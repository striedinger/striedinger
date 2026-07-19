import { getRequestLocale } from "../app/get-request-locale";

export async function RequestLocaleBoundary() {
  const locale = await getRequestLocale();

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.lang=${JSON.stringify(locale)}`,
      }}
    />
  );
}
