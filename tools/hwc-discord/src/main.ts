import { Command } from "commander";
import { DiscordStateReader } from "./discord-state-reader.js";
import { validateManifests } from "./validator.js";

const program = new Command();

program
    .name("hwc")
    .description("Manage Horror Writers Council Discord infrastructure.")
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

program.parse();
