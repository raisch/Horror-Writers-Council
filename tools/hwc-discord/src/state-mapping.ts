import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StateMapping } from "./models.js";

const root = resolve(import.meta.dirname, "../../..");
const stateDirectory = resolve(root, "discord/state");
const legacyStateMappingPath = resolve(root, "discord/.state.json");

export function stateMappingPath(guildId: string): string {
    return resolve(stateDirectory, `${guildId}.json`);
}

function readMapping(filePath: string): StateMapping {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StateMapping>;
    return { resources: parsed.resources ?? {} };
}

export function loadStateMapping(guildId: string, availableResourceIds: Iterable<string> = []): StateMapping {
    const filePath = stateMappingPath(guildId);
    if (existsSync(filePath)) return readMapping(filePath);
    if (!existsSync(legacyStateMappingPath)) return { resources: {} };

    const legacy = readMapping(legacyStateMappingPath);
    const available = new Set(availableResourceIds);
    const matchingResources = Object.values(legacy.resources).filter((id) => available.has(id)).length;
    return matchingResources >= 10 ? legacy : { resources: {} };
}

export function saveStateMapping(guildId: string, mapping: StateMapping): void {
    const filePath = stateMappingPath(guildId);
    mkdirSync(stateDirectory, { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(mapping, null, 2)}\n`);
}