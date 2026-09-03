import "dotenv/config";
import { Command } from "commander";
import { DiscordStateReader } from "./discord-state-reader.js";
import { apply, archiveAuditLog, buildPlan, driftReport, formatPlan, snapshot, verify } from "./operations.js";
import { validateManifests } from "./validator.js";

const program = new Command();

program
    .name("hwc")
    .description("Manage Horror Writers Guild Discord infrastructure.")
    .version("0.1.0");

program
    .command("validate")
    .description("Validate the Discord manifests and their cross-manifest references.")
    .action(() => {
        const result = validateManifests();
        if (result.errors.length === 0) {
            console.log(`Validated ${result.manifests} manifests successfully.`);
            return;
        }

        console.error(`Manifest validation failed with ${result.errors.length} error(s):`);
        for (const error of result.errors) {
            console.error(`- ${error}`);
        }
        process.exitCode = 1;
    });

program
    .command("read")
    .description("Read the current Discord guild state without making changes.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .action(async (options: { guild?: string }) => {
        const guildId = options.guild ?? process.env.DISCORD_GUILD_ID;
        const token = process.env.DISCORD_TOKEN;
        if (!guildId || !token) {
            throw new Error("DISCORD_TOKEN and DISCORD_GUILD_ID (or --guild) are required for hwc read.");
        }

        const state = await new DiscordStateReader(guildId, token).read();
        console.log(JSON.stringify(state, null, 2));
    });

program
    .command("plan")
    .description("Compare the current Discord guild with the desired manifest state.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .action(async (options: { guild?: string }) => console.log(formatPlan(await buildPlan(options.guild))));

program
    .command("verify")
    .description("Re-read Discord and report remaining managed drift after an apply.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .action(async (options: { guild?: string }) => {
        const result = await verify(options.guild);
        console.log(result.plan.changes.length === 0 ? "Managed drift: 0" : formatPlan(result.plan));
        console.log(`Manual steps pending: ${result.manualSteps}`);
        if (result.plan.changes.length > 0) process.exitCode = 1;
    });

program
    .command("snapshot")
    .description("Save a non-authoritative snapshot of the current Discord state.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .action(async (options: { guild?: string }) => console.log(`Snapshot saved: ${await snapshot(options.guild)}`));

program
    .command("archive-audit-log")
    .description("Export administrative Discord audit records without archiving messages.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .action(async (options: { guild?: string }) => console.log(`Audit log archived: ${await archiveAuditLog(options.guild)}`));

program
    .command("drift")
    .description("Report Discord configuration drift without changing the server.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .action(async (options: { guild?: string }) => console.log(driftReport(await buildPlan(options.guild))));

program
    .command("apply")
    .description("Apply managed infrastructure changes; destructive changes are always skipped.")
    .option("--guild <id>", "Discord guild ID; defaults to DISCORD_GUILD_ID")
    .requiredOption("--yes", "Explicitly approve the reviewed plan")
    .action(async (options: { guild?: string }) => {
        const result = await apply(options.guild);
        console.log(`Applied ${result.applied} operation(s); skipped ${result.skipped} destructive operation(s).`);
    });

program.parse();
