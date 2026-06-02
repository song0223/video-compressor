import { describe, expect, it } from "vitest";
import type { VideoMetadata } from "../types/video";
import {
  compressionSavedPercent,
  estimateExportDurationSeconds,
  estimateOutputSizeBytes,
  formatCompressionSummary,
} from "./outputStats";

const fourKSource: VideoMetadata = {
  width: 3840,
  height: 2160,
  durationSeconds: 180,
  codec: "h264",
  sizeBytes: 3 * 1024 * 1024 * 1024,
};

const longFourKSource: VideoMetadata = {
  ...fourKSource,
  durationSeconds: 32 * 60,
};

describe("output stats", () => {
  it("estimates smaller output for lower resolution compression", () => {
    const estimate = estimateOutputSizeBytes(fourKSource, {
      resolution: "720p",
      quality: "balanced",
      format: "mp4",
    });

    expect(estimate).toBeGreaterThan(100 * 1024 * 1024);
    expect(estimate).toBeLessThan(fourKSource.sizeBytes);
  });

  it("estimates high quality above balanced for the same resolution", () => {
    const balanced = estimateOutputSizeBytes(fourKSource, {
      resolution: "1080p",
      quality: "balanced",
      format: "mp4",
    });
    const high = estimateOutputSizeBytes(fourKSource, {
      resolution: "1080p",
      quality: "high",
      format: "mp4",
    });

    expect(high).toBeGreaterThan(balanced);
  });

  it("formats completed compression savings", () => {
    expect(compressionSavedPercent(1024, 256)).toBe(75);
    expect(formatCompressionSummary(3 * 1024 * 1024 * 1024, 768 * 1024 * 1024)).toBe(
      "3.0 GB -> 768 MB，节省 75%",
    );
  });

  it("estimates lower resolution exports faster than higher resolution exports", () => {
    const p480 = estimateExportDurationSeconds(fourKSource, {
      resolution: "480p",
      quality: "balanced",
      format: "mp4",
    });
    const p1080 = estimateExportDurationSeconds(fourKSource, {
      resolution: "1080p",
      quality: "balanced",
      format: "mp4",
    });

    expect(p480).toBeLessThan(p1080);
  });

  it("estimates high quality exports slower than balanced exports", () => {
    const balanced = estimateExportDurationSeconds(longFourKSource, {
      resolution: "720p",
      quality: "balanced",
      format: "mp4",
    });
    const high = estimateExportDurationSeconds(longFourKSource, {
      resolution: "720p",
      quality: "high",
      format: "mp4",
    });

    expect(high).toBeGreaterThan(balanced);
  });

  it("does not overestimate fast 720p balanced exports as near realtime encoding", () => {
    const estimate = estimateExportDurationSeconds(longFourKSource, {
      resolution: "720p",
      quality: "balanced",
      format: "mp4",
    });

    expect(estimate).toBeGreaterThanOrEqual(45);
    expect(estimate).toBeLessThanOrEqual(120);
  });
});
