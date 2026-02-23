const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");
const { requireAuth, requireModerator } = require("../middleware/auth");
const { httpError } = require("../utils/errors");

const router = express.Router();

function nowIso() { return new Date().toISOString(); }
function genId(prefix) { return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 8)}`; }

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { mapId, reason, comment = "" } = req.body || {};
    const details = [];
    if (!mapId || typeof mapId !== "string") details.push({ field: "mapId", issue: "required" });
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) details.push({ field: "reason", issue: "required" });
    if (details.length) throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);

    const mapRes = await query(`SELECT map_id FROM maps WHERE map_id = $1`, [mapId]);
    if (!mapRes.rows.length) throw httpError(404, "NOT_FOUND", "Невозможно создать жалобу: карта не найдена");

    const reportId = genId("rep");
    const ts = nowIso();

    const { rows } = await query(
      `INSERT INTO reports(report_id, map_id, author_id, reason, comment, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'new',$6)
       RETURNING report_id, map_id, author_id, reason, comment, status, created_at`,
      [reportId, mapId, req.user.id, reason.trim(), typeof comment === "string" ? comment : "", ts]
    );

    const r = rows[0];
    res.status(201).json({
      reportId: r.report_id,
      mapId: r.map_id,
      authorId: r.author_id,
      reason: r.reason,
      comment: r.comment,
      status: r.status,
      createdAt: r.created_at
    });
  } catch (err) { next(err); }
});

router.get("/", requireAuth, requireModerator, async (req, res, next) => {
  try {
    const status = req.query.status;

    let limit = 20;
    if (typeof req.query.limit === "string") limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    let offset = 0;
    if (typeof req.query.cursor === "string") offset = parseInt(req.query.cursor, 10);
    if (Number.isNaN(offset) || offset < 0) offset = 0;

    const params = [limit, offset];
    let sql = `SELECT report_id, map_id, status, reason, created_at FROM reports`;
    if (typeof status === "string") sql += ` WHERE status = '${status}'`;
    sql += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

    const listRes = await query(sql, params);

    let countSql = `SELECT COUNT(*)::int AS cnt FROM reports`;
    if (typeof status === "string") countSql += ` WHERE status = '${status}'`;
    const cntRes = await query(countSql, []);
    const total = cntRes.rows[0].cnt;

    const nextOffset = offset + listRes.rows.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    res.status(200).json({
      items: listRes.rows.map(r => ({
        reportId: r.report_id,
        mapId: r.map_id,
        status: r.status,
        reason: r.reason,
        createdAt: r.created_at
      })),
      nextCursor
    });
  } catch (err) { next(err); }
});

module.exports = router;
