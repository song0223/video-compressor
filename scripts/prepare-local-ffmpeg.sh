#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="$root_dir/src-tauri/binaries/macos"

mkdir -p "$target_dir"

ffmpeg_path="$(command -v ffmpeg || true)"
ffprobe_path="$(command -v ffprobe || true)"

if [[ -z "$ffmpeg_path" || -z "$ffprobe_path" ]]; then
  echo "ffmpeg and ffprobe must be available in PATH to prepare local binaries." >&2
  exit 1
fi

cp "$ffmpeg_path" "$target_dir/ffmpeg"
cp "$ffprobe_path" "$target_dir/ffprobe"
chmod +x "$target_dir/ffmpeg" "$target_dir/ffprobe"

echo "Prepared FFmpeg binaries in $target_dir"

