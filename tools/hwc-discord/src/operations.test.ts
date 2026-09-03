import { describe, expect, it } from "vitest";
import { loadDesiredState } from "./desired-state-parser.js";
import { buildOnboardingPayload, splitMessageContent } from "./operations.js";
import type { StateMapping } from "./models.js";

describe("onboarding configuration", () => {
    it("uses manifest keys only as internal identifiers", () => {
        const onboarding = loadDesiredState().onboarding;
        expect(onboarding.prompts).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: "interests" }),
            expect.objectContaining({ key: "mature_content_access" })
        ]));
    });

    it("generates snowflake IDs and channel targets for every option", () => {
        const mapping: StateMapping = {
            resources: {
                "channels.start_here": "100000000000000001",
                "channels.content_warning_desk": "100000000000000002"
            }
        };
        const payload = buildOnboardingPayload(loadDesiredState(), mapping) as {
            prompts: Array<{ id: string; options: Array<{ id: string; channel_ids: string[]; role_ids: string[] }> }>;
        };

        expect(payload.prompts.every((prompt) => /^\d+$/.test(prompt.id))).toBe(true);
        expect(payload.prompts.flatMap((prompt) => prompt.options).every((option) =>
            /^\d+$/.test(option.id) && option.channel_ids.length + option.role_ids.length > 0
        )).toBe(true);
        expect(mapping.resources["onboarding.prompts.interests"]).toBeDefined();
    });

    it("splits long seed content into 2,000-character Discord-safe message segments", () => {
        const segments = splitMessageContent(`${"A".repeat(1500)}\n\n${"B".repeat(1500)}`);

        expect(segments).toHaveLength(2);
        expect(segments.every((segment) => segment.length <= 2000)).toBe(true);
        expect(segments.join("")).toBe(`${"A".repeat(1500)}\n\n${"B".repeat(1500)}`);
    });

    it("uses an explicit Markdown delimiter for seed-message boundaries", () => {
        const segments = splitMessageContent("First post\n\n<!-- discord-message-break -->\n\nSecond post");

        expect(segments).toEqual(["First post", "Second post"]);
    });

    it("still enforces the message limit within explicitly separated sections", () => {
        const segments = splitMessageContent(`${"A".repeat(2001)}<!-- discord-message-break -->Second post`);

        expect(segments).toEqual(["A".repeat(2000), "A", "Second post"]);
    });
});
