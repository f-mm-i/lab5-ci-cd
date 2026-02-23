const { query } = require("../db");
const { httpError } = require("../utils/errors");

function extractToken(authHeader) {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req.header("Authorization"));
    if (!token) throw httpError(401, "UNAUTHORIZED", "Отсутствует или неверный токен авторизации");

    const { rows } = await query("SELECT user_id, role FROM users WHERE user_id = $1", [token]);
    if (!rows.length) throw httpError(401, "UNAUTHORIZED", "Пользователь не найден (проверьте токен)");

    req.user = { id: rows[0].user_id, role: rows[0].role };
    next();
  } catch (err) {
    next(err);
  }
}

function requireModerator(req, _res, next) {
  if (!req.user) return next(httpError(401, "UNAUTHORIZED", "Отсутствует авторизация"));
  if (req.user.role !== "moderator") return next(httpError(403, "FORBIDDEN", "Недостаточно прав: требуется роль модератора"));
  next();
}

module.exports = { requireAuth, requireModerator };
