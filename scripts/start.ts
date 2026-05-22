#!/usr/bin/env bun
/**
 * bun run start
 *
 * 1. Levanta OLAP + Ollama
 * 2. Hace next build
 * 3. Sirve con next start
 * 4. Al salir (Ctrl+C) apaga los contenedores automáticamente
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

  console.log("▶ Building Next.js...\n");
  const build = Bun.spawn(["bun", "x", "next", "build"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const buildCode = await build.exited;
  if (buildCode !== 0) {
    console.error("✗ Build failed");
    await down();
    process.exit(buildCode);
  }

  console.log("▶ Starting Next.js production server...\n");
  const next = Bun.spawn(["bun", "x", "next", "start"], {
    stdout: "inherit",
    stderr: "inherit",
  });

  const cleanup = async () => {
    next.kill();
    await down();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  const code = await next.exited;
  await down();
  process.exit(code);
}

main();
