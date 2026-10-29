"use client";

import { PhotoIcon } from "@workspace/icons/photo-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { CompressionMode, ImageOptimizerLabels, OptimizerItem, OutputFormat } from "./types";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosFileDropZone } from "../../../components/ios/ios-file-drop-zone";
import { IosFileEmptyState } from "../../../components/ios/ios-file-empty-state";
import { IosFloatingActionBar } from "../../../components/ios/ios-floating-action-bar";
import { downloadBlob } from "../../../lib/download-blob";
import { defineOnDeviceAiProbe, useOnDeviceAi } from "../../../lib/on-device-ai/use-on-device-ai";
import { getImageDescriptionOptions } from "./image-description-options";
import { targetRatioForMode } from "./optimization-settings";
import { cancelImageOptimizations, optimizeImage } from "./optimize-image";
import { OptimizerFileList } from "./optimizer-file-list";
import { OptimizerSettings } from "./optimizer-settings";

const MAX_FILES = 20;

function download(item: OptimizerItem) {
  if (item.output) downloadBlob(item.output, item.outputName ?? item.file.name);
}

function loadImageDescriptionCard() {
  return import("./image-description-card");
}

const ImageDescriptionCard = lazy(function importImageDescriptionCard() {
  return loadImageDescriptionCard().then(function selectCard(module) {
    return { default: module.ImageDescriptionCard };
  });
});

function preloadImageDescriptionCard() {
  void loadImageDescriptionCard();
}

interface ImageOptimizerProps {
  aiLabels: OnDeviceAiLabels;
  labels: ImageOptimizerLabels;
  locale: string;
}

export function ImageOptimizer({ aiLabels, labels, locale }: ImageOptimizerProps) {
  const [items, setItems] = useState<OptimizerItem[]>([]);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>("balanced");
  const [quality, setQuality] = useState(68);
  const encodedQualityRef = useRef(68);
  const [maxDimension, setMaxDimension] = useState(2560);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("auto");
  const [notice, setNotice] = useState<string>();
  const [describedItemId, setDescribedItemId] = useState<string | null>(null);
  // Describing images appears only once the browser confirms it can do it on the device.
  const canDescribe = useOnDeviceAi(
    defineOnDeviceAiProbe("LanguageModel", `image-description:${locale}`, function checkImages() {
      return LanguageModel.availability(getImageDescriptionOptions(locale));
    }),
  );
  const describedItem = items.find(function isDescribed(item) {
    return item.id === describedItemId;
  });
  /** The encode in progress; results from a job that is no longer current are ignored. */
  const activeJobRef = useRef<{ itemId: string } | null>(null);
  const autoSavingsTarget = Math.round((1 - targetRatioForMode(quality, compressionMode)) * 100);

  useEffect(
    function processQueue() {
      const next = items.find(function findQueued(item) {
        return item.status === "queued";
      });
      if (!next || activeJobRef.current) return;

      const job = { itemId: next.id };
      activeJobRef.current = job;
      const activeId = next.id;
      setItems(function markOptimizing(current) {
        return current.map(function updateItem(item) {
          return item.id === activeId
            ? { ...item, progress: 2, stage: "preparing", status: "optimizing" }
            : item;
        });
      });

      function updateProgress(progress: number, stage: OptimizerItem["stage"]) {
        if (!stage || activeJobRef.current !== job) return;
        setItems(function storeProgress(current) {
          return current.map(function updateItem(item) {
            return item.id === activeId && item.status === "optimizing"
              ? { ...item, progress, stage }
              : item;
          });
        });
      }

      const operation =
        next.file.type === "image/svg+xml"
          ? import("./optimize-svg").then(function loadSvgOptimizer(module) {
              return module.optimizeSvg(next.file, compressionMode, updateProgress);
            })
          : next.file.type === "image/gif"
            ? import("./optimize-gif").then(function loadGifOptimizer(module) {
                return module.optimizeGif(
                  next.file,
                  { compressionMode, maxDimension, quality: quality / 100 },
                  updateProgress,
                );
              })
            : optimizeImage(
                next.file,
                { compressionMode, maxDimension, outputFormat, quality: quality / 100 },
                updateProgress,
              );

      void operation
        .then(function complete(output) {
          if (activeJobRef.current !== job) return undefined;
          setItems(function storeOutput(current) {
            return current.map(function updateItem(item) {
              return item.id === next.id && item.status === "optimizing"
                ? {
                    ...item,
                    output,
                    outputName: createOutputName(item.file.name, output.type),
                    status: "done",
                  }
                : item;
            });
          });
          return undefined;
        })
        .catch(function fail(error: unknown) {
          if (activeJobRef.current !== job) return;
          setItems(function storeError(current) {
            return current.map(function updateItem(item) {
              return item.id === next.id && item.status === "optimizing"
                ? {
                    ...item,
                    error: error instanceof Error ? error.message : labels.unsupported,
                    status: "error",
                  }
                : item;
            });
          });
        })
        .finally(function continueQueue() {
          if (activeJobRef.current === job) activeJobRef.current = null;
        });
    },
    [compressionMode, items, labels.unsupported, maxDimension, outputFormat, quality],
  );

  function addFiles(files: File[]) {
    const accepted = files.filter(function acceptFile(file) {
      return file.type.startsWith("image/") || /\.(?:heic|heif)$/i.test(file.name);
    });
    if (accepted.length !== files.length) setNotice(labels.unsupported);
    if (items.length + accepted.length > MAX_FILES) setNotice(labels.tooManyFiles);
    const available = Math.max(0, MAX_FILES - items.length);
    setItems(function appendItems(current) {
      return current.concat(
        accepted.slice(0, available).map(function createItem(file) {
          return { file, id: crypto.randomUUID(), status: "queued" as const };
        }),
      );
    });
  }

  function requeueForSettledQuality() {
    if (encodedQualityRef.current === quality) return;
    encodedQualityRef.current = quality;
    requeueItems();
  }

  /** Stops the current encode so the queue moves straight on to work that is still wanted. */
  function cancelActiveJob(itemId?: string) {
    const job = activeJobRef.current;
    if (!job || (itemId !== undefined && job.itemId !== itemId)) return;
    activeJobRef.current = null;
    cancelImageOptimizations();
  }

  function requeueItems() {
    cancelActiveJob();
    setItems(function resetItems(current) {
      return current.map(function resetItem(item) {
        return { file: item.file, id: item.id, status: "queued" };
      });
    });
  }

  function changeCompressionMode(nextMode: CompressionMode) {
    setCompressionMode(nextMode);
    if (nextMode === "lossless") {
      setMaxDimension(0);
      setOutputFormat("auto");
    }
    requeueItems();
  }

  function renameOutput(id: string, fileStem: string) {
    setItems(function renameItem(current) {
      return current.map(function applyName(item) {
        if (item.id !== id) return item;
        const extension = /\.[^.]+$/.exec(item.outputName ?? item.file.name)?.[0] ?? "";
        return { ...item, outputName: `${fileStem}${extension}` };
      });
    });
  }

  return (
    <div className="flex flex-col gap-2 pb-16">
      {items.length === 0 ? (
        <IosFileEmptyState
          icon={<PhotoIcon />}
          title={labels.dropPrompt}
          description={labels.supported}
          note={labels.privacy}
        />
      ) : (
        <OptimizerFileList
          items={items}
          labels={labels}
          maxFiles={MAX_FILES}
          onClear={function clear() {
            cancelActiveJob();
            setItems([]);
          }}
          onDescribe={canDescribe ? setDescribedItemId : undefined}
          onPrepareDescribe={preloadImageDescriptionCard}
          onDownload={download}
          onRemove={function remove(id) {
            cancelActiveJob(id);
            setItems(function removeItem(current) {
              return current.filter(function keep(entry) {
                return entry.id !== id;
              });
            });
          }}
        />
      )}
      {describedItem ? (
        <Suspense fallback={null}>
          <ImageDescriptionCard
            key={describedItem.id}
            aiLabels={aiLabels}
            item={describedItem}
            labels={labels}
            locale={locale}
            onClose={function closeDescription() {
              setDescribedItemId(null);
            }}
            onRename={renameOutput}
          />
        </Suspense>
      ) : null}
      {notice ? (
        <Text role="alert" className="px-5 text-ios-footnote text-ios-red">
          {notice}
        </Text>
      ) : null}
      <OptimizerSettings
        autoSavingsTarget={autoSavingsTarget}
        compressionMode={compressionMode}
        labels={labels}
        maxDimension={maxDimension}
        onCompressionModeChange={changeCompressionMode}
        onMaxDimensionChange={function changeDimension(nextMaxDimension) {
          setMaxDimension(nextMaxDimension);
          requeueItems();
        }}
        onOutputFormatChange={function changeFormat(nextOutputFormat) {
          setOutputFormat(nextOutputFormat);
          requeueItems();
        }}
        onQualityChange={setQuality}
        onQualitySettle={requeueForSettledQuality}
        outputFormat={outputFormat}
        quality={quality}
      />
      <IosFileDropZone label={labels.dropActive} onFiles={addFiles} />
      <IosFloatingActionBar>
        <label
          htmlFor="image-file-input"
          className={cn(
            iosFilledButtonClassName,
            "pointer-events-auto w-full max-w-sm cursor-pointer",
          )}
        >
          <PlusIcon strokeWidth={2.8} />
          {items.length === 0 ? labels.chooseFiles : labels.addMore}
          <input
            id="image-file-input"
            className="sr-only"
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            aria-describedby="image-file-limits"
            onChange={function selectFiles(event) {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
        <span id="image-file-limits" className="sr-only">
          {labels.supported}
        </span>
      </IosFloatingActionBar>
    </div>
  );
}

function createOutputName(name: string, type: string) {
  const stem = name.replace(/\.[^.]+$/, "");
  const extension =
    type === "image/avif"
      ? "avif"
      : type === "image/jpeg"
        ? "jpg"
        : type === "image/png"
          ? "png"
          : type === "image/webp"
            ? "webp"
            : type === "image/gif"
              ? "gif"
              : type === "image/svg+xml"
                ? "svg"
                : type === "image/bmp"
                  ? "bmp"
                  : type === "image/heic"
                    ? "heic"
                    : type === "image/heif"
                      ? "heif"
                      : (name.match(/\.([^.]+)$/)?.[1] ?? "bin");
  return `${stem}-optimized.${extension}`;
}
