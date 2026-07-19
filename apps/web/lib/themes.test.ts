import { describe, expect, it } from "vitest";

import { getTheme, sortedThemes, themes } from "./themes";

describe("tweakcn themes", function () {
  it("keeps Editorial first while sorting the preset catalog", function () {
    expect(sortedThemes[0]?.id).toBe("default");
    expect(
      sortedThemes.slice(1).map(function getTitle(theme) {
        return theme.title;
      }),
    ).toEqual(
      sortedThemes
        .slice(1)
        .map(function getTitle(theme) {
          return theme.title;
        })
        .toSorted(function compareTitles(leftTitle, rightTitle) {
          return leftTitle.localeCompare(rightTitle);
        }),
    );
  });

  it("falls back to Editorial for an unknown persisted value", function () {
    expect(getTheme("not-a-theme").id).toBe("default");
    expect(themes.length).toBeGreaterThan(20);
  });
});
