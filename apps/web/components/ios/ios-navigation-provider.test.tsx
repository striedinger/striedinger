import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIosRouter } from "./ios-navigation-context";
import { IosNavigationProvider } from "./ios-navigation-provider";

const router = vi.hoisted(function createRouterMock() {
  return {
    push: vi.fn<(href: string, options?: unknown) => void>(),
    replace: vi.fn<(href: string, options?: unknown) => void>(),
  };
});

vi.mock("next/navigation", function mockNavigation() {
  return { useRouter: () => router };
});

function getDepth(pathname: string) {
  return pathname.split("/").filter(Boolean).length;
}

function PushButton() {
  const iosRouter = useIosRouter();
  return (
    <button
      type="button"
      onClick={function pushDetail() {
        iosRouter.push("/list/detail");
      }}
    >
      Open
    </button>
  );
}

function returnToList(state: unknown = { __NA: true }) {
  window.history.replaceState(state, "", "/list");
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}

describe("IosNavigationProvider", function () {
  afterEach(function resetHistory() {
    vi.useRealTimers();
    router.push.mockReset();
    router.replace.mockReset();
    window.history.replaceState(null, "", "/");
  });

  it("replays browser back to a pushed screen as a back slide", function () {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/list");
    const routerListener = vi.fn<() => void>();
    render(
      <IosNavigationProvider getDepth={getDepth}>
        <PushButton />
      </IosNavigationProvider>,
    );
    window.addEventListener("popstate", routerListener);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(router.push).toHaveBeenCalledWith("/list/detail", {
      scroll: false,
      transitionTypes: ["ios-nav-forward"],
    });

    returnToList();
    act(function finishPendingReplay() {
      vi.runAllTimers();
    });

    expect(routerListener).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/list", {
      scroll: false,
      transitionTypes: ["ios-nav-back"],
    });
    window.removeEventListener("popstate", routerListener);
  });

  it("leaves entries the router did not create to the browser", function () {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/list");
    render(
      <IosNavigationProvider getDepth={getDepth}>
        <PushButton />
      </IosNavigationProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    returnToList(null);
    act(function finishPendingReplay() {
      vi.runAllTimers();
    });

    expect(router.replace).not.toHaveBeenCalled();
  });
});
