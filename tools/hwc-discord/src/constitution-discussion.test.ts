import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildConstitutionDiscussionPosts, forumCreationOrder } from "./constitution-discussion.js";

const root = resolve(import.meta.dirname, "../../..");

describe("Constitution discussion posts", () => {
    it("creates an index, every level-two heading, and each Section as a scoped post", () => {
        const posts = buildConstitutionDiscussionPosts(readFileSync(resolve(root, "SERVER GOVERNANCE & CONSTITUTION.md"), "utf8"));

        expect(posts).toHaveLength(51);
        expect(posts[0]).toMatchObject({ key: "index", title: "SERVER GOVERNANCE & CONSTITUTION" });
        expect(posts).toContainEqual(expect.objectContaining({ title: "Article I: Definitions and Member Rights" }));
        expect(posts).toContainEqual(expect.objectContaining({ title: "Article I: Definitions and Member Rights - Section 1. Definitions" }));
        expect(posts.every((post) => post.title.length <= 100)).toBe(true);
    });

    it("creates posts in reverse source order for Discord's newest-first Forum view", () => {
        const posts = buildConstitutionDiscussionPosts(readFileSync(resolve(root, "SERVER GOVERNANCE & CONSTITUTION.md"), "utf8"));
        const creationOrder = forumCreationOrder(posts);

        expect(creationOrder[0].title).toBe("Community Commitment");
        expect(creationOrder.at(-1)?.title).toBe("SERVER GOVERNANCE & CONSTITUTION");
    });
});
