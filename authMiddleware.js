import { verifyToken } from "../utils/jwt.js";
import { pg } from "../config/postgres.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = verifyToken(token); // { id, collegeId, role }
    const { rows } = await pg.query(
      "SELECT id, name, email, college_id as \"collegeId\", role FROM users WHERE id = $1",
      [decoded.id]
    );
    if (rows.length === 0) return res.status(401).json({ message: "User not found" });

    req.user = rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
};
