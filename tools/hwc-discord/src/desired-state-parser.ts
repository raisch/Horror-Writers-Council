import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import type { DesiredState } from "./models.js";
import { validateManifests } from "./validator.js";

type RecordValue = Record<string, unknown>;

const root = resolve(import.meta.dirname, "../../..");
const manifestDirectory = resolve(root, "discord/manifest");

function record(value: unknown): RecordValue {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : {};
}

function string(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function manifest(name: string): RecordValue {
    return record(parse(readFileSync(resolve(manifestDirectory, `${name}.yaml`), "utf8")));
}

export function loadDesiredState(): DesiredState {
    const result = validateManifests();
    if (result.errors.length > 0) {
        throw new Error(`Manifest validation failed:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
    }

    const roles = manifest("roles");
    const categories = manifest("categories");
    const channels = manifest("channels");
    const permissions = manifest("permissions");
    const forums = manifest("forums");
    const guild = manifest("guild");
    const onboarding = manifest("onboarding");
    const automod = manifest("automod");
    const seedContent = manifest("seed-content");
    const manualSteps = manifest("manual-steps");
    const roleValues = record(roles.roles);
    const categoryValues = record(categories.categories);
    const channelValues = record(channels.channels);
    const roleOrder = array(roles.role_order).map(string);
    const categoryOrder = array(categories.category_order).map(string);

    return {
        roles: roleOrder.map((key, position) => {
            const value = record(roleValues[key]);
            return { key, name: string(value.name), position, provisioning: string(value.provisioning) as "create" | "system" };
        }),
        categories: categoryOrder.map((key, position) => {
            const value = record(categoryValues[key]);
            return { key, name: string(value.name), position };
        }),
        channels: Object.entries(channelValues).map(([key, raw]) => {
            const value = record(raw);
            return {
                key,
                name: string(value.name),
                category: string(value.category),
                position: typeof value.position === "number" ? value.position : undefined,
                type: string(value.type) as DesiredState["channels"][number]["type"],
                lifecycle: string(value.lifecycle) as DesiredState["channels"][number]["lifecycle"]
            };
        }),
        permissionProfiles: Object.fromEntries(Object.entries(record(permissions.permission_profiles)).map(([key, raw]) => [
            key,
            record(record(raw).overwrites) as DesiredState["permissionProfiles"][string]
        ])),
        channelProfiles: Object.fromEntries(Object.entries(record(permissions.channel_profiles)).map(([key, value]) => [key, string(value)])),
        forums: Object.fromEntries(Object.entries(record(forums.forums)).map(([key, raw]) => [key, array(record(raw).tags).map(string)])),
        community: record(guild.community),
        onboarding: onboarding,
        automodRules: array(automod.rules).map(record),
        seedContent: Object.fromEntries(Object.entries(record(seedContent.seed_content)).map(([key, value]) => [key, record(value)])),
        manualSteps: array(manualSteps.manual_steps).map(record)
    };
}
