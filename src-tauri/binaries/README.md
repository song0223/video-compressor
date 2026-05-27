# FFmpeg Binary Layout

The app expects platform binaries in this layout:

```text
src-tauri/binaries/
  macos/ffmpeg
  macos/ffprobe
  windows/ffmpeg.exe
  windows/ffprobe.exe
```

These binaries are bundled as Tauri resources. They are intentionally not committed by default because they are large and platform-specific.

