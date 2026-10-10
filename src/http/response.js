/**
 * Response helpers — JSON serialization, error, notFound
 */

function json(res, data, status = 200) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

function error(res, message, status = 400) {
  return json(res, { ok: false, error: message }, status);
}

function notFound(res) {
  return json(res, { ok: false, error: { code: "NOT_FOUND_ROUTE", message: "Endpoint non trovato" } }, 404);
}

module.exports = { json, error, notFound };
