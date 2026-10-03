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
  const selectedBox = Math.floor(selectedRow / 3) * 3 + Math.floor(selectedColumn / 3);
  const selectedValue = selectedCell >= 0 ? values[selectedCell] : 0;

  useEffect(
    function focusSelectedCell() {
      if (active) cellElements.current[selectedCell]?.focus({ preventScroll: true });
    },
    [active, selectedCell],
  );

  return (
    <div
      role="grid"
      tabIndex={-1}
      aria-label={label}
      onKeyDown={onKeyDown}
      className="grid size-full grid-cols-9 grid-rows-9 overflow-hidden rounded-[22px] bg-(--ios-grouped-cell) shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.06)]"
    >
      {values.map(function renderCell(value, cellIndex) {
        const row = Math.floor(cellIndex / 9);
        const column = cellIndex % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
        const isFixed = fixedValues[cellIndex] !== 0;
        const isSelected = selectedCell === cellIndex;
        const isRelated = row === selectedRow || column === selectedColumn || box === selectedBox;
        const isSameValue = value !== 0 && value === selectedValue && !isSelected;
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
              "flex min-w-0 touch-manipulation items-center justify-center border-(--ios-separator) transition-colors duration-100 outline-none select-none focus-visible:relative focus-visible:z-10 motion-reduce:transition-none",
              column < 8 &&
                (column === 2 || column === 5
                  ? "border-r-2 border-r-(--ios-label)/25"
                  : "border-r-[0.5px]"),
              row < 8 &&
                (row === 2 || row === 5
                  ? "border-b-2 border-b-(--ios-label)/25"
                  : "border-b-[0.5px]"),
              isRelated && !isSelected && "bg-(--ios-tint)/[0.07]",
              isSameValue && "bg-(--ios-tint)/20",
              isSelected && "bg-(--ios-tint) text-white",
              isConflicting && !isSelected && "bg-(--ios-red)/12",
            )}
          >
            <Text
              as="span"
              family="rounded"
              className={cn(
                "text-[calc(min(100cqw,100cqh)*0.06)] leading-none tabular-nums",
                isFixed ? "font-semibold" : "font-medium",
                isSelected
                  ? "text-white"
                  : isConflicting
                    ? "text-(--ios-red)"
                    : isFixed
                      ? "text-(--ios-label)"
                      : "text-(--ios-tint)",
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
