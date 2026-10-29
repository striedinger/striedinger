interface JsonLdProps {
  value: object;
}

export function JsonLd({ value }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // oxlint-disable-next-line react/no-danger -- JSON-LD must be the script's raw text; `<` is escaped so it cannot close the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value).replace(/</g, "\\u003c"),
      }}
    />
  );
}
