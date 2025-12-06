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
const templatePolyfillsPath = resolve(__dirname, "..", "template", "src", "polyfills.ts");

const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith("-")) ?? "miden-para-react-app";
const skipInstall = args.some(
  (flag) => flag === "--skip-install" || flag === "--no-install",
);
const targetDir = resolve(process.cwd(), target);
const targetParent = dirname(targetDir);
const targetName = basename(targetDir);
const baseEnv = {
  ...process.env,
  CI: process.env.CI ?? "true",
  npm_config_yes: process.env.npm_config_yes ?? "true",
};

ensureTargetParent();
runCreateVite(targetName);
overrideViteConfig(targetDir);
overrideApp(targetDir);
ensurePolyfills(targetDir);
ensurePolyfillDependency(targetDir);
ensureMidenParaDependencies(targetDir);
ensureNpmRc(targetDir);
logEnvReminder(targetName);

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
    "--yes", // avoid interactive prompts that might install/revert files
    "--no-install", // we handle installs after patching package.json
  ];
  runOrExit("npm", scaffoldArgs, targetParent, baseEnv, "n\n");
}

function overrideViteConfig(targetRoot) {
  const dest = join(targetRoot, "vite.config.ts");
  copyFileSync(templateConfigPath, dest);
}

function overrideApp(targetRoot) {
  const dest = join(targetRoot, "src", "App.tsx");
  mkdirSync(join(targetRoot, "src"), { recursive: true });
  logStep(`Replacing App.tsx with Para + Miden starter at ${dest}`);
  copyFileSync(templateAppPath, dest);
}

function ensurePolyfills(targetRoot) {
  const dest = join(targetRoot, "src", "polyfills.ts");
  mkdirSync(join(targetRoot, "src"), { recursive: true });
  copyFileSync(templatePolyfillsPath, dest);

  const mainPath = join(targetRoot, "src", "main.tsx");
  if (existsSync(mainPath)) {
    const main = readFileSync(mainPath, "utf8");
    if (!main.includes('./polyfills') && !main.includes("./polyfills")) {
      writeFileSync(mainPath, `import "./polyfills";\n${main}`);
      logStep(`Injected polyfills import into ${mainPath}`);
    }
  }
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

function ensureNpmRc(targetRoot) {
  const npmrcPath = join(targetRoot, ".npmrc");
  const line = "legacy-peer-deps=true";
  if (existsSync(npmrcPath)) {
    const contents = readFileSync(npmrcPath, "utf8");
    if (contents.includes(line)) {
      logStep("Existing .npmrc already opts into legacy-peer-deps");
      return;
    }
    writeFileSync(npmrcPath, `${contents.trim()}\n${line}\n`);
    logStep("Updated .npmrc to include legacy-peer-deps");
    return;
  }
  writeFileSync(npmrcPath, `${line}\n`);
  logStep("Created .npmrc with legacy-peer-deps=true");
}

function ensureMidenParaDependencies(targetRoot) {
  const pkgPath = join(targetRoot, "package.json");
  if (!existsSync(pkgPath)) {
    logStep("No package.json found after scaffolding; cannot add dependencies");
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.devDependencies = pkg.devDependencies ?? {};
  pkg.resolutions = pkg.resolutions ?? {};

  // Align with examples/react so Para SDK connector peers are satisfied
  Object.assign(pkg.dependencies, {
    "@cosmjs/amino": "^0.37.0",
    "@cosmjs/cosmwasm-stargate": "^0.37.0",
    "@cosmjs/encoding": "^0.37.0",
    "@cosmjs/proto-signing": "^0.37.0",
    "@cosmjs/stargate": "^0.37.0",
    "@cosmjs/tendermint-rpc": "^0.37.0",
    "@getpara/react-sdk": "2.0.0-alpha.73",
    "@keplr-wallet/types": "^0.12.299",
    "@solana-mobile/wallet-adapter-mobile": "^2.2.5",
    "@solana/wallet-adapter-base": "^0.9.27",
    "@solana/wallet-adapter-react": "^0.15.39",
    "@solana/wallet-adapter-walletconnect": "^0.1.21",
    "@solana/web3.js": "^1.98.4",
    "@tanstack/react-query": "^5.90.12",
    "@wagmi/core": "^3.0.0",
    "@demox-labs/miden-sdk": "^0.12.5",
    "cosmjs-types": "^0.11.0",
    graz: "^0.4.2",
    "miden-para": "0.0.9",
    "miden-para-react": "^0.10.0",
    react: "^19.2.0",
    "react-dom": "^19.2.0",
    viem: "^2.41.2",
    "vite-plugin-node-polyfills": "^0.24.0",
    wagmi: "^3.1.0",
  });

  Object.assign(pkg.resolutions, {
    "@getpara/react-sdk": "2.0.0-alpha.73",
    "@getpara/web-sdk": "2.0.0-alpha.73",
  });

  delete pkg.peerDependencies;

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

function runOrExit(command, args, cwd, env, input) {
  const result = spawnSync(command, args, {
    stdio: input ? ["pipe", "inherit", "inherit"] : "inherit",
    input,
    cwd,
    env,
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

function logEnvReminder(dirName) {
  logStep(
    `Remember to use VITE_PARA_API_KEY like this:\n  cd ${dirName}\n  VITE_PARA_API_KEY=... npm run dev`,
  );
}
