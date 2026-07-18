import { describe, expect, it } from "vitest";

import { canonicalStringify } from "@/lib/canonical-json";

describe("canonicalStringify", () => {
  it("sorts object keys recursively without reordering arrays", () => {
    expect(
      canonicalStringify({ z: 1, a: { d: 4, b: 2 }, list: [{ y: 2, x: 1 }, 3] }),
    ).toBe('{"a":{"b":2,"d":4},"list":[{"x":1,"y":2},3],"z":1}');
  });

  it("omits undefined object properties", () => {
    expect(canonicalStringify({ present: true, missing: undefined })).toBe(
      '{"present":true}',
    );
  });
});
