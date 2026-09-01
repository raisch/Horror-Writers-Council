# HWC Discord Infrastructure

## Test Guild Setup

1. Create an empty Discord server for testing.
2. Create a Discord application with a bot user and install it in the test server with the `bot` and `applications.commands` scopes.
3. During bootstrap, give the bot the authority required to manage the guild, roles, channels, messages, and audit log. Place its role below the Server Owner/Archivist and above every role it must manage.
4. Create `tools/hwc-discord/.env` from `.env.example` and set the test credentials:

```text
DISCORD_TOKEN=...
DISCORD_GUILD_ID=...
```

The `.env` file is ignored and loaded automatically by the CLI. Do not commit a bot token.

## Provisioning Workflow

Run these commands from this directory:

```text
npm test
npm run build
node dist/main.js validate
node dist/main.js plan
node dist/main.js apply --yes
node dist/main.js verify
node dist/main.js snapshot
```

Complete the required Membership Screening step in Discord, then rerun `verify`. A second `plan` should report no remaining managed drift. `drift` reports unexpected changes without modifying the server.

`archive-audit-log` exports administrative audit events only. It does not archive messages or other member content.