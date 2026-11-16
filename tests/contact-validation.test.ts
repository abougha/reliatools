import { describe, expect, it } from "vitest";
import { validateContactForm } from "../lib/contact/validation";

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  company: "",
  message: "Hello, I have a question about Weibull.",
};

describe("validateContactForm", () => {
  it("accepts a valid submission", () => {
    expect(validateContactForm(valid)).toEqual([]);
  });

  it("rejects non-object bodies without throwing", () => {
    for (const body of [null, undefined, 42, "text", []]) {
      expect(validateContactForm(body)).toEqual(["Invalid request body."]);
    }
  });

  it("rejects non-string fields without throwing", () => {
    const errors = validateContactForm({
      name: 123,
      email: { a: 1 },
      company: ["x"],
      message: true,
    });
    expect(errors).toHaveLength(4);
  });

  it("enforces length limits", () => {
    expect(validateContactForm({ ...valid, name: "a".repeat(101) })).toHaveLength(1);
    expect(validateContactForm({ ...valid, message: "a".repeat(5001) })).toHaveLength(1);
    expect(validateContactForm({ ...valid, message: "short" })).toHaveLength(1);
  });
});
