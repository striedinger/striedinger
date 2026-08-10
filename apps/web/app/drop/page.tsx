import type { Metadata } from "next";

import { LockIcon } from "@workspace/icons/lock-icon";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";

import type { DropLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getDropTranslator } from "../../messages/drop/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { DropTool } from "./drop-tool";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getDropTranslator(locale);
  const title = translate("Private Peer-to-Peer File Sharing");
  const description = translate(
    "Share files directly between devices with an encrypted peer-to-peer connection. Nothing is uploaded or stored on this server.",
  );

  return createPageMetadata({ title, description, locale, path: "/drop" });
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
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description,
    applicationCategory: "UtilitiesApplication",
    browserRequirements: "Requires JavaScript and WebRTC",
    featureList: [labels.encrypted, labels.directConnection, labels.privacy, labels.shareHint],
    locale,
    path: "/drop",
  });

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
          <ToolDetails
            title={translate("About this tool")}
            description={description}
            sections={[
              {
                title: translate("How it works"),
                description: labels.shareHint,
                items: [labels.selectFiles, labels.share, labels.join],
              },
              {
                title: translate("Privacy and security"),
                description: labels.privacy,
                items: [labels.encrypted, labels.directConnection],
              },
              {
                title: translate("Features"),
                description: labels.description,
                items: [labels.fileTooLarge, labels.roomCode, labels.copyLink],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
