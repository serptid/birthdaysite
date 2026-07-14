"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  separator?: string;
}

function formatValue(value: number, separator: string) {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("en-US", {
    useGrouping: Boolean(separator),
    maximumFractionDigits: 0,
  }).format(rounded);

  return separator ? formatted.replace(/,/g, separator) : formatted;
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function CountUp({
  to,
  from = 0,
  duration = 2,
  className,
  separator = "",
}: CountUpProps) {
  const [value, setValue] = useState(from);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startedAt = performance.now();
    const durationMs = Math.max(duration, 0) * 1000;

    setValue(from);

    if (durationMs === 0) {
      setValue(to);
      return;
    }

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = easeOutCubic(progress);

      setValue(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [from, to, duration]);

  return <span className={className}>{formatValue(value, separator)}</span>;
}
