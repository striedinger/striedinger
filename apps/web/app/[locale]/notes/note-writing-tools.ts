import { readStreamedText } from "../../../lib/on-device-ai/on-device-ai-session";
import {
  getProofreaderOptions,
  getRewriterOptions,
  getSummarizerOptions,
} from "./note-writing-tools-options";

export type NoteRewriteStyle = "rewrite" | "friendly" | "professional" | "concise";
export type NoteSummaryStyle = "summary" | "key-points";

interface WritingToolContext {
  monitor: (monitor: AICreateMonitor) => void;
  signal: AbortSignal;
}

const rewriteOptions: Readonly<Record<NoteRewriteStyle, RewriterOptions>> = {
  concise: { length: "shorter", tone: "as-is" },
  friendly: { length: "as-is", tone: "more-casual" },
  professional: { length: "as-is", tone: "more-formal" },
  rewrite: { length: "as-is", tone: "as-is" },
};

export async function proofreadNote(text: string, locale: string, context: WritingToolContext) {
  const proofreader = await Proofreader.create({ ...getProofreaderOptions(locale), ...context });
  try {
    return await proofreader.proofread(text, { signal: context.signal });
  } finally {
    proofreader.destroy();
  }
}

export async function rewriteNote(
  text: string,
  style: NoteRewriteStyle,
  locale: string,
  onText: (text: string) => void,
  context: WritingToolContext,
) {
  const rewriter = await Rewriter.create({
    ...getRewriterOptions(locale),
    ...rewriteOptions[style],
    sharedContext: "A personal note written in a notes app.",
    ...context,
  });
  try {
    return await readStreamedText(
      rewriter.rewriteStreaming(text, { signal: context.signal }),
      onText,
    );
  } finally {
    rewriter.destroy();
  }
}

export async function summarizeNote(
  text: string,
  style: NoteSummaryStyle,
  locale: string,
  onText: (text: string) => void,
  context: WritingToolContext,
) {
  const summarizer = await Summarizer.create({
    ...getSummarizerOptions(locale),
    type: style === "summary" ? "tldr" : "key-points",
    length: style === "summary" ? "short" : "medium",
    sharedContext: "A personal note written in a notes app.",
    ...context,
  });
  try {
    return await readStreamedText(
      summarizer.summarizeStreaming(text, { signal: context.signal }),
      onText,
    );
  } finally {
    summarizer.destroy();
  }
}
