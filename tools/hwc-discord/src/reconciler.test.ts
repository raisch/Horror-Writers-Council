import { describe, expect, it } from "vitest";
import { loadDesiredState } from "./desired-state-parser.js";
import { createChangePlan, permissionBitfields } from "./reconciler.js";
import type { ActualState, StateMapping } from "./models.js";

const emptyState: ActualState = {
    guild: { discordId: "guild", communityEnabled: false, verificationLevel: "none", explicitContentFilter: "disabled" },
    roles: [], categories: [], channels: [], automodRules: [], onboarding: {}
};

describe("createChangePlan", () => {
    it("plans resources for a blank server and leaves extras unmanaged", () => {
        const plan = createChangePlan(loadDesiredState(), emptyState, { resources: {} });
        expect(plan.changes.some((item) => item.operation === "CreateRole")).toBe(true);
        expect(plan.changes.some((item) => item.operation === "CreateCategory")).toBe(true);
        expect(plan.changes.some((item) => item.operation === "CreateChannel")).toBe(true);

        const extra = { ...emptyState, roles: [{ discordId: "extra", name: "Temporary", permissions: "0", position: 1, managed: false }] };
        expect(createChangePlan(loadDesiredState(), extra, { resources: {} }).unmanaged).toContain("role: Temporary");
    });

    it("ignores Discord bootstrap resources but reports other unmanaged resources", () => {
        const state: ActualState = {
            ...emptyState,
            roles: [
                { discordId: "bot", name: "HWC Infrastructure Test", permissions: "0", position: 1, managed: true },
                { discordId: "extra", name: "Temporary", permissions: "0", position: 2, managed: false }
            ],
            categories: [{ discordId: "text", name: "Text Channels", position: 1 }],
            channels: [
                { discordId: "general", name: "general", categoryDiscordId: "text", type: "text", position: 0, ageRestricted: false, permissionOverwrites: {}, forumTags: [] }
            ]
        };

        const unmanaged = createChangePlan(loadDesiredState(), state, { resources: {} }).unmanaged;
        expect(unmanaged).toEqual(["role: Temporary"]);
    });

    it("does not add permission changes when actual overwrites match", () => {
        const desired = loadDesiredState();
        const mapping: StateMapping = { resources: {} };
        const roles = desired.roles.map((role, index) => {
            const id = role.key === "everyone" ? "guild" : `role-${index}`;
            mapping.resources[`roles.${role.key}`] = id;
            return { discordId: id, name: role.name, permissions: "0", position: role.position, managed: false };
        });
        const categories = desired.categories.map((category) => ({ discordId: `category-${category.key}`, name: category.name, position: category.position }));
        const channels = desired.channels.map((channel) => {
            const id = `channel-${channel.key}`;
            mapping.resources[`channels.${channel.key}`] = id;
            const profile = desired.permissionProfiles[desired.channelProfiles[channel.key]];
            const permissionOverwrites = Object.fromEntries(Object.entries(profile).map(([role, values]) => {
                return [mapping.resources[`roles.${role}`], permissionBitfields(values)];
            }));
            return { discordId: id, name: channel.name, categoryDiscordId: `category-${channel.category}`, type: channel.type, position: 0, ageRestricted: false, permissionOverwrites, forumTags: desired.forums[channel.key] ?? [] };
        });
        const actual: ActualState = { guild: { ...emptyState.guild, communityEnabled: true, verificationLevel: "medium", explicitContentFilter: "all_members" }, roles, categories, channels, automodRules: desired.automodRules.map((rule, index) => ({ discordId: `${index}`, name: String(rule.name), triggerType: 0, enabled: true })), onboarding: desired.onboarding };
        const plan = createChangePlan(desired, actual, mapping);
        expect(plan.changes.filter((item) => item.operation === "SetPermissionOverwrite")).toEqual([]);
    });

    it("plans a channel move when a declared channel position drifts", () => {
        const desired = loadDesiredState();
        const startHere = desired.channels.find((channel) => channel.key === "start_here");
        expect(startHere?.position).toBe(0);

        const actual: ActualState = {
            ...emptyState,
            channels: [{
                discordId: "start-here",
                name: "start-here",
                categoryDiscordId: "threshold",
                type: "text",
                position: 3,
                ageRestricted: false,
                permissionOverwrites: {},
                forumTags: []
            }]
        };
        const mapping: StateMapping = { resources: { "channels.start_here": "start-here" } };
        const plan = createChangePlan(desired, actual, mapping);

        expect(plan.changes).toContainEqual(expect.objectContaining({
            operation: "MoveChannel",
            resource: "channels.start_here",
            current: 3,
            desired: 0
        }));
    });
});
