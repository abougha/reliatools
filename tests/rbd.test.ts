import { describe, expect, it } from "vitest";
import { computeRbdNodeReliability } from "../lib/reliabilityMath";

describe("RBD calculator", () => {
  it("does not silently treat missing Block reliability as 0", () => {
    expect(() => computeRbdNodeReliability("Block", undefined, [])).toThrow("Block reliability is required.");
  });
});
