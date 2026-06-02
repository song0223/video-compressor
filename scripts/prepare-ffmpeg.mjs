import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRootDir = resolve(scriptDir, "..");

export function platformConfig(platform = process.platform) {
  if (platform === "darwin") {
    return {
      key: "macos",
      names: ["ffmpeg", "ffprobe"],
      extraDirs: ["/opt/homebrew/bin", "/opt/homebrew/opt/ffmpeg/bin"],
    };
  }

  if (platform === "win32") {
    return {
      key: "windows",
      names: ["ffmpeg.exe", "ffprobe.exe"],
      extraDirs: [],
    };
  }

  throw new Error(`Unsupported platform for bundled FFmpeg: ${platform}`);
}

export function targetPaths(rootDir = defaultRootDir, platform = process.platform) {
  const config = platformConfig(platform);
  const targetDir = join(rootDir, "src-tauri", "binaries", config.key);
  return config.names.map((name) => ({
    name,
    path: join(targetDir, name),
    targetDir,
  }));
}

function isExecutableFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function pathCandidates(name, extraDirs) {
  const pathDirs = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean);
  return [...extraDirs, ...pathDirs].map((dir) => join(dir, name));
}

function isNativeMacBinary(path) {
  if (process.platform !== "darwin" || process.arch !== "arm64") return true;

  try {
    return execFileSync("file", [path], { encoding: "utf8" }).includes("arm64");
  } catch {
    return false;
  }
}

function findSourceBinary(name, extraDirs) {
  return pathCandidates(name, extraDirs).find((candidate) => {
    return isExecutableFile(candidate) && isNativeMacBinary(candidate);
  });
}

function removeStaleBundledCopies(rootDir, names) {
  const targetRoot = join(rootDir, "src-tauri", "target");
  if (!existsSync(targetRoot)) return;

  const appBundleNames = ["Video Compressor.app", "压缩工具箱.app"];
  for (const name of names) {
    for (const platform of ["macos", "windows"]) {
      for (const appBundleName of appBundleNames) {
        rmSync(join(targetRoot, "release", "bundle", "macos", appBundleName, "Contents", "Resources", "binaries", platform, name), {
          force: true,
        });
      }
    }
  }
}

export function prepareFfmpeg(rootDir = defaultRootDir, platform = process.platform) {
  const config = platformConfig(platform);
  const targets = targetPaths(rootDir, platform);

  if (targets.every((target) => isExecutableFile(target.path))) {
    console.log(`Bundled FFmpeg already prepared in src-tauri/binaries/${config.key}`);
    return targets.map((target) => target.path);
  }

  for (const target of targets) {
    const source = findSourceBinary(target.name, config.extraDirs);
    if (!source) {
      throw new Error(
        `Missing ${target.name}. Install FFmpeg or make sure ${target.name} is on PATH before building.`,
      );
    }

    mkdirSync(target.targetDir, { recursive: true });
    copyFileSync(source, target.path);
    if (platform !== "win32") {
      execFileSync("chmod", ["755", target.path]);
    }
  }

  removeStaleBundledCopies(rootDir, config.names);
  console.log(`Prepared FFmpeg binaries in src-tauri/binaries/${config.key}`);
  return targets.map((target) => target.path);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    for (const path of prepareFfmpeg()) {
      console.log(path);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
