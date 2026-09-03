# Server UI Testing Plan

This plan verifies the Discord server through the Discord desktop or web UI. It
tests the server created from `discord/manifest/`, not a manually assembled
approximation.

Run every test case on a separate, newly created test server. Do not reuse a
server from an earlier case: roles, onboarding answers, AutoMod alerts,
messages, and audit records would make the result ambiguous.

## Accounts and Evidence

Use two Discord accounts in separate browser profiles or Discord clients:

- **Admin**: server owner. It configures Membership Screening, assigns roles,
  and observes staff-only areas.
- **Member**: a separate adult test account with no server roles on arrival. It
  is the account used to test the member experience.

For each case, save screenshots or a short result record containing the server
ID, test-case ID, date, Discord client used, pass/fail result, and unexpected
behavior. Do not include bot tokens, invite URLs, or real sensitive content in
test evidence.

## Required Setup for Every Test Case

Complete these steps at the start of **every** test case.

1. Create a new empty Discord server and install the Infrastructure Bot as
   described in [bootstrap.md](bootstrap.md). Keep the Admin account as server
   owner and place the bot role below the Admin/Archivist authority and above
   roles it must manage.
2. From `tools/hwc-discord`, set `DISCORD_GUILD_ID` to the new server and run:

   ```text
   npm run build
   node dist/main.js validate
   node dist/main.js plan
   node dist/main.js apply --yes
   node dist/main.js verify
   ```

   Expected: validation, apply, and verification succeed. The plan after apply
   shows no remaining managed changes.
3. On the Admin account, configure **Server Settings -> Safety Setup ->
   Membership Screening**. Require acceptance of the Community Standards and
   confirmation of 18+ eligibility, then save. This is a manual configuration
   requirement; the provisioning CLI does not manage it.
4. Create a one-use invite and join with the Member account. Complete
   Membership Screening, then complete the onboarding prompts. For the
   interests prompt, select all options unless the case states otherwise. For
   mature-content access, select **Show me how to opt in**; do not assign
   `Mature Content` until the role-change step.
5. On the Member account, record visible channels before role assignment. On
   the Admin account, assign the roles specified in the case. Return to the
   Member account, refresh Discord if necessary, and record visible channels
   after each change.
6. Complete the case-specific feature test. End by running:

   ```text
   node dist/main.js drift
   node dist/main.js verify
   ```

   Remove temporary role assignments first if they are not part of the desired
   server state. `verify` must pass; record any drift and its cause.
7. Delete the disposable server only after collecting the evidence. Do not
   delete a server until any needed audit-log export or screenshots are saved.

## Channel Visibility Baseline

Perform this checklist in every case after the Member account completes
screening and onboarding, first without `Member`, then with `Member`, then with
any additional case role. A channel is considered visible when it appears in
the Member account's channel list and can be opened.

| Channel group | No `Member` role | With `Member` role | Additional role needed |
| --- | --- | --- | --- |
| `#welcome-to-the-house`, `#start-here`, `#community-standards`, `#announcements` | Visible; cannot post | Visible; cannot post | Staff may post in `#announcements` |
| `#questions-for-the-keepers`, `#introductions`, `#orientation-chat`, `#access-and-roles`, `#community-lounge` | Visible; can post | Visible; can post | None |
| `#contact-the-council` | Hidden | Visible; can post | None |
| THE COMMONS channels | Hidden | Visible; can post | None |
| THE WORKROOM channels and forums | Hidden | Visible; can post/create forum posts subject to Discord permissions | None |
| `#mature-horror-craft`, `#restricted-workshop` | Hidden | Hidden | `Mature Content` |
| `#content-warning-desk` | Hidden | Visible; can post | None |
| THE NOTICE BOARD channels and forums | Hidden | Visible; can post/create forum posts | None |
| `#governance-hall` | Hidden | Visible; can create/comment on forum posts | None |
| `#council-record`, `#election-booth` | Hidden | Visible; cannot post | Staff may post |
| `#council-chamber` | Hidden | Hidden | `Councilor` |
| `#moderator-watch` | Hidden | Hidden | `Moderator` |
| `#archivists-workbench` | Hidden | Hidden | `Archivist` |
| `The Lantern Room`, `The Night Workshop`, `The Reading` | Hidden | Visible; can connect and speak | None |
| `Council Meeting Room` | Hidden | Hidden | `Councilor` or `Archivist` |

The public read-only Threshold channels intentionally have channel-level
overrides, so Discord may display them as not synced with `THE THRESHOLD`.
That is expected. Do not click **Sync Now** during a test.

## Test Cases

### UI-01: Join, Membership Screening, and Basic Onboarding

Use the required setup. At step 4, select only **Writing craft** and
**Not now**.

Expected results:

- The Member account is pending until both screening acknowledgments are
  accepted.
- Before screening is complete, only the intended public onboarding experience
  is available; member-only and staff-only areas remain hidden.
- The onboarding screen shows both configured prompts.
- Selecting **Writing craft** makes `#craft-after-dark`,
  `#brainstorming-seance`, and `#revision-table` discoverable in the channel
  list after the Member role is assigned.
- Selecting **Not now** does not grant mature-channel access.
- All seven default onboarding channels remain visible to the Member account.

### UI-02: Onboarding Interest Routing and Channels & Roles Changes

Use the required setup. At step 4, select every interest option and **Show me
how to opt in**.

Expected results:

- The selected interests surface the configured craft, critique, reading,
  publishing, events, and co-working channels.
- The mature-content answer exposes `#content-warning-desk` but does not expose
  either mature channel.
- From the Member account's **Channels & Roles** area, change the interest
  selections and confirm the displayed optional channels update accordingly.
- Removing an interest must not bypass the `Member` role requirement or reveal
  staff-only channels.

### UI-03: Member Role and All Member-Only Channel Access

Use the required setup and assign only `Member` to the Member account.
Complete the full Channel Visibility Baseline.

Expected results:

- Every Commons channel, Workroom channel/forum, Notice Board channel/forum,
  `#content-warning-desk`, `#governance-hall`, and the three member voice
  channels is visible and usable as listed in the baseline.
- `#council-record` and `#election-booth` are readable but reject attempts to
  post.
- Both mature channels and all three private administration text channels
  remain hidden.

### UI-04: Public, Read-Only, and Category Override Behavior

Use the required setup. Do not assign `Member` until after testing the public
areas.

Expected results:

- The five public-chat Threshold channels accept a harmless message from the
  Member account.
- `#welcome-to-the-house`, `#start-here`, `#community-standards`, and
  `#announcements` reject a message from the Member account.
- In **Edit Channel -> Permissions**, `#announcements` reports that it is not
  synced with `THE THRESHOLD`; its effective permissions remain public read-only.
- After assigning `Councilor`, `Moderator`, and `Archivist` one at a time,
  verify each can post in the four public read-only channels as configured.

### UI-05: Mature Content Opt-In

Use the required setup. Assign `Member`, verify the mature channels are hidden,
then assign `Mature Content`.

Expected results:

- `#mature-horror-craft` and `#restricted-workshop` appear only after the
  `Mature Content` role is assigned.
- The Member account can post in `#mature-horror-craft` and create a harmless
  tagged post in `#restricted-workshop`.
- Removing `Mature Content` hides both channels again.
- `Mature Content` alone must not reveal any Council, moderation, or Archivist
  channels.

### UI-06: Forum Channels and Tags

Use the required setup and assign `Member`. In each accessible forum, create a
harmless test post, select every available tag across one or more posts, add a
comment, and delete the test content before teardown.

Verify these exact tag sets:

- `#first-sightings`: `Excerpt`, `Opening`, `Scene`, `Flash`, `No Critique`,
  `Critique Welcome`.
- `#critique-requests`: `Open`, `Full`, `Closed`, `Short Story`, `Novel`,
  `Novella`, `Poetry`, `Script`, `Early Draft`, `Revision`, `Structure`,
  `Character`, `Pacing`, `Line Feedback`.
- `#critique-exchange`: `Open`, `In Progress`, `Closed`, `Short Story`,
  `Novel`, `Novella`, `Poetry`, `Script`.
- `#the-unquiet-shelf`: `Short Story`, `Novel`, `Novella`, `Poetry`, `Script`,
  `Published`, `Complete`.
- `#calls-from-the-dark`: `Open`, `Closing Soon`, `Closed`, `Paying`,
  `Non-paying`, `Anthology`, `Magazine`, `Contest`, `Residency`.
- `#member-publications`: `Book`, `Story`, `Reading`, `Crowdfunding`, `Other`.
- `#services-and-collaborators`: `Editing`, `Design`, `Narration`,
  `Collaboration`, `Other`.
- `#events-in-the-lantern-room`: `Writing Sprint`, `Reading`, `Book Club`,
  `Workshop`, `Other`.
- `#governance-hall`: `Proposal`, `Discussion`, `Ordinary Rule`,
  `Constitutional Amend`, `Resolved`, `Withdrawn`.

Run the same check for `#restricted-workshop` after assigning `Mature Content`;
its tags must be `Open`, `Full`, `Closed`, `Short Story`, `Novel`, `Novella`,
`Poetry`, `Script`, and `Warnings Included`.

### UI-07: Governance and Private Role Boundaries

Use the required setup and assign `Member`, then test roles cumulatively and
individually where possible.

Expected results:

- `Councilor` reveals `#council-chamber` and `Council Meeting Room`, but not
  `#moderator-watch` or `#archivists-workbench`.
- `Moderator` reveals `#moderator-watch`, but not `#council-chamber` or
  `#archivists-workbench`.
- `Archivist` reveals `#archivists-workbench` and may access the Council areas,
  but does not receive `Administrator` through any managed role.
- `Council Chair`, `Workshop Coordinator`, and `Election Administrator` do not
  reveal a private channel merely by holding that role.
- The Member account can read but cannot post in `#council-record` and
  `#election-booth`; a Councilor, Moderator, or Archivist can post there.

### UI-08: Voice Channels

Use the required setup and assign `Member`.

Expected results:

- The Member account can view, connect to, and speak in `The Lantern Room`,
  `The Night Workshop`, and `The Reading`.
- The Member account cannot see or join `Council Meeting Room`.
- A Councilor can join and speak in `Council Meeting Room`.
- A Moderator can move a test member between member voice channels but cannot
  see the Council room unless also assigned `Councilor` or `Archivist`.
- An Archivist can manage channel settings in the voice areas.

### UI-09: Seed Content and Pinned Messages

Use the required setup and assign `Member`.

Expected results:

- The configured seed content exists and is pinned in
  `#welcome-to-the-house`, `#start-here`, `#community-standards`,
  `#craft-after-dark`, and `#contact-the-council`.
- The content is readable by the roles permitted to view the channel.
- The Member account cannot alter pins in the public read-only channels.
- The content matches the source documents named in
  `discord/manifest/seed-content.yaml` without truncation or missing sections.

### UI-10: AutoMod Blocking and Staff Alerts

Use the required setup, assign `Member` to the Member account and `Moderator`
to the Admin account. Use only harmless, clearly fake test content. Send each
sample from the Member account in `#community-lounge`, one at a time:

- A message with five mentions of the Admin account, to test mention spam.
- Several rapidly repeated harmless messages, to test message spam.
- `discord.gg/not-a-real-invite`, to test invite filtering.
- `free nitro`, to test the scam-phrase filter.

Expected results:

- Discord blocks each test message according to the corresponding enabled
  AutoMod rule.
- An alert for each block is visible in `#moderator-watch` to the Admin account
  with the `Moderator` role.
- The Member account cannot see `#moderator-watch` before or after a block.

Do not send real scam links, target real users, or test outside this disposable
server.

### UI-11: Community Safety Settings and Server Notices

Use the required setup and inspect **Server Settings** on the Admin account.

Expected results:

- Community mode is enabled.
- Verification level is `Medium`.
- Explicit content filtering applies to all members.
- The rules channel is `#community-standards`.
- Discord's public updates and safety alerts target `#moderator-watch`.
- The Member account has no access to the staff notice destination.

### UI-12: Reporting Entry Point Boundary

Use the required setup and assign `Member`.

Expected results:

- `#contact-the-council` is hidden before `Member` is assigned and visible
  afterward.
- The pinned reporting guidance is readable.
- A harmless test message can be sent by the Member account, subject to the
  channel's configured permissions.

This test does **not** assert private ticket creation or staff-member routing:
the repository provisions only the channel entry point, not a ticket bot or
ticket workflow. Test that workflow separately after selecting and configuring
such a service.

### UI-13: Role Hierarchy and Least Privilege

Use the required setup. On the Admin account, inspect **Server Settings ->
Roles**, then use **View Server As Role** for each managed role.

Expected results:

- Roles are ordered Archivist, Infrastructure Bot, Councilor, Council Chair,
  Moderator, Workshop Coordinator, Election Administrator, Mature Content,
  Member, and `@everyone` from highest to lowest, subject to the server owner
  being above all managed roles.
- No managed governance or membership role has Discord's `Administrator`
  permission.
- The previewed channel access agrees with the Channel Visibility Baseline.
- The Infrastructure Bot can manage the roles below it but cannot manage the
  server owner or Archivist authority above it.

### UI-14: Administrative Audit Export and Reconciliation

Use the required setup. Make one harmless, documented UI change that is within
the disposable server, such as assigning `Member` to the test account. Do not
change a managed channel or permission unless testing drift deliberately.

Expected results:

- **Server Settings -> Audit Log** includes the provisioning changes with an
  `HWC infrastructure apply` reason.
- Running `node dist/main.js archive-audit-log` writes an administrative audit
  export under `discord/audit-logs/` and does not export member messages.
- `node dist/main.js snapshot` creates a non-authoritative snapshot.
- `node dist/main.js plan` and `node dist/main.js verify` report no managed
  changes after ordinary member role testing is cleaned up.

### UI-15: Deliberate Managed Drift Detection

Use the required setup. With the Admin account, make one reversible change to a
managed setting, such as changing the name of `#community-lounge` to
`community-lounge-test`.

Expected results:

- `node dist/main.js drift` and `node dist/main.js plan` identify the changed
  managed resource without deleting anything.
- `node dist/main.js apply --yes` restores the manifest name.
- `node dist/main.js verify` passes after restoration.

Record the exact plan output in the test evidence. This is the only case that
intentionally changes managed Discord state through the UI.

## Exit Criteria

The server UI test suite passes when every case passes on its own fresh server,
all channel-visibility expectations hold, all four AutoMod rules block and
alert correctly, and each final `verify` reports no managed drift. Fail the
suite if any private channel is visible to an unauthorized account, any
read-only channel accepts a member post, Membership Screening is bypassed, or
the reconciliation tool cannot restore deliberate drift.
