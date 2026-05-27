import { describe, expect, it } from "vitest";
import { getDefaultPreset, qualityPresets, resolutionPresets } from "./presets";

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
