import { Router } from "express";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler, ApiError, parseDateRange } from "../utils/http.js";
import { insertAudit } from "../services/auditService.js";

const router = Router();

const createTeamSchema = z.object({
  team_code: z.string().min(2).max(30),
  team_name: z.string().min(2).max(150),
  team_leader: z.string().max(120).optional().nullable(),
  is_active: z.boolean().default(true)
});

const updateTeamSchema = z.object({
  team_code: z.string().min(2).max(30).optional(),
  team_name: z.string().min(2).max(150).optional(),
  team_leader: z.string().max(120).optional().nullable(),
  is_active: z.boolean().optional()
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.activeOnly === "true";
    const includeStats = req.query.include_stats === "true";
    const where = activeOnly ? "WHERE t.is_active = 1" : "";
    if (!includeStats) {
      const [rows] = await pool.execute(
        `SELECT t.team_id, t.team_code, t.team_name, t.team_leader, t.is_active, t.created_at, t.updated_at,
                0 AS confirmed_issue_count
         FROM teams t
         ${where}
         ORDER BY t.team_code ASC`
      );
      res.json({ rows });
      return;
    }

    const [rows] = await pool.execute(
      `SELECT t.team_id, t.team_code, t.team_name, t.team_leader, t.is_active, t.created_at, t.updated_at,
              COALESCE(bc.confirmed_issue_count, 0) AS confirmed_issue_count
       FROM teams t
       LEFT JOIN (
         SELECT b.team_id, COUNT(*) AS confirmed_issue_count
         FROM bills b
         WHERE b.status = 'CONFIRMED'
           AND b.bill_type = 'ISSUE_TO_TEAM'
         GROUP BY b.team_id
       ) bc ON bc.team_id = t.team_id
       ${where}
       ORDER BY t.team_code ASC`
    );
    res.json({ rows });
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = parsed.data;
    const team = await withTransaction(async (connection) => {
      const [existsRows] = await connection.execute(
        `SELECT team_id FROM teams WHERE team_code = ? LIMIT 1`,
        [payload.team_code]
      );
      if (existsRows.length) {
        throw new ApiError(409, "Team code already exists");
      }

      const [result] = await connection.execute(
        `INSERT INTO teams (team_code, team_name, team_leader, is_active)
         VALUES (?, ?, ?, ?)`,
        [
          payload.team_code.toUpperCase(),
          payload.team_name,
          payload.team_leader || null,
          payload.is_active ? 1 : 0
        ]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CREATE_TEAM",
        entity: "teams",
        entityId: result.insertId,
        detail: payload
      });

      const [rows] = await connection.execute(
        `SELECT team_id, team_code, team_name, team_leader, is_active, created_at, updated_at
         FROM teams
         WHERE team_id = ?`,
        [result.insertId]
      );
      return rows[0];
    });

    res.status(201).json({ row: team });
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const teamId = Number(req.params.id);
    if (!Number.isFinite(teamId) || teamId <= 0) {
      throw new ApiError(400, "Invalid team id");
    }
    const parsed = updateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = parsed.data;
    if (!Object.keys(payload).length) {
      throw new ApiError(400, "No fields to update");
    }

    const row = await withTransaction(async (connection) => {
      const [existsRows] = await connection.execute(
        `SELECT team_id FROM teams WHERE team_id = ?`,
        [teamId]
      );
      if (!existsRows.length) {
        throw new ApiError(404, "Team not found");
      }

      const updates = [];
      const params = [];
      if (payload.team_code !== undefined) {
        updates.push("team_code = ?");
        params.push(payload.team_code.toUpperCase());
      }
      if (payload.team_name !== undefined) {
        updates.push("team_name = ?");
        params.push(payload.team_name);
      }
      if (payload.team_leader !== undefined) {
        updates.push("team_leader = ?");
        params.push(payload.team_leader || null);
      }
      if (payload.is_active !== undefined) {
        updates.push("is_active = ?");
        params.push(payload.is_active ? 1 : 0);
      }

      params.push(teamId);

      await connection.execute(
        `UPDATE teams SET ${updates.join(", ")} WHERE team_id = ?`,
        params
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "UPDATE_TEAM",
        entity: "teams",
        entityId: teamId,
        detail: payload
      });

      const [rows] = await connection.execute(
        `SELECT team_id, team_code, team_name, team_leader, is_active, created_at, updated_at
         FROM teams WHERE team_id = ?`,
        [teamId]
      );
      return rows[0];
    });

    res.json({ row });
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const teamId = Number(req.params.id);
    if (!Number.isFinite(teamId) || teamId <= 0) {
      throw new ApiError(400, "Invalid team id");
    }

    await withTransaction(async (connection) => {
      const [teamRows] = await connection.execute(
        `SELECT team_id, team_code, team_name
         FROM teams
         WHERE team_id = ?
         FOR UPDATE`,
        [teamId]
      );
      const team = teamRows[0];
      if (!team) {
        throw new ApiError(404, "Team not found");
      }

      const [billRows] = await connection.execute(
        `SELECT COUNT(*) AS total FROM bills WHERE team_id = ?`,
        [teamId]
      );
      const relatedBillTotal = Number(billRows[0]?.total || 0);
      if (relatedBillTotal > 0) {
        throw new ApiError(400, "Cannot delete team because it has related bills");
      }

      await connection.execute(
        `DELETE FROM teams WHERE team_id = ?`,
        [teamId]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "DELETE_TEAM",
        entity: "teams",
        entityId: teamId,
        detail: {
          team_code: team.team_code,
          team_name: team.team_name
        }
      });
    });

    res.json({ ok: true, team_id: teamId });
  })
);

router.get(
  "/:id/issues",
  asyncHandler(async (req, res) => {
    const teamId = Number(req.params.id);
    if (!Number.isFinite(teamId) || teamId <= 0) {
      throw new ApiError(400, "Invalid team id");
    }

    const from = req.query.from ? String(req.query.from) : "";
    const to = req.query.to ? String(req.query.to) : "";
    const date = parseDateRange(from, to);
    const movement = req.query.movement ? String(req.query.movement).toLowerCase() : "issue";
    if (!["issue", "return"].includes(movement)) {
      throw new ApiError(400, "Invalid movement mode");
    }
    const billType = movement === "return" ? "RETURN_FROM_TEAM" : "ISSUE_TO_TEAM";

    const [teamRows] = await pool.execute(
      `SELECT team_id, team_code, team_name, team_leader, is_active FROM teams WHERE team_id = ?`,
      [teamId]
    );
    if (!teamRows.length) {
      throw new ApiError(404, "Team not found");
    }

    const [detailRows] = await pool.execute(
      `SELECT b.bill_id, b.bill_no, b.bill_datetime, b.sender_name, b.receiver_name,
              p.product_id, p.product_code_wlma, p.product_name, p.unit, bi.qty
       FROM bills b
       JOIN bill_items bi ON bi.bill_id = b.bill_id
       JOIN products p ON p.product_id = bi.product_id
       WHERE b.team_id = ?
         AND b.status = 'CONFIRMED'
         AND b.bill_type = ?
         ${date.clause}
       ORDER BY b.bill_datetime DESC, b.bill_id DESC`,
      [teamId, billType, ...date.params]
    );

    const [summaryRows] = await pool.execute(
      `SELECT p.product_id, p.product_code_wlma, p.product_name, p.unit, SUM(bi.qty) AS total_qty
       FROM bills b
       JOIN bill_items bi ON bi.bill_id = b.bill_id
       JOIN products p ON p.product_id = bi.product_id
       WHERE b.team_id = ?
         AND b.status = 'CONFIRMED'
         AND b.bill_type = ?
         ${date.clause}
       GROUP BY p.product_id
       ORDER BY total_qty DESC, p.product_code_wlma ASC`,
      [teamId, billType, ...date.params]
    );

    res.json({
      team: teamRows[0],
      movement,
      summary: summaryRows,
      details: detailRows
    });
  })
);

export default router;
