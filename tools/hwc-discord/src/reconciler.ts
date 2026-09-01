import type { ActualState, Change, ChangePlan, DesiredChannel, DesiredState, RiskLevel, StateMapping } from "./models.js";

const permissionBits: Record<string, bigint> = {
    manage_channels: 1n << 4n,
    view_channel: 1n << 10n,
    send_messages: 1n << 11n,
    manage_messages: 1n << 13n,
    read_message_history: 1n << 16n,
    connect: 1n << 20n,
    speak: 1n << 21n,
    move_members: 1n << 24n
};

function change(operation: string, resource: string, risk: RiskLevel, dependencies: string[] = [], current?: unknown, desired?: unknown): Change {
    return { operation, resource, risk, dependencies, current, desired };
}

export function permissionBitfields(values: Record<string, string>): { allow: string; deny: string } {
    let allow = 0n;
    let deny = 0n;
    for (const [permission, value] of Object.entries(values)) {
        if (value === "allow") allow |= permissionBits[permission] ?? 0n;
        if (value === "deny") deny |= permissionBits[permission] ?? 0n;
    }
    return { allow: allow.toString(), deny: deny.toString() };
}

function mappedOrNamed<T extends { discordId: string; name: string }>(items: T[], mapping: StateMapping, key: string, name: string): T | undefined {
    return items.find((item) => item.discordId === mapping.resources[key]) ?? items.find((item) => item.name === name);
}

export function createChangePlan(desired: DesiredState, actual: ActualState, mapping: StateMapping): ChangePlan {
    const changes: Change[] = [];
    const unmanaged: string[] = [];
    const desiredRoleNames = new Set(desired.roles.map((role) => role.name));
    const desiredCategoryNames = new Set(desired.categories.map((category) => category.name));
    const desiredChannels = new Set(desired.channels.map((channel) => `${channel.category}\u0000${channel.name}`));

    const configuredGuildChannels: Array<[string, string | undefined]> = [
        ["rules_channel", actual.guild.rulesChannelDiscordId],
        ["public_updates_channel", actual.guild.publicUpdatesChannelDiscordId],
        ["safety_alerts_channel", actual.guild.safetyAlertsChannelDiscordId]
    ];
    const guildChannelsMatch = configuredGuildChannels.every(([key, actualId]) => {
        const desiredChannel = desired.community[key];
        return typeof desiredChannel === "string" && actualId === mapping.resources[`channels.${desiredChannel}`];
    });
    if (actual.guild.communityEnabled !== desired.community.enabled ||
        actual.guild.verificationLevel !== desired.community.verification_level ||
        actual.guild.explicitContentFilter !== desired.community.explicit_content_filter ||
        !guildChannelsMatch) {
        changes.push(change("ModifyGuild", "guild", "SENSITIVE", [], actual.guild, desired.community));
    }
    for (const role of desired.roles.filter((role) => role.provisioning === "create")) {
        const existing = mappedOrNamed(actual.roles, mapping, `roles.${role.key}`, role.name);
        if (!existing) changes.push(change("CreateRole", `roles.${role.key}`, "SAFE", [], undefined, role));
        else if (existing.name !== role.name) changes.push(change("UpdateRole", `roles.${role.key}`, "SAFE", [], existing, role));
        else if (existing.position !== role.position) changes.push(change("MoveRole", `roles.${role.key}`, "SENSITIVE", ["CreateRole"], existing.position, role.position));
    }
    for (const role of actual.roles) {
        if (role.name !== "@everyone" && !desiredRoleNames.has(role.name)) unmanaged.push(`role: ${role.name}`);
    }
    for (const category of desired.categories) {
        const existing = mappedOrNamed(actual.categories, mapping, `categories.${category.key}`, category.name);
        if (!existing) changes.push(change("CreateCategory", `categories.${category.key}`, "SAFE", [], undefined, category));
        else if (existing.position !== category.position) changes.push(change("MoveChannel", `categories.${category.key}`, "SENSITIVE", ["CreateCategory"], existing.position, category.position));
    }
    for (const category of actual.categories) if (!desiredCategoryNames.has(category.name)) unmanaged.push(`category: ${category.name}`);

    for (const channel of desired.channels) planChannel(desired, actual, mapping, channel, changes);
    for (const channel of actual.channels) {
        const category = actual.categories.find((item) => item.discordId === channel.categoryDiscordId)?.name ?? "";
        if (!desiredChannels.has(`${desired.categories.find((item) => item.name === category)?.key ?? category}\u0000${channel.name}`)) unmanaged.push(`channel: #${channel.name}`);
    }
    for (const rule of desired.automodRules) {
        const key = typeof rule.key === "string" ? rule.key : "unknown";
        const name = typeof rule.name === "string" ? rule.name : key;
        if (!mappedOrNamed(actual.automodRules, mapping, `automod.${key}`, name)) changes.push(change("CreateAutoModRule", `automod.${key}`, "SAFE", ["ModifyGuild"], undefined, rule));
    }
    if (JSON.stringify(actual.onboarding) !== JSON.stringify(desired.onboarding)) {
        changes.push(change("ModifyOnboarding", "onboarding", "SENSITIVE", ["ModifyGuild"], actual.onboarding, desired.onboarding));
    }
    for (const [key, entry] of Object.entries(desired.seedContent)) {
        if (!mapping.resources[`seed.${key}`]) changes.push(change("CreateSeedContent", `seed.${key}`, "SAFE", ["CreateChannel"], undefined, entry));
    }
    return { changes: changes.sort((left, right) => left.operation.localeCompare(right.operation) || left.resource.localeCompare(right.resource)), unmanaged };
}

function planChannel(desired: DesiredState, actual: ActualState, mapping: StateMapping, channel: DesiredChannel, changes: Change[]): void {
    const existing = mappedOrNamed(actual.channels, mapping, `channels.${channel.key}`, channel.name);
    if (!existing) {
        changes.push(change("CreateChannel", `channels.${channel.key}`, "SAFE", ["CreateCategory"], undefined, channel));
    } else if (existing.type !== channel.type) {
        changes.push(change("UpdateChannel", `channels.${channel.key}`, "SENSITIVE", [], existing.type, channel.type));
    }
    const profile = desired.channelProfiles[channel.key];
    if (profile && (!existing || !permissionsMatch(desired, actual, mapping, channel.key, existing.discordId, profile))) {
        changes.push(change("SetPermissionOverwrite", `permissions.${channel.key}`, "SENSITIVE", ["CreateChannel"], undefined, profile));
    }
    for (const tag of desired.forums[channel.key] ?? []) {
        if (!existing?.forumTags.includes(tag)) changes.push(change("CreateForumTag", `forums.${channel.key}.${tag}`, "SAFE", ["CreateChannel"], undefined, tag));
    }
}

function permissionsMatch(desired: DesiredState, actual: ActualState, mapping: StateMapping, channelKey: string, channelId: string, profileKey: string): boolean {
    const channel = actual.channels.find((item) => item.discordId === channelId);
    const profile = desired.permissionProfiles[profileKey];
    if (!channel || !profile || !desired.channelProfiles[channelKey]) return false;
    return Object.entries(profile).every(([roleKey, values]) => {
        const roleId = roleKey === "everyone" ? actual.guild.discordId : mapping.resources[`roles.${roleKey}`];
        if (!roleId) return false;
        const expected = permissionBitfields(values);
        const actualOverwrite = channel.permissionOverwrites[roleId];
        return actualOverwrite?.allow === expected.allow && actualOverwrite.deny === expected.deny;
    });
}

export function orderChanges(plan: ChangePlan): Change[] {
    const order = ["ModifyGuild", "CreateRole", "UpdateRole", "MoveRole", "CreateCategory", "CreateChannel", "UpdateChannel", "MoveChannel", "SetPermissionOverwrite", "CreateForumTag", "CreateAutoModRule", "ModifyOnboarding", "CreateSeedContent"];
    return [...plan.changes].sort((left, right) => order.indexOf(left.operation) - order.indexOf(right.operation) || left.resource.localeCompare(right.resource));
}