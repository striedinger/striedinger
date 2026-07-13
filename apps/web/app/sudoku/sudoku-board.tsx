import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, type KeyboardEventHandler } from "react";

import { hasConflict } from "./sudoku";

interface SudokuBoardProps {
  active: boolean;
  cellEmptyLabel: string;
  cellValueLabel: string;
  fixedValues: readonly number[];
  label: string;
  onSelect: (cellIndex: number) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  selectedCell: number;
  values: readonly number[];
}

export function SudokuBoard({
  active,
  cellEmptyLabel,
  cellValueLabel,
  fixedValues,
  label,
  onSelect,
  onKeyDown,
  selectedCell,
  values,
}: SudokuBoardProps) {
  const cellElements = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedRow = Math.floor(selectedCell / 9);
  const selectedColumn = selectedCell % 9;

  useEffect(
    function focusSelectedCell() {
      if (active) cellElements.current[selectedCell]?.focus();
    },
    [active, selectedCell],
  );

  return (
    <div
      role="grid"
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
      className="grid aspect-square w-full grid-cols-9 overflow-hidden rounded-lg border-2 border-foreground/70 bg-border shadow-sm"
    >
      {values.map(function renderCell(value, cellIndex) {
        const row = Math.floor(cellIndex / 9);
        const column = cellIndex % 9;
        const isFixed = fixedValues[cellIndex] !== 0;
        const isSelected = selectedCell === cellIndex;
        const isRelated = row === selectedRow || column === selectedColumn;
        const isConflicting = !isFixed && hasConflict(values, cellIndex);
        const cellLabel = (value ? cellValueLabel : cellEmptyLabel)
          .replace("{row}", String(row + 1))
          .replace("{column}", String(column + 1))
          .replace("{value}", String(value));

        return (
          <button
            key={cellIndex}
            ref={function storeCellElement(cellElement) {
              cellElements.current[cellIndex] = cellElement;
            }}
            type="button"
            role="gridcell"
            tabIndex={active && isSelected ? 0 : -1}
            aria-label={cellLabel}
            aria-selected={isSelected}
            aria-invalid={isConflicting || undefined}
            onClick={function selectCell() {
              onSelect(cellIndex);
            }}
            className={cn(
              "flex min-w-0 touch-manipulation items-center justify-center border-r border-b border-border bg-background transition-[background-color,transform] outline-none hover:bg-accent/70 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.94] motion-reduce:transition-none",
              column === 2 || column === 5 ? "border-r-2 border-r-foreground/60" : undefined,
              row === 2 || row === 5 ? "border-b-2 border-b-foreground/60" : undefined,
              isRelated && !isSelected ? "bg-muted/70" : undefined,
              isSelected ? "bg-accent ring-2 ring-ring ring-inset" : undefined,
              isConflicting ? "bg-destructive/10 text-destructive" : undefined,
            )}
          >
            <Text
              as="span"
              family="rounded"
              size="lg"
              weight={isFixed ? "bold" : "medium"}
              className={cn(
                "leading-none tabular-nums sm:text-xl",
                !isFixed ? "text-primary" : undefined,
              )}
            >
              {value || ""}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
