import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { asyncHandler, ApiError } from "../utils/http.js";
import { requireRole } from "../middleware/auth.js";
import { insertAudit } from "../services/auditService.js";

const router = Router();

const roleEnum = z.enum(["ADMIN", "STOREKEEPER", "VIEWER"]);

const createUserSchema = z.object({
  username: z.string().min(3).max(60),
  password: z.string().min(6).max(120),
  display_name: z.string().min(2).max(120),
  role: roleEnum.default("VIEWER")
});

const updateUserSchema = z.object({
  display_name: z.string().min(2).max(120).optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).max(120).optional()
});

function toUserPayloadError(parsedResult) {
  if (parsedResult.success) {
    return {
      message: "Invalid payload",
      issues: null
    };
  }

  const issues = parsedResult.error?.issues || [];
  const first = issues[0];
  const field = String(first?.path?.[0] || "");

  if (field === "username") {
    return { message: "Username must be 3-60 characters", issues };
  }
  if (field === "password") {
    return { message: "Password must be 6-120 characters", issues };
  }
  if (field === "display_name") {
    return { message: "Display name must be 2-120 characters", issues };
  }
  if (field === "role") {
    return { message: "Role must be ADMIN, STOREKEEPER, or VIEWER", issues };
  }
  if (field === "is_active") {
    return { message: "is_active must be true or false", issues };
  }

  return {
    message: "Invalid payload",
    issues
  };
}

router.get(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT user_id, username, display_name, role, is_active, created_at, updated_at
       FROM users
       ORDER BY username ASC`
    );
    res.json({ rows });
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const payloadError = toUserPayloadError(parsed);
      throw new ApiError(400, payloadError.message, {
        issues: payloadError.issues
      });
    }

    const payload = parsed.data;
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const createdUser = await withTransaction(async (connection) => {
      const [existsRows] = await connection.execute(
        `SELECT user_id FROM users WHERE username = ? LIMIT 1`,
        [payload.username]
      );
      if (existsRows.length) {
        throw new ApiError(409, "Username already exists");
      }

      const [result] = await connection.execute(
        `INSERT INTO users (username, password_hash, display_name, role, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [payload.username, passwordHash, payload.display_name, payload.role]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CREATE_USER",
        entity: "users",
        entityId: result.insertId,
        detail: {
          username: payload.username,
          role: payload.role
        }
      });

      const [rows] = await connection.execute(
        `SELECT user_id, username, display_name, role, is_active, created_at, updated_at
         FROM users
         WHERE user_id = ?`,
        [result.insertId]
      );
      return rows[0];
    });

    res.status(201).json({ row: createdUser });
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new ApiError(400, "Invalid user id");
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const payloadError = toUserPayloadError(parsed);
      throw new ApiError(400, payloadError.message, {
        issues: payloadError.issues
      });
    }
    const payload = parsed.data;
    if (!Object.keys(payload).length) {
      throw new ApiError(400, "No fields to update");
    }

    const updatedUser = await withTransaction(async (connection) => {
      const [existingRows] = await connection.execute(
        `SELECT user_id, role, is_active FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      const existing = existingRows[0];
      if (!existing) {
        throw new ApiError(404, "User not found");
      }

      if (existing.user_id === req.user.user_id && payload.is_active === false) {
        throw new ApiError(400, "Cannot deactivate current user");
      }

      if (
        existing.role === "ADMIN" &&
        (payload.role && payload.role !== "ADMIN" || payload.is_active === false)
      ) {
        const [adminRows] = await connection.execute(
          `SELECT COUNT(*) AS total
           FROM users
           WHERE role = 'ADMIN' AND is_active = 1`
        );
        const activeAdmins = Number(adminRows[0]?.total || 0);
        if (activeAdmins <= 1) {
          throw new ApiError(400, "At least one active admin is required");
        }
      }

      const updates = [];
      const params = [];

      if (payload.display_name !== undefined) {
        updates.push("display_name = ?");
        params.push(payload.display_name);
      }
      if (payload.role !== undefined) {
        updates.push("role = ?");
        params.push(payload.role);
      }
      if (payload.is_active !== undefined) {
        updates.push("is_active = ?");
        params.push(payload.is_active ? 1 : 0);
      }
      if (payload.password !== undefined) {
        const hash = await bcrypt.hash(payload.password, 10);
        updates.push("password_hash = ?");
        params.push(hash);
      }

      if (!updates.length) {
        throw new ApiError(400, "No valid fields to update");
      }

      params.push(userId);

      await connection.execute(
        `UPDATE users
         SET ${updates.join(", ")}
         WHERE user_id = ?`,
        params
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "UPDATE_USER",
        entity: "users",
        entityId: userId,
        detail: payload
      });

      const [rows] = await connection.execute(
        `SELECT user_id, username, display_name, role, is_active, created_at, updated_at
         FROM users
         WHERE user_id = ?`,
        [userId]
      );
      return rows[0];
    });

    res.json({ row: updatedUser });
  })
);

export default router;
