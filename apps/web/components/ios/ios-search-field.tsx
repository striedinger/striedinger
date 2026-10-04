"use client";

import type { ComponentPropsWithRef, PointerEvent } from "react";

import { CircleXFillIcon } from "@workspace/icons/circle-x-fill-icon";
import { CloseIcon } from "@workspace/icons/close-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState } from "react";

import { iosGlassClassName } from "./ios-glass";

type IosSearchFieldProps = Omit<ComponentPropsWithRef<"input">, "onChange" | "type" | "value"> & {
  cancelLabel: string;
  clearLabel: string;
  containerClassName?: string;
  onCancel?: () => void;
  onValueChange: (value: string) => void;
  value: string;
};

/**
 * The iOS 26 search field: a glass capsule that, while active, is joined by a round glass
 * button to dismiss search.
 */
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
    <div role="search" className={cn("flex items-center gap-2", containerClassName)}>
      <label
        className={cn(
          "relative flex h-11 min-w-0 flex-1 items-center rounded-full text-ios-secondary-label",
          iosGlassClassName,
        )}
      >
        <SearchIcon
          className="pointer-events-none absolute left-3.5 size-[18px]"
          strokeWidth={2.4}
        />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          className={cn(
            "size-full min-w-0 appearance-none rounded-full bg-transparent pr-10 pl-10 text-ios-body text-ios-label outline-none placeholder:text-ios-secondary-label [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
            className,
          )}
          onChange={function updateQuery(event) {
            onValueChange(event.currentTarget.value);
          }}
          onFocus={function activateSearch(event) {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={function deactivateSearch(event) {
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
            className="absolute right-1 flex size-9 items-center justify-center rounded-full text-ios-tertiary-label outline-none focus-visible:text-ios-secondary-label"
            onPointerDown={keepInputFocus}
            onClick={function clearQuery() {
              onValueChange("");
              inputRef.current?.focus();
            }}
          >
            <CircleXFillIcon className="size-[18px]" />
          </button>
        ) : null}
      </label>
      {isActive ? (
        <button
          type="button"
          aria-label={cancelLabel}
          className={cn(
            "flex size-11 shrink-0 animate-in items-center justify-center rounded-full text-ios-label duration-200 outline-none zoom-in-75 fade-in focus-visible:ring-2 focus-visible:ring-ios-tint active:scale-90 motion-reduce:animate-none",
            iosGlassClassName,
          )}
          onPointerDown={keepInputFocus}
          onClick={cancelSearch}
        >
          <CloseIcon className="size-[18px]" strokeWidth={2.4} />
        </button>
      ) : null}
    </div>
  );
}

function keepInputFocus(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault();
}
