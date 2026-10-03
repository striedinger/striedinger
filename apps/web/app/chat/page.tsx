import type { Metadata } from "next";

import { LockIcon } from "@workspace/icons/lock-icon";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";

import type { ChatLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getTranslator } from "../../messages/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { ChatTool } from "./chat-tool";

const descriptionKey =
  "Chat privately with nearby devices over a fast, encrypted, serverless peer-to-peer mesh.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const title = translate("Private Nearby Chat");
  const description = translate(descriptionKey);

  return createPageMetadata({ title, description, locale, path: "/chat" });
}

export default async function ChatPage() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const title = translate("Nearby Chat - Private local messaging");
  const description = translate(descriptionKey);
  const pairingDescription = translate(
    "Use a short pairing code to connect nearby browsers. WebRTC carries messages directly between peers.",
  );
  const privacyDescription = translate(
    "Messages are encrypted between connected devices and are not stored after the temporary session ends.",
  );
  const temporaryDescription = translate(
    "No account is required. Leaving the session clears the temporary conversation from this app.",
  );
  const labels: ChatLabels = {
    anonymousAlias: translate("Anonymous neighbor"),
    back: translate("Back"),
    cancelPairing: translate("Cancel pairing"),
    closeDevices: translate("Close devices"),
    connect: translate("Connect"),
    connecting: translate("Connecting…"),
    connectionFailed: translate(
      "A local connection could not be established. Keep both devices on the same Wi-Fi network and try again.",
    ),
    connectToChat: translate("Connect a device to chat"),
    connectToJoin: translate("Connect a device to join this chat."),
    connectToStart: translate("Connect a device to start chatting."),
    continue: translate("Continue"),
    copied: translate("Copied"),
    deviceCount: translate("{count} devices"),
    devicesConnected: translate("{count} devices connected"),
    invalidAnswer: translate("That answer is invalid. Ask the other device to create it again."),
    invalidInvite: translate("That invite is invalid or could not be opened."),
    inviteFailed: translate("Could not create an invite. Check browser support and try again."),
    inviteSomeone: translate("Invite someone"),
    joinWithInvite: translate("Join with an invite"),
    keepPageOpen: translate("Keep this page open while they connect."),
    localOnly: translate("Local only"),
    message: translate("Message"),
    messageNearby: translate("Message nearby…"),
    messages: translate("Messages"),
    nearbyDevices: translate("Nearby devices"),
    noMessages: translate("No messages yet"),
    oneDevice: translate("1 device"),
    oneDeviceConnected: translate("1 device connected"),
    pairingCode: translate("One-time pairing code"),
    pasteInvite: translate("Paste the invite you received"),
    pasteReply: translate("Paste their reply"),
    preparingConnection: translate("Preparing a private connection…"),
    readyToConnect: translate("Ready to connect"),
    send: translate("Send"),
    sendInvite: translate("Send invite"),
    sendInviteInstruction: translate("Send this invite to the other person."),
    sendReply: translate("Send reply"),
    sendReplyInstruction: translate("Send this reply to the person who invited you."),
    shared: translate("Shared"),
    showCode: translate("Show code"),
    title: translate("Nearby Chat"),
    you: translate("You"),
    youAre: translate("You’re {name}"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: title,
    description,
    applicationCategory: "CommunicationApplication",
    browserRequirements: "Requires JavaScript, WebRTC, and Web Crypto",
    featureList: [pairingDescription, privacyDescription, temporaryDescription],
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
            title={labels.title}
            description={translate(
              "Private chat for nearby devices. Messages disappear when you leave.",
            )}
            eyebrow={
              <Text
                as="span"
                size="sm"
                weight="medium"
                className="hidden w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground sm:inline-flex"
              >
                <LockIcon className="size-3.5" />
                {translate("Private · Local · Temporary")}
              </Text>
            }
          />
          <ChatTool labels={labels} />
          <ToolDetails
            title={translate("About this tool")}
            description={description}
            sections={[
              {
                title: translate("How it works"),
                description: pairingDescription,
              },
              {
                title: translate("Privacy and security"),
                description: privacyDescription,
              },
              {
                title: translate("Features"),
                description: temporaryDescription,
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
