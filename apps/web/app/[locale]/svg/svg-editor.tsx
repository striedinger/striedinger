"use client";

import { CheckCircleIcon } from "@workspace/icons/check-circle-icon";
import { CircleHalfIcon } from "@workspace/icons/circle-half-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { DownloadIcon } from "@workspace/icons/download-icon";
import { FileUpIcon } from "@workspace/icons/file-up-icon";
import { GaugeIcon } from "@workspace/icons/gauge-icon";
import { PhotoIcon } from "@workspace/icons/photo-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { SparklesIcon } from "@workspace/icons/sparkles-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { SvgEditorLabels, SvgInspection, SvgPreviewBackground } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosMenu } from "../../../components/ios/ios-menu";
import { iosBottomScrollEdgeClassName } from "../../../components/ios/ios-scroll-edge";
import { IosToast } from "../../../components/ios/ios-toast";
import { IosValueRow } from "../../../components/ios/ios-value-row";
import { useIsHydrated } from "../../../components/use-is-hydrated";
import { copyText } from "../../../lib/copy-text";
import { downloadBlob } from "../../../lib/download-blob";
import { formatBytes } from "../../../lib/format-bytes";
import { getNumberFormat } from "../../../lib/intl-cache";
import { defineOnDeviceAiProbe, useOnDeviceAi } from "../../../lib/on-device-ai/use-on-device-ai";
import { optimizeSvgText } from "../../../lib/svg/optimize-svg-text";
import { exportSvgAsPng } from "./export-svg-png";
import { inspectSvg, maximumSvgCharacters } from "./inspect-svg";
import { sampleSvg } from "./sample-svg";
import { SvgCodeEditor } from "./svg-code-editor";
import { getSvgDescribeOptions, getSvgEditOptions } from "./svg-intelligence-options";
import { SvgPreview } from "./svg-preview";

interface SvgEditorProps {
  aiLabels: OnDeviceAiLabels;
  labels: SvgEditorLabels;
  locale: string;
}

function loadSvgIntelligencePanel() {
  return import("./svg-intelligence-panel");
}

const SvgIntelligencePanel = lazy(function importSvgIntelligencePanel() {
  return loadSvgIntelligencePanel().then(function selectPanel(module) {
    return { default: module.SvgIntelligencePanel };
  });
});

function preloadSvgIntelligencePanel() {
  void loadSvgIntelligencePanel();
}

const sectionHeaderClassName = "flex min-h-9 items-end justify-between gap-3 px-5 pb-1.5";
const sectionHeadingClassName = "text-ios-subheadline font-semibold text-ios-secondary-label";

export function SvgEditor({ aiLabels, labels, locale }: SvgEditorProps) {
  const [source, setSource] = useState(sampleSvg);
  const [fileName, setFileName] = useState("drawing.svg");
  const [background, setBackground] = useState<SvgPreviewBackground>("grid");
  const [toastMessage, setToastMessage] = useState("");
  // The preview keeps the last drawing that parsed while new markup is typed.
  const [previewSource, setPreviewSource] = useState<string | null>(sampleSvg);
  const [isOptimizing, startOptimizing] = useTransition();
  const [isExporting, startExporting] = useTransition();
  const [isAiOpen, setIsAiOpen] = useState(false);
  // On-device AI controls appear only once the browser confirms it can run them.
  const canEdit = useOnDeviceAi(
    defineOnDeviceAiProbe("LanguageModel", `svg-edit:${locale}`, function checkEditing() {
      return LanguageModel.availability(getSvgEditOptions(locale));
    }),
  );
  const canDescribe = useOnDeviceAi(
    defineOnDeviceAiProbe("LanguageModel", `svg-describe:${locale}`, function checkDescribing() {
      return LanguageModel.availability(getSvgDescribeOptions(locale));
    }),
  );
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

  useEffect(
    function hideToastAfterAMoment() {
      if (!toastMessage) return;
      const timeout = window.setTimeout(function hideToast() {
        setToastMessage("");
      }, 2_000);
      return function cancelHidingToast() {
        window.clearTimeout(timeout);
      };
    },
    [toastMessage],
  );

  const validInspection = inspection?.status === "valid" ? inspection : null;
  const canAct = validInspection !== null && source === deferredSource;
  const numberFormat = getNumberFormat(locale, { maximumFractionDigits: 2 });

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > maximumSvgCharacters * 4) {
      setToastMessage(labels.tooLarge);
      return;
    }
    try {
      setSource(await file.text());
      setFileName(file.name.toLowerCase().endsWith(".svg") ? file.name : `${file.name}.svg`);
    } catch {
      setToastMessage(labels.openFailed);
    }
  }

  /** Applies a slow result only if nobody edited the drawing while it was being made. */
  function replaceSourceIfUnchanged(expectedSource: string, nextSource: string) {
    setSource(function applyIfUnchanged(currentSource) {
      return currentSource === expectedSource ? nextSource : currentSource;
    });
  }

  function optimize() {
    const originalSource = source;
    startOptimizing(async function optimizeSource() {
      try {
        const optimizedSource = await optimizeSvgText(originalSource, { keepDimensions: true });
        const originalBytes = new Blob([originalSource]).size;
        const optimizedBytes = new Blob([optimizedSource]).size;
        if (optimizedBytes >= originalBytes) {
          setToastMessage(labels.alreadyOptimized);
          return;
        }
        replaceSourceIfUnchanged(originalSource, optimizedSource);
        setToastMessage(
          labels.optimized
            .replace("{before}", formatBytes(originalBytes))
            .replace("{after}", formatBytes(optimizedBytes)),
        );
      } catch {
        setToastMessage(labels.optimizeFailed);
      }
    });
  }

  async function copySource() {
    if (await copyText(source)) setToastMessage(labels.copied);
  }

  function exportPng() {
    if (!validInspection) return;
    const { height, width } = validInspection;
    startExporting(async function exportImage() {
      try {
        const png = await exportSvgAsPng(source, width, height);
        downloadBlob(png, fileName.replace(/\.svg$/i, ".png"));
      } catch {
        setToastMessage(labels.exportFailed);
      }
    });
  }

  const backgroundOptions: readonly { label: string; value: SvgPreviewBackground }[] = [
    { label: labels.gridBackground, value: "grid" },
    { label: labels.lightBackground, value: "light" },
    { label: labels.darkBackground, value: "dark" },
  ];
  const invalidMessage =
    inspection?.status !== "invalid"
      ? null
      : inspection.reason === "syntax"
        ? labels.invalid.replace("{error}", inspection.error)
        : inspection.reason === "not-svg"
          ? labels.notSvg
          : labels.tooLarge;

  return (
    <div className="grid gap-6 pb-20 lg:h-[max(36rem,calc(100dvh-12rem))] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-5">
      <section
        aria-labelledby="svg-preview-heading"
        className="flex min-h-0 flex-col lg:col-start-2"
      >
        <div className={sectionHeaderClassName}>
          <Text as="h2" id="svg-preview-heading" className={sectionHeadingClassName}>
            {labels.preview}
          </Text>
        </div>
        <SvgPreview
          background={background}
          emptyLabel={labels.emptyPreview}
          isStale={source !== deferredSource || inspection?.status === "invalid"}
          label={labels.preview}
          source={previewSource}
          accessory={
            <IosMenu
              sections={[
                {
                  id: "background",
                  title: labels.background,
                  actions: backgroundOptions.map(function createBackgroundAction(option) {
                    return {
                      checked: option.value === background,
                      id: option.value,
                      label: option.label,
                      onSelect() {
                        setBackground(option.value);
                      },
                    };
                  }),
                },
              ]}
              trigger={
                <IosBarButton aria-label={labels.background}>
                  <CircleHalfIcon />
                </IosBarButton>
              }
            />
          }
        />
      </section>

      <section
        aria-labelledby="svg-code-heading"
        className="flex min-h-0 flex-col lg:col-start-1 lg:row-span-2 lg:row-start-1"
      >
        <div className={sectionHeaderClassName}>
          <Text as="h2" id="svg-code-heading" className={sectionHeadingClassName}>
            {labels.inputLabel}
          </Text>
          {validInspection ? (
            <Text
              as="span"
              className="flex items-center gap-1 text-ios-footnote font-semibold text-ios-green [&_svg]:size-3.5"
            >
              <CheckCircleIcon aria-hidden="true" strokeWidth={2.4} />
              {labels.valid}
            </Text>
          ) : null}
        </div>
        <div className="min-h-0 flex-1">
          <SvgCodeEditor
            readOnly={isOptimizing}
            invalid={invalidMessage !== null}
            label={labels.inputLabel}
            onChange={setSource}
            placeholder={labels.placeholder}
            value={source}
          />
        </div>
        <Text
          aria-live="polite"
          className={cn(
            "px-5 pt-2 text-ios-footnote break-words",
            invalidMessage ? "text-ios-red" : "text-ios-secondary-label",
          )}
        >
          {invalidMessage ?? labels.privacy}
        </Text>
      </section>

      <IosListSection className="px-0 lg:col-start-2" header={labels.details}>
        <IosValueRow
          label={labels.dimensions}
          value={
            validInspection?.width != null && validInspection.height != null
              ? `${numberFormat.format(validInspection.width)} × ${numberFormat.format(validInspection.height)}`
              : "—"
          }
        />
        <IosValueRow
          label={labels.fileSize}
          value={validInspection ? formatBytes(validInspection.byteLength) : "—"}
        />
        <IosValueRow
          label={labels.elements}
          value={validInspection ? numberFormat.format(validInspection.elementCount) : "—"}
        />
      </IosListSection>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pt-8 pb-safe-min-3.5",
          iosBottomScrollEdgeClassName,
        )}
      >
        {isAiOpen ? (
          <Suspense fallback={null}>
            <SvgIntelligencePanel
              aiLabels={aiLabels}
              canDescribe={canDescribe}
              dimensions={{
                height: validInspection?.height ?? null,
                width: validInspection?.width ?? null,
              }}
              isSourceValid={canAct}
              labels={labels}
              locale={locale}
              onClose={function closeAi() {
                setIsAiOpen(false);
              }}
              onReplaceSource={replaceSourceIfUnchanged}
              source={source}
            />
          </Suspense>
        ) : null}
        <div role="toolbar" aria-label={labels.actions} className="flex items-center gap-3">
          <label
            className={cn(
              "pointer-events-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ios-tint transition-transform duration-150 focus-within:ring-2 focus-within:ring-ios-tint/60 active:scale-[0.92] motion-reduce:transition-none [&_svg]:size-5.25",
              iosGlassClassName,
            )}
          >
            <FileUpIcon aria-hidden="true" />
            <span className="sr-only">{labels.open}</span>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              className="sr-only"
              onChange={openFile}
            />
          </label>
          <IosBarButton
            className="pointer-events-auto min-w-40 text-ios-tint"
            disabled={!canAct || isOptimizing}
            aria-busy={isOptimizing}
            onClick={optimize}
          >
            <GaugeIcon aria-hidden="true" />
            {labels.optimize}
          </IosBarButton>
          {canEdit ? (
            <IosBarButton
              className="pointer-events-auto text-ios-tint"
              aria-label={labels.aiTitle}
              aria-pressed={isAiOpen}
              onPointerEnter={preloadSvgIntelligencePanel}
              onFocus={preloadSvgIntelligencePanel}
              onClick={function toggleAi() {
                setIsAiOpen(!isAiOpen);
              }}
            >
              <SparklesIcon />
            </IosBarButton>
          ) : null}
          <IosMenu
            side="top"
            sections={[
              {
                id: "export",
                actions: [
                  {
                    disabled: !canAct,
                    icon: <CopyIcon />,
                    id: "copy",
                    label: labels.copy,
                    onSelect: copySource,
                  },
                  {
                    disabled: !canAct,
                    icon: <DownloadIcon />,
                    id: "download",
                    label: labels.downloadSvg,
                    onSelect() {
                      downloadBlob(new Blob([source], { type: "image/svg+xml" }), fileName);
                    },
                  },
                  {
                    disabled: !canAct || isExporting,
                    icon: <PhotoIcon />,
                    id: "png",
                    label: labels.exportPng,
                    onSelect: exportPng,
                  },
                ],
              },
            ]}
            trigger={
              <IosBarButton className="pointer-events-auto text-ios-tint" aria-label={labels.share}>
                <ShareUpIcon />
              </IosBarButton>
            }
          />
        </div>
      </div>
      <IosToast message={toastMessage} />
    </div>
  );
}
