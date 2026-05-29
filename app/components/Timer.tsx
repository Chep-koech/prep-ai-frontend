"use client";

import { useEffect, useState } from "react";

type Props = {
  totalSeconds: number;
  running: boolean;
  onExpire?: () => void;
};

export default function Timer({ totalSeconds, running, onExpire }: Props) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  useEffect(() => {
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      onExpire?.();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [running, timeLeft, onExpire]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const low = timeLeft <= 60 && running;

  return (
    <div
      className={`text-xl font-mono px-4 py-2 rounded-lg border ${
        low
          ? "bg-red-950/50 border-red-700 text-red-300"
          : "bg-gray-900 border-gray-700 text-white"
      }`}
    >
      {m}:{s.toString().padStart(2, "0")}
    </div>
  );
}
