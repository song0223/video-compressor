# 压缩工具箱

压缩工具箱是一个基于 Tauri、React 和 Rust 的跨平台桌面小工具集合。支持视频、图片和音频压缩/转码，内置 FFmpeg/FFprobe，普通用户下载安装包后不需要再额外安装命令行工具。

当前版本：`0.4.0`

## 下载

最新安装包可以在 GitHub Releases 下载：

[压缩工具箱 0.4.0](https://github.com/song0223/video-compressor/releases/tag/v0.4.0)

- macOS Apple Silicon：`compression-toolbox_0.4.0_aarch64.dmg`
- Windows x64：`compression-toolbox_0.4.0_x64-setup.exe`

> macOS 版本目前面向 Apple Silicon 构建。Windows 版本通过 GitHub Actions 自动构建。

## 功能

### 视频压缩

- 支持拖拽导入视频，也支持手动多选视频。
- 支持多种输出格式：MP4、MOV、MKV、WebM。
- 支持更多视频格式：mp4、mov、mkv、avi、webm、m4v、flv、wmv、ts、mpeg、mpg、3gp、mts。
- 默认输出到原视频所在目录，也可以手动选择输出目录。
- 支持 `480p`、`720p`、`1080p`、`2K`、`4K`、原尺寸等分辨率预设。
- 支持小体积、均衡、高清优先等质量预设。
- 支持自定义输出文件名。
- 导出时显示进度条、预计剩余时间、当前输出大小和预计输出大小。
- 支持暂停/恢复导出任务。
- 导出完成后显示完成消息、应用角标数量和提示音。
- 支持从列表中删除单个任务、重试失败任务、清空列表、全部导出。
- 自动记住上次使用的预设和输出目录。

### 图片压缩

- 支持拖拽导入图片，也支持手动多选图片。
- 支持原格式输出，也支持压缩到 JPEG/PNG/WebP。
- 支持 `80%`、`60%`、`40%`、`10%` 默认压缩档位。
- 支持 `1%` 到 `99%` 自定义压缩百分比。
- 支持自定义输出文件名。
- 显示原始大小、预计大小和导出后的实际大小。
- 支持压缩前后对比预览（滑块式）。
- 支持取消导出、重试失败任务。
- 导出完成后显示完成消息和提示音。
- 自动记住上次使用的预设和输出目录。

### 音频压缩

- 支持拖拽导入音频，也支持手动多选音频。
- 支持多种输出格式：MP3、AAC、FLAC、WAV、OGG。
- 支持多种比特率：128kbps、192kbps、256kbps、320kbps。
- 支持多种采样率：22050Hz、44100Hz、48000Hz。
- 支持音量标准化（loudnorm）。
- 支持可视化音频裁剪（拖拽选择区域）。
- 支持播放预览选中区域。
- 支持自定义输出文件名。
- 支持取消导出、重试失败任务。
- 导出完成后显示完成消息和提示音。
- 自动记住上次使用的预设和输出目录。

## 技术栈

- Tauri 2
- React
- TypeScript
- Rust
- FFmpeg/FFprobe
- GitHub Actions

## 本地开发

安装依赖：

```bash
npm install
```

准备本地 FFmpeg/FFprobe：

```bash
bash scripts/prepare-local-ffmpeg.sh
```

启动开发环境：

```bash
npm run tauri dev
```

`scripts/prepare-local-ffmpeg.sh` 会把当前机器 `PATH` 里的 `ffmpeg` 和 `ffprobe` 复制到 Tauri 资源目录。打包后的应用会优先使用内置二进制，开发时如果资源不存在，会回退到系统 `PATH`。

## 测试

前端测试：

```bash
npm test -- --run
```

Rust 测试：

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

前端构建：

```bash
npm run build
```

## 打包

macOS 本地打包：

```bash
bash scripts/prepare-local-ffmpeg.sh
npm run tauri build
```

Windows 安装包通过 GitHub Actions 在 Windows runner 上构建：

```bash
npm run tauri -- build --bundles nsis
```

Windows 只生成 NSIS `.exe` 安装器，不再生成 MSI，避免 WiX 打包链路带来的不稳定。

## 发布

推送 `v*` tag 会触发完整发布流程：

1. 构建 macOS DMG。
2. 构建 Windows NSIS 安装包。
3. 上传 Actions artifacts。
4. 自动创建或更新对应 GitHub Release。
5. 将文件名规范化为 `compression-toolbox_<version>_...`。

示例：

```bash
git tag v0.4.0
git push origin v0.4.0
```

普通 `main` 分支推送只做构建验证和 artifact 上传，不会更新 Release。
