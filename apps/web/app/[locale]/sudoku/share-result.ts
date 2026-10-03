import type { SudokuDifficulty, SudokuLabels } from "./types";

interface ShareResultOptions {
  date: string;
  difficulty: SudokuDifficulty;
  elapsedTime: string;
  inputCount: number;
  labels: SudokuLabels;
  localizedDate: string;
  minimumInputCount: number;
  score: number;
}

export type ShareOutcome = "downloaded" | "shared";

export async function shareSudokuResult({
  date,
  difficulty,
  elapsedTime,
  inputCount,
  labels,
  localizedDate,
  minimumInputCount,
  score,
}: ShareResultOptions): Promise<ShareOutcome> {
  const imageBlob = await createResultImage({
    date,
    difficulty,
    elapsedTime,
    inputCount,
    labels,
    localizedDate,
    minimumInputCount,
    score,
  });
  const filename = `sudoku-${date}-${difficulty}.png`;
  const imageFile = new File([imageBlob], filename, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [imageFile] })) {
    await navigator.share({
      files: [imageFile],
      title: labels.title,
      text: `${labels.completed} · ${labels.difficulty[difficulty]} · ${elapsedTime} · ${labels.score} ${score}/100`,
    });
    return "shared";
  }

  const imageUrl = URL.createObjectURL(imageBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = imageUrl;
  downloadLink.download = filename;
  downloadLink.click();
  window.setTimeout(function releaseImageUrl() {
    URL.revokeObjectURL(imageUrl);
  }, 1_000);
  return "downloaded";
}

function createResultImage(options: ShareResultOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1_200;
  canvas.height = 630;
  const context = canvas.getContext("2d");

  if (!context) {
    return Promise.reject(new Error("Canvas is unavailable"));
  }

  context.fillStyle = "#f4f1ea";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#171717";
  setFittedFont(context, options.labels.title, 42, 28, 1_056, "600", "ui-serif, Georgia, serif");
  context.fillText(options.labels.title, 72, 92, 1_056);

  context.strokeStyle = "#171717";
  context.lineWidth = 2;
  context.strokeRect(72, 140, 1_056, 390);

  context.font = "700 112px ui-rounded, system-ui, sans-serif";
  context.fillText(options.elapsedTime, 120, 330);

  const scoreText = `${options.labels.score} ${options.score}/100`;
  setFittedFont(context, scoreText, 34, 24, 430, "500", "ui-sans-serif, system-ui, sans-serif");
  context.fillText(scoreText, 650, 330, 430);
  setFittedFont(
    context,
    options.labels.difficulty[options.difficulty],
    34,
    24,
    430,
    "500",
    "ui-sans-serif, system-ui, sans-serif",
  );
  context.fillText(options.labels.difficulty[options.difficulty], 120, 405, 430);
  context.fillStyle = "#68645d";
  context.font = "400 28px ui-sans-serif, system-ui, sans-serif";
  setFittedFont(
    context,
    options.localizedDate,
    28,
    20,
    430,
    "400",
    "ui-sans-serif, system-ui, sans-serif",
  );
  context.fillText(options.localizedDate, 120, 458, 430);
  const inputText = options.labels.scoreInputs
    .replace("{count}", String(options.inputCount))
    .replace("{minimum}", String(options.minimumInputCount));
  setFittedFont(context, inputText, 28, 20, 430, "400", "ui-sans-serif, system-ui, sans-serif");
  context.fillText(inputText, 650, 405, 430);

  context.fillStyle = "#171717";
  context.font = "500 24px ui-sans-serif, system-ui, sans-serif";
  context.fillText("striedinger.co/sudoku", 72, 585);

  return new Promise(function createBlob(resolve, reject) {
    canvas.toBlob(function resolveBlob(blob) {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Image generation failed"));
      }
    }, "image/png");
  });
}

function setFittedFont(
  context: CanvasRenderingContext2D,
  text: string,
  preferredSize: number,
  minimumSize: number,
  maximumWidth: number,
  weight: string,
  family: string,
) {
  for (let fontSize = preferredSize; fontSize >= minimumSize; fontSize -= 1) {
    context.font = `${weight} ${fontSize}px ${family}`;

    if (context.measureText(text).width <= maximumWidth) {
      return;
    }
  }
}
