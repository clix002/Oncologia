#!/usr/bin/env bun
/**
 * bun run dev
 *
 * 1. Levanta solo OLAP + Ollama (lo que necesita el frontend)
 * 2. Corre next dev
 * 3. Al salir (Ctrl+C) apaga los contenedores automáticamente
 */

import { $ } from "bun";

const COMPOSE = "docker/podman-compose.yml";
const DEV_SERVICES = ["postgres_olap", "ollama"];

async function compose(...args: string[]) {
  const proc = Bun.spawn(["podman", "compose", "-f", COMPOSE, ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

async function down() {
  console.log("\n⏬ Stopping containers...");
  await compose("stop", ...DEV_SERVICES);
  console.log("✓ Containers stopped");
}

async function main() {
  console.log("▶ Starting OLAP + Ollama...");
  await compose("up", "-d", ...DEV_SERVICES);

  console.log("▶ Starting Next.js dev server...\n");

  const next = Bun.spawn(["bun", "x", "next", "dev"], {
    stdout: "inherit",
    stderr: "inherit",
  });

  // Captura Ctrl+C y señales de salida
  const cleanup = async () => {
    next.kill();
    await down();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Si next sale solo (crash / build error)
  const code = await next.exited;
  await down();
  process.exit(code);
}

main();
