"use client";

import type { MouseEvent, PointerEvent } from "react";

import { CameraIcon } from "@workspace/icons/camera-icon";
import { ChecklistIcon } from "@workspace/icons/checklist-icon";
import { TextFormatIcon } from "@workspace/icons/text-format-icon";

import type { IosMenuSection } from "../../../components/ios/ios-menu";
import type { NotesMessages } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosGlassGroup } from "../../../components/ios/ios-glass-group";
import { IosMenu } from "../../../components/ios/ios-menu";

interface NoteFormatControlsProps {
  className?: string;
  /** Keeps the note focused while a control is pressed. */
  editingControlHandlers: {
    onMouseDown: (event: MouseEvent<HTMLElement>) => void;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  };
  isEditing: boolean;
  isFormatOpen: boolean;
  messages: NotesMessages;
  /** Where the photo menu opens: above a bottom toolbar or below the top one. */
  menuSide: "top" | "bottom";
  onAddChecklist: () => void;
  onToggleFormat: () => void;
  photoMenuSections: IosMenuSection[];
}

/**
 * The note's format, checklist, and photo controls, which sit in the bottom toolbar on
 * iPhone and in the top toolbar beside the share and more buttons on wider screens.
 */
export function NoteFormatControls({
  className,
  editingControlHandlers,
  isEditing,
  isFormatOpen,
  messages,
  menuSide,
  onAddChecklist,
  onToggleFormat,
  photoMenuSections,
}: NoteFormatControlsProps) {
  return (
    <IosGlassGroup label={messages.Format} className={className}>
      {isEditing ? (
        <IosBarButton
          variant="plain"
          aria-label={messages.Format}
          aria-pressed={isFormatOpen}
          {...editingControlHandlers}
          onClick={onToggleFormat}
        >
          <TextFormatIcon />
        </IosBarButton>
      ) : null}
      <IosBarButton
        variant="plain"
        aria-label={messages.Checklist}
        {...(isEditing ? editingControlHandlers : undefined)}
        onClick={onAddChecklist}
      >
        <ChecklistIcon />
      </IosBarButton>
      <IosMenu
        side={menuSide}
        align="center"
        sections={photoMenuSections}
        trigger={
          <IosBarButton variant="plain" aria-label={messages["Attach Photo"]}>
            <CameraIcon />
          </IosBarButton>
        }
      />
    </IosGlassGroup>
  );
}
