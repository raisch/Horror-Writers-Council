import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify } from "yaml";
import { DiscordStateReader } from "./discord-state-reader.js";
import { DiscordStateWriter } from "./discord-state-writer.js";
import { loadDesiredState } from "./desired-state-parser.js";
import type { ChangePlan } from "./models.js";
import { createChangePlan, orderChanges } from "./reconciler.js";
import { normalizeDiscordState } from "./state-normalizer.js";
import { loadStateMapping, saveStateMapping } from "./state-mapping.js";

const root = resolve(import.meta.dirname, "../../..");

export function credentials(guildOverride?: string): { guildId: string; token: string } {
    const guildId = guildOverride ?? process.env.DISCORD_GUILD_ID;
    const token = process.env.DISCORD_TOKEN;
    if (!guildId || !token) throw new Error("DISCORD_TOKEN and DISCORD_GUILD_ID (or --guild) are required.");
    return { guildId, token };
}

export async function buildPlan(guildOverride?: string): Promise<ChangePlan> {
    const { guildId, token } = credentials(guildOverride);
    const actual = normalizeDiscordState(await new DiscordStateReader(guildId, token).read());
    return createChangePlan(loadDesiredState(), actual, loadStateMapping());
}

export function formatPlan(plan: ChangePlan): string {
    const ordered = orderChanges(plan);
    const lines = ["HWC Discord Plan", ""];
    for (const item of ordered) lines.push(`${item.risk === "SAFE" ? "+" : "~"} ${item.operation} ${item.resource} [${item.risk}]`);
    for (const resource of plan.unmanaged) lines.push(`! UNMANAGED RESOURCE: ${resource}`);
    const counts = Object.fromEntries(["SAFE", "SENSITIVE", "DESTRUCTIVE"].map((risk) => [risk, ordered.filter((item) => item.risk === risk).length]));
    lines.push("", `${counts.SAFE} safe`, `${counts.SENSITIVE} sensitive`, `${counts.DESTRUCTIVE} destructive`);
    return lines.join("\n");
}

export async function verify(guildOverride?: string): Promise<{ plan: ChangePlan; manualSteps: number }> {
    const plan = await buildPlan(guildOverride);
    return { plan, manualSteps: loadDesiredState().manualSteps.length };
}

export async function snapshot(guildOverride?: string): Promise<string> {
    const { guildId, token } = credentials(guildOverride);
    const actual = normalizeDiscordState(await new DiscordStateReader(guildId, token).read());
    const timestamp = new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z");
    const directory = resolve(root, "discord/snapshots", timestamp);
    mkdirSync(directory, { recursive: true });
    for (const [name, value] of Object.entries({ guild: actual.guild, roles: actual.roles, channels: actual.channels, automod: actual.automodRules, onboarding: actual.onboarding })) {
        writeFileSync(resolve(directory, `${name}.yaml`), stringify(value));
    }
    writeFileSync(resolve(directory, "metadata.json"), `${JSON.stringify({ authoritative: false, guild_id: guildId, timestamp }, null, 2)}\n`);
    return directory;
}

export async function archiveAuditLog(guildOverride?: string): Promise<string> {
    const { guildId, token } = credentials(guildOverride);
    const auditLog = await new DiscordStateReader(guildId, token).getAuditLog();
    const directory = resolve(root, "discord/audit-logs");
    mkdirSync(directory, { recursive: true });
    const filename = `${new Date().toISOString().replace(/[:.]/g, "").replace("Z", "Z")}.json`;
    const filePath = resolve(directory, filename);
    writeFileSync(filePath, `${JSON.stringify({ guild_id: guildId, archived_at: new Date().toISOString(), audit_log: auditLog }, null, 2)}\n`);
    return filePath;
}

export function driftReport(plan: ChangePlan): string {
    const critical = orderChanges(plan).filter((item) =>
        item.resource.includes("mature_") || item.resource.includes("restricted_workshop") ||
        item.resource.includes("council_chamber") || item.resource.includes("moderator_watch") ||
        item.resource.includes("archivists_workbench") || item.operation === "ModifyGuild"
    );
    if (critical.length === 0 && plan.changes.length === 0) return "Managed drift: 0";
    return ["Managed drift detected", ...critical.map((item) => `CRITICAL ${item.operation} ${item.resource}`), ...plan.unmanaged.map((item) => `UNMANAGED ${item}`)].join("\n");
}

const channelTypeNumbers = { text: 0, voice: 2, announcement: 5, forum: 15 } as const;
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

function resourceId(value: unknown): string | undefined {
    return typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).id === "string"
        ? (value as Record<string, string>).id
        : undefined;
}

function auditReason(): string {
    try {
        const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
        return `HWC infrastructure apply ${commit}`;
    } catch {
        return "HWC infrastructure apply unknown";
    }
}

export async function apply(guildOverride?: string): Promise<{ applied: number; skipped: number }> {
    const { guildId, token } = credentials(guildOverride);
    const desired = loadDesiredState();
    const reader = new DiscordStateReader(guildId, token);
    const actual = normalizeDiscordState(await reader.read());
    const mapping = loadStateMapping();
    const writer = new DiscordStateWriter(guildId, token);
    const reason = auditReason();
    let applied = 0;
    let skipped = 0;

    for (const role of desired.roles.filter((role) => role.provisioning === "create")) {
        const existing = actual.roles.find((item) => item.name === role.name);
        const id = existing?.discordId ?? resourceId(await writer.createRole(role.name, reason));
        if (!id) throw new Error(`Discord did not return an ID while creating role ${role.name}.`);
        mapping.resources[`roles.${role.key}`] = id;
        if (!existing) applied++;
    }
    for (const category of desired.categories) {
        const existing = actual.categories.find((item) => item.name === category.name);
        const id = existing?.discordId ?? resourceId(await writer.createCategory(category.name, reason));
        if (!id) throw new Error(`Discord did not return an ID while creating category ${category.name}.`);
        mapping.resources[`categories.${category.key}`] = id;
        if (!existing) applied++;
    }
    for (const channel of desired.channels) {
        const existing = actual.channels.find((item) => item.name === channel.name && item.type === channel.type);
        const id = existing?.discordId ?? resourceId(await writer.createChannel(channel.name, channelTypeNumbers[channel.type], mapping.resources[`categories.${channel.category}`], reason));
        if (!id) throw new Error(`Discord did not return an ID while creating channel ${channel.name}.`);
        mapping.resources[`channels.${channel.key}`] = id;
        if (!existing) applied++;
    }
    for (const [channelKey, profileKey] of Object.entries(desired.channelProfiles)) {
        const channelId = mapping.resources[`channels.${channelKey}`];
        const profile = desired.permissionProfiles[profileKey];
        if (!channelId || !profile) continue;
        for (const [roleKey, permissions] of Object.entries(profile)) {
            const roleId = roleKey === "everyone" ? actual.guild.discordId : mapping.resources[`roles.${roleKey}`];
            if (!roleId) continue;
            let allow = 0n;
            let deny = 0n;
            for (const [permission, value] of Object.entries(permissions)) {
                if (value === "allow") allow |= permissionBits[permission] ?? 0n;
                if (value === "deny") deny |= permissionBits[permission] ?? 0n;
            }
            await writer.setPermissionOverwrite(channelId, roleId, allow.toString(), deny.toString(), reason);
            applied++;
        }
    }
    await writer.updateGuild({
        features: ["COMMUNITY"],
        verification_level: 2,
        explicit_content_filter: 2,
        rules_channel_id: mapping.resources[`channels.${String(desired.community.rules_channel)}`],
        public_updates_channel_id: mapping.resources[`channels.${String(desired.community.public_updates_channel)}`],
        safety_alerts_channel_id: mapping.resources[`channels.${String(desired.community.safety_alerts_channel)}`]
    }, reason);
    applied++;
    for (const [channelKey, tags] of Object.entries(desired.forums)) {
        const channelId = mapping.resources[`channels.${channelKey}`];
        const existing = actual.channels.find((channel) => channel.discordId === channelId);
        if (channelId && (!existing || existing.forumTags.length === 0)) {
            await writer.updateForumTags(channelId, tags, reason);
            applied++;
        }
    }
    for (const rule of desired.automodRules) {
        const key = typeof rule.key === "string" ? rule.key : "";
        if (!key || mapping.resources[`automod.${key}`]) continue;
        const trigger = rule.trigger === "keyword" ? 1 : rule.trigger === "spam" ? 3 : 5;
        const actions = Array.isArray(rule.actions) ? rule.actions : [];
        const actionMetadata = actions.map((action) => action === "send_alert" ? {
            type: 2,
            metadata: { channel_id: mapping.resources[`channels.${String(rule.alert_channel)}`] }
        } : { type: 1, metadata: {} });
        const created = await writer.createAutoModRule({
            name: rule.name,
            event_type: 1,
            trigger_type: trigger,
            trigger_metadata: rule.trigger_metadata ?? {},
            actions: actionMetadata,
            enabled: true
        }, reason);
        const id = resourceId(created);
        if (id) mapping.resources[`automod.${key}`] = id;
        applied++;
    }
    const onboardingOptions = Array.isArray(desired.onboarding.prompts)
        ? desired.onboarding.prompts.flatMap((prompt) => {
            if (typeof prompt !== "object" || prompt === null) return [];
            const value = prompt as Record<string, unknown>;
            return [{
                id: String(value.key),
                title: String(value.question),
                type: 0,
                required: value.required === true,
                single_select: value.multiple !== true,
                options: Array.isArray(value.options) ? value.options.map((option) => {
                    const optionValue = option as Record<string, unknown>;
                    return { id: String(optionValue.label), title: String(optionValue.label), channel_ids: Array.isArray(optionValue.channels) ? optionValue.channels.map((key) => mapping.resources[`channels.${String(key)}`]).filter(Boolean) : [] };
                }) : []
            }];
        })
        : [];
    await writer.updateOnboarding({
        enabled: true,
        default_channel_ids: Array.isArray(desired.onboarding.default_channels)
            ? desired.onboarding.default_channels.map((key) => mapping.resources[`channels.${String(key)}`]).filter(Boolean)
            : [],
        prompts: onboardingOptions
    }, reason);
    applied++;
    for (const [key, entry] of Object.entries(desired.seedContent)) {
        if (mapping.resources[`seed.${key}`]) continue;
        const channelId = mapping.resources[`channels.${String(entry.channel)}`];
        const source = typeof entry.source === "string" ? entry.source : "";
        if (!channelId || !source) continue;
        const messageId = resourceId(await writer.createMessage(channelId, readFileSync(resolve(root, source), "utf8"), reason));
        if (!messageId) throw new Error(`Discord did not return an ID while creating seed message ${key}.`);
        if (entry.pin === true) await writer.pinMessage(channelId, messageId, reason);
        mapping.resources[`seed.${key}`] = messageId;
        applied++;
    }
    skipped += createChangePlan(desired, actual, mapping).changes.filter((item) => item.risk === "DESTRUCTIVE").length;
    saveStateMapping(mapping);
    return { applied, skipped };
}