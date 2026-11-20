import { describe, expect, it } from "vitest";
import { getPageTitle, isPageId } from "./page-ids";

describe("dynamic page route validation", () => {
  it("accepts only the seven supported module routes", () => {
    expect(isPageId("restoration")).toBe(true);
    expect(isPageId("method")).toBe(true);
    expect(isPageId("does-not-exist")).toBe(false);
    expect(isPageId("")).toBe(false);
  });

  it("maps route slugs to readable browser titles", () => {
    expect(getPageTitle("flex")).toBe("Flex Events");
    expect(getPageTitle("console")).toBe("DISCOM Console");
    expect(getPageTitle("does-not-exist")).toBe("Page not found");
  });
});
