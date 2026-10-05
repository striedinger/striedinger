"use client";

import { CheckCircleIcon } from "@workspace/icons/check-circle-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { DownloadIcon } from "@workspace/icons/download-icon";
import { FileUpIcon } from "@workspace/icons/file-up-icon";
import { PhotoIcon } from "@workspace/icons/photo-icon";
import { SparklesIcon } from "@workspace/icons/sparkles-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useDeferredValue, useState, useTransition, type ChangeEvent } from "react";

import type { SvgEditorLabels, SvgInspection, SvgPreviewBackground } from "./types";

import { IosGroupedPane } from "../../../components/ios/ios-grouped-pane";
import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";
import { useIsHydrated } from "../../../components/use-is-hydrated";
import { copyText } from "../../../lib/copy-text";
import { downloadBlob } from "../../../lib/download-blob";
import { formatBytes } from "../../../lib/format-bytes";
import { getNumberFormat } from "../../../lib/intl-cache";
import { optimizeSvgText } from "../../../lib/svg/optimize-svg-text";
import { exportSvgAsPng } from "./export-svg-png";
import { inspectSvg, maximumSvgCharacters } from "./inspect-svg";
import { sampleSvg } from "./sample-svg";
import { SvgPreview } from "./svg-preview";

interface SvgEditorProps {
  labels: SvgEditorLabels;
  locale: string;
}

interface ActionMessage {
  text: string;
  tone: "error" | "success";
}

const actionButtonClassName =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ios-fill px-3.5 text-ios-subheadline font-semibold text-ios-tint outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 focus-within:ring-2 focus-within:ring-ios-tint/50 active:opacity-60 disabled:cursor-default disabled:text-ios-tertiary-label disabled:active:opacity-100 [&_svg]:size-4";

export function SvgEditor({ labels, locale }: SvgEditorProps) {
  const [source, setSource] = useState(sampleSvg);
  const [fileName, setFileName] = useState("drawing.svg");
  const [background, setBackground] = useState<SvgPreviewBackground>("grid");
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);
  // The preview keeps the last drawing that parsed while new markup is typed.
  const [previewSource, setPreviewSource] = useState<string | null>(sampleSvg);
  const [isOptimizing, startOptimizing] = useTransition();
  const [isExporting, startExporting] = useTransition();
  // Parsing a large drawing on every keystroke would delay typing, so it trails the input.
  const deferredSource = useDeferredValue(source);
  const isHydrated = useIsHydrated();
  const inspection: SvgInspection | null = isHydrated ? inspectSvg(deferredSource) : null;

  if (inspection?.status === "valid" && previewSource !== deferredSource) {
    setPreviewSource(deferredSource);
  }
  if (inspection?.status === "empty" && previewSource !== null) {
    setPreviewSource(null);
  }

  const isValid = inspection?.status === "valid";
  const canAct = isValid && source === deferredSource;
  const numberFormat = getNumberFormat(locale, { maximumFractionDigits: 2 });

  function replaceSource(nextSource: string) {
    setSource(nextSource);
    setActionMessage(null);
  }

  function handleSourceChange(event: ChangeEvent<HTMLTextAreaElement>) {
    replaceSource(event.currentTarget.value);
  }

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > maximumSvgCharacters * 4) {
      setActionMessage({ text: labels.tooLarge, tone: "error" });
      return;
    }
    try {
      const text = await file.text();
      replaceSource(text);
      setFileName(file.name.toLowerCase().endsWith(".svg") ? file.name : `${file.name}.svg`);
    } catch {
      setActionMessage({ text: labels.openFailed, tone: "error" });
    }
  }

  function optimize() {
    const originalSource = source;
    startOptimizing(async function optimizeSource() {
      try {
        const optimizedSource = await optimizeSvgText(originalSource, { keepDimensions: true });
        const originalBytes = new Blob([originalSource]).size;
        const optimizedBytes = new Blob([optimizedSource]).size;
        if (optimizedBytes >= originalBytes) {
          setActionMessage({ text: labels.alreadyOptimized, tone: "success" });
          return;
        }
        setSource(optimizedSource);
        setActionMessage({
          text: labels.optimized
            .replace("{before}", formatBytes(originalBytes))
            .replace("{after}", formatBytes(optimizedBytes)),
          tone: "success",
        });
      } catch {
        setActionMessage({ text: labels.optimizeFailed, tone: "error" });
      }
    });
  }

  async function copySource() {
    if (await copyText(source)) setActionMessage({ text: labels.copied, tone: "success" });
  }

  function downloadSvg() {
    downloadBlob(new Blob([source], { type: "image/svg+xml" }), fileName);
  }

  function exportPng() {
    if (inspection?.status !== "valid") return;
    const { height, width } = inspection;
    startExporting(async function exportImage() {
      try {
        const png = await exportSvgAsPng(source, width, height);
        downloadBlob(png, fileName.replace(/\.svg$/i, ".png"));
      } catch {
        setActionMessage({ text: labels.exportFailed, tone: "error" });
      }
    });
  }

  const dimensions =
    inspection?.status === "valid" && inspection.width !== null && inspection.height !== null
      ? `${numberFormat.format(inspection.width)} × ${numberFormat.format(inspection.height)}`
      : "—";
  const stats = [
    { label: labels.dimensions, value: dimensions },
    {
      label: labels.fileSize,
      value: inspection?.status === "valid" ? formatBytes(inspection.byteLength) : "—",
    },
    {
      label: labels.elements,
      value: inspection?.status === "valid" ? numberFormat.format(inspection.elementCount) : "—",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-5">
      <IosGroupedPane
        heading={labels.inputLabel}
        headingId="svg-input-heading"
        footer={
          <div className="flex flex-col gap-1" aria-live="polite">
            {isValid ? (
              <Text className="flex items-center gap-1.5 text-ios-footnote font-semibold text-ios-green [&_svg]:size-4">
                <CheckCircleIcon aria-hidden="true" />
                {labels.valid}
              </Text>
            ) : null}
            {inspection?.status === "invalid" ? (
              <Text className="text-ios-footnote break-words text-ios-red">
                {inspection.reason === "syntax"
                  ? labels.invalid.replace("{error}", inspection.error)
                  : inspection.reason === "not-svg"
                    ? labels.notSvg
                    : labels.tooLarge}
              </Text>
            ) : null}
            {actionMessage ? (
              <Text
                className={cn(
                  "text-ios-footnote",
                  actionMessage.tone === "error" ? "text-ios-red" : "text-ios-label",
                )}
              >
                {actionMessage.text}
              </Text>
            ) : null}
            <Text className="text-ios-footnote text-ios-secondary-label">{labels.privacy}</Text>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-ios-xl bg-ios-grouped-cell transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ios-tint/35 motion-reduce:transition-none">
            <textarea
              className="block h-88 w-full resize-none bg-transparent px-4 py-3.5 font-mono text-[14px] leading-[22px] text-ios-label caret-ios-tint outline-none placeholder:text-ios-tertiary-label lg:h-128"
              value={source}
              onChange={handleSourceChange}
              placeholder={labels.placeholder}
              aria-label={labels.inputLabel}
              aria-invalid={inspection?.status === "invalid"}
              maxLength={maximumSvgCharacters}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div
            role="toolbar"
            aria-label={labels.actions}
            className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <label className={actionButtonClassName}>
              <FileUpIcon aria-hidden="true" />
              {labels.open}
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                onChange={openFile}
              />
            </label>
            <button
              type="button"
              className={actionButtonClassName}
              disabled={!canAct || isOptimizing}
              aria-busy={isOptimizing}
              onClick={optimize}
            >
              <SparklesIcon aria-hidden="true" />
              {labels.optimize}
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              disabled={!canAct}
              onClick={copySource}
            >
              <CopyIcon aria-hidden="true" />
              {labels.copy}
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              disabled={!canAct}
              onClick={downloadSvg}
            >
              <DownloadIcon aria-hidden="true" />
              {labels.downloadSvg}
            </button>
            <button
              type="button"
              className={actionButtonClassName}
              disabled={!canAct || isExporting}
              aria-busy={isExporting}
              onClick={exportPng}
            >
              <PhotoIcon aria-hidden="true" />
              {labels.exportPng}
            </button>
          </div>
        </div>
      </IosGroupedPane>

      <IosGroupedPane heading={labels.preview} headingId="svg-preview-heading">
        <div className="flex flex-col gap-3">
          <SvgPreview
            background={background}
            emptyLabel={labels.emptyPreview}
            isStale={source !== deferredSource || inspection?.status === "invalid"}
            label={labels.preview}
            source={previewSource}
          />
          <IosSegmentedControl
            label={labels.background}
            options={[
              { label: labels.gridBackground, value: "grid" },
              { label: labels.lightBackground, value: "light" },
              { label: labels.darkBackground, value: "dark" },
            ]}
            value={background}
            onChange={setBackground}
          />
          <dl className="m-0 grid grid-cols-3 gap-px overflow-hidden rounded-ios-xl bg-ios-separator">
            {stats.map(function renderStat(stat) {
              return (
                <div
                  key={stat.label}
                  className="flex min-w-0 flex-col bg-ios-grouped-cell px-3.5 py-2.5"
                >
                  <Text as="dt" className="text-ios-footnote text-ios-secondary-label">
                    {stat.label}
                  </Text>
                  <Text
                    as="dd"
                    numberOfLines={1}
                    className="m-0 text-ios-body font-semibold text-ios-label tabular-nums"
                  >
                    {stat.value}
                  </Text>
                </div>
              );
            })}
          </dl>
        </div>
      </IosGroupedPane>
    </div>
  );
}
