import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateOverviewProfile } from "../src/engine/overview-profile";

const profile = await generateOverviewProfile();
const output = "export const overviewProfile = " + JSON.stringify(profile, null, 2) + ";\n";
writeFileSync(resolve(process.cwd(), "src/data/overview-profile.ts"), output, "utf8");
process.stdout.write("Generated 48-point overview profile from seed 2026 / 60 restoration runs.\n");
