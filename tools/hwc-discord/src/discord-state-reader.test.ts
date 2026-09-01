import { describe, expect, it } from "vitest";
import { DiscordStateReader, type DiscordRestClient } from "./discord-state-reader.js";

describe("DiscordStateReader", () => {
    it("reads each managed Discord resource without mutations", async () => {
        const calls: string[] = [];
        const client: DiscordRestClient = {
            async get(route: string): Promise<unknown> {
                calls.push(route);
                if (route.endsWith("/roles")) return [{ id: "role-1" }];
                if (route.endsWith("/channels")) return [{ id: "forum-1", type: 15 }, { id: "text-1", type: 0 }];
                if (route.endsWith("/auto-moderation/rules")) return [{ id: "rule-1" }];
                if (route.endsWith("/onboarding")) return { guild_id: "guild-1" };
                return { id: "guild-1" };
            }
        };

        const state = await new DiscordStateReader("guild-1", client).read();

        expect(calls.sort()).toEqual([
            "/guilds/guild-1",
            "/guilds/guild-1/auto-moderation/rules",
            "/guilds/guild-1/channels",
            "/guilds/guild-1/onboarding",
            "/guilds/guild-1/roles"
        ]);
        expect(state.forums).toEqual([{ id: "forum-1", type: 15 }]);
    });
});