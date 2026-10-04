"use client";

import { UsersIcon } from "@workspace/icons/users-icon";
import { lazy, Suspense, useState } from "react";

import type { PairingPanelProps } from "./pairing-panel";
import type { ChatLabels } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { useHasOpened } from "../../../components/use-has-opened";
import { ChatComposer } from "./chat-composer";
import { ChatWelcome } from "./chat-welcome";
import { describeConnectedDevices } from "./device-status";
import { MessageList } from "./message-list";
import { PairingPanel } from "./pairing-panel";
import { useNearbyChat } from "./use-nearby-chat";

interface ChatToolProps {
  labels: ChatLabels;
  locale: string;
}

const DeviceDrawer = lazy(function importDeviceDrawer() {
  return import("./device-drawer").then(function selectDeviceDrawer(module) {
    return { default: module.DeviceDrawer };
  });
});

function preloadDeviceDrawer() {
  void import("./device-drawer");
}

/**
 * Nearby Chat as an iOS Messages screen. Until another device joins, the screen walks through
 * pairing under a large title; afterwards it becomes the conversation, with further pairing
 * in a bottom sheet.
 */
export function ChatTool({ labels, locale }: ChatToolProps) {
  const chat = useNearbyChat(labels);
  const [isDeviceDrawerOpen, setIsDeviceDrawerOpen] = useState(false);
  const showsConversation = chat.peerCount > 0 || chat.messages.length > 0;
  // Only one pairing panel may exist at a time, so the sheet closes with the conversation.
  if (isDeviceDrawerOpen && !showsConversation) setIsDeviceDrawerOpen(false);
  const showsDeviceDrawer = isDeviceDrawerOpen && showsConversation;
  const hasDeviceDrawerOpened = useHasOpened(showsDeviceDrawer);
  const pairingProps: PairingPanelProps = {
    connectionError: chat.connectionError,
    labels,
    onAcceptAnswer: chat.acceptAnswer,
    onAcceptInvite: chat.acceptInvite,
    onCancel: chat.cancelPairing,
    onCreateInvite: chat.createInvite,
    pairingCode: chat.pairingCode,
    pairingState: chat.pairingState,
    peerCount: chat.peerCount,
  };

  function sendMessage(text: string) {
    return chat.sendMessage(text, Date.now());
  }

  return (
    <>
      {showsConversation ? (
        <div className="relative size-full bg-(--ios-background) [--ios-bar-edge:var(--ios-background)] [--ios-content-width:48rem]">
          <MessageList
            emptyDescription={labels.youAre.replace("{name}", chat.alias)}
            header={
              <IosNavigationBar
                title={labels.title}
                subtitle={describeConnectedDevices(labels, chat.peerCount)}
                titleDisplay="inline"
                leading={<IosAppSwitcherButton />}
                trailing={
                  <IosBarButton
                    aria-label={labels.nearbyDevices}
                    aria-haspopup="dialog"
                    onClick={function openDeviceDrawer() {
                      setIsDeviceDrawerOpen(true);
                    }}
                    onFocus={preloadDeviceDrawer}
                    onPointerEnter={preloadDeviceDrawer}
                    onTouchStart={preloadDeviceDrawer}
                  >
                    <UsersIcon />
                  </IosBarButton>
                }
              />
            }
            labels={labels}
            locale={locale}
            messages={chat.messages}
          />
          <ChatComposer disabled={chat.peerCount === 0} labels={labels} onSend={sendMessage} />
        </div>
      ) : (
        <IosToolScreen title={labels.title}>
          <ChatWelcome alias={chat.alias} labels={labels} />
          <PairingPanel {...pairingProps} />
        </IosToolScreen>
      )}
      {hasDeviceDrawerOpened ? (
        <Suspense fallback={null}>
          <DeviceDrawer
            {...pairingProps}
            open={showsDeviceDrawer}
            onOpenChange={setIsDeviceDrawerOpen}
          />
        </Suspense>
      ) : null}
    </>
  );
}
