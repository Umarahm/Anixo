import { useRef, useEffect } from "react";

/**
 * usePlayerEvents
 * Handles two sets of global event listeners for the video player:
 * 1. Keyboard shortcuts — J (skip back) / L (skip forward)
 * 2. iframe postMessage events — video ended → autoNext
 */
export function usePlayerEvents({ goNextEpisode, autoNext, globalSettings }) {
  // Keep autoNext in a ref so the message handler doesn't need it as a dep
  const autoNextRef = useRef(autoNext);
  useEffect(() => {
    autoNextRef.current = autoNext;
  }, [autoNext]);

  // ── Keyboard shortcuts: J / L skip ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const skipVal = globalSettings?.skipSeconds || 10;

      if (e.key.toLowerCase() === "l") {
        window.postMessage({ event: "skip", amount: skipVal }, "*");
      } else if (e.key.toLowerCase() === "j") {
        window.postMessage({ event: "skip", amount: -skipVal }, "*");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalSettings]);

  // ── Megaplay / iframe player message handler ──
  useEffect(() => {
    const handleMessage = (event) => {
      let data = event.data;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          // Handle raw string events like "ended" or "complete"
          if (
            data === "ended" ||
            data === "video_ended" ||
            data === "complete"
          ) {
            if (autoNextRef.current) goNextEpisode();
          }
          return;
        }
      }

      if (!data) return;

      // Detect video completion from various player event formats
      const isComplete =
        data.event === "complete" ||
        data.event === "onComplete" ||
        data.event === "ended" ||
        data.event === "finish" ||
        data.type === "complete" ||
        data.type === "ended" ||
        data.status === "completed" ||
        data.status === "finished" ||
        (data.event === "state" && data.data === "completed") ||
        data.message === "ended";

      if (isComplete && autoNextRef.current) {
        console.info("[Player] Video ended, moving to next episode...");
        goNextEpisode();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [goNextEpisode]);
}
