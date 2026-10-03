export interface DiagnosticRow {
  label: string;
  value: string;
}

export interface DiagnosticSection {
  rows: ReadonlyArray<DiagnosticRow>;
  title: string;
}

export interface BrowserDiagnosticsLabels {
  batteryAndNetwork: string;
  clientHints: string;
  collecting: string;
  dateTimeAndInternationalization: string;
  documentAndJavaScript: string;
  enabled: string;
  mediaAndDeviceApis: string;
  navigator: string;
  navigatorProperties: string;
  notSupported: string;
  pluginsAndMimeTypes: string;
  refresh: string;
  screenAndWindow: string;
  storageApis: string;
  supported: string;
  unavailable: string;
}
