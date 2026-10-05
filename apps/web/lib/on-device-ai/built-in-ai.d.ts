// Chrome's built-in AI APIs, which run Gemini Nano on the device. They exist only in browsers
// that ship them, so every global here may be missing at runtime: check with `in` first.
// https://developer.chrome.com/docs/ai/built-in-apis

type AIAvailability = "unavailable" | "downloadable" | "downloading" | "available";

interface AIDownloadProgressEvent extends Event {
  /** Download progress from 0 to 1. */
  readonly loaded: number;
}

interface AICreateMonitor extends EventTarget {
  addEventListener(
    type: "downloadprogress",
    listener: (event: AIDownloadProgressEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

interface AICreateOptions {
  monitor?: (monitor: AICreateMonitor) => void;
  signal?: AbortSignal;
}

interface AIDestroyable {
  destroy(): void;
}

interface AIRequestOptions {
  signal?: AbortSignal;
}

type LanguageModelExpected = { type: "text" | "image" | "audio"; languages?: string[] };

interface LanguageModelMessage {
  role: "system" | "user" | "assistant";
  content: string | { type: "text" | "image" | "audio"; value: unknown }[];
}

interface LanguageModelOptions {
  expectedInputs?: LanguageModelExpected[];
  expectedOutputs?: LanguageModelExpected[];
}

interface LanguageModelCreateOptions extends AICreateOptions, LanguageModelOptions {
  initialPrompts?: LanguageModelMessage[];
}

interface LanguageModelPromptOptions extends AIRequestOptions {
  responseConstraint?: object;
  omitResponseConstraintInput?: boolean;
}

interface LanguageModelSession extends AIDestroyable {
  readonly inputQuota: number;
  readonly inputUsage: number;
  prompt(
    input: string | LanguageModelMessage[],
    options?: LanguageModelPromptOptions,
  ): Promise<string>;
  promptStreaming(
    input: string | LanguageModelMessage[],
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string>;
}

declare const LanguageModel: {
  availability(options?: LanguageModelOptions): Promise<AIAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
};

interface AILanguageOptions {
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
}

interface SummarizerOptions extends AILanguageOptions {
  format?: "markdown" | "plain-text";
  length?: "short" | "medium" | "long";
  type?: "key-points" | "tldr" | "teaser" | "headline";
}

interface SummarizerCreateOptions extends AICreateOptions, SummarizerOptions {
  sharedContext?: string;
}

interface SummarizerSession extends AIDestroyable {
  readonly inputQuota: number;
  measureInputUsage(input: string): Promise<number>;
  summarize(input: string, options?: AIRequestOptions & { context?: string }): Promise<string>;
  summarizeStreaming(
    input: string,
    options?: AIRequestOptions & { context?: string },
  ): ReadableStream<string>;
}

declare const Summarizer: {
  availability(options?: SummarizerOptions): Promise<AIAvailability>;
  create(options?: SummarizerCreateOptions): Promise<SummarizerSession>;
};

interface RewriterOptions extends AILanguageOptions {
  format?: "as-is" | "markdown" | "plain-text";
  length?: "as-is" | "shorter" | "longer";
  tone?: "as-is" | "more-formal" | "more-casual";
}

interface RewriterCreateOptions extends AICreateOptions, RewriterOptions {
  sharedContext?: string;
}

interface RewriterSession extends AIDestroyable {
  rewrite(input: string, options?: AIRequestOptions & { context?: string }): Promise<string>;
  rewriteStreaming(
    input: string,
    options?: AIRequestOptions & { context?: string },
  ): ReadableStream<string>;
}

declare const Rewriter: {
  availability(options?: RewriterOptions): Promise<AIAvailability>;
  create(options?: RewriterCreateOptions): Promise<RewriterSession>;
};

interface ProofreaderOptions {
  expectedInputLanguages?: string[];
}

interface ProofreadCorrection {
  correction: string;
  endIndex: number;
  startIndex: number;
}

interface ProofreaderSession extends AIDestroyable {
  proofread(
    input: string,
    options?: AIRequestOptions,
  ): Promise<{ correctedInput: string; corrections: ProofreadCorrection[] }>;
}

declare const Proofreader: {
  availability(options?: ProofreaderOptions): Promise<AIAvailability>;
  create(options?: AICreateOptions & ProofreaderOptions): Promise<ProofreaderSession>;
};

interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslatorSession extends AIDestroyable {
  translate(input: string, options?: AIRequestOptions): Promise<string>;
}

declare const Translator: {
  availability(options: TranslatorOptions): Promise<AIAvailability>;
  create(options: AICreateOptions & TranslatorOptions): Promise<TranslatorSession>;
};

interface LanguageDetectorSession extends AIDestroyable {
  detect(
    input: string,
    options?: AIRequestOptions,
  ): Promise<{ confidence: number; detectedLanguage: string }[]>;
}

declare const LanguageDetector: {
  availability(options?: { expectedInputLanguages?: string[] }): Promise<AIAvailability>;
  create(
    options?: AICreateOptions & { expectedInputLanguages?: string[] },
  ): Promise<LanguageDetectorSession>;
};
