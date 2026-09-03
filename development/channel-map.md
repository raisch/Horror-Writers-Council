The configured server has 45 channels. Visibility below is the intended permission model from the manifest used to create it.

| Channel | Purpose | Visibility |
|---|---|---|
| `#welcome-to-the-house` | Server introduction and orientation | Public, read-only |
| `#start-here` | Joining steps, roles, and wayfinding | Public, read-only |
| `#community-standards` | Standards, member rights, and conduct expectations | Public, read-only |
| `#announcements` | Official server-wide updates | Public, read-only; Council, moderators, and archivists can post |
| `#questions-for-the-keepers` | Questions about rules, access, and operations | Public chat |
| `#introductions` | Newcomer introductions | Public chat |
| `#orientation-chat` | Help using and joining the server | Public chat |
| `#access-and-roles` | Help with roles and channel access | Public chat |
| `#community-lounge` | Low-stakes chat before membership screening | Public chat |
| `#contact-the-council` | Entry point for reports and private tickets | Members only; intended to be handled privately by the ticket service |
| `#the-flickering-lamp` | General member conversation | Members only |
| `#what-are-you-writing` | Writing check-ins, goals, and milestones | Members only |
| `#horror-reading-room` | Books, stories, criticism, and spoiler-marked discussion | Members only |
| `#screen-and-scream` | Horror screen, audio drama, and games discussion | Members only |
| `#the-research-cabinet` | Historical, cultural, scientific, and folklore research | Members only |
| `#quiet-company` | Writing sprints, accountability, and co-working | Members only |
| `#craft-after-dark` | Craft: structure, voice, pacing, technique | Members only |
| `#brainstorming-seance` | Human-to-human plot, character, and worldbuilding help | Members only |
| `#first-sightings` | Early drafts and excerpts | Members-only forum |
| `#critique-requests` | Scoped feedback requests | Members-only forum |
| `#critique-exchange` | Workshop discussions for accepted submissions | Members-only forum; cohort restrictions may be added manually |
| `#revision-table` | Revision and post-critique support | Members only |
| `#the-unquiet-shelf` | Completed or published member work | Members-only forum |
| `#mature-horror-craft` | Mature horror-craft discussion | Opt-in `mature_content` role only |
| `#restricted-workshop` | Mature workshop submissions and critique | Opt-in `mature_content` role only |
| `#content-warning-desk` | Guidance on content warnings and boundaries | Members only |
| `#calls-from-the-dark` | Submission calls, contests, and residencies | Members-only forum |
| `#market-watch` | Publishing news and submission resources | Members only |
| `#member-publications` | Member releases, readings, and crowdfunding | Members-only forum |
| `#services-and-collaborators` | Paid services and collaboration offers | Members-only forum |
| `#events-in-the-lantern-room` | Workshops, readings, and events | Members-only forum |
| `#governance-hall` | Rules proposals, amendments, and member comment | Members-only forum |
| `#council-record` | Agendas, decisions, results, and financial records | Members can read; only staff can post |
| `#election-booth` | Candidate statements and election questions | Members can read; only staff can post; intended for election periods |
| `#council-chamber` | Council deliberation and decision records | `councilor` and `archivist` roles only |
| `#moderator-watch` | Moderation coordination, records, and training | `moderator` and `archivist` roles only |
| `#archivists-workbench` | Technical administration, security, backups, and recovery | `archivist` role only |
| `The Lantern Room` | Casual voice conversation | Members only |
| `The Night Workshop` | Writing sprints and co-working voice | Members only |
| `The Reading` | Readings, book clubs, and scheduled events | Members only |
| `Council Meeting Room` | Council voice meetings | `councilor` and `archivist` roles only |

This is why `#announcements` is intentionally unsynced from `THE THRESHOLD`: its public read-only permissions differ from the category’s public-chat channels. Definitions are in [channels.yaml](/Users/robr/Documents/DISCORD/discord/manifest/channels.yaml) and [permissions.yaml](/Users/robr/Documents/DISCORD/discord/manifest/permissions.yaml).