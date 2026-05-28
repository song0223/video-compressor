import { getCurrentWindow } from "@tauri-apps/api/window";

export interface CompletionNotifier {
  playCompletionSound: () => void;
  setBadgeCount: (count?: number) => Promise<void>;
}

export const completionToneSettings = {
  durationSeconds: 0.34,
  peakGain: 0.18,
};

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function playCompletionTone() {
  if (typeof window === "undefined") return;

  try {
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(completionToneSettings.peakGain, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + completionToneSettings.durationSeconds,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + completionToneSettings.durationSeconds + 0.02);
    oscillator.addEventListener(
      "ended",
      () => {
        void context.close().catch(() => undefined);
      },
      { once: true },
    );
  } catch {
    // Notification sounds are helpful, but compression must never depend on audio support.
  }
}

export const appCompletionNotifier: CompletionNotifier = {
  playCompletionSound: playCompletionTone,
  async setBadgeCount(count?: number) {
    try {
      await getCurrentWindow().setBadgeCount(count);
    } catch {
      // Some platforms or dev-browser contexts do not expose app badges.
    }
  },
};

export async function notifyExportCompleted(
  completedCount: number,
  notifier: CompletionNotifier,
) {
  if (completedCount <= 0) return;

  notifier.playCompletionSound();
  await notifier.setBadgeCount(completedCount);
}

export async function clearExportCompletionBadge(
  notifier: Pick<CompletionNotifier, "setBadgeCount">,
) {
  await notifier.setBadgeCount(undefined);
}

export async function setExportCompletionBadge(
  count: number,
  notifier: Pick<CompletionNotifier, "setBadgeCount">,
) {
  await notifier.setBadgeCount(count > 0 ? count : undefined);
}
