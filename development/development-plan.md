**DEVELOPMENT PLAN**

# 1. Define the target architecture

Create a new technical project within the existing repository, or preferably alongside it if you want governance documents and operational code reviewed differently:

```text
Horror-Writers-Guild/
├── README.md
├── SERVER GOVERNANCE & CONSTITUTION.md
├── community-standards.md
├── member-guide.md
├── proposed-channels.md
│
├── discord/
│   ├── manifest/
│   │   ├── guild.yaml
│   │   ├── roles.yaml
│   │   ├── categories.yaml
│   │   ├── channels.yaml
│   │   ├── forums.yaml
│   │   ├── permissions.yaml
│   │   ├── onboarding.yaml
│   │   ├── automod.yaml
│   │   ├── seed-content.yaml
│   │   └── manual-steps.yaml
│   │
│   ├── seed-content/
│   │   ├── welcome.md
│   │   ├── start-here.md
│   │   ├── community-standards.md
│   │   ├── workshop-guide.md
│   │   └── reporting.md
│   │
│   ├── schemas/
│   │   └── manifest.schema.json
│   │
│   └── snapshots/
│       └── README.md
│
├── tools/
│   └── hwc-discord/
│       ├── ...
│
└── tests/
```

The **manifest is authoritative**. Snapshots are evidence of actual Discord state, not authority.

That distinction should be architectural, not merely conventional.

---

# 2. Choose the implementation technology

I would use **TypeScript/Node.js**.

Reasons:

* excellent Discord ecosystem;
* Discord.js can reduce boilerplate;
* good YAML/JSON Schema libraries;
* strong typing for desired/current-state comparison;
* easy CLI development;
* good GitHub Actions support.

A reasonable stack:

```text
Node.js 22+
TypeScript
discord.js
yaml
ajv            JSON Schema validation
commander       CLI
vitest          tests
pino            structured logging
```

I would use Discord.js for ordinary objects/events but allow direct REST API calls where the library abstracts away something you need.

Do **not** make the Discord bot itself the only interface. Separate:

```text
Discord API client
        ↑
reconciliation engine
        ↑
manifest parser
        ↑
CLI
```

Then the same engine can eventually be invoked from a bot command, GitHub Action, or administrative UI.

---

# 3. Establish stable logical IDs

This is foundational.

Never make Discord-generated snowflake IDs part of the canonical specification.

Give everything an internal key:

```yaml
roles:
  member:
    name: Member

  councilor:
    name: Councilor

channels:
  critique_requests:
    name: critique-requests

  council_record:
    name: council-record
```

Discord IDs belong in a generated state file:

```json
{
  "roles.member": "123456...",
  "roles.councilor": "234567...",
  "channels.critique_requests": "345678..."
}
```

This makes the same manifest applicable to:

* the initial server;
* a development server;
* a staging server;
* a replacement server after deletion.

---

# 4. Derive the initial role model from the founding documents

I would start with these permanent roles.

### Infrastructure roles

```text
@everyone
Archivist
Infrastructure Bot
```

### Governance roles

```text
Councilor
Council Chair
Moderator
Workshop Coordinator
Election Administrator
```

`Council Chair` probably should not receive more Discord authority than `Councilor`; it is primarily an institutional designation.

### Membership roles

```text
Member
Mature Content
```

Because the entire proposed community is 18+, `Member` means someone who has completed the server's membership process. The documents explicitly describe the server as an adult community.

`Mature Content` is a **second opt-in role** for access to the Red Room. It isn't a substitute for Discord's age-restricted-channel mechanism.

### Temporary roles

Do not create these permanently in YAML:

```text
Workshop: <identifier>
Election Candidate: <cycle>
Suspended
Restricted
```

They are runtime entities managed by the operational bot.

For example:

```text
Workshop: hollow-house-2026-09
```

---

# 5. Define the role hierarchy

Proposed order, highest to lowest:

```text
Archivist
Infrastructure Bot
Councilor
Moderator
Workshop Coordinator
Election Administrator
Mature Content
Member
@everyone
```

There is an important implementation detail here: Discord bots cannot manage roles above their own highest role.

During bootstrap, therefore:

```text
Archivist
Infrastructure Bot   ← temporarily high
...
```

After provisioning, verify that the bot has only the authority it actually needs.

I would **not** grant `Administrator` to Councilors or Moderators. The governance documents expect role isolation and recusal; `Administrator` defeats channel-level access controls.

---

# 6. Define category structure

Translate the proposed structure essentially directly:

```yaml
categories:
  threshold:
    name: "THE THRESHOLD"

  commons:
    name: "THE COMMONS"

  workroom:
    name: "THE WORKROOM"

  red_room:
    name: "THE RED ROOM"

  notice_board:
    name: "THE NOTICE BOARD"

  council:
    name: "THE COUNCIL CHAMBER"

  voice:
    name: "VOICE & EVENTS"
```

The manifest should preserve ordering.

---

# 7. Classify every channel by Discord type

This is where `proposed-channels.md` becomes implementation data.

I would start with this mapping.

### Threshold

| Channel                     | Type                                   |
| --------------------------- | -------------------------------------- |
| `welcome-to-the-house`      | text/read-only                         |
| `start-here`                | text/read-only                         |
| `community-standards`       | text/read-only                         |
| `announcements`             | Announcement                           |
| `questions-for-the-keepers` | text                                   |
| `contact-the-council`       | text containing ticket-app entry point |

### Commons

Ordinary text channels:

```text
the-flickering-lamp
what-are-you-writing
horror-reading-room
screen-and-scream
the-research-cabinet
quiet-company
```

### Workroom

```text
craft-after-dark          text
brainstorming-seance      text
first-sightings           Forum
critique-requests         Forum
critique-exchange         Forum / controlled workflow
revision-table            text
the-unquiet-shelf         Forum
```

I would use Forums more heavily than the proposed document specifies because they fit the content semantics better.

### Red Room

```text
mature-horror-craft       text + age restricted
restricted-workshop       Forum + age restricted
content-warning-desk      text
```

### Notice Board

```text
calls-from-the-dark       Forum
market-watch              text
member-publications       Forum
services-and-collaborators Forum
events-in-the-lantern-room Forum or text
```

### Council

```text
governance-hall           Forum
council-record            text/read-only
election-booth            Forum, normally locked
council-chamber           private text
moderator-watch           private text
archivists-workbench      private text
```

Discord's API supports creating guild channels and roles, and Discord exposes Forum-specific fields such as `available_tags`; a Forum currently supports up to 20 available tags. ([Documentation - Discord][1])

---

# 8. Define Forum tags

Treat Forum taxonomy as configuration.

For `critique-requests`:

```yaml
tags:
  - Open
  - Full
  - Closed
  - Short Story
  - Novel
  - Novella
  - Poetry
  - Script
  - Early Draft
  - Revision
  - Structure
  - Character
  - Pacing
  - Line Feedback
```

For `first-sightings`:

```text
Excerpt
Opening
Scene
Flash
No Critique
Critique Welcome
```

For `calls-from-the-dark`:

```text
Open
Closing Soon
Closed
Paying
Non-paying
Anthology
Magazine
Contest
Residency
```

For `governance-hall`:

```text
Proposal
Discussion
Ordinary Rule
Constitutional Amendment
Resolved
Withdrawn
```

These tags should eventually be ordinary rules rather than constitutional provisions.

---

# 9. Define the base permission matrix

Do this **before writing automation**.

Create a human-readable matrix such as:

| Resource            | Everyone | Member | Mature | Workshop | Council | Moderator | Archivist |
| ------------------- | -------: | -----: | -----: | -------: | ------: | --------: | --------: |
| Threshold           |     Read |   Read |   Read |     Read |  Manage |    Manage |    Manage |
| Commons             |        — |     RW |     RW |       RW |      RW |        RW |    Manage |
| Workroom            |        — |     RW |     RW |       RW |      RW |        RW |    Manage |
| Red Room            |        — |      — |     RW |       RW |      RW |        RW |    Manage |
| Council Chamber     |        — |      — |      — |        — |      RW |         — |    Manage |
| Moderator Watch     |        — |      — |      — |        — |       — |        RW |    Manage |
| Archivist Workbench |        — |      — |      — |        — |       — |         — |        RW |

Then express the matrix in YAML.

Example:

```yaml
channels:
  council_chamber:
    permissions:
      everyone:
        view_channel: deny

      councilor:
        view_channel: allow
        send_messages: allow
        read_message_history: allow

      archivist:
        view_channel: allow
```

Use explicit permission templates instead of copying arbitrary bitfields everywhere:

```yaml
permission_profiles:
  public_read_only:
  member_chat:
  mature_chat:
  council_private:
  moderator_private:
  archivist_private:
```

That dramatically reduces mistakes.

---

# 10. Model workshops separately from static configuration

The server manifest establishes:

```text
#critique-requests
#critique-exchange
#restricted-workshop
```

It should **not** contain individual workshops.

Those belong to an application workflow.

The eventual workshop automation should support:

```text
/workshop request
/workshop volunteer
/workshop accept
/workshop open
/workshop close
/workshop withdraw
```

The repository's rules say critique is opt-in, authors define feedback boundaries, creative work remains theirs, and workshop material cannot be repurposed outside its permitted context.

So an eventual workshop object should include:

```yaml
workshop:
  author:
  title:
  length:
  content_warnings:
  requested_feedback:
  excluded_feedback:
  maturity: standard
  participants:
  opens_at:
  closes_at:
  retention_policy:
```

**Do not make workshop automation part of MVP provisioning.**

The initial infrastructure project should create the places where workshops operate. Workshop lifecycle automation can be Phase 2.

---

# 11. Define Community-server configuration

The manifest should request:

```yaml
community:
  enabled: true

  verification_level: medium

  explicit_content_filter: all_members

  rules_channel: community_standards

  public_updates_channel: archivists_workbench

  safety_alerts_channel: moderator_watch
```

Discord's current API exposes `COMMUNITY` as a mutable guild feature and requires Administrator permission to enable it. Discord also exposes `rules_channel_id`, `public_updates_channel_id`, verification level, explicit-content filtering and related guild properties. ([Documentation - Discord][1])

This is one justification for temporary bootstrap authority.

---

# 12. Treat Membership Screening as a manual checkpoint

Do not spend engineering effort trying to automate something Discord currently does not expose properly.

Discord's documentation states that it has removed API documentation for getting/editing Membership Screening while revising that API; the `pending` member behavior remains available. ([Documentation - Discord][1])

Put it explicitly in:

```yaml
manual_steps:
  - key: membership_screening
    required: true
    instructions: >
      Enable Membership Screening and require acceptance
      of Community Standards and confirmation of 18+ eligibility.
```

The CLI should tell the Archivist:

```text
MANUAL STEP REQUIRED

[ ] Configure Membership Screening
    Server Settings → Safety Setup → Membership Screening

Required:
- acceptance of Community Standards
- 18+ community acknowledgment
```

Do not pretend the restore is 100% automated when it isn't.

---

# 13. Configure Onboarding separately

Discord **does** currently expose `Get Guild Onboarding` and `Modify Guild Onboarding`. The modification endpoint requires `MANAGE_GUILD` and `MANAGE_ROLES`. ([Documentation - Discord][1])

Potential questions:

```text
What brings you here?
☑ Writing craft
☑ Critique/workshops
☑ Reading horror
☑ Publishing/markets
☑ Events/co-working

Would you like access to mature-content areas?
○ Not now
○ Show me how to opt in
```

Don't use onboarding to certify age.

The API currently imposes conditions when enabling onboarding, including default-channel requirements, so your planning engine must validate those dependencies before attempting activation. ([Documentation - Discord][1])

---

# 14. Design AutoMod policy

Start conservatively.

The API currently supports listing, creating, modifying and deleting Auto Moderation rules. Creating them requires `MANAGE_GUILD`, with additional permissions for some actions. ([Documentation - Discord][2])

MVP AutoMod:

```text
mention spam protection
common scam/spam patterns
invite spam
extreme message spam
possibly known slur/harassment terms
```

Do **not** attempt to automate nuanced Community Standards enforcement using keyword matching.

Especially don't try to detect:

```text
AI-generated prose
plagiarism
bad-faith critique
misgendering
commercial conflicts
```

Those require human judgment.

---

# 15. Define seed content

Turn existing repository artifacts into authoritative Discord posts.

For example:

```yaml
seed_content:
  welcome:
    channel: welcome_to_the_house
    source: discord/seed-content/welcome.md
    pin: true

  community_standards:
    channel: community_standards
    source: community-standards.md
    pin: true
```

Each managed message should include hidden or visible provenance:

```text
Canonical source:
community-standards.md
Repository revision: <git SHA>
```

The automation should maintain a mapping:

```text
seed.community_standards → Discord message 1234567
```

Subsequent apply operations should edit the managed message rather than produce another copy.

---

# 16. Create a JSON Schema for the manifest

Before writing Discord mutation code, make malformed configuration impossible.

Validate:

* duplicate logical keys;
* duplicate channel names within a category;
* references to nonexistent roles;
* references to nonexistent categories;
* impossible Forum tag counts;
* contradictory permissions;
* missing Community prerequisites;
* unrecognized channel types;
* permanent `Administrator` grants;
* accidental `@everyone` access to restricted channels.

Make these **hard validation failures**.

Example:

```text
ERROR permissions.red_room

restricted-workshop grants VIEW_CHANNEL to @everyone.
Expected Mature Content only.
```

---

# 17. Build the Discord read layer first

Before the tool can change anything, it must accurately describe an existing server.

Implement:

```text
getGuild()
getRoles()
getChannels()
getAutoModRules()
getOnboarding()
getForumConfiguration()
```

Normalize Discord objects into your own internal representation.

For example:

```ts
interface ActualRole {
  discordId: string;
  name: string;
  permissions: Set<Permission>;
  position: number;
}
```

Do not build comparisons directly on raw Discord JSON.

---

# 18. Build the desired-state parser

Convert YAML into the same conceptual model:

```text
DesiredGuild
DesiredRole[]
DesiredCategory[]
DesiredChannel[]
DesiredAutoModRule[]
DesiredOnboarding
```

At this point you should have:

```text
DesiredState
ActualState
```

but still **zero mutation code**.

---

# 19. Build the reconciliation engine

This is the heart of the system.

Input:

```text
desired state
actual state
state mapping
```

Output:

```text
ChangePlan
```

Operations should look like:

```text
CreateRole
UpdateRole
MoveRole

CreateCategory

CreateChannel
UpdateChannel
MoveChannel

SetPermissionOverwrite

CreateForumTag
RemoveForumTag

ModifyGuild

CreateAutoModRule

ModifyOnboarding
```

Each action needs:

```text
resource
current
desired
risk level
dependencies
```

---

# 20. Implement `hwc plan`

This is the first complete usable product.

Example:

```text
$ hwc plan --guild 1234

HWC Discord Plan
────────────────────────────────────

Guild
  ~ enable Community

Roles
  + Member
  + Mature Content
  + Councilor
  + Moderator
  + Workshop Coordinator

Categories
  + THE THRESHOLD
  + THE COMMONS
  + THE WORKROOM
  ...

Channels
  + #welcome-to-the-house
  + #critique-requests [forum]
  + #restricted-workshop [forum, age restricted]
  ...

Permissions
  + 87 overwrites

AutoMod
  + mention spam
  + invite spam

Manual requirements
  ! Membership Screening

73 create
12 modify
0 delete
```

`plan` must never mutate Discord.

---

# 21. Introduce risk classes

Classify operations:

```text
SAFE
SENSITIVE
DESTRUCTIVE
```

Examples:

**SAFE**

```text
create missing channel
add missing Forum tag
update topic
```

**SENSITIVE**

```text
change permission
change role hierarchy
enable Community
```

**DESTRUCTIVE**

```text
delete role
delete channel
remove Forum tag
remove access from governance role
```

MVP should **not automatically execute destructive operations at all**.

A manifest omission must not mean:

> delete that Discord channel.

Instead:

```text
UNMANAGED RESOURCE DETECTED:
#temporary-discussion

No action taken.
```

This prevents a typo from destroying history.

---

# 22. Build dependency ordering

The apply engine cannot operate alphabetically.

Required sequence:

```text
1. Validate manifest
2. Read existing Discord state
3. Create/update base guild configuration
4. Create roles
5. Arrange role hierarchy
6. Create categories
7. Create prerequisite text channels
8. Enable Community
9. Create Community-dependent channel types
10. Create remaining channels
11. Apply channel positions
12. Apply permission overwrites
13. Configure Forum tags/settings
14. Configure AutoMod
15. Configure onboarding
16. Seed institutional content
17. Perform verification
18. Produce manual-step checklist
```

Internally this is a dependency graph.

---

# 23. Build `hwc apply`

The first version should require explicit confirmation:

```text
hwc plan > plan.txt

hwc apply
```

and show:

```text
67 operations
5 sensitive operations
0 destructive operations

Apply? [y/N]
```

Eventually CI can use:

```text
hwc apply --approved-plan <hash>
```

so the applied plan can be proven to be the one reviewed.

---

# 24. Use Discord audit-log reasons

Whenever the API supports it, attach:

```text
HWC infrastructure apply <git-sha>
```

Discord allows applications performing eligible administrative actions to provide `X-Audit-Log-Reason`. ([Documentation - Discord][3])

That gives you:

```text
Discord audit event
↔ Git commit
↔ infrastructure plan
```

which fits the Constitution's emphasis on accountable technical administration.

---

# 25. Build post-apply verification

Never assume HTTP 200 means the server is correct.

After apply:

1. fetch the server again;
2. normalize it;
3. recompute plan;
4. expect zero remaining managed drift.

Output:

```text
VERIFY

Guild settings ........ PASS
Roles .................. PASS
Role hierarchy ......... PASS
Categories .............. PASS
Channels ................ PASS
Permissions ............. PASS
Forums .................. PASS
AutoMod ................. PASS
Onboarding .............. PASS

Manual steps ............ 1 pending

Managed drift: 0
```

---

# 26. Create `hwc snapshot`

Only after provisioning works.

Snapshot:

```text
Discord → normalized configuration → timestamped JSON/YAML
```

Store:

```text
snapshots/
  2026-09-01T180000Z/
     guild.yaml
     roles.yaml
     channels.yaml
     automod.yaml
     onboarding.yaml
     metadata.json
```

Snapshots should state:

```yaml
authoritative: false
```

The canonical manifest remains authoritative.

---

# 27. Archive Discord audit logs

Discord's audit logs are available to apps with `VIEW_AUDIT_LOG`, but Discord currently retains entries for only **45 days**. ([Documentation - Discord][3])

Add a later scheduled process:

```text
hwc archive-audit-log
```

Store them outside Discord.

Do not combine this with message archiving.

Administrative audit records and user conversations have very different privacy implications.

---

# 28. Build drift detection

Once the server exists:

```text
hwc drift
```

should effectively run `plan` and categorize unexpected changes.

High-priority alerts:

```text
Administrator permission added
restricted channel became visible
bot role moved
Council channel access changed
Moderator access changed
Community disabled
AutoMod disabled
age restriction removed
```

Example:

```text
CRITICAL DRIFT

#restricted-workshop

VIEW_CHANNEL
expected:
  Mature Content = allow
  @everyone = deny

actual:
  @everyone = allow
```

Initially report only. Don't auto-remediate.

---

# 29. Add manifest-level governance controls

Add rules the software itself refuses to violate.

For example:

```yaml
guardrails:
  forbid_administrator:
    - councilor
    - moderator
    - workshop_coordinator

  private_channels:
    council_chamber:
      required_roles:
        - councilor

    moderator_watch:
      required_roles:
        - moderator

  mature_channels:
    - mature_horror_craft
    - restricted_workshop
```

Then even a malformed PR can't casually deploy dangerous permissions.

---

# 30. Treat private reporting as an external integration

The static server merely provisions:

```text
#contact-the-council
```

and posts the entry UI/instructions.

The **ticket service should be a separate subsystem**.

Do not mix it into infrastructure reconciliation.

Its design needs to solve:

```text
member → ordinary report → eligible Moderators/Councilors
member → report about Moderator → exclude Moderator
member → report about Councilor → exclude Councilor
member → report about Archivist → external/off-server recipient
```

The repository explicitly requires the reported official not participate in review.

The owner-access limitation means the Archivist-report path must leave the Discord server.

---

# 31. Keep elections out of provisioning

Provision:

```text
#election-booth
Election Administrator role
candidate role template
```

Do not implement voting in the initial infrastructure tool.

The founding documents require anonymous ranked-choice ballots using STV.

That's its own security-sensitive project.

---

# 32. Create unit tests

Test the reconciliation engine without Discord.

Examples:

```text
blank server → all required resources created
existing role → no duplicate
wrong role position → move operation
wrong permission → correction
unknown extra channel → leave unmanaged
restricted workshop visible to everyone → critical correction
second apply → zero changes
```

That last one is the defining idempotency test.

---

# 33. Create integration tests against a disposable Discord server

Use a dedicated test guild.

Run:

```text
blank guild
   ↓
apply
   ↓
verify
   ↓
plan again
```

Expected:

```text
second plan: 0 changes
```

Then deliberately corrupt it:

```text
change permissions
delete a channel
move a role
remove a Forum tag
```

Run plan.

The expected differences must be detected accurately.

---

# 34. Perform the most important test: reconstruction

Once the first test server looks correct:

1. preserve nothing except manifest/state;
2. create another empty guild;
3. install the bot;
4. apply;
5. compare the two.

This reveals hidden UI-only configuration.

Anything missing becomes either:

```text
automation work
```

or:

```text
documented manual step
```

Never leave it as tribal knowledge.

---

# 35. Seed the production server using exactly the same process

Production launch should therefore be:

```text
1. Create blank Discord server manually.
2. Create/install HWC infrastructure application.
3. Put Infrastructure Bot role near top.
4. Set DISCORD_TOKEN securely.
5. Set DISCORD_GUILD_ID.
6. Run hwc validate.
7. Run hwc plan.
8. Review plan.
9. Run hwc apply.
10. Run hwc verify.
11. Complete Membership Screening/manual steps.
12. Run hwc verify-manual.
13. Snapshot.
14. Commit deployment record.
15. Invite founding members.
```

**Do not manually construct the production channels beforehand.**

Otherwise you aren't testing recovery.

---

# 36. Production credential handling

Never put:

```text
Discord bot token
application secret
OAuth secrets
ticket-system credentials
```

in the repository.

For local administration:

```text
.env
```

excluded by `.gitignore`.

For CI:

```text
GitHub Actions secrets
```

or a dedicated secrets manager.

Limit the application to the one intended production server where practical.

---

# 37. Add GitHub Actions only after local tooling works

Initially, deployment should be manual from a trusted machine.

Later:

```text
PR
 ↓
manifest validation
 ↓
unit tests
 ↓
generate plan against production
 ↓
attach plan to workflow
 ↓
human review
 ↓
approved deployment
```

I would **not** have a merge automatically mutate Discord in version 1.

Governance-affecting infrastructure deserves an explicit deployment action.

---

# 38. Recommended development milestones

I would break the project into these deliverable milestones.

### M1 — Canonical manifest

Done when:

* every proposed channel is represented;
* permanent roles exist;
* permission matrix exists;
* Forum tags exist;
* Community settings exist;
* manual limitations are documented;
* schema validation passes.

**No Discord writes yet.**

### M2 — Read + Plan

Done when:

```text
hwc plan
```

can correctly compare a blank/test server with the manifest.

### M3 — Core Apply

Supports:

```text
roles
categories
ordinary channels
channel ordering
permissions
```

Second apply produces zero changes.

### M4 — Community features

Supports:

```text
Community mode
Forum channels/tags
Announcement channel
age-restricted channels
AutoMod
Onboarding
```

Membership Screening remains documented/manual while Discord's API doesn't expose it.

### M5 — Seed content

Managed rule/welcome/help posts.

### M6 — Recovery

A blank second server is reconstructed successfully.

### M7 — Snapshot and drift detection

```text
snapshot
drift
```

### M8 — Operational services

Separate implementations for:

```text
workshops
tickets/reporting
audit-log archival
```

### M9 — Elections

Only after the rest is stable.

---

# 39. What I would explicitly exclude from version 1

This scope discipline is important.

Don't initially build:

* STV election software;
* sophisticated moderation;
* AI-content detection;
* permanent message archives;
* manuscript backups;
* full ticket system;
* email continuity;
* member re-import;
* automatic destructive reconciliation;
* web dashboard.

Version 1 should answer one question extraordinarily well:

> **Can this repository turn a blank Discord server into the approved HWC server reliably and repeatedly?**

---

# 40. Definition of done for the initial project

I would not consider the infrastructure complete until all of these pass:

```text
✓ Blank server can be provisioned.

✓ Running apply twice produces zero changes.

✓ Roles are reconstructed in the correct hierarchy.

✓ All categories/channels are reconstructed.

✓ Forum types and tags survive reconstruction.

✓ Mature channels cannot be viewed without proper access.

✓ Council/moderator/Archivist spaces have correct isolation.

✓ @everyone cannot accidentally enter member-only areas.

✓ Community mode is enabled.

✓ Onboarding is reproducible.

✓ AutoMod is reproducible.

✓ Canonical institutional posts can be recreated.

✓ API-inaccessible settings appear as explicit manual tasks.

✓ Every managed object has a stable logical identifier.

✓ Unexpected resources are reported but not deleted.

✓ Permission drift is detected.

✓ A second completely separate test server can be rebuilt
  without referring to the first server's configuration UI.

✓ Production can be bootstrapped using the identical procedure.
```

That last pair is the real disaster-recovery acceptance test.

## Recommended implementation order

In practical coding order, I would do:

```text
01  Write roles.yaml [COMPLETED]
02  Write categories.yaml [COMPLETED]
03  Write channels.yaml [COMPLETED]
04  Write permissions.yaml [COMPLETED]
05  Write forums.yaml [COMPLETED]
06  Write guild.yaml [COMPLETED]
07  Write onboarding.yaml [COMPLETED]
08  Write automod.yaml [COMPLETED]
09  Write manual-steps.yaml [COMPLETED]
10  Create JSON Schema [COMPLETED]
11  Implement manifest validator [COMPLETED]
12  Implement Discord state reader [COMPLETED]
13  Implement state normalizer [COMPLETED]
14  Implement diff/reconciliation engine [COMPLETED]
15  Implement plan [COMPLETED]
16  Implement role apply [COMPLETED]
17  Implement category/channel apply [COMPLETED]
18  Implement ordering [COMPLETED]
19  Implement permissions [COMPLETED]
20  Implement Community configuration [COMPLETED]
21  Implement Forums [COMPLETED]
22  Implement age restrictions [PARTIALLY COMPLETED]
23  Implement AutoMod [COMPLETED]
24  Implement onboarding [COMPLETED]
25  Implement seed messages [COMPLETED]
26  Implement verification [COMPLETED]
27  Implement state mapping [COMPLETED]
28  Implement snapshots [COMPLETED]
29  Implement drift detection [COMPLETED]
30  Provision Test Server A [COMPLETED]
31  Destroy assumptions / deliberately alter A
32  Verify drift detection
33  Provision blank Test Server B [COMPLETED]
34  Compare A and B
35  Document manual-only settings [COMPLETED]
36  Freeze manifest v1
37  Bootstrap production with the same process
38  Snapshot production
39  Begin member onboarding [PARTIALLY COMPLETED]
40  Build workshop/ticket systems separately
```

The technical premise is solid: Discord currently exposes APIs for guild configuration, role creation/positioning, channel creation, Community features, onboarding, Forum configuration and AutoMod. ([Documentation - Discord][1]) The principal known provisioning exception is Membership Screening configuration, whose editing API Discord currently says is being reworked. ([Documentation - Discord][1])

I would make the **next concrete development artifact** the actual `discord/manifest/` directory—particularly `roles.yaml`, `channels.yaml`, and `permissions.yaml`—because those force all remaining architectural decisions into explicit, reviewable form before any code can mutate a Discord server.

[1]: https://docs.discord.com/developers/resources/guild "Guild Resource - Documentation - Discord"
[2]: https://docs.discord.com/developers/resources/auto-moderation "Auto Moderation - Documentation - Discord"
[3]: https://docs.discord.com/developers/resources/audit-log "Audit Logs Resource - Documentation - Discord"
