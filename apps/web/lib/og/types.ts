export interface PageMetadata {
  canonicalUrl: string;
  description: string;
  image: string;
  siteName: string;
  title: string;
  twitterCard: string;
  twitterDescription: string;
  twitterImage: string;
  twitterTitle: string;
  tags: ReadonlyArray<MetadataTag>;
}

export interface MetadataTag {
  name: string;
  value: string;
}

export type PreviewErrorCode =
  | "invalid-url"
  | "unsafe-url"
  | "unreachable"
  | "not-html"
  | "too-large"
  | "missing-metadata"
  | "rate-limited";

export type PreviewState =
  | { status: "idle"; url: string }
  | { status: "error"; url: string; error: PreviewErrorCode }
  | {
      status: "success";
      url: string;
      durationMilliseconds: number;
      metadata: PageMetadata;
    };
