"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import { formatElapsedTime } from "./sudoku";

interface SudokuTimerProps {
  completedSeconds?: number;
  startedAt?: number;
}

export function SudokuTimer({ completedSeconds, startedAt }: SudokuTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(
    function updateTimer() {
      if (completedSeconds !== undefined || startedAt === undefined) {
        return;
      }
      const timerStartedAt = startedAt;

      function calculateElapsedTime() {
        setElapsedSeconds(Math.floor((Date.now() - timerStartedAt) / 1_000));
      }

      calculateElapsedTime();
      const intervalId = window.setInterval(calculateElapsedTime, 1_000);

      return function stopTimer() {
        window.clearInterval(intervalId);
      };
    },
    [completedSeconds, startedAt],
  );

  return (
    <Text size="xl" weight="semibold" family="rounded" className="tabular-nums" aria-live="off">
      {formatElapsedTime(completedSeconds ?? (startedAt === undefined ? 0 : elapsedSeconds))}
    </Text>
  );
}
