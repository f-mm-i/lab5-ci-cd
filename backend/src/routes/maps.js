const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { httpError } = require("../utils/errors");

const router = express.Router();

function nowIso() { return new Date().toISOString(); }
function genId(prefix) { return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 8)}`; }
function validateVisibility(v) { return v === "private" || v === "public"; }

function canRead(user, map) {
  if (map.visibility === "public") return true;
  if (user.role === "moderator") return true;
  return map.owner_id === user.id;
}
function canWrite(user, map) {
  if (user.role === "moderator") return true;
  return map.owner_id === user.id;
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, description = "", visibility = "private" } = req.body || {};
    const details = [];
    if (!title || typeof title !== "string" || title.trim().length === 0) details.push({ field: "title", issue: "required" });
    if (!validateVisibility(visibility)) details.push({ field: "visibility", issue: "must be 'private' or 'public'" });
    if (details.length) throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);

    const mapId = genId("map");
    const ts = nowIso();

    const { rows } = await query(
      `INSERT INTO maps(map_id, owner_id, title, description, visibility, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING map_id, owner_id, title, description, visibility, created_at, updated_at`,
      [mapId, req.user.id, title.trim(), typeof description === "string" ? description : "", visibility, ts, ts]
    );

    const m = rows[0];
    res.status(201).json({
      mapId: m.map_id,
      ownerId: m.owner_id,
      title: m.title,
      description: m.description,
      visibility: m.visibility,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    });
  } catch (err) { next(err); }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const visibility = req.query.visibility;

    let limit = 20;
    if (typeof req.query.limit === "string") limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    let offset = 0;
    if (typeof req.query.cursor === "string") offset = parseInt(req.query.cursor, 10);
    if (Number.isNaN(offset) || offset < 0) offset = 0;

    const params = [req.user.id, limit, offset];
    let sql = `SELECT map_id, title, visibility, updated_at FROM maps WHERE owner_id = $1`;
    if (typeof visibility === "string" && (visibility === "private" || visibility === "public")) {
      sql += ` AND visibility = '${visibility}'`;
    }
    sql += ` ORDER BY updated_at DESC LIMIT $2 OFFSET $3`;

    const listRes = await query(sql, params);

    let countSql = `SELECT COUNT(*)::int AS cnt FROM maps WHERE owner_id = $1`;
    if (typeof visibility === "string" && (visibility === "private" || visibility === "public")) {
      countSql += ` AND visibility = '${visibility}'`;
    }
    const cntRes = await query(countSql, [req.user.id]);
    const total = cntRes.rows[0].cnt;

    const nextOffset = offset + listRes.rows.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    res.status(200).json({
      items: listRes.rows.map(r => ({
        mapId: r.map_id,
        title: r.title,
        visibility: r.visibility,
        updatedAt: r.updated_at
      })),
      nextCursor
    });
  } catch (err) { next(err); }
});

router.get("/:mapId", requireAuth, async (req, res, next) => {
  try {
    const mapId = req.params.mapId;
    const { rows } = await query(
      `SELECT map_id, owner_id, title, description, visibility, created_at, updated_at
       FROM maps WHERE map_id = $1`,
      [mapId]
    );
    if (!rows.length) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    const m = rows[0];
    if (!canRead(req.user, m)) throw httpError(403, "FORBIDDEN", "Недостаточно прав для просмотра карты");

    res.status(200).json({
      mapId: m.map_id,
      ownerId: m.owner_id,
      title: m.title,
      description: m.description,
      visibility: m.visibility,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    });
  } catch (err) { next(err); }
});

router.post("/:mapId/elements", requireAuth, async (req, res, next) => {
  try {
    const mapId = req.params.mapId;
    const mapRes = await query(`SELECT map_id, owner_id, visibility FROM maps WHERE map_id = $1`, [mapId]);
    if (!mapRes.rows.length) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    const map = mapRes.rows[0];
    if (!canWrite(req.user, map)) throw httpError(403, "FORBIDDEN", "Недостаточно прав для изменения карты");

    const { type, x, y, content = "", style = {} } = req.body || {};
    const details = [];
    if (!type || typeof type !== "string") details.push({ field: "type", issue: "required" });
    if (typeof x !== "number") details.push({ field: "x", issue: "must be number" });
    if (typeof y !== "number") details.push({ field: "y", issue: "must be number" });
    if (details.length) throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);

    const elementId = genId("el");
    const ts = nowIso();
    const { rows } = await query(
      `INSERT INTO elements(element_id, map_id, type, x, y, content, style, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING element_id, map_id, type, x, y, content, style, created_at`,
      [elementId, mapId, type, x, y, typeof content === "string" ? content : "", style, ts]
    );
    await query(`UPDATE maps SET updated_at = $2 WHERE map_id = $1`, [mapId, ts]);

    const e = rows[0];
    res.status(201).json({
      elementId: e.element_id,
      mapId: e.map_id,
      type: e.type,
      x: e.x,
      y: e.y,
      content: e.content,
      style: e.style,
      createdAt: e.created_at
    });
  } catch (err) { next(err); }
});

router.get("/:mapId/elements", requireAuth, async (req, res, next) => {
  try {
    const mapId = req.params.mapId;
    const mapRes = await query(`SELECT map_id, owner_id, visibility FROM maps WHERE map_id = $1`, [mapId]);
    if (!mapRes.rows.length) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    const map = mapRes.rows[0];
    if (!canRead(req.user, map)) throw httpError(403, "FORBIDDEN", "Недостаточно прав для просмотра элементов карты");

    const { rows } = await query(
      `SELECT element_id, type, x, y, content FROM elements WHERE map_id = $1 ORDER BY created_at ASC`,
      [mapId]
    );

    res.status(200).json({
      items: rows.map(r => ({
        elementId: r.element_id,
        type: r.type,
        x: r.x,
        y: r.y,
        content: r.content
      }))
    });
  } catch (err) { next(err); }
});

module.exports = router;
