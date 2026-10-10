/**
 * Server â€” HTTP factory
 */

const http = require("http");
const { env } = require("./config/env");
const { handleRequest } = require("./http/request-handler");

function createServer() {
  const PORT = env("LUMIA_PORT", 3500);
  const HOST = env("LUMIA_HOST", "127.0.0.1");

  const server = http.createServer(handleRequest);

  server.headersTimeout = env("HEADERS_TIMEOUT", 20000);
  server.requestTimeout = env("REQUEST_TIMEOUT", 30000);
  server.timeout = env("SOCKET_TIMEOUT", 120000);
  server.keepAliveTimeout = env("KEEP_ALIVE_TIMEOUT", 5000);

  return { server, PORT, HOST };
}

module.exports = { createServer };
