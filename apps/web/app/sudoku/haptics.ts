let iosSwitchControl: HTMLInputElement | undefined;

export function triggerHapticFeedback(): void {
  navigator.vibrate?.(10);

  const switchControl = getIosSwitchControl();
  switchControl.click();
}

function getIosSwitchControl(): HTMLInputElement {
  if (iosSwitchControl?.isConnected) {
    return iosSwitchControl;
  }

  const switchControl = document.createElement("input");
  switchControl.type = "checkbox";
  switchControl.setAttribute("switch", "");
  switchControl.setAttribute("aria-hidden", "true");
  switchControl.tabIndex = -1;
  switchControl.style.position = "fixed";
  switchControl.style.width = "1px";
  switchControl.style.height = "1px";
  switchControl.style.opacity = "0";
  switchControl.style.pointerEvents = "none";
  document.body.append(switchControl);
  iosSwitchControl = switchControl;
  return switchControl;
}
