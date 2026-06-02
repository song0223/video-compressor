import { describe, expect, it } from "vitest";
import type { ImageMetadata } from "../types/image";
import {
  compressionSavedPercent,
  estimateImageOutputSizeBytes,
  formatImageCompressionSummary,
  isSupportedImage,
} from "./imageStats";
import { getDefaultImagePreset, imageFormatPresets, imageQualityPresets } from "./imagePresets";

const photo: ImageMetadata = {
  width: 4000,
  height: 3000,
  format: "jpeg",
  sizeBytes: 8 * 1024 * 1024,
};

describe("image stats", () => {
  it("detects only supported image files", () => {
    expect(isSupportedImage("/Users/songxiang/Desktop/a.JPG")).toBe(true);
    expect(isSupportedImage("/Users/songxiang/Desktop/a.webp")).toBe(true);
    expect(isSupportedImage("/Users/songxiang/Desktop/a.mp4")).toBe(false);
  });

  it("estimates smaller output for small quality than high quality", () => {
    const small = estimateImageOutputSizeBytes(photo, {
      format: "webp",
      qualityPercent: 40,
    });
    const high = estimateImageOutputSizeBytes(photo, {
      format: "webp",
      qualityPercent: 80,
    });

    expect(small).toBeLessThan(high);
    expect(high).toBeLessThan(photo.sizeBytes);
  });

  it("estimates visible savings for non-extreme website presets", () => {
    const small = estimateImageOutputSizeBytes(photo, {
      format: "webp",
      qualityPercent: 40,
    });
    const balanced = estimateImageOutputSizeBytes(photo, {
      format: "webp",
      qualityPercent: 60,
    });

    expect(small).toBeLessThan(800 * 1024);
    expect(balanced).toBeLessThan(2 * 1024 * 1024);
  });

  it("keeps format and quality labels independent from video presets", () => {
    expect(imageFormatPresets.map((preset) => preset.label)).toEqual([
      "保持原格式",
      "JPG",
      "PNG",
      "WebP",
    ]);
    expect(imageQualityPresets.map((preset) => preset.label)).toEqual(["80%", "60%", "40%", "10%"]);
    expect(imageQualityPresets.map((preset) => preset.percent)).toEqual([80, 60, 40, 10]);
  });

  it("uses original format as the default image preset", () => {
    expect(getDefaultImagePreset()).toEqual({ format: "original", qualityPercent: 60 });
  });

  it("estimates extreme webp output around a few hundred KB for a 2 MB website image", () => {
    const estimate = estimateImageOutputSizeBytes(
      {
        width: 2400,
        height: 1600,
        format: "jpeg",
        sizeBytes: 2 * 1024 * 1024,
      },
      {
        format: "webp",
        qualityPercent: 10,
      },
    );

    expect(estimate).toBeGreaterThanOrEqual(70 * 1024);
    expect(estimate).toBeLessThanOrEqual(110 * 1024);
  });

  it("accounts for extreme resize when estimating a large 3.2 MB image", () => {
    const estimate = estimateImageOutputSizeBytes(
      {
        width: 4000,
        height: 3000,
        format: "jpeg",
        sizeBytes: Math.round(3.2 * 1024 * 1024),
      },
      {
        format: "original",
        qualityPercent: 10,
      },
    );

    expect(estimate).toBeLessThan(120 * 1024);
  });

  it("estimates custom quality percentages between default presets", () => {
    const custom = estimateImageOutputSizeBytes(photo, {
      format: "webp",
      qualityPercent: 37,
    });
    const stronger = estimateImageOutputSizeBytes(photo, {
      format: "webp",
      qualityPercent: 10,
    });

    expect(custom).toBeGreaterThan(stronger);
    expect(custom).toBeLessThan(800 * 1024);
  });

  it("formats completed image compression savings", () => {
    expect(compressionSavedPercent(1024, 256)).toBe(75);
    expect(formatImageCompressionSummary(300 * 1024, 180 * 1024)).toBe(
      "300 KB -> 180 KB，节省 40%",
    );
    expect(formatImageCompressionSummary(8 * 1024 * 1024, 3 * 1024 * 1024)).toBe(
      "8 MB -> 3 MB，节省 63%",
    );
  });
});
