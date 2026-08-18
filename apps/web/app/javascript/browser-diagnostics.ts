import type { BrowserDiagnosticsLabels, DiagnosticRow, DiagnosticSection } from "./types";

interface NavigatorUaData {
  brands: ReadonlyArray<{ brand: string; version: string }>;
  getHighEntropyValues(hints: ReadonlyArray<string>): Promise<Record<string, unknown>>;
  mobile: boolean;
  platform: string;
}

interface BatteryManagerLike {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface NetworkInformationLike {
  downlink?: number;
  downlinkMax?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

type NavigatorExtensions = Navigator & {
  bluetooth?: { getAvailability?: () => Promise<boolean> };
  connection?: NetworkInformationLike;
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryManagerLike>;
  globalPrivacyControl?: boolean;
  userAgentData?: NavigatorUaData;
};

type WindowExtensions = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type ScreenExtensions = Screen & {
  availLeft?: number;
  availTop?: number;
  isExtended?: boolean;
};

const unavailableValueLength = 2_048;

export async function collectBrowserDiagnostics(
  labels: BrowserDiagnosticsLabels,
): Promise<ReadonlyArray<DiagnosticSection>> {
  const extendedNavigator = navigator as NavigatorExtensions;
  const scripts = Array.from(document.scripts);
  const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
  const [clientHintsRows, batteryRows, mediaRows, storageRows] = await Promise.all([
    collectClientHints(extendedNavigator, labels),
    collectBatteryAndNetwork(extendedNavigator, labels),
    collectMediaAndDeviceApis(extendedNavigator, labels),
    collectStorageApis(labels),
  ]);

  return [
    {
      title: labels.documentAndJavaScript,
      rows: [
        row("JavaScript", labels.enabled),
        row("document.referrer", document.referrer, labels.unavailable),
        row("document.characterSet", document.characterSet, labels.unavailable),
        row("document.compatMode", document.compatMode, labels.unavailable),
        row("document.visibilityState", document.visibilityState, labels.unavailable),
        row("document.fullscreenEnabled", document.fullscreenEnabled, labels.unavailable),
        row(
          "document.inlineScripts",
          scripts.some(function isInlineScript(script) {
            return !script.src;
          }),
          labels.unavailable,
        ),
        row(
          "document.sameOriginScripts",
          scripts.some(function isSameOriginScript(script) {
            return (
              Boolean(script.src) &&
              new URL(script.src, window.location.href).origin === window.location.origin
            );
          }),
          labels.unavailable,
        ),
        row(
          "document.thirdPartyScripts",
          scripts.some(function isThirdPartyScript(script) {
            return (
              Boolean(script.src) &&
              new URL(script.src, window.location.href).origin !== window.location.origin
            );
          }),
          labels.unavailable,
        ),
        row("window.isSecureContext", window.isSecureContext, labels.unavailable),
        row("window.crossOriginIsolated", window.crossOriginIsolated, labels.unavailable),
      ],
    },
    {
      title: labels.screenAndWindow,
      rows: collectScreenAndWindow(labels),
    },
    {
      title: labels.dateTimeAndInternationalization,
      rows: [
        row("Date", new Date().toString(), labels.unavailable),
        row("Date.toLocaleString()", new Date().toLocaleString(), labels.unavailable),
        row("Date.toISOString()", new Date().toISOString(), labels.unavailable),
        row("Date.getTimezoneOffset()", new Date().getTimezoneOffset(), labels.unavailable),
        row("Intl.locale", resolvedOptions.locale, labels.unavailable),
        row("Intl.calendar", resolvedOptions.calendar, labels.unavailable),
        row("Intl.numberingSystem", resolvedOptions.numberingSystem, labels.unavailable),
        row("Intl.timeZone", resolvedOptions.timeZone, labels.unavailable),
        row("Intl.hourCycle", resolvedOptions.hourCycle, labels.unavailable),
      ],
    },
    {
      title: labels.navigator,
      rows: collectNavigator(extendedNavigator, labels),
    },
    {
      title: labels.clientHints,
      rows: clientHintsRows,
    },
    {
      title: labels.pluginsAndMimeTypes,
      rows: collectPluginsAndMimeTypes(labels),
    },
    {
      title: labels.batteryAndNetwork,
      rows: batteryRows,
    },
    {
      title: labels.mediaAndDeviceApis,
      rows: mediaRows,
    },
    {
      title: labels.storageApis,
      rows: storageRows,
    },
    {
      title: labels.navigatorProperties,
      rows: collectAdditionalNavigatorProperties(labels),
    },
  ];
}

export function serializeDiagnosticValue(value: unknown, unavailable: string): string {
  if (value === undefined || value === null || value === "") {
    return unavailable;
  }

  let serialized: string;

  if (typeof value === "string") {
    serialized = value;
  } else if (typeof value === "function") {
    serialized = "[function]";
  } else if (typeof value === "object") {
    try {
      serialized = JSON.stringify(value, null, 2) ?? Object.prototype.toString.call(value);
    } catch {
      serialized = Object.prototype.toString.call(value);
    }
  } else if (typeof value === "number" || typeof value === "bigint") {
    serialized = value.toString();
  } else if (typeof value === "boolean") {
    serialized = value ? "true" : "false";
  } else if (typeof value === "symbol") {
    serialized = value.toString();
  } else {
    serialized = unavailable;
  }

  return serialized.length > unavailableValueLength
    ? `${serialized.slice(0, unavailableValueLength)}…`
    : serialized;
}

function collectScreenAndWindow(labels: BrowserDiagnosticsLabels): ReadonlyArray<DiagnosticRow> {
  const extendedScreen = screen as ScreenExtensions;

  return [
    row("screen.width", screen.width, labels.unavailable),
    row("screen.height", screen.height, labels.unavailable),
    row("screen.availWidth", screen.availWidth, labels.unavailable),
    row("screen.availHeight", screen.availHeight, labels.unavailable),
    row("screen.availTop", extendedScreen.availTop, labels.unavailable),
    row("screen.availLeft", extendedScreen.availLeft, labels.unavailable),
    row("screen.colorDepth", screen.colorDepth, labels.unavailable),
    row("screen.pixelDepth", screen.pixelDepth, labels.unavailable),
    row("screen.orientation.type", screen.orientation?.type, labels.unavailable),
    row("screen.orientation.angle", screen.orientation?.angle, labels.unavailable),
    row("screen.isExtended", extendedScreen.isExtended, labels.unavailable),
    row("window.devicePixelRatio", window.devicePixelRatio, labels.unavailable),
    row("window.innerWidth", window.innerWidth, labels.unavailable),
    row("window.innerHeight", window.innerHeight, labels.unavailable),
    row("window.outerWidth", window.outerWidth, labels.unavailable),
    row("window.outerHeight", window.outerHeight, labels.unavailable),
    row("visualViewport.width", window.visualViewport?.width, labels.unavailable),
    row("visualViewport.height", window.visualViewport?.height, labels.unavailable),
    row("visualViewport.scale", window.visualViewport?.scale, labels.unavailable),
    row(
      "prefers-color-scheme",
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      labels.unavailable,
    ),
    row(
      "prefers-reduced-motion",
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "no-preference",
      labels.unavailable,
    ),
  ];
}

function collectNavigator(
  extendedNavigator: NavigatorExtensions,
  labels: BrowserDiagnosticsLabels,
): ReadonlyArray<DiagnosticRow> {
  return [
    row("navigator.userAgent", extendedNavigator.userAgent, labels.unavailable),
    row("navigator.appVersion", extendedNavigator.appVersion, labels.unavailable),
    row("navigator.appName", extendedNavigator.appName, labels.unavailable),
    row("navigator.appCodeName", extendedNavigator.appCodeName, labels.unavailable),
    row("navigator.product", extendedNavigator.product, labels.unavailable),
    row("navigator.productSub", extendedNavigator.productSub, labels.unavailable),
    row("navigator.vendor", extendedNavigator.vendor, labels.unavailable),
    row("navigator.vendorSub", extendedNavigator.vendorSub, labels.unavailable),
    row("navigator.platform", extendedNavigator.platform, labels.unavailable),
    row("navigator.hardwareConcurrency", extendedNavigator.hardwareConcurrency, labels.unavailable),
    row("navigator.deviceMemory", extendedNavigator.deviceMemory, labels.unavailable),
    row("navigator.language", extendedNavigator.language, labels.unavailable),
    row("navigator.languages", extendedNavigator.languages, labels.unavailable),
    row("navigator.onLine", extendedNavigator.onLine, labels.unavailable),
    row("navigator.doNotTrack", extendedNavigator.doNotTrack, labels.unavailable),
    row("navigator.cookieEnabled", extendedNavigator.cookieEnabled, labels.unavailable),
    row("navigator.maxTouchPoints", extendedNavigator.maxTouchPoints, labels.unavailable),
    row("navigator.webdriver", extendedNavigator.webdriver, labels.unavailable),
    row("navigator.pdfViewerEnabled", extendedNavigator.pdfViewerEnabled, labels.unavailable),
    row(
      "navigator.globalPrivacyControl",
      extendedNavigator.globalPrivacyControl,
      labels.unavailable,
    ),
  ];
}

async function collectClientHints(
  extendedNavigator: NavigatorExtensions,
  labels: BrowserDiagnosticsLabels,
): Promise<ReadonlyArray<DiagnosticRow>> {
  const userAgentData = extendedNavigator.userAgentData;

  if (!userAgentData) {
    return [row("navigator.userAgentData", labels.notSupported)];
  }

  let highEntropyValues: Record<string, unknown> = {};

  try {
    highEntropyValues = await userAgentData.getHighEntropyValues([
      "architecture",
      "bitness",
      "formFactors",
      "fullVersionList",
      "model",
      "platformVersion",
      "uaFullVersion",
      "wow64",
    ]);
  } catch {
    // Low-entropy values are still useful when high-entropy hints are unavailable.
  }

  return [
    row("API Status", labels.supported),
    row("brands", userAgentData.brands, labels.unavailable),
    row("mobile", userAgentData.mobile, labels.unavailable),
    row("platform", userAgentData.platform, labels.unavailable),
    ...Object.entries(highEntropyValues).map(function createHintRow([key, value]) {
      return row(key, value, labels.unavailable);
    }),
  ];
}

function collectPluginsAndMimeTypes(
  labels: BrowserDiagnosticsLabels,
): ReadonlyArray<DiagnosticRow> {
  const plugins = Array.from(navigator.plugins, function formatPlugin(plugin) {
    return `${plugin.name} (${plugin.filename || labels.unavailable})`;
  });
  const mimeTypes = Array.from(navigator.mimeTypes, function formatMimeType(mimeType) {
    return `${mimeType.type}${mimeType.description ? ` — ${mimeType.description}` : ""}`;
  });

  return [
    row("navigator.plugins", plugins, labels.unavailable),
    row("navigator.mimeTypes", mimeTypes, labels.unavailable),
  ];
}

async function collectBatteryAndNetwork(
  extendedNavigator: NavigatorExtensions,
  labels: BrowserDiagnosticsLabels,
): Promise<ReadonlyArray<DiagnosticRow>> {
  const rows: DiagnosticRow[] = [];
  const connection = extendedNavigator.connection;

  if (connection) {
    rows.push(
      row("Network Information API", labels.supported),
      row("connection.type", connection.type, labels.unavailable),
      row("connection.effectiveType", connection.effectiveType, labels.unavailable),
      row("connection.downlink", connection.downlink, labels.unavailable),
      row("connection.downlinkMax", connection.downlinkMax, labels.unavailable),
      row("connection.rtt", connection.rtt, labels.unavailable),
      row("connection.saveData", connection.saveData, labels.unavailable),
    );
  } else {
    rows.push(row("Network Information API", labels.notSupported));
  }

  if (!extendedNavigator.getBattery) {
    rows.push(row("Battery Status API", labels.notSupported));
    return rows;
  }

  try {
    const battery = await extendedNavigator.getBattery();
    rows.push(
      row("Battery Status API", labels.supported),
      row("battery.charging", battery.charging, labels.unavailable),
      row("battery.chargingTime", battery.chargingTime, labels.unavailable),
      row("battery.dischargingTime", battery.dischargingTime, labels.unavailable),
      row("battery.level", `${Math.round(battery.level * 100)}%`, labels.unavailable),
    );
  } catch {
    rows.push(row("Battery Status API", labels.unavailable));
  }

  return rows;
}

async function collectMediaAndDeviceApis(
  extendedNavigator: NavigatorExtensions,
  labels: BrowserDiagnosticsLabels,
): Promise<ReadonlyArray<DiagnosticRow>> {
  const rows: DiagnosticRow[] = [];
  const AudioContextConstructor =
    window.AudioContext ?? (window as WindowExtensions).webkitAudioContext;

  if (AudioContextConstructor) {
    try {
      const audioContext = new AudioContextConstructor();
      rows.push(
        row("Web Audio API", labels.supported),
        row("audioContext.state", audioContext.state, labels.unavailable),
        row("audioContext.sampleRate", audioContext.sampleRate, labels.unavailable),
        row(
          "audioContext.destination.maxChannelCount",
          audioContext.destination.maxChannelCount,
          labels.unavailable,
        ),
        row(
          "audioContext.destination.channelCount",
          audioContext.destination.channelCount,
          labels.unavailable,
        ),
      );
      await audioContext.close();
    } catch {
      rows.push(row("Web Audio API", labels.unavailable));
    }
  } else {
    rows.push(row("Web Audio API", labels.notSupported));
  }

  const voices = window.speechSynthesis?.getVoices().map(function formatVoice(voice) {
    return `${voice.name} (${voice.lang})${voice.default ? " · default" : ""}`;
  });
  rows.push(
    row(
      "SpeechSynthesis API",
      "speechSynthesis" in window ? labels.supported : labels.notSupported,
    ),
    row("speechSynthesis.voices", voices, labels.unavailable),
  );

  if (extendedNavigator.bluetooth?.getAvailability) {
    try {
      rows.push(
        row("Web Bluetooth API", labels.supported),
        row(
          "bluetooth.getAvailability()",
          await extendedNavigator.bluetooth.getAvailability(),
          labels.unavailable,
        ),
      );
    } catch {
      rows.push(row("Web Bluetooth API", labels.unavailable));
    }
  } else {
    rows.push(row("Web Bluetooth API", labels.notSupported));
  }

  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const deviceCounts: Record<string, number> = {};

      for (const device of devices) {
        deviceCounts[device.kind] = (deviceCounts[device.kind] ?? 0) + 1;
      }

      rows.push(
        row("MediaDevices API", labels.supported),
        row("mediaDevices.deviceCounts", deviceCounts, labels.unavailable),
      );
    } catch {
      rows.push(row("MediaDevices API", labels.unavailable));
    }
  } else {
    rows.push(row("MediaDevices API", labels.notSupported));
  }

  return rows;
}

async function collectStorageApis(
  labels: BrowserDiagnosticsLabels,
): Promise<ReadonlyArray<DiagnosticRow>> {
  const rows = [
    row("localStorage", canAccessStorage("localStorage") ? labels.supported : labels.unavailable),
    row(
      "sessionStorage",
      canAccessStorage("sessionStorage") ? labels.supported : labels.unavailable,
    ),
    row("IndexedDB", "indexedDB" in window ? labels.supported : labels.notSupported),
    row("Cache Storage", "caches" in window ? labels.supported : labels.notSupported),
    row("Cookie Store API", "cookieStore" in window ? labels.supported : labels.notSupported),
  ];

  if (!navigator.storage?.estimate) {
    rows.push(row("StorageManager API", labels.notSupported));
    return rows;
  }

  try {
    const estimate = await navigator.storage.estimate();
    rows.push(
      row("StorageManager API", labels.supported),
      row("storage.usage", estimate.usage, labels.unavailable),
      row("storage.quota", estimate.quota, labels.unavailable),
    );
  } catch {
    rows.push(row("StorageManager API", labels.unavailable));
  }

  return rows;
}

function collectAdditionalNavigatorProperties(
  labels: BrowserDiagnosticsLabels,
): ReadonlyArray<DiagnosticRow> {
  const knownProperties = new Set([
    "appCodeName",
    "appName",
    "appVersion",
    "bluetooth",
    "connection",
    "cookieEnabled",
    "deviceMemory",
    "doNotTrack",
    "getBattery",
    "globalPrivacyControl",
    "hardwareConcurrency",
    "language",
    "languages",
    "maxTouchPoints",
    "mimeTypes",
    "onLine",
    "pdfViewerEnabled",
    "platform",
    "plugins",
    "product",
    "productSub",
    "userAgent",
    "userAgentData",
    "vendor",
    "vendorSub",
    "webdriver",
  ]);
  const propertyNames = new Set<string>();
  let currentObject: object | null = navigator;

  while (currentObject && currentObject !== Object.prototype) {
    for (const propertyName of Object.getOwnPropertyNames(currentObject)) {
      if (propertyName !== "constructor" && !knownProperties.has(propertyName)) {
        propertyNames.add(propertyName);
      }
    }
    currentObject = Object.getPrototypeOf(currentObject) as object | null;
  }

  return Array.from(propertyNames)
    .toSorted()
    .slice(0, 100)
    .map(function createNavigatorPropertyRow(propertyName) {
      let value: unknown;

      try {
        value = Reflect.get(navigator, propertyName);
      } catch {
        value = labels.unavailable;
      }

      return row(`navigator.${propertyName}`, value, labels.unavailable);
    });
}

function canAccessStorage(storageName: "localStorage" | "sessionStorage") {
  try {
    return window[storageName] !== undefined;
  } catch {
    return false;
  }
}

function row(label: string, value: unknown, unavailable = ""): DiagnosticRow {
  return {
    label,
    value: serializeDiagnosticValue(value, unavailable),
  };
}
