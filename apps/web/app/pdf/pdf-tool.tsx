"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useCallback, useMemo, useState } from "react";

import type { PdfCompressionMode, PdfOperationStage, PdfToolLabels } from "./types";

import { PdfDropZone } from "./pdf-drop-zone";
import { PdfPreview } from "./pdf-preview";

interface Result {
  blob: Blob;
  name: string;
  unlocked: boolean;
}

export function PdfTool({ labels }: { labels: PdfToolLabels }) {
  const [file, setFile] = useState<File>();
  const [compressionMode, setCompressionMode] = useState<PdfCompressionMode>("balanced");
  const [quality, setQuality] = useState(70);
  const [passwordInput, setPasswordInput] = useState("");
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordIsValid, setPasswordIsValid] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<PdfOperationStage>("preparing");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>();

  const handlePasswordResult = useCallback(function handlePasswordResult(
    documentRequiresPassword: boolean,
    isValid: boolean,
  ) {
    if (documentRequiresPassword) setRequiresPassword(true);
    setPasswordIsValid(isValid);
  }, []);

  function selectFile(selectedFile: File) {
    setFile(selectedFile);
    setPassword("");
    setPasswordInput("");
    setRequiresPassword(false);
    setPasswordIsValid(true);
    setResult(undefined);
    setError("");
    setProgress(0);
  }

  function updateProgress(nextProgress: number, nextStage: PdfOperationStage) {
    setProgress(nextProgress);
    setStage(nextStage);
  }

  async function runOperation(operation: "compress" | "unlock") {
    if (!file) return;
    setIsProcessing(true);
    setResult(undefined);
    setError("");
    setProgress(2);
    setStage("preparing");
    try {
      const processor = await import("./process-pdf");
      const blob =
        operation === "unlock"
          ? await processor.unlockPdf(file, password, updateProgress)
          : await processor.optimizePdf(
              file,
              { compressionMode, password: password || undefined, quality: quality / 100 },
              updateProgress,
            );
      const suffix = operation === "unlock" ? "unrestricted" : "optimized";
      setProgress(100);
      setResult({
        blob,
        name: `${file.name.replace(/\.pdf$/i, "")}-${suffix}.pdf`,
        unlocked: operation === "unlock",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.unsupported);
    } finally {
      setIsProcessing(false);
    }
  }

  const previewFile = useMemo(
    function createPreviewFile() {
      return result ? new File([result.blob], result.name, { type: "application/pdf" }) : file;
    },
    [file, result],
  );
  const savings = file && result ? Math.max(0, 1 - result.blob.size / file.size) : 0;
  const stageLabel =
    stage === "preparing"
      ? labels.processing
      : stage === "decoding"
        ? labels.open
        : stage === "compressing"
          ? labels.compress
          : labels.result;

  if (!file) {
    return <PdfDropZone labels={labels} onFile={selectFile} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Surface className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <Text weight="semibold" className="truncate">
              {file.name}
            </Text>
            <Text size="sm" tone="muted">
              {formatBytes(file.size)}
            </Text>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={function replaceFile() {
              setFile(undefined);
              setResult(undefined);
            }}
          >
            {labels.replaceFile}
          </Button>
        </Surface>

        <PdfPreview
          key={`${previewFile!.name}-${previewFile!.size}-${previewFile!.lastModified}`}
          file={previewFile!}
          labels={labels}
          password={result?.unlocked ? "" : password}
          onPasswordResult={handlePasswordResult}
        />

        {isProcessing ? (
          <Surface className="p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <Text size="sm" weight="semibold">
                {stageLabel}…
              </Text>
              <Text size="sm" className="text-primary tabular-nums">
                {Math.round(progress)}%
              </Text>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="h-full animate-pulse rounded-full bg-primary transition-[width] duration-500 motion-reduce:animate-none motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Text size="sm" tone="muted" className="mt-3">
              {labels.fileStaysLocal}
            </Text>
          </Surface>
        ) : null}

        {result ? (
          <Surface className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <Text weight="semibold">
                {result.unlocked ? labels.unlockComplete : labels.result}
              </Text>
              <Text size="sm" tone="muted">
                {formatBytes(result.blob.size)}
                {!result.unlocked && savings > 0
                  ? ` · ${Math.round(savings * 100)}% ${labels.saved}`
                  : ""}
                {!result.unlocked && savings === 0 ? ` · ${labels.noSmallerResult}` : ""}
              </Text>
            </div>
            <Button
              type="button"
              onClick={function downloadResult() {
                download(result);
              }}
            >
              {labels.download}
            </Button>
          </Surface>
        ) : null}
      </div>

      <Surface className="flex flex-col gap-6 p-5 lg:sticky lg:top-20">
        {requiresPassword ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={function submitPassword(event) {
              event.preventDefault();
              setPassword(passwordInput);
            }}
          >
            <label className="flex flex-col gap-2">
              <Text size="sm" weight="semibold">
                {labels.password}
              </Text>
              <Input
                type="password"
                value={passwordInput}
                autoComplete="off"
                onChange={function changePassword(event) {
                  setPasswordInput(event.target.value);
                }}
              />
            </label>
            <Text size="sm" tone="muted">
              {labels.passwordHelp}
            </Text>
            <Button type="submit" size="sm" disabled={!passwordInput}>
              {labels.open}
            </Button>
          </form>
        ) : null}

        <label className="flex flex-col gap-2">
          <Text size="sm" weight="semibold">
            {labels.compressionMode}
          </Text>
          <select
            value={compressionMode}
            onChange={function changeMode(event) {
              setCompressionMode(event.target.value as PdfCompressionMode);
              setResult(undefined);
            }}
            className="h-9 rounded-md border border-input bg-surface-inset px-3 text-sm"
          >
            <option value="balanced">{labels.balanced}</option>
            <option value="smallest">{labels.smallest}</option>
            <option value="lossless">{labels.lossless}</option>
          </select>
        </label>
        {compressionMode === "smallest" ? (
          <label className="flex flex-col gap-2">
            <Text size="sm" weight="semibold">
              Quality: {quality}%
            </Text>
            <input
              type="range"
              min="35"
              max="95"
              value={quality}
              className="accent-primary"
              onChange={function changeQuality(event) {
                setQuality(Number(event.target.value));
                setResult(undefined);
              }}
            />
          </label>
        ) : null}
        <Button
          type="button"
          disabled={isProcessing || (requiresPassword && !passwordIsValid)}
          onClick={function compress() {
            void runOperation("compress");
          }}
        >
          {labels.compress}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isProcessing || (requiresPassword && (!password || !passwordIsValid))}
          onClick={function removeLock() {
            void runOperation("unlock");
          }}
        >
          {labels.removeLock}
        </Button>
        {error ? (
          <Text size="sm" className="text-destructive" role="alert">
            {error}
          </Text>
        ) : null}
        <div className="border-t border-border pt-5">
          <Text size="sm" weight="semibold">
            {labels.fileStaysLocal}
          </Text>
        </div>
      </Surface>
    </div>
  );
}

function download(result: Result) {
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.name;
  anchor.click();
  setTimeout(function releaseUrl() {
    URL.revokeObjectURL(url);
  }, 1_000);
}

function formatBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
