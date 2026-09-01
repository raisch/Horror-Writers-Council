# Test Discord Server Bootstrap

This guide creates a disposable Discord server for exercising the Horror Writers Council infrastructure tool. It is not a production-launch procedure. Use a new empty server and do not invite community members.

The canonical desired state is under `discord/manifest/`. Snapshots are evidence of Discord's actual state and are not authoritative.

## Before You Begin

You need:

- A Discord account that can create servers and applications.
- Node.js 22 or later and npm.
- This repository checked out locally.
- Permission to create a Discord application and install its bot in a server you own.

Do not put a bot token in the repository, chat, screenshots, issues, or shell history that will be shared.

## 1. Validate the Local Tooling

Open a terminal in `tools/hwc-discord` and run:

```text
npm install
npm run check
npm test
npm run build
node dist/main.js validate
```

Expected result: TypeScript checks and tests pass, the build completes, and validation reports that all 10 manifests were validated successfully.

Stop here if validation fails. Do not compensate by manually creating Discord channels or roles; fix the manifest or tool first.

## 2. Create an Empty Test Server

1. In Discord, select the add-server button.
2. Choose **Create My Own**.
3. Choose **For a club or community**.
4. Name it something clearly disposable, such as `HWC Infrastructure Test - YYYY-MM-DD`.
5. Skip optional customization and do not create any channels, roles, or categories beyond Discord's defaults.
6. Confirm that you are the server owner.

Record the server's numeric ID:

1. In Discord settings, open **Advanced** and enable **Developer Mode**.
2. Right-click the test server icon.
3. Select **Copy Server ID**.

Keep this ID for the local `.env` file. It is not a secret, but it should identify only the disposable test server.

## 3. Create the Discord Application and Bot

1. Open the Discord Developer Portal and select **New Application**.
2. Name it `HWC Infrastructure Test` and create it.
3. Open the application’s **Bot** page.
4. Select **Add Bot** and confirm.
5. Under **Privileged Gateway Intents**, leave all intents disabled. The infrastructure CLI uses REST requests and does not require gateway intents.
6. Select **Reset Token**, copy the displayed bot token, and store it only in the local `.env` file created in Step 5. Treat it as a password.

If the token is exposed, immediately reset it in the Developer Portal and update the local `.env` file.

## 4. Install the Bot in the Test Server

1. In the application’s **OAuth2** page, open **URL Generator**.
2. Select these scopes:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, select the temporary bootstrap permissions:
   - Manage Server
   - Manage Roles
   - Manage Channels
   - Manage Messages
   - Manage Webhooks
   - View Audit Log
   - Send Messages
   - Manage Threads
   - Create Public Threads
   - Create Private Threads
   - Embed Links
   - Attach Files
   - Read Message History
   - Mention Everyone
4. Open the generated URL in a private browser window or a normal browser session where you are logged into the account that owns the test server.
5. Select only the disposable test server and authorize the installation.

Do not grant the bot Discord's `Administrator` permission. The test is intended to expose missing permission requirements, not to bypass the intended controls.

## 5. Configure Local Credentials

From `tools/hwc-discord`, create a local environment file:

```text
cp .env.example .env
```

Set the values in `.env`:

```text
DISCORD_TOKEN=your-bot-token
DISCORD_GUILD_ID=your-test-server-id
```

The CLI loads `.env` automatically. The file is ignored by Git; confirm it remains untracked:

```text
git status --short -- tools/hwc-discord/.env
```

Expected result: no output.

## 6. Establish Bootstrap Role Placement

The bot cannot manage a Discord role at or above its own highest role.

1. Return to the test server.
2. Open **Server Settings** > **Roles**.
3. Locate the installed bot role.
4. Move it below your owner/Archivist account and above every role the tool will create or manage.
5. Save the role order.

The generated `Archivist` role is not the same as Discord's Server Owner authority. Keep your Discord account as the server owner throughout testing.

## 7. Review the Blank-Server Plan

Back in `tools/hwc-discord`, run:

```text
node dist/main.js read > ../../tmp/test-guild-before.json
node dist/main.js plan > ../../tmp/test-guild-plan.txt
```

Review `../../tmp/test-guild-plan.txt` before applying it. It should show creation of managed roles, categories, channels, permission overwrites, Forum configuration, AutoMod rules, onboarding configuration, and seed content.

It may report Discord-created resources as unmanaged. The tool must not delete them.

Stop and investigate if the plan includes a destructive operation. The current MVP must report destructive work but never execute it.

## 8. Provision the Test Server

Apply only after reviewing the generated plan:

```text
node dist/main.js apply --yes
```

The command uses an audit-log reason containing the current Git commit SHA. It writes Discord resource IDs to `discord/.state.json`, which is ignored by Git.

If the command fails, do not retry blindly. Capture the error, inspect the Discord Audit Log, correct the specific manifest or implementation issue, and start again with a new empty test server if partial setup makes the result unclear.

## 9. Verify the Provisioned State

Run:

```text
node dist/main.js verify
node dist/main.js plan
node dist/main.js snapshot
```

Expected result:

- `verify` reports no managed drift.
- The second `plan` reports no remaining managed changes.
- `snapshot` creates a timestamped directory under `discord/snapshots/` whose `metadata.json` marks the snapshot as `authoritative: false`.

If a plan still shows changes, treat that as a failed idempotency test. Do not manually edit Discord to make it pass; fix the tool’s normalization, reconciliation, or apply behavior and rebuild the server.

## 10. Complete Manual Membership Screening

Membership Screening cannot currently be configured reliably through this tool, so configure it in Discord:

1. Open **Server Settings** > **Safety Setup** > **Membership Screening**.
2. Enable Membership Screening.
3. Add a requirement accepting the Community Standards.
4. Add a requirement confirming 18+ eligibility.
5. Save the screening configuration.
6. Test with a separate adult test account, if available, and confirm a new member stays pending until both requirements are accepted.

This is required by `discord/manifest/manual-steps.yaml`. Onboarding is not age verification and does not replace this step.

## 11. Perform Focused Access Checks

Use a second test account or temporary role assignments to confirm the security model:

- A user without `Member` cannot view member-only Commons or Workroom channels.
- A `Member` without `Mature Content` cannot view `#mature-horror-craft` or `#restricted-workshop`.
- A member with `Mature Content` can view the mature channels.
- A Councilor can access `#council-chamber` but not `#moderator-watch` by default.
- A Moderator can access `#moderator-watch` but not `#council-chamber` by default.
- Only the Archivist can access `#archivists-workbench` by default.
- All managed onboarding and policy messages are present and pinned in their target channels.
- `#announcements` is readable by members and is selected as the Community public-updates channel.

Run a drift check after these tests:

```text
node dist/main.js drift
```

It should report no managed drift once temporary test-role assignments are removed.

## 12. Test AutoMod and Audit Records

From a non-administrator test account, test only harmless samples:

- A message with five mentions to test mention-spam handling.
- A clearly fake Discord invite URL to test invite-spam handling.
- A harmless use of one configured scam phrase in a private test discussion, if moderation policy permits the test.

Confirm the message is blocked and an alert appears in `#moderator-watch`. Then open **Server Settings** > **Audit Log** and confirm infrastructure changes include the `HWC infrastructure apply` reason.

Do not test scams against real users or publish real malicious links.

## 13. Archive and Inspect Administrative Audit Data

Run:

```text
node dist/main.js archive-audit-log
```

The result is saved under `discord/audit-logs/`, which is ignored by Git. It contains administrative audit records only; it must not be used as a message archive.

## 14. Reconstruction Test

The essential disaster-recovery test is a fresh reconstruction:

1. Preserve only the repository manifests and the generated state mapping as evidence; do not copy channels or settings manually.
2. Create a second blank disposable server.
3. Repeat Steps 2 through 10 using that second server ID.
4. Compare the second server’s plan and snapshot to the first server’s desired state.
5. Record every setting that cannot be recreated through the CLI as a new required manual step.

A server built through manual channel setup is not a valid reconstruction test.

## 15. Cleanup

1. Reset the bot token if it was ever exposed outside the local `.env` file.
2. Delete the disposable Discord test server from **Server Settings** > **Delete Server**.
3. Remove `tools/hwc-discord/.env` if the credentials are no longer needed.
4. Remove ignored audit exports and snapshots only if they are no longer needed for test evidence.
5. Confirm no credentials or generated state files are staged for commit:

```text
git status --short
```

Do not promote a test bot token, test guild ID, test state mapping, or test snapshot to production.
