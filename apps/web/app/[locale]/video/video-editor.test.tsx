import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { VideoEditorLabels } from "./types";

import { messages } from "../../../messages/video/en";
import { VideoEditor } from "./video-editor";

const labels = new Proxy({} as VideoEditorLabels, {
  get(_target, key) {
    return key === "dropPrompt"
      ? messages["Drop a video here"]
      : key === "unsupported"
        ? messages[
            "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox."
          ]
        : key === "chooseVideo"
          ? messages["Choose Video"]
          : String(key);
  },
});

const aiLabels = {
  downloading: "Downloading {percent}",
  failed: "Failed",
  onDevice: "On device",
  retry: "Try Again",
  working: "Working",
};

describe("VideoEditor", function () {
  it("explains when the browser cannot edit video instead of failing later", function () {
    render(<VideoEditor aiLabels={aiLabels} labels={labels} locale="en" />);
    expect(screen.getByText(labels.unsupported)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: labels.chooseVideo })).toBeDisabled();
  });
});
