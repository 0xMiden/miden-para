#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templateConfigPath = resolve(__dirname, "..", "template", "vite.config.ts");
const templateAppPath = resolve(__dirname, "..", "template", "src", "App.tsx");

const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith("-")) ?? "miden-para-react-app";
const skipInstall = args.some(
  (flag) => flag === "--skip-install" || flag === "--no-install",
);
const targetDir = resolve(process.cwd(), target);
const targetParent = dirname(targetDir);
const targetName = basename(targetDir);

ensureTargetParent();
runCreateVite(targetName);
overrideViteConfig(targetDir);
overrideApp(targetDir);
ensurePolyfillDependency(targetDir);
ensureMidenParaDependencies(targetDir);

if (!skipInstall) {
  installDependencies(targetDir);
} else {
  logStep("Skipped dependency installation (--skip-install)");
}

function ensureTargetParent() {
  mkdirSync(targetParent, { recursive: true });
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
  logStep(
    `Scaffolding react-ts via npm ${scaffoldArgs.join(" ")} (cwd: ${targetParent})`,
  );
  runOrExit("npm", scaffoldArgs, targetParent);
}

function overrideViteConfig(targetRoot) {
  const dest = join(targetRoot, "vite.config.ts");
  logStep(`Applying custom vite.config.ts to ${dest}`);
  copyFileSync(templateConfigPath, dest);
}

function overrideApp(targetRoot) {
  const dest = join(targetRoot, "src", "App.tsx");
  mkdirSync(join(targetRoot, "src"), { recursive: true });
  logStep(`Replacing App.tsx with Para + Miden starter at ${dest}`);
  copyFileSync(templateAppPath, dest);
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

function ensureMidenParaDependencies(targetRoot) {
  const pkgPath = join(targetRoot, "package.json");
  if (!existsSync(pkgPath)) {
    logStep("No package.json found after scaffolding; cannot add dependencies");
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies["@getpara/react-sdk"] ??= "2.0.0-alpha.73";
  pkg.dependencies["@tanstack/react-query"] ??= "^5.90.12";
  pkg.dependencies["miden-para"] ??= "^0.0.9";
  pkg.dependencies["miden-para-react"] ??= "^0.0.9";

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  logStep("Added Para + Miden starter dependencies");
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
