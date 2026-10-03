export interface IpDiagnosticRow {
  label: string;
  value: string;
}

export interface RequestDiagnostics {
  headers: ReadonlyArray<IpDiagnosticRow>;
  ipAddress: string;
  ipVersion: string;
  location: ReadonlyArray<IpDiagnosticRow>;
  request: ReadonlyArray<IpDiagnosticRow>;
}

export interface WebRtcLabels {
  address: string;
  candidateType: string;
  description: string;
  failed: string;
  heading: string;
  noCandidates: string;
  notSupported: string;
  protocol: string;
  runTest: string;
  testing: string;
}
