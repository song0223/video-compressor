#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="$root_dir/src-tauri/binaries/macos"

mkdir -p "$target_dir"

find_native_binary() {
  local name="$1"
  local candidates=(
    "/opt/homebrew/bin/$name"
    "/opt/homebrew/opt/ffmpeg/bin/$name"
    "$(command -v "$name" || true)"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      if file "$candidate" | grep -q 'arm64'; then
        echo "$candidate"
        return 0
      fi
    fi
  done

  return 1
}

ffmpeg_path="$(find_native_binary ffmpeg || true)"
ffprobe_path="$(find_native_binary ffprobe || true)"

if [[ -z "$ffmpeg_path" || -z "$ffprobe_path" ]]; then
  echo "arm64 ffmpeg and ffprobe are required for Apple Silicon builds." >&2
  echo "Install them with: /opt/homebrew/bin/brew install ffmpeg" >&2
  exit 1
fi

rm -f "$target_dir/ffmpeg" "$target_dir/ffprobe"
cp "$ffmpeg_path" "$target_dir/ffmpeg"
cp "$ffprobe_path" "$target_dir/ffprobe"
chmod 755 "$target_dir/ffmpeg" "$target_dir/ffprobe"

if [[ -d "$root_dir/src-tauri/target" ]]; then
  find "$root_dir/src-tauri/target" \
    \( -path '*/binaries/macos/ffmpeg' -o -path '*/binaries/macos/ffprobe' \) \
    -type f -delete
fi

echo "Prepared FFmpeg binaries in $target_dir"
file "$target_dir/ffmpeg" "$target_dir/ffprobe"
