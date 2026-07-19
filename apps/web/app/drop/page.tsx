import type { Metadata } from "next";

import { LockIcon } from "@workspace/icons/lock-icon";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";

import type { DropLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { getDropTranslator } from "../../messages/drop/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { DropTool } from "./drop-tool";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getDropTranslator(locale);
  const title = translate("Drop - Private file sharing");
  const description = translate(
    "Share files directly between devices with an encrypted peer-to-peer connection. Nothing is uploaded or stored on this server.",
  );

  return {
    title,
    description,
    alternates: { canonical: "/drop" },
    openGraph: {
      type: "website",
      url: "/drop",
      locale,
      siteName: "Hugo Striedinger",
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function DropPage() {
  const locale = await getRequestLocale();
  const translate = await getDropTranslator(locale);
  const description = translate(
    "Share files directly between devices with an encrypted peer-to-peer connection. Nothing is uploaded or stored on this server.",
  );
  const labels: DropLabels = {
    addFiles: translate("Add files"),
    availableFiles: translate("Files in this session"),
    copied: translate("Link copied"),
    copyFailed: translate("Could not copy the link. Copy the room code instead."),
    copyLink: translate("Copy invite link"),
    description,
    directConnection: translate("Sent directly"),
    download: translate("Download"),
    dropFiles: translate("Drop to share"),
    dropHint: translate("Drop files here"),
    encrypted: translate("End-to-end encrypted"),
    fileInvalid: translate("Received file failed its integrity check"),
    fileReady: translate("1 file"),
    fileTooLarge: translate("Larger than the 100 MB browser limit"),
    filesReady: translate("{count} files"),
    invalidCode: translate("Enter the complete 16-character room code."),
    join: translate("Join"),
    joinCode: translate("XXXX-XXXX-XXXX-XXXX"),
    joinHint: translate("Have a room code?"),
    noFiles: translate("Files you select or receive will appear here."),
    noPeers: translate("Waiting for another device"),
    onePeer: translate("1 device connected"),
    peers: translate("{count} devices connected"),
    preparing: translate("Preparing…"),
    privacy: translate("Files stay in your browser until a device connects. Up to 100 MB each."),
    retry: translate("Retry"),
    roomCode: translate("Your room"),
    roomError: translate(
      "A direct connection could not be established. Try another network or browser.",
    ),
    selectFiles: translate("Select files"),
    sending: translate("Sending"),
    share: translate("Share invite"),
    shareHint: translate("Send the private link or room code to another device."),
    title: translate("Drop"),
    transferFailed: translate("Transfer failed"),
    waiting: translate("Ready to send"),
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: labels.title,
    description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and WebRTC",
    url: "https://striedinger.co/drop",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-10">
          <PageHeader
            title={labels.title}
            description={description}
            eyebrow={
              <Text
                as="span"
                size="sm"
                weight="medium"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground"
              >
                <LockIcon className="size-3.5" />
                {labels.encrypted}
              </Text>
            }
          />
          <DropTool labels={labels} />
        </div>
      </PageContainer>
    </PageShell>
  );
}
