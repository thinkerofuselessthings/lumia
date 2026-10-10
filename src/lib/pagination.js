/**
 * src/lib/pagination.js — V3.M5.B9
 *
 * Helper centralizzato per paginazione query string `?page=&page_size=` (oppure
 * `?limit=&offset=`) con tetti hard contro DoS.
 *
 * Uso:
 *   const { page, page_size, limit, offset } = parsePagination(ctx, { default_size: 50, max_size: 200 });
 *   const rows  = stmt.all(limit, offset);
 *   const total = countStmt.get().total;
 *   return paginated(rows, total, page, page_size);
 */

'use strict';

function _toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parsePagination(ctx, opts = {}) {
  const defaultSize = Math.max(1, opts.default_size || 50);
  const maxSize     = Math.max(defaultSize, opts.max_size || 200);

  const url = new URL(ctx.req.url, 'http://localhost');
  const q   = url.searchParams;

  // Supporta sia ?page+page_size sia ?limit+offset
  let pageSize = _toInt(q.get('page_size'), null);
  if (pageSize === null) pageSize = _toInt(q.get('limit'), defaultSize);
  pageSize = Math.min(Math.max(pageSize, 1), maxSize);

  let page = _toInt(q.get('page'), null);
  let offset;
  if (page !== null) {
    page = Math.max(page, 1);
    offset = (page - 1) * pageSize;
  } else {
    offset = Math.max(_toInt(q.get('offset'), 0), 0);
    page = Math.floor(offset / pageSize) + 1;
  }

  return { page, page_size: pageSize, limit: pageSize, offset };
}

function paginated(items, total, page, page_size) {
  const total_pages = total === 0 ? 0 : Math.ceil(total / page_size);
  return { items, page, page_size, total, total_pages };
}

module.exports = { parsePagination, paginated };
