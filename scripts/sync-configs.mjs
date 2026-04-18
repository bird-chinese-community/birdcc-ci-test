/**
 * sync-configs.mjs — Pull latest config snapshots from upstream repos.
 *
 * Usage:
 *   node scripts/sync-configs.mjs [--check] [--verbose]
 *
 *   --check   Verify configs are up-to-date without writing changes (CI mode).
 *   --verbose Print extra progress output.
 */

import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sortedConfigSources } from "./config-sources-registry.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workRoot = resolve(repoRoot, ".tmp/sync-configs");
const lockFile = resolve(repoRoot, "configs/ci-lock.json");

const args = new Set(process.argv.slice(2));
const isCheckMode = args.has("--check");
const verbose = args.has("--verbose");

const log = (...parts) => {
  if (verbose) console.log(...parts);
};

const normalizeLockSources = (sources) => sources.map(({ syncedAt, ...source }) => source);

const hasConfigsDiff = async () => {
  try {
    await run({
      cmd: "git",
      args: ["diff", "--quiet", "--", "configs"],
      cwd: repoRoot,
    });
    return false;
  } catch (error) {
    if (error instanceof Error && error.message.includes("git diff --quiet")) {
      return true;
    }
    throw error;
  }
};

const run = async ({ cmd, args: cmdArgs, cwd }) => {
  const stdout = [];
  const stderr = [];
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      stdout.push(chunk);
      if (verbose) {
        process.stdout.write(chunk);
      }
    });
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          `${cmd} ${cmdArgs.join(" ")} failed (exit ${code})\n${Buffer.concat(stdout).toString("utf8")}${Buffer.concat(stderr).toString("utf8")}`,
        ),
      );
    });
  });
};

const cloneOrUpdate = async (repoGit, cloneDir) => {
  try {
    await stat(join(cloneDir, ".git"));
    log(`  git fetch ${repoGit}`);
    await run({ cmd: "git", args: ["fetch", "--depth", "1", "origin"], cwd: cloneDir });
    await run({ cmd: "git", args: ["reset", "--hard", "origin/HEAD"], cwd: cloneDir });
  } catch {
    log(`  git clone --depth 1 ${repoGit}`);
    await rm(cloneDir, { recursive: true, force: true });
    await run({
      cmd: "git",
      args: ["clone", "--depth", "1", repoGit, cloneDir],
      cwd: workRoot,
    });
  }
};

const getCommit = async (cloneDir) => {
  const chunks = [];
  await new Promise((resolve, reject) => {
    const child = spawn("git", ["rev-parse", "HEAD"], {
      cwd: cloneDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (c) => chunks.push(c));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("git rev-parse failed")),
    );
  });
  return Buffer.concat(chunks).toString("utf8").trim();
};

const applyLocalAdjustments = async (source, destDir) => {
  if (source.id === "bird2-net186-config") {
    const templatePath = resolve(destDir, "config-example.conf");
    const generatedPath = resolve(destDir, "config.conf");
    const birdConfPath = resolve(destDir, "bird.conf");

    const template = await readFile(templatePath, "utf8");
    const adaptedConfig = [
      "# Adapted for birdcc-ci-test CI from config-example.conf.",
      "# Upstream: https://github.com/186526/net186-config",
      "",
      template.trimEnd(),
      "",
    ].join("\n");
    await writeFile(generatedPath, adaptedConfig, "utf8");

    const birdConf = await readFile(birdConfPath, "utf8");
    if (!birdConf.includes('# include "./config.conf";')) {
      throw new Error("Expected commented config.conf include in configs/net186/bird.conf");
    }

    await writeFile(
      birdConfPath,
      birdConf.replace('# include "./config.conf";', 'include "./config.conf";'),
      "utf8",
    );
    return;
  }

  if (source.id === "bird3-bird-configs-output-nycm1") {
    const birdConfPath = resolve(destDir, "bird.conf");
    const birdConf = await readFile(birdConfPath, "utf8");
    const normalized = birdConf.replace(/^(\s*source address\s+[^;\n]+)$/gmu, "$1;");
    await writeFile(birdConfPath, normalized, "utf8");
  }
};

const syncSource = async (source) => {
  const cloneDir = resolve(workRoot, source.id);
  const destDir = resolve(repoRoot, source.dest);

  await cloneOrUpdate(source.repoGit, cloneDir);
  const commit = await getCommit(cloneDir);
  log(`  commit: ${commit}`);

  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  for (const { from, to } of source.copy) {
    const fromPath = resolve(cloneDir, from);
    const toPath = resolve(destDir, to);

    if (from.endsWith("/")) {
      await rm(toPath, { recursive: true, force: true });
      await cp(fromPath, toPath, { recursive: true });
      log(`  cp -r ${from} → ${to}`);
    } else {
      await mkdir(resolve(toPath, ".."), { recursive: true });
      await cp(fromPath, toPath);
      log(`  cp ${from} → ${to}`);
    }
  }

  await applyLocalAdjustments(source, destDir);

  return {
    id: source.id,
    path: source.path,
    dest: source.dest,
    entry: source.entry,
    repo: source.repo,
    repoGit: source.repoGit,
    defaultBranch: source.defaultBranch,
    licenseSpdx: source.licenseSpdx,
    birdMajor: source.birdMajor,
    localAdjustments: source.localAdjustments,
    commit,
    syncedAt: new Date().toISOString(),
  };
};

const main = async () => {
  await mkdir(workRoot, { recursive: true });

  let existingLock = {};
  try {
    existingLock = JSON.parse(await readFile(lockFile, "utf8"));
  } catch {
    /* no lock file yet */
  }

  const results = [];
  for (const source of sortedConfigSources) {
    console.log(`Syncing ${source.id} from ${source.repo}…`);
    const result = await syncSource(source);
    results.push(result);
    console.log(`  ✓ ${source.id} @ ${result.commit.slice(0, 12)}`);
  }

  const newLock = {
    generatedAt: new Date().toISOString(),
    ranked: false,
    sources: results,
  };

  const existingStr = JSON.stringify(normalizeLockSources(existingLock.sources ?? []));
  const newStr = JSON.stringify(normalizeLockSources(results));
  const metadataChanged = existingStr !== newStr;
  const configsChanged = await hasConfigsDiff();
  const hasChanges = metadataChanged || configsChanged;

  if (isCheckMode) {
    if (hasChanges) {
      console.error(
        "Config snapshots are out of date. Run `node scripts/sync-configs.mjs` to update.",
      );
      process.exit(1);
    }
    console.log("Config snapshots are up to date.");
    return;
  }

  if (metadataChanged) {
    await writeFile(lockFile, JSON.stringify(newLock, null, 2) + "\n", "utf8");
  }

  if (hasChanges) {
    console.log("Changes detected — configs/ci-lock.json updated.");
  } else {
    console.log("No changes detected.");
  }
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
