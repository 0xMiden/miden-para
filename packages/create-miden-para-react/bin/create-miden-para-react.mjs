#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templateConfigPath = resolve(__dirname, "..", "template", "vite.config.ts");

const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith("-")) ?? "miden-para-react-app";
const skipInstall = args.some(
  (flag) => flag === "--skip-install" || flag === "--no-install",
);
const targetDir = resolve(process.cwd(), target);

runCreateVite(target);
overrideViteConfig(targetDir);
ensurePolyfillDependency(targetDir);

if (!skipInstall) {
  installDependencies(targetDir);
} else {
  logStep("Skipped dependency installation (--skip-install)");
}

function runCreateVite(targetArg) {
  const scaffoldArgs = [
    "create",
    "vite@latest",
    targetArg,
    "--",
    "--template",
    "react-ts",
  ];
  logStep(`Scaffolding react-ts via npm ${scaffoldArgs.join(" ")}`);
  runOrExit("npm", scaffoldArgs);
}

function overrideViteConfig(targetRoot) {
  const dest = join(targetRoot, "vite.config.ts");
  logStep(`Applying custom vite.config.ts to ${dest}`);
  copyFileSync(templateConfigPath, dest);
}

function ensurePolyfillDependency(targetRoot) {
  const pkgPath = join(targetRoot, "package.json");
  if (!existsSync(pkgPath)) {
    logStep("No package.json found after scaffolding; nothing to patch");
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.devDependencies = pkg.devDependencies ?? {};
  pkg.devDependencies["vite-plugin-node-polyfills"] ??= "^0.24.0";
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  logStep("Added vite-plugin-node-polyfills to devDependencies");
}

function installDependencies(targetRoot) {
  const pm = detectPackageManager();
  logStep(`Installing dependencies with ${pm.command}`);
  runOrExit(pm.command, pm.args, targetRoot);
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent || "";
  if (ua.startsWith("pnpm")) return { command: "pnpm", args: ["install"] };
  if (ua.startsWith("yarn")) return { command: "yarn", args: [] };
  if (ua.startsWith("bun")) return { command: "bun", args: ["install"] };
  return { command: "npm", args: ["install"] };
}

function runOrExit(command, args, cwd) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function logStep(message) {
  console.log(`\n> ${message}`);
}
