// A minimal client for the MCP server inside Rive Early Access (http://localhost:9791/mcp while the app is open).
// The editor is sandboxed on macOS, so files go in and out as data instead of paths.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const URL_ = "http://127.0.0.1:9791/mcp";
const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
let ready;
let session;
let id = 1;

async function rpc(method, params, notify = false) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: session ? { ...headers, "mcp-session-id": session } : headers,
    body: JSON.stringify({ jsonrpc: "2.0", ...(notify ? {} : { id: id++ }), method, params }),
  });
  session ??= res.headers.get("mcp-session-id");
  if (notify) return null;
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
  return JSON.parse(lines.at(-1) ?? text);
}

async function init() {
  ready ??= (async () => {
    await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "search-party-build", version: "1" } });
    await rpc("notifications/initialized", {}, true);
  })();
  return ready;
}

// Calls a tool and returns its parsed result. Throws on a transport error or a `success: false` result.
export async function tool(name, args = {}) {
  await init();
  const body = await rpc("tools/call", { name, arguments: args });
  if (body.error) throw new Error(`${name}: ${JSON.stringify(body.error)}`);
  const text = body.result?.content?.[0]?.text ?? "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (/^Error/.test(text)) throw new Error(`${name}: ${text.slice(0, 600)}`);
    return text;
  }
  if (parsed.success === false) throw new Error(`${name}: ${JSON.stringify(parsed).slice(0, 800)}`);
  return parsed;
}

// `cmd` tools take { command, data: { [command]: payload } }.
export const cmd = (name, command, payload = {}) => tool(name, { command, data: { [command]: payload } });

export async function uploadSvg(path, name) {
  const data = readFileSync(path).toString("base64");
  return (await tool("upload_asset", { name, file: `data:image/svg+xml;name=${basename(path)};base64,${data}` })).asset;
}

export async function exportRiv(path) {
  const result = await tool("export_file", { format: "riv", destination: "/", inline_base64: true });
  if (!result.data) throw new Error(`export: ${JSON.stringify(result).slice(0, 400)}`);
  writeFileSync(path, Buffer.from(result.data, "base64"));
  return path;
}
