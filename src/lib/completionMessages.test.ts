import { describe, expect, it } from "vitest";
import {
  addCompletionMessage,
  completionBadgeCount,
  dismissCompletionMessage,
} from "./completionMessages";

describe("completion messages", () => {
  it("counts one visible completion message as one app badge notification", () => {
    const messages = addCompletionMessage([], "完成 A.mp4");

    expect(completionBadgeCount(messages)).toBe(1);
  });

  it("reduces the app badge count when a completion message is dismissed", () => {
    const first = addCompletionMessage([], "完成 A.mp4");
    const second = addCompletionMessage(first, "完成 B.mp4");

    const remaining = dismissCompletionMessage(second, second[0].id);

    expect(remaining).toHaveLength(1);
    expect(completionBadgeCount(remaining)).toBe(1);
    expect(remaining[0].text).toBe("完成 B.mp4");
  });
});
