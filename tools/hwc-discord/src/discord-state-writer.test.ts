import { describe, expect, it } from "vitest";
import { DiscordStateWriter, type DiscordMutationClient } from "./discord-state-writer.js";

describe("DiscordStateWriter", () => {
    it("uses PUT for Guild Onboarding updates", async () => {
        const calls: string[] = [];
        const client: DiscordMutationClient = {
            post: async () => ({}),
            patch: async () => ({}),
            put: async (route) => {
                calls.push(route);
                return {};
            }
        };

        await new DiscordStateWriter("guild-1", client).updateOnboarding({ enabled: true }, "test");

        expect(calls).toEqual(["/guilds/guild-1/onboarding"]);
    });

    it("uses PATCH to update an existing AutoMod rule", async () => {
        const calls: string[] = [];
        const client: DiscordMutationClient = {
            post: async () => ({}),
            patch: async (route) => {
                calls.push(route);
                return {};
            },
            put: async () => ({})
        };

        await new DiscordStateWriter("guild-1", client).updateAutoModRule("rule-1", { enabled: true }, "test");

        expect(calls).toEqual(["/guilds/guild-1/auto-moderation/rules/rule-1"]);
    });
});