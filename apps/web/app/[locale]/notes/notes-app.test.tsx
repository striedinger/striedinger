import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { messages } from "../../../messages/notes/en";
import { NotesApp } from "./notes-app";

const aiLabels = {
  downloading: "Downloading {percent}",
  failed: "Failed",
  onDevice: "On device",
  retry: "Try Again",
  working: "Working",
};

vi.mock("next/navigation", async function mockNavigation() {
  const { useHistoryPathname } = await import("../../../test/history-navigation");
  return { usePathname: useHistoryPathname };
});

const welcomeNoteHtml = "<h1>Welcome to Notes</h1><p>Start writing</p>";

function renderNotes() {
  return render(
    <NotesApp
      aiLabels={aiLabels}
      locale="en"
      messages={messages}
      welcomeNoteHtml={welcomeNoteHtml}
    />,
  );
}

describe("NotesApp", function () {
  beforeEach(function resetDevice() {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/notes");
  });

  afterEach(function resetUrl() {
    window.history.replaceState(null, "", "/");
  });

  it("starts with a welcome note in the Notes folder", async function () {
    renderNotes();

    const notesFolder = await screen.findByRole("button", { name: /^Notes\s*1$/ });
    fireEvent.click(notesFolder);

    expect(window.location.pathname).toBe("/notes/notes");
    expect(await screen.findByRole("button", { name: /Welcome to Notes/ })).toBeInTheDocument();
  });

  it("creates folders and rejects duplicate names", async function () {
    renderNotes();
    await screen.findByRole("button", { name: /^Notes\s*1$/ });

    fireEvent.click(screen.getByRole("button", { name: "New Folder" }));
    const dialog = await screen.findByRole("alertdialog", { name: "New Folder" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), {
      target: { value: "Recipes" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("button", { name: /^Recipes\s*0$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Folder" }));
    const secondDialog = await screen.findByRole("alertdialog", { name: "New Folder" });
    fireEvent.change(within(secondDialog).getByRole("textbox", { name: "Name" }), {
      target: { value: "recipes" },
    });
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alertdialog", { name: "Name Taken" })).toBeInTheDocument();
  });

  it("offers Writing Tools only when the browser can run them on the device", async function () {
    const summarize = vi.fn<(text: string) => ReadableStream<string>>(function streamSummary() {
      return new ReadableStream({
        start(controller) {
          controller.enqueue("Start writing.");
          controller.close();
        },
      });
    });
    vi.stubGlobal("Summarizer", {
      availability: vi.fn<() => Promise<string>>().mockResolvedValue("downloadable"),
      create: vi
        .fn<() => Promise<object>>()
        .mockResolvedValue({ destroy() {}, summarizeStreaming: summarize }),
    });
    renderNotes();
    fireEvent.click(await screen.findByRole("button", { name: /^Notes\s*1$/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Welcome to Notes/ }));

    fireEvent.click(await screen.findByRole("button", { name: "Writing Tools" }));
    expect(await screen.findByRole("button", { name: "Summary" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proofread" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Summary" }));

    expect(await screen.findByText("Start writing.")).toBeInTheDocument();
    expect(summarize).toHaveBeenCalledWith("Welcome to Notes\nStart writing", expect.anything());
    vi.unstubAllGlobals();
  });

  it("moves a deleted note to Recently Deleted", async function () {
    renderNotes();
    fireEvent.click(await screen.findByRole("button", { name: /^Notes\s*1$/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Welcome to Notes/ }));

    const editor = await screen.findByRole("textbox", { name: "Note text" });
    expect(editor).toHaveTextContent("Welcome to Notes");

    fireEvent.click(
      within(editor.closest("section") as HTMLElement).getByRole("button", { name: "More" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete Note" }));

    await waitFor(function expectRecentlyDeletedFolder() {
      expect(screen.getByRole("button", { name: /^Recently Deleted\s*1$/ })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^Notes\s*0$/ })).toBeInTheDocument();
  });
});
