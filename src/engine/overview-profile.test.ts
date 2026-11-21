import { describe, expect, it } from "vitest";
import { overviewProfile } from "../data/overview-profile";
import { generateOverviewProfile } from "./overview-profile";

describe("generated overview restoration profile", () => {
  it("matches the deterministic 60-run restoration engine output", async () => {
    const generated = await generateOverviewProfile();
    expect(generated).toEqual(overviewProfile);
  }, 60000);
});
