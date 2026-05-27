# Video Compressor Design

## Goal

Build a polished cross-platform desktop video compression tool for macOS and Windows. Users should be able to add one or more videos, choose practical presets like 720p or 2K, export compressed MP4 files, and see reliable progress without installing FFmpeg separately.

## Product Scope

The first version is a batch queue video compressor.

Included:

- Drag and drop multiple videos into the app.
- Click "Add Videos" and manually multi-select video files.
- Show all added files in a queue.
- Do not support adding folders in the first version.
- Let each video use an individual preset.
- Let the user apply one preset to all queued videos.
- Provide resolution presets: 480p, 720p, 1080p, 2K, 4K, and original size.
- Provide quality presets: small size, balanced, and high quality.
- Default output format is MP4 with H.264 video.
- Copy audio by default when compatible; fall back to AAC when needed.
- Show detailed progress: per-file percentage, total percentage, speed, estimated remaining time, output size, status, and completion actions.
- Allow opening the output file or output folder after export.
- Bundle FFmpeg and FFprobe so users do not need extra installs.
- Build macOS locally and build Windows through GitHub Actions.

Not included in the first version:

- Folder import.
- Recursive scanning.
- Advanced FFmpeg command editor.
- Cloud upload.
- Video editing features such as trimming, subtitles, filters, or watermarking.
- macOS App Store or Microsoft Store distribution.

## Recommended Stack

- Desktop shell: Tauri.
- UI: React, TypeScript, Tailwind CSS.
- Native command layer: Rust through Tauri commands.
- Video engine: bundled FFmpeg and FFprobe binaries.
- Packaging:
  - macOS: local Tauri bundle, producing `.app` and `.dmg`.
  - Windows: GitHub Actions on a Windows runner, producing installer artifacts.

This stack keeps the app lighter than Electron while still allowing a modern UI. Rust is responsible for process management, file paths, progress parsing, cancellation, and safe interaction with bundled binaries.

## Interface Design

The first screen is the working tool, not a landing page.

Main areas:

- Header toolbar:
  - App name.
  - Add Videos button.
  - Clear Queue button.
  - Output directory selector.
  - Start All / Pause / Cancel controls.
- Queue list:
  - File name.
  - Source metadata from FFprobe, such as resolution, duration, codec, and size.
  - Selected preset.
  - Per-file progress bar.
  - Status text: waiting, running, paused, completed, failed, canceled.
  - Speed, estimated remaining time, and output size when available.
  - Completion actions: open file, reveal in folder.
- Preset panel:
  - Resolution buttons: 480p, 720p, 1080p, 2K, 4K, original.
  - Quality segmented control: small size, balanced, high quality.
  - Apply to selected / Apply to all.
- Footer progress:
  - Total progress bar.
  - Completed count.
  - Current job summary.

The visual style should be clean and practical: restrained colors, compact spacing, clear progress states, and polished controls. It should feel like a serious utility rather than a marketing page.

## Preset Mapping

Initial preset behavior:

- 480p: scale height to 480, preserve aspect ratio.
- 720p: scale height to 720, preserve aspect ratio.
- 1080p: scale height to 1080, preserve aspect ratio.
- 2K: scale height to 1440, preserve aspect ratio.
- 4K: scale height to 2160, preserve aspect ratio.
- Original: keep original resolution.

Quality behavior:

- Small size: H.264, CRF around 26, faster preset.
- Balanced: H.264, CRF around 22, veryfast or faster preset.
- High quality: H.264, CRF around 18 to 20, slower preset if acceptable.

The exact values can be adjusted after testing real sample videos.

## Data Flow

1. User adds videos by drag and drop or multi-select dialog.
2. Frontend sends file paths to the Rust layer.
3. Rust runs FFprobe to read metadata.
4. Frontend displays queue rows with metadata and default presets.
5. User chooses per-file or global presets.
6. Rust builds a safe FFmpeg command for each queued item.
7. Rust starts FFmpeg and parses progress from stderr or `-progress`.
8. Rust emits progress events to the frontend.
9. Frontend updates per-file and total progress bars.
10. On completion, the app records output path and enables reveal/open actions.

## Error Handling

The app should handle these cases clearly:

- Unsupported file type.
- Missing or unreadable source file.
- FFprobe metadata failure.
- Output path not writable.
- Existing output file name conflict.
- FFmpeg process failure.
- User cancellation.

Errors should appear inside the queue row, with a short readable message and a retry option where reasonable.

## Bundled FFmpeg

The app will ship platform-specific FFmpeg and FFprobe binaries:

- macOS binaries inside the Tauri resources directory.
- Windows binaries inside the Tauri resources directory for the Windows build.

The Rust layer resolves the correct binary path at runtime. The UI never asks users to install FFmpeg.

## Build and Release

Local macOS workflow:

- Install Node, Rust, and Tauri prerequisites.
- Run a local build command to produce a macOS bundle.

Windows workflow:

- Push source to GitHub.
- GitHub Actions runs on `windows-latest`.
- The workflow installs dependencies, bundles Windows FFmpeg assets, and runs Tauri build.
- Installer artifacts are uploaded from the workflow.

## Testing

Core verification should include:

- Add one video manually.
- Add multiple videos manually.
- Drag multiple videos.
- Export 720p MP4.
- Export 2K MP4.
- Cancel a running job.
- Handle a bad or unsupported file.
- Verify progress reaches 100 percent and output file exists.
- Verify bundled FFmpeg is used instead of relying on a system install.
- Verify macOS bundle runs on this Mac.
- Verify Windows artifact is produced by GitHub Actions.

## Open Decisions

- Final app display name.
- Whether to sign/notarize macOS builds in the first version.
- Whether Windows should produce `.exe`, `.msi`, or both.
- Whether to add hardware acceleration later.

