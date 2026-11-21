"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 20;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => ({
  height: 16 + (i % 4) * 6,
  // Deterministic spread so bars don't move in lockstep.
  duration: 150 + ((i * 73) % 200),
  delay: (i * 47) % 300,
}));
const IDLE_SCALE = 0.3;

/**
 * Row of bars. With an `analyser` (mic recording) the bars follow the live input level;
 * otherwise `active` plays a simulated animation, like the reference's speech visualisation.
 */
export default function AudioWaveform({
  active,
  analyser = null,
  color = "#ff6640",
}: {
  active: boolean;
  analyser?: AnalyserNode | null;
  color?: string;
}) {
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (!analyser) return;
    const bars = barRefs.current;
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const draw = () => {
      analyser.getByteFrequencyData(data);
      bars.forEach((bar, i) => {
        if (!bar) return;
        // Mirror around the centre so the loudest (low) bins sit in the middle.
        const bin = Math.abs(i - (BAR_COUNT - 1) / 2) | 0;
        const level = (data[bin] ?? 0) / 255;
        bar.style.transform = `scaleY(${Math.max(IDLE_SCALE, Math.min(1, level * 1.4))})`;
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      bars.forEach((bar) => {
        if (bar) bar.style.transform = "";
      });
    };
  }, [analyser]);

  const simulated = active && !analyser;

  return (
    <div className="my-2.5 flex min-h-[50px] items-center justify-center" aria-hidden>
      <div className="flex items-center justify-center gap-0.5 px-5">
        {BARS.map((bar, i) => (
          <span
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            className={`block w-[3px] rounded-[1.5px] opacity-80 ${
              simulated ? "motion-safe:animate-wave" : "transition-transform duration-200"
            }`}
            style={{
              height: bar.height,
              backgroundColor: color,
              transform: simulated || analyser ? undefined : `scaleY(${IDLE_SCALE})`,
              animationDuration: simulated ? `${bar.duration}ms` : undefined,
              animationDelay: simulated ? `${bar.delay}ms` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
