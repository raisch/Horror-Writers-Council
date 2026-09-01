import { describe, expect, it } from "vitest";
import { stateMappingPath } from "./state-mapping.js";

describe("stateMappingPath", () => {
    it("isolates resource mappings by guild ID", () => {
        expect(stateMappingPath("guild-one")).not.toBe(stateMappingPath("guild-two"));
        expect(stateMappingPath("guild-one")).toMatch(/discord\/state\/guild-one\.json$/);
    });
});