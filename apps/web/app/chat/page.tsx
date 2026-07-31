import type { Metadata } from "next";

import { LockIcon } from "@workspace/icons/lock-icon";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";

import { JsonLd } from "../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getTranslator } from "../../messages/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { ChatTool } from "./chat-tool";

const descriptionKey =
  "Chat privately with nearby devices over a fast, encrypted, serverless peer-to-peer mesh.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const title = translate("Nearby Chat - Private local messaging");
  const description = translate(descriptionKey);

  return createPageMetadata({ title, description, locale, path: "/chat" });
}

export default async function ChatPage() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const title = translate("Nearby Chat - Private local messaging");
  const description = translate(descriptionKey);
  const structuredData = createWebApplicationStructuredData({
    name: title,
    description,
    applicationCategory: "CommunicationApplication",
    browserRequirements: "Requires JavaScript, WebRTC, and Web Crypto",
    featureList: [
      "End-to-end encrypted messaging",
      "Peer-to-peer WebRTC connections",
      "No account required",
      "Temporary local sessions",
    ],
    locale,
    path: "/chat",
  });

  return (
    <PageShell className="py-4 sm:py-8">
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-4 sm:gap-6">
          <PageHeader
            variant="compact"
            title={translate("Nearby Chat")}
            description="Private chat for nearby devices. Messages disappear when you leave."
            eyebrow={
              <Text
                as="span"
                size="sm"
                weight="medium"
                className="hidden w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground sm:inline-flex"
              >
                <LockIcon className="size-3.5" />
                Private · Local · Temporary
              </Text>
            }
          />
          <ChatTool />
        </div>
      </PageContainer>
    </PageShell>
  );
}
