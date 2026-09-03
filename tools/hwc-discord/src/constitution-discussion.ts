import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { REST } from "discord.js";
import { splitMessageContent } from "./operations.js";
import { loadStateMapping, saveStateMapping } from "./state-mapping.js";

const root = resolve(import.meta.dirname, "../../..");
const constitutionPath = resolve(root, "SERVER GOVERNANCE & CONSTITUTION.md");
const sourceLabel = "SERVER GOVERNANCE & CONSTITUTION.md";
const discussionPrefix = "constitution_discussion";
const defaultRequestDelayMs = 2_000;

interface DiscussionPost {
    key: string;
    title: string;
    content: string;
}

interface Heading {
    level: number;
    title: string;
    body: string;
}

function debugLog(enabled: boolean, message: string): void {
    if (enabled) console.log(`[debug ${new Date().toISOString()}] ${message}`);
}

function formatError(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const details = error as Error & { status?: number; code?: number; rawError?: { code?: number; message?: string } };
    const apiDetails = [details.status, details.code, details.rawError?.code].filter((value) => value !== undefined).join("/");
    return apiDetails ? `${error.message} (Discord API: ${apiDetails}${details.rawError?.message ? `: ${details.rawError.message}` : ""})` : error.message;
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseHeadings(markdown: string): Heading[] {
    const matches = [...markdown.matchAll(/^(#{1,3})\s+(.+)$/gm)];
    return matches.map((match, index) => ({
        level: match[1].length,
        title: match[2].trim(),
        body: markdown.slice(match.index! + match[0].length, matches[index + 1]?.index ?? markdown.length).trim()
    }));
}

function postContent(body: string, scope: string): string {
    const discussionNote = `*Discussion scope: ${scope}. Propose exact wording changes here; use the parent Article post for structural questions.*`;
    return [body, discussionNote, `*Draft source: ${sourceLabel}*`].filter(Boolean).join("\n\n");
}

function keyFor(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export function buildConstitutionDiscussionPosts(markdown: string): DiscussionPost[] {
    const headings = parseHeadings(markdown);
    const title = headings.find((heading) => heading.level === 1);
    if (!title) throw new Error("Constitution source must contain a level-one title.");

    const posts: DiscussionPost[] = [{
        key: "index",
        title: title.title,
        content: [
            title.body,
            "This is the discussion index for the proposed founding constitution. Each Article and Section has its own forum post. Keep structural questions in Article posts and exact wording proposals in Section posts.",
            `*Draft source: ${sourceLabel}*`
        ].filter(Boolean).join("\n\n")
    }];
    let currentArticle: Heading | undefined;

    for (const heading of headings) {
        if (heading.level === 1) continue;
        if (heading.level === 2) {
            currentArticle = heading.title.startsWith("Article ") ? heading : undefined;
            posts.push({
                key: keyFor(heading.title),
                title: heading.title,
                content: postContent(heading.body, heading.title.startsWith("Article ") ? "article-wide issues" : "this constitutional provision")
            });
            continue;
        }
        if (heading.level === 3) {
            const title = currentArticle ? `${currentArticle.title} - ${heading.title}` : heading.title;
            if (title.length > 100) throw new Error(`Forum post title exceeds Discord's 100-character limit: ${title}`);
            posts.push({
                key: `${keyFor(currentArticle?.title ?? "document")}_${keyFor(heading.title)}`,
                title,
                content: postContent(heading.body, "this section")
            });
        }
    }
    return posts;
}

export function forumCreationOrder(posts: DiscussionPost[]): DiscussionPost[] {
    // Discord displays Forum posts newest first, so create the source in reverse.
    return [...posts].reverse();
}

async function createForumPost(rest: REST, forumId: string, post: DiscussionPost, debug: boolean): Promise<string> {
    const segments = splitMessageContent(post.content);
    const startedAt = Date.now();
    console.log(`Creating: ${post.title}`);
    debugLog(debug, `POST /channels/${forumId}/threads key=${post.key} segments=${segments.length}`);
    const response = await rest.post(`/channels/${forumId}/threads`, {
        body: {
            name: post.title,
            auto_archive_duration: 10080,
            message: { content: segments[0] }
        },
        reason: "Create Constitution discussion post"
    }) as { id?: string };
    if (!response.id) throw new Error(`Discord did not return a thread ID for: ${post.title}`);
    debugLog(debug, `Created thread=${response.id} in ${Date.now() - startedAt}ms`);

    for (const [index, content] of segments.slice(1).entries()) {
        debugLog(debug, `POST /channels/${response.id}/messages continuation=${index + 2}/${segments.length}`);
        await rest.post(`/channels/${response.id}/messages`, {
            body: { content },
            reason: "Continue Constitution discussion post"
        });
    }
    return response.id;
}

async function deleteForumPost(rest: REST, threadId: string, debug: boolean): Promise<void> {
    debugLog(debug, `DELETE /channels/${threadId}`);
    await rest.delete(`/channels/${threadId}`, { reason: "Replace Constitution discussion posts" });
}

const program = new Command();
program
    .name("constitution-discussion")
    .description("Create scoped Constitution discussion posts in #governance-hall.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .option("--yes", "Create posts; otherwise print the dry-run plan")
    .option("--replace", "Delete previously created Constitution discussion posts before recreating them; requires --yes")
    .option("--debug", "Log Discord request progress and API error details")
    .option("--delay <milliseconds>", "Minimum delay between Discord writes to avoid rate limits", String(defaultRequestDelayMs))
    .action(async (options: { guild?: string; yes?: boolean; replace?: boolean; debug?: boolean; delay: string }) => {
        const guildId = options.guild ?? process.env.DISCORD_GUILD_ID;
        const token = process.env.DISCORD_TOKEN;
        if (!guildId || !token) throw new Error("DISCORD_TOKEN and DISCORD_GUILD_ID (or --guild) are required.");
        const delayMs = Number(options.delay);
        if (!Number.isInteger(delayMs) || delayMs < 0) throw new Error("--delay must be a non-negative integer number of milliseconds.");

        const posts = buildConstitutionDiscussionPosts(readFileSync(constitutionPath, "utf8"));
        const mapping = loadStateMapping(guildId);
        const forumId = mapping.resources["channels.governance_hall"];
        if (!forumId) throw new Error("No state mapping exists for channels.governance_hall. Run the infrastructure apply first.");
        debugLog(options.debug === true, `guild=${guildId} forum=${forumId} delay=${delayMs}ms`);

        const postTitles = new Map(posts.map((post) => [`${discussionPrefix}.${post.key}`, post.title]));
        const existing = Object.entries(mapping.resources)
            .filter(([key]) => key.startsWith(`${discussionPrefix}.`))
            .map(([mappingKey, threadId]) => ({ mappingKey, threadId, title: postTitles.get(mappingKey) ?? mappingKey }));
        const pending = options.replace ? posts : posts.filter((post) => !mapping.resources[`${discussionPrefix}.${post.key}`]);
        const creationOrder = forumCreationOrder(pending);
        if (options.replace) {
            console.log(`${existing.length} previously created Constitution discussion posts will be deleted before all ${posts.length} posts are recreated.`);
        }
        console.log(`${pending.length} of ${posts.length} Constitution discussion posts pending; they will be created in reverse source order so Discord displays the document in reading order:`);
        for (const post of creationOrder) console.log(`- ${post.title}`);
        if (!options.yes || pending.length === 0) return;

        const rest = new REST({ version: "10" }).setToken(token);
        if (options.debug === true) {
            rest.on("restDebug", (message) => debugLog(true, `Discord REST: ${message}`));
            rest.on("rateLimited", (rateLimit) => debugLog(true,
                `Discord rate limit: global=${rateLimit.global} route=${rateLimit.route} retry_after=${rateLimit.retryAfter}ms limit=${rateLimit.limit}`
            ));
        }
        if (options.replace) {
            for (const [index, post] of existing.entries()) {
                console.log(`Deleting: ${post.title}`);
                await deleteForumPost(rest, post.threadId, options.debug === true);
                delete mapping.resources[post.mappingKey];
                saveStateMapping(guildId, mapping);
                console.log(`Deleted: ${post.title}`);
                if (delayMs > 0 && index < existing.length - 1) await sleep(delayMs);
            }
        }
        for (const [index, post] of creationOrder.entries()) {
            const threadId = await createForumPost(rest, forumId, post, options.debug === true);
            mapping.resources[`${discussionPrefix}.${post.key}`] = threadId;
            saveStateMapping(guildId, mapping);
            console.log(`Created: ${post.title}`);
            if (delayMs > 0 && index < creationOrder.length - 1) await sleep(delayMs);
        }
    });

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename)) {
    program.parseAsync()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(formatError(error));
            process.exit(1);
        });
}
