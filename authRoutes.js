import express from "express";
import { signup, login, signupSchema, loginSchema } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

export default router;
