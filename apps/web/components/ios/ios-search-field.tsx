"use client";

import type { ComponentPropsWithRef, PointerEvent } from "react";

import { CircleXFillIcon } from "@workspace/icons/circle-x-fill-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState } from "react";

type IosSearchFieldProps = Omit<ComponentPropsWithRef<"input">, "onChange" | "type" | "value"> & {
  cancelLabel: string;
  clearLabel: string;
  containerClassName?: string;
  onCancel?: () => void;
  onValueChange: (value: string) => void;
  value: string;
};

export function IosSearchField({
  cancelLabel,
  clearLabel,
  className,
  containerClassName,
  onBlur,
  onCancel,
  onFocus,
  onKeyDown,
  onValueChange,
  value,
  ...props
}: IosSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || value.length > 0;

  function cancelSearch() {
    onValueChange("");
    inputRef.current?.blur();
    setIsFocused(false);
    onCancel?.();
  }

  return (
    <div role="search" className={cn("flex items-center px-4 pb-2", containerClassName)}>
      <label className="relative flex h-9 min-w-0 flex-1 items-center rounded-[10px] bg-(--ios-tertiary-fill) text-(--ios-secondary-label)">
        <SearchIcon className="pointer-events-none absolute left-2 size-[18px]" strokeWidth={2.4} />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          className={cn(
            "size-full min-w-0 appearance-none bg-transparent pr-8 pl-[30px] text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-label) outline-none placeholder:text-(--ios-secondary-label) [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
            className,
          )}
          onChange={function updateQuery(event) {
            onValueChange(event.currentTarget.value);
          }}
          onFocus={function showCancelButton(event) {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={function hideCancelButton(event) {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onKeyDown={function handleSearchKeys(event) {
            if (event.key === "Escape") cancelSearch();
            onKeyDown?.(event);
          }}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label={clearLabel}
            className="absolute right-0 flex size-9 items-center justify-center text-(--ios-tertiary-label) outline-none focus-visible:text-(--ios-secondary-label)"
            onPointerDown={keepInputFocus}
            onClick={function clearQuery() {
              onValueChange("");
              inputRef.current?.focus();
            }}
          >
            <CircleXFillIcon className="size-[17px]" />
          </button>
        ) : null}
      </label>
      <div
        className={cn(
          "grid transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          isActive ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <button
            type="button"
            tabIndex={isActive ? 0 : -1}
            aria-hidden={!isActive || undefined}
            className="ml-2 h-9 text-[17px] leading-[22px] tracking-[-0.43px] whitespace-nowrap text-(--ios-tint) outline-none active:opacity-40"
            onPointerDown={keepInputFocus}
            onClick={cancelSearch}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function keepInputFocus(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault();
}
