import { describe, expect, it } from "vitest";
import { directoryFromPath, fileNameFromPath } from "./filePaths";

describe("file path helpers", () => {
  it("gets the containing directory from a macOS path", () => {
    expect(directoryFromPath("/Users/songxiang/Downloads/movie.mp4")).toBe(
      "/Users/songxiang/Downloads",
    );
  });

  it("gets the containing directory from a Windows path", () => {
    expect(directoryFromPath("C:\\Users\\songxiang\\Videos\\movie.mp4")).toBe(
      "C:\\Users\\songxiang\\Videos",
    );
  });

  it("gets the file name from either platform separator", () => {
    expect(fileNameFromPath("C:\\Users\\songxiang\\Videos\\movie.mp4")).toBe("movie.mp4");
  });
});
