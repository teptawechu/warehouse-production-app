import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db.js";
import { config } from "../config.js";
import { asyncHandler, ApiError } from "../utils/http.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

function toPublicUser(row) {
  return {
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    is_active: !!row.is_active
  };
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }

    const { username, password } = parsed.data;
    const [rows] = await pool.execute(
      `SELECT user_id, username, password_hash, display_name, role, is_active
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      throw new ApiError(401, "Invalid username or password");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new ApiError(401, "Invalid username or password");
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        display_name: user.display_name,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: toPublicUser(user)
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT user_id, username, display_name, role, is_active
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.user_id]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      throw new ApiError(401, "Session expired");
    }
    res.json({ user: toPublicUser(user) });
  })
);

export default router;
