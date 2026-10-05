import { describe, expect, it } from "vitest";

import { toFileStem } from "./describe-image";

describe("toFileStem", function () {
  it("turns a suggested name into a safe hyphenated file stem", function () {
    expect(toFileStem("Golden Retriever on the Beach.JPG")).toBe("golden-retriever-on-the-beach");
    expect(toFileStem("Café  &  croissant!")).toBe("cafe-croissant");
    expect(toFileStem("???")).toBe("image");
  });
});
