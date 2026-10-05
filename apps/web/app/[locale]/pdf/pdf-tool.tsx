"use client";

import { DocIcon } from "@workspace/icons/doc-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useRef, useState } from "react";

import type { PdfCompressionMode, PdfOperationStage, PdfToolLabels } from "./types";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { iosBottomScrollEdgeClassName } from "../../../components/ios/ios-scroll-edge";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { downloadBlob } from "../../../lib/download-blob";
import { formatBytes } from "../../../lib/format-bytes";
import { PdfDropZone } from "./pdf-drop-zone";
import { PdfOptionsSection } from "./pdf-options-section";
import { PdfStatusSection } from "./pdf-status-section";

// The preview pulls in pdf.js rendering, so it loads once a file is chosen.
const PdfPreview = lazy(function importPdfPreview() {
  return import("./pdf-preview").then(function selectPdfPreview(module) {
    return { default: module.PdfPreview };
  });
});

interface Result {
  blob: Blob;
  /** The optimized document as a file, created once so the preview keeps a stable input. */
  file: File;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePasswordResult(documentRequiresPassword: boolean, isValid: boolean) {
    if (documentRequiresPassword) setRequiresPassword(true);
    setPasswordIsValid(isValid);
  }

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
    if (!file || isProcessing) return;
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
      const name = `${file.name.replace(/\.pdf$/i, "")}-${suffix}.pdf`;
      setProgress(100);
      setResult({
        blob,
        file: new File([blob], name, { type: "application/pdf" }),
        name,
        unlocked: operation === "unlock",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.unsupported);
    } finally {
      setIsProcessing(false);
    }
  }

  function selectFiles(files: File[]) {
    if (isProcessing) return;
    const pdf = files.find(function findPdf(candidate) {
      return candidate.type === "application/pdf" || /\.pdf$/i.test(candidate.name);
    });
    if (pdf) selectFile(pdf);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  const previewFile = result?.file ?? file;
  const stageLabel =
    stage === "preparing"
      ? labels.processing
      : stage === "decoding"
        ? labels.open
        : stage === "compressing"
          ? labels.compress
          : labels.result;
  const canCompress = !isProcessing && !(requiresPassword && !passwordIsValid);

  return (
    <div className="flex flex-col gap-2 pb-16">
      {file && previewFile ? (
        <>
          <IosListSection className="px-0 pt-2" label={labels.title}>
            <li className="flex min-h-16 items-center gap-3 px-4 py-2.5">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-ios-md bg-ios-tint text-white [&_svg]:size-5"
              >
                <DocIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text
                  as="span"
                  numberOfLines={1}
                  title={file.name}
                  className="text-ios-body text-ios-label"
                >
                  {file.name}
                </Text>
                <Text as="span" className="text-ios-footnote text-ios-secondary-label tabular-nums">
                  {formatBytes(file.size)}
                </Text>
              </span>
              <button
                type="button"
                disabled={isProcessing}
                className="shrink-0 rounded-full px-2 py-1 text-ios-body text-ios-tint outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-50 disabled:text-ios-tertiary-label"
                onClick={openFilePicker}
              >
                {labels.replaceFile}
              </button>
            </li>
          </IosListSection>
          <PdfStatusSection
            isProcessing={isProcessing}
            labels={labels}
            onDownload={function downloadResult() {
              if (result) download(result);
            }}
            originalSize={file.size}
            progress={progress}
            result={
              result
                ? { name: result.name, size: result.blob.size, unlocked: result.unlocked }
                : undefined
            }
            stageLabel={stageLabel}
          />
          {error ? (
            <Text role="alert" className="px-5 text-ios-footnote text-ios-red">
              {error}
            </Text>
          ) : null}
          <PdfOptionsSection
            canRemoveRestrictions={
              !isProcessing && !(requiresPassword && (!password || !passwordIsValid))
            }
            compressionMode={compressionMode}
            labels={labels}
            onCompressionModeChange={function changeMode(nextMode) {
              setCompressionMode(nextMode);
              setResult(undefined);
            }}
            onPasswordInputChange={setPasswordInput}
            onPasswordSubmit={function submitPassword() {
              setPassword(passwordInput);
            }}
            onQualityChange={function changeQuality(nextQuality) {
              setQuality(nextQuality);
              setResult(undefined);
            }}
            onRemoveRestrictions={function removeLock() {
              void runOperation("unlock");
            }}
            passwordInput={passwordInput}
            quality={quality}
            requiresPassword={requiresPassword}
          />
          <Suspense fallback={<IosSkeleton className="mt-4 h-96 w-full rounded-ios-xl" />}>
            <PdfPreview
              key={`${previewFile.name}-${previewFile.size}-${previewFile.lastModified}`}
              file={previewFile}
              labels={labels}
              password={result?.unlocked ? "" : password}
              onPasswordResult={handlePasswordResult}
            />
          </Suspense>
        </>
      ) : (
        <div className="flex flex-col pt-2">
          <div className="rounded-ios-2xl border-2 border-dashed border-ios-separator bg-ios-grouped-cell">
            <IosContentUnavailable
              className="px-6 pt-12 pb-12"
              icon={<DocIcon />}
              title={labels.dropPrompt}
              description={labels.supported}
            />
          </div>
          <Text className="px-5 pt-2 text-ios-footnote text-ios-secondary-label">
            {labels.fileStaysLocal}
          </Text>
        </div>
      )}
      <PdfDropZone label={labels.dropActive} onFiles={selectFiles} />
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".pdf,application/pdf"
        tabIndex={-1}
        aria-hidden="true"
        onChange={function selectInputFile(event) {
          selectFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pt-8 pb-safe-min-3.5",
          iosBottomScrollEdgeClassName,
        )}
      >
        <button
          type="button"
          disabled={file ? !canCompress : false}
          className={cn(iosFilledButtonClassName, "pointer-events-auto w-full max-w-sm")}
          onClick={
            file
              ? function compress() {
                  void runOperation("compress");
                }
              : openFilePicker
          }
        >
          {file ? null : <PlusIcon strokeWidth={2.8} />}
          {file ? labels.compress : labels.chooseFile}
        </button>
      </div>
    </div>
  );
}

function download(result: Result) {
  downloadBlob(result.blob, result.name);
}
