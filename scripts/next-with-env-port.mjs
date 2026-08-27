import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true, override: true });
config({ quiet: true });

const command = process.argv[2] ?? "dev";
const baseUrl = process.env.RAROLEADS_BASE_URL ?? process.env.APP_BASE_URL;
const args = [command];

if (baseUrl) {
  try {
    const { port } = new URL(baseUrl);
    if (port) args.push("-p", port);
  } catch {
    console.warn("RAROLEADS_BASE_URL/APP_BASE_URL invalida; usando a porta padrao do Next.");
  }
}

const child = spawn("next", args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
