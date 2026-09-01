import { describe, expect, it } from "vitest";
import { normalizeDiscordState } from "./state-normalizer.js";

describe("normalizeDiscordState", () => {
    it("normalizes Community settings, categories, channels, and Forum tags", () => {
        const state = normalizeDiscordState({
            guild: {
                id: "guild-1",
                features: ["COMMUNITY"],
                verification_level: 2,
                explicit_content_filter: 2,
                rules_channel_id: "text-1"
            },
            roles: [{ id: "role-1", name: "Member", permissions: "0", position: 1 }],
            channels: [
                { id: "category-1", type: 4, name: "THE COMMONS", position: 2 },
                { id: "text-1", type: 0, name: "general", parent_id: "category-1", position: 3 },
                { id: "forum-1", type: 15, name: "workshop", available_tags: [{ name: "Open" }] }
            ],
            automodRules: [{ id: "rule-1", name: "Block spam", trigger_type: 3, enabled: true }],
            onboarding: { guild_id: "guild-1" },
            forums: []
        });

        expect(state.guild).toMatchObject({ communityEnabled: true, verificationLevel: "medium" });
        expect(state.categories).toEqual([{ discordId: "category-1", name: "THE COMMONS", position: 2 }]);
        expect(state.channels).toEqual(expect.arrayContaining([
            expect.objectContaining({ discordId: "text-1", type: "text", categoryDiscordId: "category-1" }),
            expect.objectContaining({ discordId: "forum-1", type: "forum", forumTags: ["Open"] })
        ]));
    });
});