import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse } from "yaml";

type Manifest = Record<string, unknown>;
type RecordValue = Record<string, unknown>;

const manifestFiles = [
    "roles",
    "categories",
    "channels",
    "permissions",
    "forums",
    "guild",
    "onboarding",
    "automod",
    "manual-steps",
    "seed-content"
] as const;

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const manifestDirectory = resolve(repositoryRoot, "discord/manifest");
const schemaPath = resolve(repositoryRoot, "discord/schemas/manifest.schema.json");

function asRecord(value: unknown): RecordValue | undefined {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as RecordValue
        : undefined;
}

function getRecord(manifest: Manifest, key: string): RecordValue {
    return asRecord(manifest[key]) ?? {};
}

function getArray(manifest: Manifest, key: string): unknown[] {
    return Array.isArray(manifest[key]) ? manifest[key] : [];
}

function getString(record: RecordValue, key: string): string | undefined {
    return typeof record[key] === "string" ? record[key] : undefined;
}

function getNestedRecord(record: RecordValue, key: string): RecordValue {
    return asRecord(record[key]) ?? {};
}

function addMissingReferences(
    errors: string[],
    source: string,
    references: Iterable<string>,
    available: Set<string>,
    resource: string
): void {
    for (const reference of references) {
        if (!available.has(reference)) {
            errors.push(`${source}: ${resource} reference does not exist: ${reference}`);
        }
    }
}

export interface ValidationResult {
    errors: string[];
    manifests: number;
}

export function validateManifests(): ValidationResult {
    const errors: string[] = [];
    const manifests = new Map<string, Manifest>();
    const rawManifests = new Map<string, string>();

    let schema: object;
    try {
        schema = JSON.parse(readFileSync(schemaPath, "utf8")) as object;
    } catch (error) {
        return { errors: [`schema: ${(error as Error).message}`], manifests: 0 };
    }

    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(schema);

    for (const name of manifestFiles) {
        const filePath = resolve(manifestDirectory, `${name}.yaml`);
        try {
            const raw = readFileSync(filePath, "utf8");
            rawManifests.set(name, raw);
            const manifest = parse(raw);
            if (!asRecord(manifest)) {
                errors.push(`${name}: manifest must be an object`);
                continue;
            }
            manifests.set(name, manifest);
            if (!validate(manifest)) {
                for (const error of validate.errors ?? []) {
                    errors.push(`${name}: ${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
                }
            }
        } catch (error) {
            errors.push(`${name}: ${(error as Error).message}`);
        }
    }

    for (const [name, raw] of rawManifests) {
        if (raw.includes("\t")) {
            errors.push(`${name}: tab characters are not permitted in YAML manifests`);
        }
    }

    const roles = getRecord(manifests.get("roles") ?? {}, "roles");
    const categories = getRecord(manifests.get("categories") ?? {}, "categories");
    const channels = getRecord(manifests.get("channels") ?? {}, "channels");
    const permissions = manifests.get("permissions") ?? {};
    const guardrails = getRecord(permissions, "guardrails");
    const profiles = getRecord(permissions, "permission_profiles");
    const channelProfiles = getRecord(permissions, "channel_profiles");
    const forums = getRecord(manifests.get("forums") ?? {}, "forums");
    const guild = getNestedRecord(manifests.get("guild") ?? {}, "community");
    const onboarding = manifests.get("onboarding") ?? {};
    const automod = manifests.get("automod") ?? {};
    const seedContent = getRecord(manifests.get("seed-content") ?? {}, "seed_content");
    const roleKeys = new Set(Object.keys(roles));
    const categoryKeys = new Set(Object.keys(categories));
    const channelKeys = new Set(Object.keys(channels));
    const channelNamesByCategory = new Set<string>();

    for (const [channelKey, channel] of Object.entries(channels)) {
        const channelRecord = getNestedRecord(channels, channelKey);
        const category = getString(channelRecord, "category");
        const name = getString(channelRecord, "name");
        if (category !== undefined && !categoryKeys.has(category)) {
            errors.push(`channels.${channelKey}: category reference does not exist: ${category}`);
        }
        if (category !== undefined && name !== undefined) {
            const nameKey = `${category}\u0000${name}`;
            if (channelNamesByCategory.has(nameKey)) {
                errors.push(`channels.${channelKey}: channel name is duplicated within ${category}: ${name}`);
            }
            channelNamesByCategory.add(nameKey);
        }
        if (!asRecord(channel)) {
            errors.push(`channels.${channelKey}: channel must be an object`);
        }
    }

    if (Object.keys(channelProfiles).length !== channelKeys.size) {
        errors.push("permissions: channel_profiles must contain exactly one entry for every channel");
    }
    addMissingReferences(errors, "permissions", Object.keys(channelProfiles), channelKeys, "channel");
    addMissingReferences(
        errors,
        "permissions",
        Object.values(channelProfiles).filter((value): value is string => typeof value === "string"),
        new Set(Object.keys(profiles)),
        "permission profile"
    );

    for (const [profileKey, profile] of Object.entries(profiles)) {
        const overwrites = getNestedRecord(getNestedRecord(profiles, profileKey), "overwrites");
        addMissingReferences(errors, `permissions.${profileKey}`, Object.keys(overwrites), roleKeys, "role");
        for (const [roleKey, overwrite] of Object.entries(overwrites)) {
            if (Object.hasOwn(getNestedRecord(overwrites, roleKey), "administrator")) {
                errors.push(`permissions.${profileKey}.${roleKey}: Administrator grants are forbidden`);
            }
            if (!asRecord(overwrite)) {
                errors.push(`permissions.${profileKey}.${roleKey}: overwrite must be an object`);
            }
        }
    }

    for (const [forumKey, forum] of Object.entries(forums)) {
        const channel = getNestedRecord(channels, forumKey);
        if (getString(channel, "type") !== "forum") {
            errors.push(`forums.${forumKey}: reference must target a Forum channel`);
        }
        const tags = getArray(getNestedRecord(forums, forumKey), "tags");
        if (tags.length > 20) {
            errors.push(`forums.${forumKey}: Discord permits at most 20 tags`);
        }
    }
    const forumChannelKeys = Object.entries(channels)
        .filter(([, channel]) => getString(asRecord(channel) ?? {}, "type") === "forum")
        .map(([key]) => key)
        .sort();
    const configuredForumKeys = Object.keys(forums).sort();
    if (JSON.stringify(forumChannelKeys) !== JSON.stringify(configuredForumKeys)) {
        errors.push("forums: every Forum channel must have exactly one Forum configuration");
    }

    addMissingReferences(
        errors,
        "guild.community",
        ["rules_channel", "public_updates_channel", "safety_alerts_channel"]
            .map((key) => getString(guild, key))
            .filter((value): value is string => value !== undefined),
        channelKeys,
        "channel"
    );

    addMissingReferences(
        errors,
        "onboarding",
        getArray(onboarding, "default_channels").filter((value): value is string => typeof value === "string"),
        channelKeys,
        "channel"
    );
    for (const prompt of getArray(onboarding, "prompts")) {
        const promptRecord = asRecord(prompt) ?? {};
        for (const option of getArray(promptRecord, "options")) {
            const optionRecord = asRecord(option) ?? {};
            addMissingReferences(
                errors,
                "onboarding",
                getArray(optionRecord, "channels").filter((value): value is string => typeof value === "string"),
                channelKeys,
                "channel"
            );
        }
    }

    for (const rule of getArray(automod, "rules")) {
        const ruleRecord = asRecord(rule) ?? {};
        const alertChannel = getString(ruleRecord, "alert_channel");
        if (alertChannel !== undefined && !channelKeys.has(alertChannel)) {
            errors.push(`automod: alert channel does not exist: ${alertChannel}`);
        }
    }

    for (const [seedKey, seed] of Object.entries(seedContent)) {
        const entry = getNestedRecord(seedContent, seedKey);
        const channel = getString(entry, "channel");
        const source = getString(entry, "source");
        if (channel !== undefined && !channelKeys.has(channel)) {
            errors.push(`seed_content.${seedKey}: channel reference does not exist: ${channel}`);
        }
        if (channel !== undefined) {
            const channelType = getString(getNestedRecord(channels, channel), "type");
            if (channelType !== "text" && channelType !== "announcement") {
                errors.push(`seed_content.${seedKey}: managed messages require a text or announcement channel`);
            }
        }
        if (source !== undefined && !existsSync(resolve(repositoryRoot, source))) {
            errors.push(`seed_content.${seedKey}: source file does not exist: ${source}`);
        }
        if (!asRecord(seed)) {
            errors.push(`seed_content.${seedKey}: seed entry must be an object`);
        }
    }

    const profileOverwrites = (profileKey: string): RecordValue =>
        getNestedRecord(getNestedRecord(profiles, profileKey), "overwrites");
    const canView = (profileKey: string, roleKey: string): boolean =>
        getString(getNestedRecord(profileOverwrites(profileKey), roleKey), "view_channel") === "allow";
    const deniesView = (profileKey: string, roleKey: string): boolean =>
        getString(getNestedRecord(profileOverwrites(profileKey), roleKey), "view_channel") === "deny";

    addMissingReferences(
        errors,
        "permissions.guardrails",
        getArray(guardrails, "forbid_administrator").filter((value): value is string => typeof value === "string"),
        roleKeys,
        "role"
    );
    addMissingReferences(
        errors,
        "permissions.guardrails",
        getArray(guardrails, "mature_channels").filter((value): value is string => typeof value === "string"),
        channelKeys,
        "channel"
    );
    for (const [channelKey, rule] of Object.entries(getRecord(guardrails, "private_channels"))) {
        if (!channelKeys.has(channelKey)) errors.push(`permissions.guardrails: private channel does not exist: ${channelKey}`);
        const profileKey = getString(channelProfiles, channelKey);
        for (const roleKey of getArray(getNestedRecord(getRecord(guardrails, "private_channels"), channelKey), "required_roles")) {
            if (typeof roleKey !== "string") continue;
            if (!roleKeys.has(roleKey)) errors.push(`permissions.guardrails.${channelKey}: required role does not exist: ${roleKey}`);
            if (!profileKey || !canView(profileKey, roleKey)) {
                errors.push(`permissions.guardrails.${channelKey}: ${roleKey} must be allowed to view the channel`);
            }
        }
        if (!asRecord(rule)) errors.push(`permissions.guardrails.${channelKey}: private channel rule must be an object`);
    }

    if (!deniesView("mature_chat", "everyone") || !canView("mature_chat", "mature_content")) {
        errors.push("permissions.mature_chat: restricted channels must deny everyone and allow Mature Content");
    }
    for (const channelKey of ["mature_horror_craft", "restricted_workshop"]) {
        if (getString(channelProfiles, channelKey) !== "mature_chat") {
            errors.push(`permissions.${channelKey}: mature channels must use the mature_chat profile`);
        }
    }
    if (!canView("council_private", "councilor") || Object.hasOwn(profileOverwrites("council_private"), "moderator")) {
        errors.push("permissions.council_private: Council access must exclude Moderators by default");
    }
    if (!canView("moderator_private", "moderator") || Object.hasOwn(profileOverwrites("moderator_private"), "councilor")) {
        errors.push("permissions.moderator_private: Moderator access must exclude Councilors by default");
    }
    const archivistRoles = Object.keys(profileOverwrites("archivist_private")).sort();
    if (JSON.stringify(archivistRoles) !== JSON.stringify(["archivist", "everyone"])) {
        errors.push("permissions.archivist_private: only Archivist and @everyone overwrites are permitted");
    }
    for (const [channelKey, profileKey] of Object.entries({
        council_chamber: "council_private",
        moderator_watch: "moderator_private",
        archivists_workbench: "archivist_private",
        council_meeting_room: "council_voice"
    })) {
        if (getString(channelProfiles, channelKey) !== profileKey) {
            errors.push(`permissions.${channelKey}: must use the ${profileKey} profile`);
        }
    }

    return { errors, manifests: manifests.size };
}