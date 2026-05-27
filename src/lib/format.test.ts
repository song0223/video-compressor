import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration, formatPercent } from "./format";

describe("format helpers", () => {
  it("formats file sizes", () => {
    expect(formatBytes(633 * 1024 * 1024)).toBe("633 MB");
  });

  it("formats duration", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats progress", () => {
    expect(formatPercent(0.683)).toBe("68%");
  });
});
