import { describe, expect, it } from "vitest";
import { validateManifests } from "./validator.js";

describe("validateManifests", () => {
    it("accepts the canonical manifest set", () => {
        expect(validateManifests()).toEqual({ errors: [], manifests: 10 });
    });
});