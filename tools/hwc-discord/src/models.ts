export type ChannelType = "text" | "announcement" | "forum" | "voice";
export type Lifecycle = "permanent" | "temporary" | "optional";
export type PermissionValue = "allow" | "deny";
export type RiskLevel = "SAFE" | "SENSITIVE" | "DESTRUCTIVE";

export interface DesiredRole {
    key: string;
    name: string;
    position: number;
    provisioning: "create" | "system";
}

export interface DesiredCategory {
    key: string;
    name: string;
    position: number;
}

export interface DesiredChannel {
    key: string;
    name: string;
    category: string;
    position?: number;
    type: ChannelType;
    lifecycle: Lifecycle;
}

export interface DesiredState {
    roles: DesiredRole[];
    categories: DesiredCategory[];
    channels: DesiredChannel[];
    permissionProfiles: Record<string, Record<string, Record<string, PermissionValue>>>;
    channelProfiles: Record<string, string>;
    forums: Record<string, string[]>;
    community: Record<string, unknown>;
    onboarding: Record<string, unknown>;
    automodRules: Record<string, unknown>[];
    seedContent: Record<string, Record<string, unknown>>;
    manualSteps: Record<string, unknown>[];
}

export interface ActualRole {
    discordId: string;
    name: string;
    permissions: string;
    position: number;
    managed: boolean;
}

export interface ActualCategory {
    discordId: string;
    name: string;
    position: number;
}

export interface ActualChannel {
    discordId: string;
    name: string;
    categoryDiscordId?: string;
    type: ChannelType;
    position: number;
    ageRestricted: boolean;
    permissionOverwrites: Record<string, { allow: string; deny: string }>;
    forumTags: string[];
}

export interface ActualGuild {
    discordId: string;
    communityEnabled: boolean;
    verificationLevel: string;
    explicitContentFilter: string;
    rulesChannelDiscordId?: string;
    publicUpdatesChannelDiscordId?: string;
    safetyAlertsChannelDiscordId?: string;
}

export interface ActualAutoModRule {
    discordId: string;
    name: string;
    triggerType: number;
    enabled: boolean;
}

export interface ActualState {
    guild: ActualGuild;
    roles: ActualRole[];
    categories: ActualCategory[];
    channels: ActualChannel[];
    automodRules: ActualAutoModRule[];
    onboarding: Record<string, unknown>;
}

export interface StateMapping {
    resources: Record<string, string>;
}

export interface Change {
    operation: string;
    resource: string;
    current?: unknown;
    desired?: unknown;
    risk: RiskLevel;
    dependencies: string[];
}

export interface ChangePlan {
    changes: Change[];
    unmanaged: string[];
}
