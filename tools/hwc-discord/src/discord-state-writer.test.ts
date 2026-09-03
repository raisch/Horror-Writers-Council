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

    it("uses the bulk channel-position endpoint for a channel move", async () => {
        const calls: Array<{ route: string; body: unknown }> = [];
        const client: DiscordMutationClient = {
            post: async () => ({}),
            patch: async (route, options) => {
                calls.push({ route, body: options.body });
                return {};
            },
            put: async () => ({})
        };

        await new DiscordStateWriter("guild-1", client).setChannelPosition("channel-1", 0, "test");

        expect(calls).toEqual([{ route: "/guilds/guild-1/channels", body: [{ id: "channel-1", position: 0 }] }]);
    });
});
