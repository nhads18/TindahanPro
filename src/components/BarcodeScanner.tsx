import { useEffect, useRef, useState } from "react";
import { IconBarcode, IconCamera } from "./Icons";

/**
 * BarcodeScanner
 * - If the browser exposes `window.BarcodeDetector`, requests the camera and
 *   runs a detect loop against the video frames.
 * - Always attaches a keyboard-wedge listener: USB/Bluetooth barcode scanners
 *   behave like a very fast typist that ends with Enter. We buffer keystrokes
 *   and flush on Enter, but reset the buffer whenever the gap between two
 *   keystrokes is too slow to be a scanner (i.e. a human typing).
 */

// Minimal ambient typing for the still-experimental BarcodeDetector API.
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

const WEDGE_MAX_GAP_MS = 80; // max ms between keystrokes to still count as scanner input
const WEDGE_MIN_LENGTH = 3; // ignore accidental single/double keypresses + Enter

export default function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "active" | "unsupported" | "denied">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);

  const bufferRef = useRef("");
  const lastKeyTsRef = useRef(0);

  const fire = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    // debounce duplicate scans (camera loop can re-detect the same frame repeatedly)
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === trimmed && now - last.ts < 1200) return;
    lastScanRef.current = { code: trimmed, ts: now };
    onScan(trimmed);
  };

  /* ---------- keyboard-wedge listener (always on) ---------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const gap = now - lastKeyTsRef.current;
      lastKeyTsRef.current = now;

      // a gap this large means the previous keystroke (if any) was a human
      // typing, not a scanner wedge firing keys in rapid succession — start over.
      if (gap > WEDGE_MAX_GAP_MS) bufferRef.current = "";

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= WEDGE_MIN_LENGTH) fire(code);
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- camera detect loop (feature-detected) ---------- */
  useEffect(() => {
    if (!window.BarcodeDetector) {
      setCameraState("unsupported");
      return;
    }

    let cancelled = false;
    setCameraState("starting");

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("active");

        const detector = new window.BarcodeDetector!();
        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) fire(results[0].rawValue);
          } catch {
            // transient decode errors are expected between frames; ignore
          }
          rafRef.current = requestAnimationFrame(() => void loop());
        };
        rafRef.current = requestAnimationFrame(() => void loop());
      } catch {
        if (!cancelled) setCameraState("denied");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rise rounded-lg border border-dashed border-line bg-paper/70 p-3">
      {cameraState === "active" && (
        <video ref={videoRef} muted playsInline className="mb-2 w-full rounded-md border border-line" />
      )}
      <div className="flex items-start gap-2 text-[11px] text-ink-soft">
        {cameraState === "active" ? (
          <IconCamera className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine" />
        ) : (
          <IconBarcode className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <p>
          {cameraState === "starting" && "Starting camera…"}
          {cameraState === "active" && "Point the camera at a barcode."}
          {cameraState === "unsupported" && "Camera scan isn't supported on this browser — use a USB/Bluetooth barcode scanner (it types the code automatically)."}
          {cameraState === "denied" && "Camera access wasn't granted — you can still scan with a USB/Bluetooth barcode scanner."}
          {cameraState === "idle" && "Waiting for camera…"}
        </p>
      </div>
    </div>
  );
}
