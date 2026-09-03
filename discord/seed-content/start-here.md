# Start Here

1. Complete Membership Screening, including acceptance of the Community Standards and the 18+ eligibility acknowledgment.
2. Read `#community-standards` before joining critique, workshops, or mature-content areas.
3. Use Onboarding to follow the parts of the server that fit your interests.
4. Visit `#the-flickering-lamp` to introduce yourself or settle in.

The `Mature Content` role is optional. It provides access to designated age-restricted spaces but is not an age-verification substitute. The channel guidance in `#content-warning-desk` explains where difficult material belongs.

For public process questions, use `#questions-for-the-keepers`. For misconduct, an appeal, or a personal governance concern, use the private reporting route in `#contact-the-council`.

*Canonical source: `member-guide.md` and `community-standards.md`. Repository revision: managed at deployment.*

<!-- discord-message-break -->

# **PLEASE NOTE: THIS IS A TEST DISCORD SERVER.**

It can vanish or be reset _**without warning**_. We like living on the edge. Yes, we do.

## CURRENT OPERATIONAL STATUS

At this point, the server has structure, roles, permissions, and default content only. 

Configuration management of the server is fully automated and includes

- Manifest validation: rejects malformed or unsafe server definitions before deployment.
- Declarative provisioning and reconciliation: compares the YAML configuration with the live server, produces a change plan, applies managed updates, and leaves unmanaged resources alone.
- Drift detection and verification: identifies configuration changes made directly in Discord without automatically deleting or repairing anything.
- Local state mapping: tracks Discord resource IDs so renamed or reordered resources can be managed reliably.
- Snapshots and audit-log export: writes local server-state snapshots and administrative audit records.
- Managed seed content: publishes and pins repository-backed policy, welcome, workshop, and reporting messages.

Automating this process allows for the creation of new servers with identical configuration for testing or production use. It also supports disaster recovery should the server fail or be deleted.

<!-- discord-message-break -->

For it to be fully operational, further development is required. Mostly this means creating bots, webhooks, and management scripts to handle custom features like 

- Backup of member content (excluding member-shared intellectual property)
- Onboarding workflow
- Private reporting/ticket workflow, including conflict-aware routing when the report concerns a moderator, councilor, or owner.
- Anonymous ranked-choice/STV election administration.
- Workshop lifecycle management, such as applications, temporary private cohorts, enrollment, and archival.

See [the development plan](https://github.com/raisch/Horror-Writers-Guild/blob/main/development/development-plan.md) for up-to-date status.

<!-- discord-message-break -->

## CHANGELOG

- 2026-09-01 /robr
    - initial bootstraping scripts completed.
    - 1st test server instantiated.
- 2026-09-03 /robr
    - changed name from Horror Writers Council to Horror Writers Guild
    - updated core posts (like this one).
    - 2nd server instantiated.
    - test member cohort invited.

<!-- discord-message-break -->

The complete source for this server, including configuration automation and initial content can be found at the [Horror Writers Guild repository](https://github.com/raisch/Horror-Writers-Guild).

