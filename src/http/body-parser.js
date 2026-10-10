/**
 * Body Parser — JSON body parser with size limit and timeout
 */

const { env } = require("../config/env");
const { AppError } = require("../errors/app-error");

const MAX_BODY_SIZE = env("MAX_BODY_SIZE", 1 * 1024 * 1024); // 1 MB

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "DELETE" || req.method === "HEAD") {
      resolve(null);
      return;
    }

    const TIMEOUT_MS = env("BODY_PARSE_TIMEOUT", 10000);
    let body = "";
    let size = 0;

    const timer = setTimeout(() => {
      req.destroy();
      reject(AppError.from("BODY_TIMEOUT"));
    }, TIMEOUT_MS);

    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        clearTimeout(timer);
        req.destroy();
        reject(AppError.from("BODY_TOO_LARGE"));
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      clearTimeout(timer);
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (e) {
        reject(AppError.from("BODY_INVALID_JSON"));
      }
    });
    req.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

module.exports = { parseBody };
