import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StateMapping } from "./models.js";

const root = resolve(import.meta.dirname, "../../..");
const stateDirectory = resolve(root, "discord/state");

export function stateMappingPath(guildId: string): string {
    return resolve(stateDirectory, `${guildId}.json`);
}

export function loadStateMapping(guildId: string): StateMapping {
    const filePath = stateMappingPath(guildId);
    if (!existsSync(filePath)) return { resources: {} };
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StateMapping>;
    return { resources: parsed.resources ?? {} };
}

export function saveStateMapping(guildId: string, mapping: StateMapping): void {
    const filePath = stateMappingPath(guildId);
    mkdirSync(stateDirectory, { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(mapping, null, 2)}\n`);
}