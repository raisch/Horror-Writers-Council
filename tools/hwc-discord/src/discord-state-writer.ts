import { REST } from "discord.js";

export interface DiscordMutationClient {
    post(route: string, options: { body: unknown; reason: string }): Promise<unknown>;
    patch(route: string, options: { body: unknown; reason: string }): Promise<unknown>;
    put(route: string, options: { body: unknown; reason: string }): Promise<unknown>;
}

export class DiscordStateWriter {
    private readonly rest: DiscordMutationClient;

    constructor(private readonly guildId: string, tokenOrClient: string | DiscordMutationClient) {
        this.rest = typeof tokenOrClient === "string"
            ? new REST({ version: "10" }).setToken(tokenOrClient) as unknown as DiscordMutationClient
            : tokenOrClient;
    }

    createRole(name: string, reason: string): Promise<unknown> {
        return this.rest.post(`/guilds/${this.guildId}/roles`, { body: { name }, reason });
    }

    createCategory(name: string, reason: string): Promise<unknown> {
        return this.rest.post(`/guilds/${this.guildId}/channels`, { body: { name, type: 4 }, reason });
    }

    createChannel(name: string, type: number, parentId: string | undefined, reason: string): Promise<unknown> {
        return this.rest.post(`/guilds/${this.guildId}/channels`, { body: { name, type, parent_id: parentId }, reason });
    }

    updateGuild(body: Record<string, unknown>, reason: string): Promise<unknown> {
        return this.rest.patch(`/guilds/${this.guildId}`, { body, reason });
    }

    setPermissionOverwrite(channelId: string, roleId: string, allow: string, deny: string, reason: string): Promise<unknown> {
        return this.rest.put(`/channels/${channelId}/permissions/${roleId}`, { body: { type: 0, allow, deny }, reason });
    }

    updateForumTags(channelId: string, tags: string[], reason: string): Promise<unknown> {
        return this.rest.patch(`/channels/${channelId}`, { body: { available_tags: tags.map((name) => ({ name })) }, reason });
    }

    createAutoModRule(body: Record<string, unknown>, reason: string): Promise<unknown> {
        return this.rest.post(`/guilds/${this.guildId}/auto-moderation/rules`, { body, reason });
    }

    updateAutoModRule(ruleId: string, body: Record<string, unknown>, reason: string): Promise<unknown> {
        return this.rest.patch(`/guilds/${this.guildId}/auto-moderation/rules/${ruleId}`, { body, reason });
    }

    updateOnboarding(body: Record<string, unknown>, reason: string): Promise<unknown> {
        return this.rest.put(`/guilds/${this.guildId}/onboarding`, { body, reason });
    }

    createMessage(channelId: string, content: string, reason: string): Promise<unknown> {
        return this.rest.post(`/channels/${channelId}/messages`, { body: { content }, reason });
    }

    pinMessage(channelId: string, messageId: string, reason: string): Promise<unknown> {
        return this.rest.put(`/channels/${channelId}/pins/${messageId}`, { body: {}, reason });
    }
}