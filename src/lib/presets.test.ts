import { describe, expect, it } from "vitest";
import { getDefaultPreset, qualityPresets, resolutionPresets, videoFormatPresets } from "./presets";

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

  it("defaults to 720p balanced mp4", () => {
    expect(getDefaultPreset()).toEqual({ resolution: "720p", quality: "balanced", format: "mp4" });
  });

  it("includes three quality levels", () => {
    expect(qualityPresets.map((preset) => preset.id)).toEqual([
      "small",
      "balanced",
      "high",
    ]);
  });

  it("includes four format options", () => {
    expect(videoFormatPresets.map((preset) => preset.id)).toEqual([
      "mp4",
      "mov",
      "mkv",
      "webm",
    ]);
  });
});
