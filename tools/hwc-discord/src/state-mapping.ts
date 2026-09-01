import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StateMapping } from "./models.js";

const root = resolve(import.meta.dirname, "../../..");
export const stateMappingPath = resolve(root, "discord/.state.json");

export function loadStateMapping(): StateMapping {
    if (!existsSync(stateMappingPath)) return { resources: {} };
    const parsed = JSON.parse(readFileSync(stateMappingPath, "utf8")) as Partial<StateMapping>;
    return { resources: parsed.resources ?? {} };
}

export function saveStateMapping(mapping: StateMapping): void {
    writeFileSync(stateMappingPath, `${JSON.stringify(mapping, null, 2)}\n`);
}