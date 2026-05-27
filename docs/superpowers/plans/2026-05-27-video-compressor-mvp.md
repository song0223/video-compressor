# Video Compressor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable macOS/Windows video compression desktop app with batch queue, presets, bundled FFmpeg, detailed progress, and packaging automation.

**Architecture:** Use Tauri as the desktop shell. React owns queue UI and user interactions; Rust owns file metadata, FFmpeg command construction, process execution, progress parsing, cancellation, and binary path resolution.

**Tech Stack:** Tauri, React, TypeScript, Tailwind CSS, Rust, FFmpeg/FFprobe, Vitest, Cargo tests, GitHub Actions.

---

## File Structure

- `package.json`: frontend scripts and dependencies.
- `vite.config.ts`: Vite React app configuration.
- `src/main.tsx`: frontend entrypoint.
- `src/App.tsx`: top-level shell wiring.
- `src/types/video.ts`: queue item, preset, progress, and metadata types.
- `src/lib/presets.ts`: preset definitions and labels.
- `src/lib/format.ts`: size, time, and progress formatting helpers.
- `src/lib/presets.test.ts`: preset behavior tests.
- `src/lib/format.test.ts`: formatting tests.
- `src/components/Toolbar.tsx`: add, clear, output directory, start, pause, cancel controls.
- `src/components/DropZone.tsx`: drag/drop import surface.
- `src/components/PresetPanel.tsx`: resolution and quality controls.
- `src/components/QueueTable.tsx`: queue rows, progress bars, status, completion actions.
- `src/components/FooterProgress.tsx`: total progress summary.
- `src/styles.css`: Tailwind entry and app styling.
- `src-tauri/Cargo.toml`: Rust dependencies.
- `src-tauri/tauri.conf.json`: app metadata, resources, bundle settings.
- `src-tauri/src/main.rs`: Tauri bootstrap and command registration.
- `src-tauri/src/models.rs`: Rust models shared across commands.
- `src-tauri/src/presets.rs`: Rust preset-to-FFmpeg mapping.
- `src-tauri/src/ffmpeg.rs`: FFmpeg/FFprobe path resolution, metadata, command builder, progress parser.
- `src-tauri/src/jobs.rs`: export queue, process lifecycle, cancellation, event emission.
- `src-tauri/binaries/README.md`: expected FFmpeg binary layout.
- `.github/workflows/build.yml`: macOS and Windows build workflow.

## Task 1: Scaffold Tauri React Project

**Files:**
- Create/modify all base project files listed above.

- [ ] **Step 1: Generate the Tauri React TypeScript scaffold**

Run:

```bash
cd /Users/songxiang/work/mac/video-compressor
npm create tauri-app@latest . -- --template react-ts --manager npm
```

Expected: project files are created without replacing the existing design docs.

- [ ] **Step 2: Install UI and test dependencies**

Run:

```bash
cd /Users/songxiang/work/mac/video-compressor
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Expected: `package-lock.json`, Tailwind config, and PostCSS config exist.

- [ ] **Step 3: Verify baseline build**

Run:

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: frontend builds and Rust tests pass.

- [ ] **Step 4: Commit scaffold**

Run:

```bash
git add .
git commit -m "chore: scaffold tauri react app"
```

## Task 2: Add Preset and Formatting Units

**Files:**
- Create: `src/types/video.ts`
- Create: `src/lib/presets.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/presets.test.ts`
- Create: `src/lib/format.test.ts`

- [ ] **Step 1: Add failing preset tests**

`src/lib/presets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDefaultPreset, resolutionPresets, qualityPresets } from "./presets";

describe("presets", () => {
  it("includes the required resolution options", () => {
    expect(resolutionPresets.map((preset) => preset.id)).toEqual([
      "480p",
      "720p",
      "1080p",
      "2k",
      "4k",
      "original",
    ]);
  });

  it("defaults to 720p balanced", () => {
    expect(getDefaultPreset()).toEqual({ resolution: "720p", quality: "balanced" });
  });

  it("includes three quality levels", () => {
    expect(qualityPresets.map((preset) => preset.id)).toEqual([
      "small",
      "balanced",
      "high",
    ]);
  });
});
```

- [ ] **Step 2: Add failing format tests**

`src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration, formatPercent } from "./format";

describe("format helpers", () => {
  it("formats file sizes", () => {
    expect(formatBytes(633 * 1024 * 1024)).toBe("633 MB");
  });

  it("formats duration", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats progress", () => {
    expect(formatPercent(0.683)).toBe("68%");
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- --run src/lib/presets.test.ts src/lib/format.test.ts
```

Expected: fail because modules do not exist yet.

- [ ] **Step 4: Implement the units**

Create `src/types/video.ts`:

```ts
export type ResolutionPresetId = "480p" | "720p" | "1080p" | "2k" | "4k" | "original";
export type QualityPresetId = "small" | "balanced" | "high";

export interface VideoPreset {
  resolution: ResolutionPresetId;
  quality: QualityPresetId;
}

export interface VideoMetadata {
  width: number;
  height: number;
  durationSeconds: number;
  codec: string;
  sizeBytes: number;
}

export type QueueStatus = "waiting" | "running" | "paused" | "completed" | "failed" | "canceled";

export interface QueueProgress {
  percent: number;
  speedText?: string;
  etaSeconds?: number;
  outputSizeBytes?: number;
}

export interface QueueItem {
  id: string;
  sourcePath: string;
  fileName: string;
  metadata?: VideoMetadata;
  preset: VideoPreset;
  status: QueueStatus;
  progress: QueueProgress;
  outputPath?: string;
  errorMessage?: string;
}
```

Create `src/lib/presets.ts`:

```ts
import type { QualityPresetId, ResolutionPresetId, VideoPreset } from "../types/video";

export const resolutionPresets: Array<{ id: ResolutionPresetId; label: string; height?: number }> = [
  { id: "480p", label: "480p", height: 480 },
  { id: "720p", label: "720p", height: 720 },
  { id: "1080p", label: "1080p", height: 1080 },
  { id: "2k", label: "2K", height: 1440 },
  { id: "4k", label: "4K", height: 2160 },
  { id: "original", label: "原尺寸" },
];

export const qualityPresets: Array<{ id: QualityPresetId; label: string }> = [
  { id: "small", label: "小体积" },
  { id: "balanced", label: "均衡" },
  { id: "high", label: "高清优先" },
];

export function getDefaultPreset(): VideoPreset {
  return { resolution: "720p", quality: "balanced" };
}
```

Create `src/lib/format.ts`:

```ts
export function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return "-";
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, Math.floor(seconds % 60));
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- --run src/lib/presets.test.ts src/lib/format.test.ts
git add src package.json package-lock.json
git commit -m "feat: add video presets and format helpers"
```

Expected: tests pass and commit succeeds.

## Task 3: Build Static Queue UI

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/DropZone.tsx`
- Create: `src/components/PresetPanel.tsx`
- Create: `src/components/QueueTable.tsx`
- Create: `src/components/FooterProgress.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement React components with mock queue state**

Use local state in `App.tsx` with sample items first. Render the exact layout from the approved design: toolbar, queue table, preset panel, and footer progress.

- [ ] **Step 2: Run visual check**

Run:

```bash
npm run dev
```

Open the local app URL and confirm the first screen is the working tool, not a landing page.

- [ ] **Step 3: Build and commit**

Run:

```bash
npm run build
git add src
git commit -m "feat: build compressor queue interface"
```

Expected: frontend build passes and UI commit succeeds.

## Task 4: Add Rust Preset Mapping and FFmpeg Command Builder

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/presets.rs`
- Create: `src-tauri/src/ffmpeg.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Write Rust tests for scale and quality mapping**

Add tests that verify 720p uses `scale=-2:720`, 2K uses `scale=-2:1440`, original size omits scale, small size uses higher CRF than balanced, and high quality uses lower CRF than balanced.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: fail before the new modules are implemented.

- [ ] **Step 3: Implement command builder**

Implement a function that accepts source path, output path, resolution preset, and quality preset, then returns an argv vector for FFmpeg. It must pass paths as separate arguments and never shell-concatenate user paths.

- [ ] **Step 4: Run tests and commit**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
git add src-tauri
git commit -m "feat: add ffmpeg command builder"
```

Expected: Rust tests pass.

## Task 5: Add FFprobe Metadata and Progress Parser

**Files:**
- Modify: `src-tauri/src/ffmpeg.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Write progress parser tests**

Test `out_time_ms=5000000` with a 10 second duration returns 50 percent. Test `total_size=1048576` returns output size. Test malformed progress lines are ignored without panic.

- [ ] **Step 2: Implement FFprobe metadata command**

Expose a Tauri command that accepts a video path, runs bundled or local FFprobe, and returns width, height, duration, codec, and file size.

- [ ] **Step 3: Implement progress parsing**

Use FFmpeg `-progress pipe:1 -nostats` output. Convert `out_time_ms` against known duration into a normalized `0..1` percent.

- [ ] **Step 4: Run tests and commit**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
git add src-tauri
git commit -m "feat: read metadata and parse ffmpeg progress"
```

Expected: Rust tests pass.

## Task 6: Wire Frontend to Tauri Commands

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/DropZone.tsx`
- Modify: `src/components/QueueTable.tsx`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add manual multi-select**

Use Tauri dialog APIs to select multiple video files. Add each selected file to the queue with default preset and load metadata through the Rust command.

- [ ] **Step 2: Add drag and drop**

Handle dropped file paths and add supported video files to the queue. Do not add folder support.

- [ ] **Step 3: Add output directory selection**

Use Tauri dialog APIs to choose an output directory. Store it in frontend state.

- [ ] **Step 4: Build and commit**

Run:

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git add src src-tauri
git commit -m "feat: connect queue imports to native metadata"
```

Expected: build and Rust tests pass.

## Task 7: Implement Export Jobs, Events, and Cancellation

**Files:**
- Create: `src-tauri/src/jobs.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`
- Modify: `src/components/QueueTable.tsx`
- Modify: `src/components/FooterProgress.tsx`

- [ ] **Step 1: Add job lifecycle tests**

Test output filename generation appends preset labels and avoids overwriting source files. Test cancellation marks a job canceled.

- [ ] **Step 2: Implement single-job export**

Run FFmpeg for one queued file, emit progress events, and return output path on completion.

- [ ] **Step 3: Implement sequential batch export**

Process queued files one at a time. Update per-file and total progress. Keep the UI responsive.

- [ ] **Step 4: Implement cancel current**

Store the child process handle and kill it when the user cancels current export.

- [ ] **Step 5: Build and commit**

Run:

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git add src src-tauri
git commit -m "feat: run exports with progress and cancellation"
```

Expected: app builds, Rust tests pass, and a local sample export reaches 100 percent.

## Task 8: Bundle FFmpeg and Add Packaging Automation

**Files:**
- Create: `src-tauri/binaries/README.md`
- Modify: `src-tauri/tauri.conf.json`
- Create: `.github/workflows/build.yml`
- Modify: `README.md`

- [ ] **Step 1: Document binary layout**

Use this layout:

```text
src-tauri/binaries/
  macos/ffmpeg
  macos/ffprobe
  windows/ffmpeg.exe
  windows/ffprobe.exe
```

- [ ] **Step 2: Configure Tauri resources**

Add the binaries directory as a Tauri resource so the runtime can resolve platform-specific FFmpeg and FFprobe.

- [ ] **Step 3: Add GitHub Actions workflow**

Create a workflow with macOS and Windows jobs. The Windows job runs on `windows-latest`, installs Node and Rust, runs `npm ci`, runs tests, and runs `npm run tauri build`.

- [ ] **Step 4: Run local verification and commit**

Run:

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git add src-tauri .github README.md
git commit -m "ci: add cross-platform packaging workflow"
```

Expected: local build and tests pass.

## Task 9: Final Verification

**Files:**
- Modify as needed from verification findings.

- [ ] **Step 1: Run full local checks**

Run:

```bash
npm test -- --run
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Expected: all tests pass and macOS bundle is produced.

- [ ] **Step 2: Smoke test with a local video**

Add `/Users/songxiang/Downloads/Sicily_Slow_tv_4k.mp4`, export 720p balanced, confirm output exists and FFprobe reports height 720.

- [ ] **Step 3: Push and check GitHub Actions**

Run:

```bash
git push
```

Expected: GitHub receives all commits and the build workflow starts.

## Self-Review

- Spec coverage: batch queue, manual multi-select, drag/drop, no folder import, presets, detailed progress, bundled FFmpeg, macOS local build, and Windows GitHub Actions are covered.
- Placeholder scan: no unfinished markers remain.
- Type consistency: frontend preset IDs match the planned Rust preset mapping.
