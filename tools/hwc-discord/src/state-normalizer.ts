import type { ActualChannel, ActualState, ChannelType } from "./models.js";
import type { ActualDiscordState, DiscordChannel } from "./discord-state-reader.js";

const channelTypes: Record<number, ChannelType | undefined> = {
    0: "text",
    2: "voice",
    5: "announcement",
    15: "forum"
};

const verificationLevels = ["none", "low", "medium", "high", "very_high"];
const explicitContentFilters = ["disabled", "members_without_roles", "all_members"];

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number {
    return typeof value === "number" ? value : 0;
}

function normalizeChannel(channel: DiscordChannel): ActualChannel | undefined {
    const type = channelTypes[channel.type];
    const id = stringValue(channel.id);
    const name = stringValue(channel.name);
    if (!type || !id || !name) return undefined;

    const overwrites = Array.isArray(channel.permission_overwrites)
        ? channel.permission_overwrites
        : [];
    const permissionOverwrites = Object.fromEntries(overwrites.flatMap((overwrite) => {
        if (typeof overwrite !== "object" || overwrite === null) return [];
        const value = overwrite as Record<string, unknown>;
        const overwriteId = stringValue(value.id);
        if (!overwriteId) return [];
        return [[overwriteId, {
            allow: stringValue(value.allow) ?? "0",
            deny: stringValue(value.deny) ?? "0"
        }]];
    }));
    const tags = Array.isArray(channel.available_tags)
        ? channel.available_tags.flatMap((tag) => {
            if (typeof tag !== "object" || tag === null) return [];
            const name = stringValue((tag as Record<string, unknown>).name);
            return name ? [name] : [];
        })
        : [];

    return {
        discordId: id,
        name,
        categoryDiscordId: stringValue(channel.parent_id),
        type,
        position: numberValue(channel.position),
        ageRestricted: channel.nsfw === true,
        permissionOverwrites,
        forumTags: tags
    };
}

export function normalizeDiscordState(raw: ActualDiscordState): ActualState {
    const guild = raw.guild as Record<string, unknown>;
    const allChannels = raw.channels.map(normalizeChannel).filter((channel): channel is ActualChannel => channel !== undefined);

    return {
        guild: {
            discordId: raw.guild.id,
            communityEnabled: Array.isArray(guild.features) && guild.features.includes("COMMUNITY"),
            verificationLevel: verificationLevels[numberValue(guild.verification_level)] ?? "unknown",
            explicitContentFilter: explicitContentFilters[numberValue(guild.explicit_content_filter)] ?? "unknown",
            rulesChannelDiscordId: stringValue(guild.rules_channel_id),
            publicUpdatesChannelDiscordId: stringValue(guild.public_updates_channel_id),
            safetyAlertsChannelDiscordId: stringValue(guild.safety_alerts_channel_id)
        },
        roles: raw.roles.flatMap((role) => {
            const id = stringValue(role.id);
            const name = stringValue(role.name);
            return id && name ? [{
                discordId: id,
                name,
                permissions: stringValue(role.permissions) ?? "0",
                position: numberValue(role.position)
            }] : [];
        }),
        categories: raw.channels.flatMap((channel) => {
            const id = stringValue(channel.id);
            const name = stringValue(channel.name);
            return channel.type === 4 && id && name
                ? [{ discordId: id, name, position: numberValue(channel.position) }]
                : [];
        }),
        channels: allChannels,
        automodRules: raw.automodRules.flatMap((rule) => {
            const id = stringValue(rule.id);
            const name = stringValue(rule.name);
            return id && name ? [{
                discordId: id,
                name,
                triggerType: numberValue(rule.trigger_type),
                enabled: rule.enabled === true
            }] : [];
        }),
        onboarding: raw.onboarding as Record<string, unknown>
    };
}