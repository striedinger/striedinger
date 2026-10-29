export async function copyText(text: string) {
  try {
    // The Clipboard API is missing outside secure contexts despite the DOM typing.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (typeof clipboard?.writeText === "function") {
      await clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to the selection-based fallback below.
  }

  const previouslyFocusedElement = document.activeElement;
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.readOnly = true;
  textArea.tabIndex = -1;
  textArea.setAttribute("aria-hidden", "true");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();

  try {
    // A missing execCommand throws, which the catch below reports as a failed copy.
    // oxlint-disable-next-line typescript/no-deprecated -- intentional legacy fallback when the Clipboard API is unavailable
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();

    if (previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElement.focus();
    }
  }
}
