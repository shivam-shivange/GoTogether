import bcrypt from "bcryptjs";
import { pg } from "../config/postgres.js";
import { signToken } from "../utils/jwt.js";
import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  // infer college by email domain
  const emailDomain = email.split("@")[1]?.toLowerCase();
  const collegeRes = await pg.query("SELECT id FROM colleges WHERE email_domain = $1", [emailDomain]);
  if (collegeRes.rows.length === 0)
    return res.status(400).json({ message: "Email domain not allowed. Your college is not onboarded." });

  const collegeId = collegeRes.rows[0].id;

  const existing = await pg.query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing.rows.length) return res.status(400).json({ message: "User already exists" });

  const hash = await bcrypt.hash(password, 10);
  const insert = await pg.query(
    `INSERT INTO users (name, email, college_id, password_hash)
     VALUES ($1, $2, $3, $4) RETURNING id, name, email, college_id as "collegeId", role`,
    [name, email, collegeId, hash]
  );

  const user = insert.rows[0];
  const token = signToken({ id: user.id, collegeId: user.collegeId, role: user.role });
  res.json({ user, token });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pg.query(
    `SELECT id, name, email, college_id as "collegeId", role, password_hash FROM users WHERE email = $1`,
    [email]
  );
  if (!rows.length) return res.status(400).json({ message: "Invalid credentials" });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ message: "Invalid credentials" });

  delete user.password_hash;
  const token = signToken({ id: user.id, collegeId: user.collegeId, role: user.role });
  res.json({ user, token });
};
