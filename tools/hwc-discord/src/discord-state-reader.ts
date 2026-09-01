import { REST } from "discord.js";

export interface DiscordGuild {
    id: string;
    [key: string]: unknown;
}

export interface DiscordRole {
    id: string;
    [key: string]: unknown;
}

export interface DiscordChannel {
    id: string;
    type: number;
    [key: string]: unknown;
}

export interface DiscordAutoModRule {
    id: string;
    [key: string]: unknown;
}

export interface DiscordOnboarding {
    guild_id: string;
    [key: string]: unknown;
}

export interface ActualDiscordState {
    guild: DiscordGuild;
    roles: DiscordRole[];
    channels: DiscordChannel[];
    automodRules: DiscordAutoModRule[];
    onboarding: DiscordOnboarding;
    forums: DiscordChannel[];
}

export interface DiscordRestClient {
    get(route: string): Promise<unknown>;
}

export class DiscordStateReader {
    private readonly rest: DiscordRestClient;

    constructor(
        private readonly guildId: string,
        tokenOrClient: string | DiscordRestClient
    ) {
        this.rest = typeof tokenOrClient === "string"
            ? new REST({ version: "10" }).setToken(tokenOrClient)
            : tokenOrClient;
    }

    async getGuild(): Promise<DiscordGuild> {
        return this.getObject(`/guilds/${this.guildId}`, "guild") as Promise<DiscordGuild>;
    }

    async getRoles(): Promise<DiscordRole[]> {
        return this.getArray(`/guilds/${this.guildId}/roles`, "roles") as Promise<DiscordRole[]>;
    }

    async getChannels(): Promise<DiscordChannel[]> {
        return this.getArray(`/guilds/${this.guildId}/channels`, "channels") as Promise<DiscordChannel[]>;
    }

    async getAutoModRules(): Promise<DiscordAutoModRule[]> {
        return this.getArray(`/guilds/${this.guildId}/auto-moderation/rules`, "AutoMod rules") as Promise<DiscordAutoModRule[]>;
    }

    async getOnboarding(): Promise<DiscordOnboarding> {
        return this.getObject(`/guilds/${this.guildId}/onboarding`, "onboarding") as Promise<DiscordOnboarding>;
    }

    async getAuditLog(): Promise<Record<string, unknown>> {
        return this.getObject(`/guilds/${this.guildId}/audit-logs`, "audit-log") as Promise<Record<string, unknown>>;
    }

    getForumConfiguration(channels: DiscordChannel[]): DiscordChannel[] {
        return channels.filter((channel) => channel.type === 15);
    }

    async read(): Promise<ActualDiscordState> {
        const [guild, roles, channels, automodRules, onboarding] = await Promise.all([
            this.getGuild(),
            this.getRoles(),
            this.getChannels(),
            this.getAutoModRules(),
            this.getOnboarding()
        ]);

        return {
            guild,
            roles,
            channels,
            automodRules,
            onboarding,
            forums: this.getForumConfiguration(channels)
        };
    }

    private async getArray(route: string, resource: string): Promise<unknown[]> {
        const response = await this.rest.get(route);
        if (!Array.isArray(response)) {
            throw new Error(`Discord returned an invalid ${resource} response.`);
        }
        return response;
    }

    private async getObject(route: string, resource: string): Promise<Record<string, unknown>> {
        const response = await this.rest.get(route);
        if (typeof response !== "object" || response === null || Array.isArray(response)) {
            throw new Error(`Discord returned an invalid ${resource} response.`);
        }
        return response as Record<string, unknown>;
    }
}