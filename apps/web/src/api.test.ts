import { describe, expect, it } from "vitest";
import { emptyFormSchema } from "./formSchemas";

describe("emptyFormSchema", () => {
  it("contains a submit button for new Form.io forms", () => {
    expect(emptyFormSchema.components.some((component) => component.type === "button" && component.action === "submit")).toBe(true);
  });
});
