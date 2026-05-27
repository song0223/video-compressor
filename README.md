# Video Compressor

跨平台视频压缩/转码桌面工具。

第一版目标：

- macOS 本地打包生成应用
- Windows 通过 GitHub Actions 自动打包
- 内置 FFmpeg/FFprobe，用户无需额外安装软件
- 支持拖拽导入和手动多选视频
- 支持 480p、720p、1080p、2K、4K、原尺寸等分辨率预设
- 支持小体积、均衡、高清优先等质量预设
- 支持详细导出进度、预计剩余时间、输出大小和打开文件位置

## 本地开发

```bash
npm install
bash scripts/prepare-local-ffmpeg.sh
npm run tauri dev
```

`scripts/prepare-local-ffmpeg.sh` 会把当前机器 PATH 里的 `ffmpeg` 和 `ffprobe` 复制到 Tauri 资源目录。打包后的应用会优先使用内置二进制，开发时如果资源不存在，会回退到系统 PATH。

## 打包

macOS 本地打包：

```bash
bash scripts/prepare-local-ffmpeg.sh
npm run tauri build
```

Windows 安装包通过 GitHub Actions 在 Windows runner 上构建。
