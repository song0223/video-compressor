import { describe, expect, it, vi } from "vitest";
import {
  clearExportCompletionBadge,
  completionToneSettings,
  notifyExportCompleted,
} from "./completionNotifications";

describe("completion notifications", () => {
  it("plays a tone and updates the app badge with the completed count", async () => {
    const notifier = {
      playCompletionSound: vi.fn(),
      setBadgeCount: vi.fn().mockResolvedValue(undefined),
    };

    await notifyExportCompleted(2, notifier);

    expect(notifier.playCompletionSound).toHaveBeenCalledTimes(1);
    expect(notifier.setBadgeCount).toHaveBeenCalledWith(2);
  });

  it("does not notify when the completed count is zero", async () => {
    const notifier = {
      playCompletionSound: vi.fn(),
      setBadgeCount: vi.fn().mockResolvedValue(undefined),
    };

    await notifyExportCompleted(0, notifier);

    expect(notifier.playCompletionSound).not.toHaveBeenCalled();
    expect(notifier.setBadgeCount).not.toHaveBeenCalled();
  });

  it("clears the app badge", async () => {
    const notifier = {
      setBadgeCount: vi.fn().mockResolvedValue(undefined),
    };

    await clearExportCompletionBadge(notifier);

    expect(notifier.setBadgeCount).toHaveBeenCalledWith(undefined);
  });

  it("uses a more noticeable completion tone", () => {
    expect(completionToneSettings.peakGain).toBeGreaterThanOrEqual(0.14);
    expect(completionToneSettings.durationSeconds).toBeGreaterThanOrEqual(0.28);
  });
});
