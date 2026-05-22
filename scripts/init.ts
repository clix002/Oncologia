#!/usr/bin/env bun
/**
 * bun run init
 *
 * 1. Levanta todos los contenedores
 * 2. Espera a que estén healthy
 * 3. Corre el pipeline ETL completo
 * 4. Si todo OK → apaga contenedores
 * 5. Si falla   → apaga contenedores y sale con código 1
 */

import { $ } from "bun";

const COMPOSE = "docker/podman-compose.yml";
const HEALTHY_TIMEOUT_MS = 300_000; // 5 min — Ollama tarda en arrancar
const POLL_INTERVAL_MS = 5_000;

const CONTAINERS = [
  "oncologia-oltp",
  "oncologia-olap",
  "oncologia-mongo",
  "oncologia-neo4j",
  "oncologia-ollama",
];

async function run(cmd: string, args: string[]) {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`"${cmd} ${args.join(" ")}" exited with ${code}`);
}

async function isHealthy(container: string): Promise<boolean> {
  try {
    const result = await $`podman inspect --format {{.State.Health.Status}} ${container}`.quiet();
    const status = result.stdout.toString().trim();
    // "healthy" = healthcheck passed
    // ""        = container has no healthcheck configured (treat as ready)
    // "starting"= still warming up
    // "unhealthy"= failed
    return status === "healthy" || status === "";
  } catch {
    return false;
  }
}

async function waitForContainers() {
  console.log("\n⏳ Waiting for containers to be healthy...");
  const deadline = Date.now() + HEALTHY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const checks = await Promise.all(CONTAINERS.map(isHealthy));
    const pending = CONTAINERS.filter((_, i) => !checks[i]);

    if (pending.length === 0) {
      console.log("✓ All containers healthy\n");
      return;
    }

    console.log(`  not ready: ${pending.join(", ")}`);
    await Bun.sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Timed out waiting for containers to be healthy");
}

async function down() {
  console.log("\n⏬ Stopping containers...");
  await $`podman compose -f ${COMPOSE} down`.quiet();
  console.log("✓ Containers stopped");
}

async function main() {
  console.log("🚀 [init] Starting full pipeline\n");

  // 1. Limpiar estado anterior y levantar contenedores
  console.log("▶ Starting containers...");
  await $`podman compose -f ${COMPOSE} down`.quiet().nothrow();
  await run("podman", ["compose", "-f", COMPOSE, "up", "-d"]);

  // 2. Esperar healthy
  await waitForContainers();

  // 3. ETL
  console.log("▶ Running ETL pipeline...");
  try {
    await run("bun", ["run", "--cwd", "apps/etl", "all"]);
    console.log("\n✓ ETL pipeline completed successfully");
  } catch (err) {
    console.error("\n✗ ETL pipeline failed:", err);
    await down();
    process.exit(1);
  }

  // 4. Apagar
  await down();
  console.log("\n✓ [init] Done");
}

main();
