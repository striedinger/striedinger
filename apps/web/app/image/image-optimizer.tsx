"use client";

import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useRef, useState } from "react";

import type { CompressionMode, ImageOptimizerLabels, OptimizerItem, OutputFormat } from "./types";

import { FileDropZone } from "./file-drop-zone";
import { targetRatioForMode } from "./optimization-settings";
import { optimizeImage } from "./optimize-image";
import { OptimizerFileRow } from "./optimizer-file-row";

const MAX_FILES = 20;

function download(item: OptimizerItem) {
  if (!item.output) return;
  const url = URL.createObjectURL(item.output);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = item.outputName ?? item.file.name;
  anchor.click();
  setTimeout(function releaseUrl() {
    URL.revokeObjectURL(url);
  }, 1_000);
}

function openAdditionalFilePicker() {
  document.getElementById("image-add-more")?.click();
}

export function ImageOptimizer({ labels }: { labels: ImageOptimizerLabels }) {
  const [items, setItems] = useState<OptimizerItem[]>([]);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>("balanced");
  const [quality, setQuality] = useState(68);
  const [maxDimension, setMaxDimension] = useState(2560);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("auto");
  const [notice, setNotice] = useState<string>();
  const processingRef = useRef(false);
  const autoSavingsTarget = Math.round((1 - targetRatioForMode(quality, compressionMode)) * 100);

  useEffect(
    function processQueue() {
      const next = items.find(function findQueued(item) {
        return item.status === "queued";
      });
      if (!next || processingRef.current) return;

      processingRef.current = true;
      const activeId = next.id;
      setItems(function markOptimizing(current) {
        return current.map(function updateItem(item) {
          return item.id === activeId
            ? { ...item, progress: 2, stage: "preparing", status: "optimizing" }
            : item;
        });
      });

      function updateProgress(progress: number, stage: OptimizerItem["stage"]) {
        if (!stage) return;
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
        .catch(function fail(error) {
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
          processingRef.current = false;
        });
    },
    [compressionMode, items, labels.unsupported, maxDimension, outputFormat, quality],
  );

  const completed = items.filter(function completedItems(item) {
    return item.output;
  });

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

  function requeueItems() {
    setItems(function resetItems(current) {
      return current.map(function resetItem(item) {
        return { file: item.file, id: item.id, status: "queued" };
      });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <Surface className="overflow-hidden p-2">
        {items.length === 0 ? (
          <FileDropZone labels={labels} onFiles={addFiles} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div>
                <Text weight="semibold">{labels.queue}</Text>
                <Text size="sm" tone="muted">
                  {items.length} / {MAX_FILES}
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openAdditionalFilePicker}
                >
                  {labels.addMore}
                </Button>
                <input
                  id="image-add-more"
                  className="sr-only"
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={function selectMore(event) {
                    addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={function clear() {
                    setItems([]);
                  }}
                >
                  {labels.clearAll}
                </Button>
              </div>
            </div>
            <ul>
              <>
                {items.map(function renderItem(item) {
                  return (
                    <OptimizerFileRow
                      key={item.id}
                      item={item}
                      labels={labels}
                      onDownload={download}
                      onRemove={function remove(id) {
                        setItems(function removeItem(current) {
                          return current.filter(function keep(entry) {
                            return entry.id !== id;
                          });
                        });
                      }}
                    />
                  );
                })}
              </>
            </ul>
            {completed.length > 1 ? (
              <div className="border-t border-border p-4">
                <Button
                  type="button"
                  onClick={function downloadAll() {
                    completed.forEach(download);
                  }}
                >
                  {labels.downloadAll}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Surface>

      <Surface className="flex flex-col gap-6 p-5 lg:sticky lg:top-20">
        <label className="flex flex-col gap-2">
          <Text size="sm" weight="semibold">
            {labels.compressionMode}
          </Text>
          <select
            value={compressionMode}
            onChange={function changeCompressionMode(event) {
              const nextMode = event.target.value as CompressionMode;
              setCompressionMode(nextMode);
              if (nextMode === "lossless") {
                setMaxDimension(0);
                setOutputFormat("auto");
              }
              requeueItems();
            }}
            className="h-9 rounded-md border border-input bg-surface-inset px-3 text-sm"
          >
            <option value="balanced">{labels.balancedMode}</option>
            <option value="smallest">{labels.smallestMode}</option>
            <option value="lossless">{labels.losslessMode}</option>
          </select>
        </label>
        {compressionMode !== "lossless" ? (
          <label className="flex flex-col gap-2">
            <Text size="sm" weight="semibold">
              {labels.quality}: {quality}%
            </Text>
            <input
              type="range"
              min="35"
              max="95"
              value={quality}
              onChange={function changeQuality(event) {
                setQuality(Number(event.target.value));
                requeueItems();
              }}
              className="accent-primary"
            />
            <Text size="sm" tone="muted">
              {labels.qualityHint}
            </Text>
            {outputFormat === "auto" ? (
              <Text size="sm" tone="muted">
                {labels.autoTarget}: ~{autoSavingsTarget}% {labels.saved}
              </Text>
            ) : null}
          </label>
        ) : null}
        <label className="flex flex-col gap-2">
          <Text size="sm" weight="semibold">
            {labels.maxDimension}
          </Text>
          <select
            value={maxDimension}
            disabled={compressionMode === "lossless"}
            onChange={function changeDimension(event) {
              setMaxDimension(Number(event.target.value));
              requeueItems();
            }}
            className="h-9 rounded-md border border-input bg-surface-inset px-3 text-sm"
          >
            <option value="0">Original dimensions</option>
            <option value="1280">Email · 1280 px</option>
            <option value="1920">Web · 1920 px</option>
            <option value="2560">Retina web · 2560 px</option>
            <option value="3840">Ultra HD · 3840 px</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <Text size="sm" weight="semibold">
            {labels.format}
          </Text>
          <select
            value={outputFormat}
            onChange={function changeFormat(event) {
              setOutputFormat(event.target.value as OutputFormat);
              requeueItems();
            }}
            className="h-9 rounded-md border border-input bg-surface-inset px-3 text-sm"
          >
            <option value="auto">{labels.auto}</option>
            <option value="image/avif">{labels.avif}</option>
            <option value="image/webp">{labels.webp}</option>
            <option value="image/jpeg" disabled={compressionMode === "lossless"}>
              {labels.jpeg}
            </option>
            <option value="image/png">{labels.png}</option>
          </select>
        </label>
        <div className="border-t border-border pt-5">
          <Text size="sm" weight="semibold">
            {labels.privacy}
          </Text>
        </div>
        {notice ? (
          <Text size="sm" className="text-destructive" role="alert">
            {notice}
          </Text>
        ) : null}
      </Surface>
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
