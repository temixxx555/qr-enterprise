# EnterpriseQR — Complete Product and Technical Handbook

**Reviewed October 23, 2026 · Africa/Lagos**  
Project: `C:\Users\HP\OneDrive\Desktop\enterpriseqr`  
Technology: Next.js App Router, JavaScript/JSX, React and MongoDB.  
Status: working local application, simulated rewards and VTPass sandbox adapter; deployment preparation only.

## About this handbook

This reference explains the app for its owner, developers, testers and future AI coding sessions. It is based on the current source, not just the original proposal. “Implemented” means code exists; “locally verified” means the recorded local checks passed; “pending” means the required evidence or implementation is still missing. Proposed additions are identified separately.

The complete test suite was not rerun for this documentation update. Test results below are the recorded October 2 results. On October 23, a read-only configuration check found the VTPass sandbox settings absent, and `npm run deploy:check` confirmed hosted configuration is incomplete. Only configured/not-configured booleans and missing variable names were inspected; no credential values were shown. A Docker CLI executable is present, but no container build or run was verified. No credentials or actual participant records are included. This is not a production certification or independent security audit.

### Contents

1. Completion assessment
2. Product and use cases
3. Roles and access matrix
4. Screens and navigation
5. Campaign builder
6. Publication, QR and images
7. Forms, consent and response review
8. Verification and eligibility
9. Reward accounting and processing
10. VTPass integration
11. Analytics, exports and audit
12. End-to-end workflows
13. Architecture and source map
14. Data model
15. API inventory
16. Local setup and commands
17. Deployment and recovery
18. Verification evidence
19. Remaining work
20. Future additions
21. Owner decisions and continuation guidance

## 1. Completion assessment

### Can you say “90% done”?

**Not as a verified statement about the complete production platform.** Most core local workflows are built. The app is an advanced working local MVP. However, real verification, actual airtime delivery and verified hosted operations are material unfinished work, not just finishing touches.

There is no agreed, effort-weighted baseline that supports an exact percentage. Counting phases would be misleading because they differ in effort and risk. Sandbox credentials are necessary, but adding them will not implement live OTP, secure real-recipient handling or production operations.

A reliable progress statement is:

> The core EnterpriseQR app is largely built and locally tested. Campaign customization, accounts and permissions, forms, simulated rewards, reporting and operations work locally. VTPass sandbox integration and deployment preparation are in place. Real-service acceptance and production work remain before launch.

### Phase status

| Phase | Scope | Actual position |
| --- | --- | --- |
| 0 | Requirements and decisions | Written; owner launch policies still need decisions |
| 1 | UI and campaign pages | Implemented; core desktop/mobile journeys inspected |
| 2 | Accounts, organizations, roles | Locally tested; hosted email acceptance outstanding |
| 3 | Campaign persistence, QR, images | Locally tested; hosted storage and final-domain phone scan unverified |
| 4 | Forms, consent, submissions | Implemented and tested |
| 5 | Verification and eligibility | Local simulator implemented; real OTP/bot integration unfinished |
| 6 | Claims, ledger and jobs | Implemented and tested with simulated outcomes |
| 7 | Provider integration | Sandbox adapter implemented; account acceptance pending; live delivery unfinished |
| 8 | Operations and reporting | Implemented and locally verified |
| 9 | Security/failure testing | Substantial automated coverage; broader accessibility/load/hosted checks outstanding |
| 10 | Deployment and handover | Files prepared; publication not authorized; hosted acceptance outstanding |

There are **11 phases, numbered 0–10**. Local implementation does not automatically satisfy production acceptance.

### Confidence and evidence

Recorded checks: 24 unit tests, 76 HTTP regression assertions, 77 reward assertions and 43 operations assertions: **220 checks in total**. This combines tests and assertions; it is not 220 independent full user journeys. Lint, production compilation and a local backup restoration passed. A scan of built client assets found no matches for the configured private values checked.

This supports confidence in the tested local scenarios. It does not prove real provider delivery, production scalability, legal compliance or zero undiscovered bugs.

## 2. Product and use cases

EnterpriseQR turns a stable QR link into a configurable campaign webpage. Organizers introduce a person, business, event or initiative, collect responses and optionally offer a controlled reward. Editing and republishing content keeps the campaign's QR address stable.

There are four main experiences:

- **Organizer workspace:** accounts, organizations, campaign editing, publishing, submissions, rewards and reporting.
- **Participant page:** public branded content and the actions enabled by the organizer.
- **Platform administration:** separately privileged organization listing and suspension/reactivation.
- **Background processing:** durable jobs handled independently of a visitor's browser.

### Birthday invitation

Cover/profile photos, celebrant introduction, invitation details, gallery, venue/map link, RSVP and birthday wishes. Optional airtime can be demonstrated locally. RSVP and rewards are separate actions: the app does not currently enforce “RSVP first, then claim.”

### Personal showcase

Biography, work/story, gallery, announcements and website/social links. All actions can be disabled for a content-only page.

### Leader/community page

Biography, priorities, public event details and official links, with feedback or RSVP. This is a content template, not an election-management system. There is no ballot, voter register, verified vote count or vote-linked reward mechanism. The template has rewards off by default.

### Business or brand

Business introduction, services/products described in text/images, website links, feedback, survey or complaints. There is no checkout, inventory, subscription billing or order system.

### Feedback campaign

Configurable form, privacy notice, optional marketing permission, private response review and scoped export. Scanning, submitting a response or resolving a complaint never automatically issues airtime.

## 3. Roles and access

### Organization model

A user may belong to multiple organizations. Each owns its campaigns, responses, assets, reward policies and history. The organization switcher selects a context; the server checks the user's active membership and the organization's active state. A browser-supplied organization ID alone grants no access.

A signed-in user can create an organization and becomes its owner. Public visitors need no organizer account to view available pages or submit public forms.

### Role definitions

**Owner:** organization creator. Can administer campaigns, rewards and staff; exclusively grants/manages administrator membership through the current team endpoint.

**Administrator:** administers organization campaigns, publication, rewards and managers. Cannot manage the owner or other administrators through the current team endpoint.

**Campaign manager:** works on assigned campaigns. Can create a campaign, which is assigned to its creator, edit permitted drafts, duplicate campaigns, review responses and inspect/export scoped reports. Cannot publish, change availability, change reward policy or approve/process rewards.

**Public participant:** reads available published pages and uses enabled actions. Test reward receipts require the participant browser token; knowing a receipt ID alone does not expose it.

**Platform super administrator:** separate server-side grant. Can list organizations and activate/suspend them with an audited reason. This does not automatically confer tenant membership or access to every organization's private submissions.

### Permission matrix

“Assigned” includes campaigns a manager creates and is assigned to. Ordinary private actions require active membership and organization.

| Action | Owner | Administrator | Manager | Public participant |
| --- | --- | --- | --- | --- |
| Create organization | Yes | Yes | Yes | Sign in first |
| List campaigns | All in selected organization | All | Assigned | No |
| Create draft | Yes | Yes | Yes, self-assigned | No |
| Read/edit draft | Yes | Yes | Assigned | No |
| Duplicate campaign | Yes | Yes | Assigned | No |
| Publish/republish/schedule | Yes | Yes | No | No |
| Pause/archive | Yes | Yes | No | No |
| Download QR/print sheet | Yes | Yes | Assigned | No private export access |
| Read available public page | Yes | Yes | Yes | Yes |
| View/review response answers | Yes | Yes | Assigned | No |
| Export reports/answers | Yes | Yes | Assigned scope | No |
| View reward policy/ledger | Yes | Yes | Assigned | Limited public policy only |
| Change budget/policy/references | Yes | Yes | No | No |
| Approve/decline claims | Yes | Yes | No | No |
| Process test job/request lookup | Yes | Yes | No | No |
| View claim processing history | Yes | Yes | Assigned | Own limited receipt only |
| View organization audit | Yes | Yes | No | No |
| View provider/operations readiness | Yes | Yes | No | No |
| Manage managers/assignments | Yes | Yes | No | No |
| Grant/manage administrator role | Yes | No | No | No |
| Transfer owner through UI | No supported workflow | No | No | No |
| Platform organization controls | Separate grant required | Separate grant required | Separate grant required | No |

### Team workflow and boundaries

A staff member must create an account before being added by email. Current team management directly adds an existing account; it is not an invitation email/acceptance flow. Membership is active or suspended. Membership and assignments update transactionally. Up to 200 campaign assignment IDs are accepted per update; only matching organization campaigns are assigned.

The owner cannot be altered through the team endpoint. Custom roles, ownership transfer, branch hierarchy, MFA and enterprise SSO are not implemented. Suspension blocks subsequent ordinary server-authorized access. Approved reward commitments follow the settlement policy described later.

## 4. Screens and navigation

| Screen | Purpose |
| --- | --- |
| Login / reset password | Account creation, sign-in and token recovery |
| Onboarding / Organizations | Create/select active organization |
| Overview | Stored campaign/activity totals and compact analytics |
| Campaigns | Search/filter list and open drafts/details |
| Campaign editor | Identity, design, sections, actions and forms |
| Campaign detail | Publication, schedule, QR, reward rules and ledger |
| Print sheet | Printable QR; browser Save as PDF |
| Submissions | Filtered RSVP/response inbox |
| Response detail | Answers, consent snapshot and review notes |
| Fulfillment | Claims, decisions, history and transaction lookup |
| Analytics | Visits, responses, claims, spend and budget/queue metrics |
| Team & access | Membership role/status and assignments |
| Audit log | Organization actions and exports |
| Settings | Account session controls |
| Platform | Separately privileged organization status controls |
| `/q/[code]` | Published public campaign |
| `/receipt/[id]` | Participant-bound test reward status |
| Browser draft preview | Preview browser-saved content |

Old demo components remain in the source tree. Their presence does not mean the current authenticated dashboard uses invented analytics; the current reporting screens query stored data.

## 5. Campaign builder

### Templates and editor layout

Four editable templates: Personal, Birthday & invitation, Leader & community, and Business & brand. They provide starting content rather than fixed layouts. The editor uses three panels: **Identity & design**, **Page sections**, and **Buttons & rewards**. Publication and reward budget configuration are separate screens/controls.

### Identity and appearance

Person/organization name, page title, tagline, introduction, cover banner, cover description, crop position, profile photo/logo, image description and main website are editable.

Appearance controls include accent color, paper/rose/sky/sand backgrounds, editorial/modern headings and left/center header alignment. These are preset controls, not arbitrary CSS or a general-purpose design tool.

### Sections

Up to 12 sections. Move up/down, duplicate, hide or remove each.

| Section | Content |
| --- | --- |
| Text/story | Heading and plain-text body |
| Announcement | Heading and message |
| Event | Heading, date/time, timezone label, venue, address, description and map/event link |
| Links | Up to 8 labeled links per section |
| Gallery | Up to 4 photos per section with descriptions/captions |
| Image banner | Image, description, caption and optional destination |

Hidden blocks are omitted from the publication; empty blocks are not shown as empty placeholders. Preview, draft save and JSON backup download are available. Backup includes page/photo data, not memberships, responses, ledger or a full database restore. Earlier browser drafts can be copied into an organization.

Saving preserves edits made while a request is in flight. Server revision checks reject overwriting a newer stored version. This is not live collaborative editing.

### Actions and restrictions

Enable RSVP, messages/feedback and reward independently. Customize labels and reward information or disable all actions. A reward button does not establish funding or entitlement; those remain server-controlled.

Text is rendered without accepting arbitrary HTML/scripts. General links accept complete HTTP/HTTPS URLs without embedded credentials. Privacy links require HTTPS. JPG/PNG/WebP are supported; arbitrary SVG/code embeds are not.

The normalized page is capped at 4 MB; section/link/gallery limits are enforced on the server. Editor fields can have smaller limits than the general server text ceiling. There is no built-in video upload, file attachment section or custom domain workflow.

## 6. Publication, QR and images

### Lifecycle and snapshots

Saving updates the draft. Publishing snapshots the saved draft and records a version. Further edits remain private until an owner/admin republishes. Old submissions retain old form questions; old reward claims retain admitted terms.

Stored states: Draft, Published, Paused, Archived. Published availability also depends on schedule and active organization. Start is inclusive; end is exclusive. Publication dates use Lagos in the UI and absolute timestamps in storage. Event-section timezone text is a display label, not the campaign scheduling engine.

Only a published campaign can be paused. Archive is terminal: no editing or republishing; duplicate it to start a new draft. Duplication creates a new campaign and code and does not copy response/reward history or allocation.

### QR behavior

The campaign uses a random code under `APP_URL/q/[code]`. Content can change without replacing the code. PNG/SVG downloads and print-to-PDF are supported. QR output uses error correction M, margin 4 and 1024-pixel PNG width.

A QR download does not publish a draft. Unavailable campaigns do not allow new participation. Set the final HTTPS origin before distributing printed codes; ordinary visitors cannot access your computer's loopback URL.

### Image processing and access

The server decodes raster images, caps input pixels at 20 million, rotates appropriately, resizes inside 1400 × 1400 and re-encodes WebP. Re-encoding removes original metadata. Image identity combines organization identity with content, allowing organization-local reuse.

Local images live under `.data/assets`; hosted images require private S3-compatible storage. App routes expose available published images and authorize private ones. If an image is used by another available published campaign, that publication may still make it public.

**The current S3 adapter explicitly supplies access-key and secret-key credentials.** Configure `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`; do not assume workload-identity fallback exists. Actual hosted upload/read and policy behavior are unverified.

Storage quotas, orphan-image cleanup and lifecycle retention are not implemented. An upload followed by a failed campaign save can leave an unused asset requiring future cleanup.

## 7. Forms, consent and response review

### Forms and fields

The response action supports feedback, survey or complaint; RSVP has its own form. Each supports 1–20 fields, title, privacy notice, optional HTTPS privacy URL and confirmation message.

Ten field types: text, textarea, email, phone, number, select, radio, checkboxes, rating and consent. Configure labels, help text, required flags, text length, numeric range/whole numbers, choices and order. Choices permit 1–20 unique options. Ratings start at 1 and end between 2 and 10.

A phone question validates format; it does not prove number ownership. Reward verification is separate.

### Consent and records

Exactly one required processing/data-use acknowledgement is required. Marketing permission is optional and unselected initially. The organizer supplies its actual notice. Questions, answers, notice and consent are retained as a snapshot with the response.

This records consent; it does not establish that a notice or business practice meets legal requirements.

### Validation and duplicate handling

Server checks reject unknown fields, malformed values, invalid choices, missing required answers and stale publication versions. Campaign/organization availability is rechecked. The same request key and answers produce one response; reusing the key with different answers fails.

Fresh keys can create additional ordinary responses. There is no one-response-per-human guarantee. A honeypot and fixed-window campaign ceiling of 60 attempts/minute provide basic controls; real bot/risk integration remains open.

### Review

Inbox filters include campaign, workflow, state and Lagos dates, with 25-row pagination. Staff can read answers/consent and save internal notes.

- Feedback/survey/RSVP: new, reviewed, archived.
- Complaints: new, in_review, resolved, dismissed.
- Complaint resolution/dismissal requires a note.
- Notes: maximum 2,000 characters; 100 review-history entries per response.
- Revision checks reject stale reviews; manager access remains assigned-campaign only.

Review is private and audited. No outbound reply, SLA escalation or automated goodwill payout exists. Complaint resolution and reward approval are separate workflows.

## 8. Verification and eligibility

### Verification mode

Phone verification currently uses a **local simulator**: it displays a test code and sends no SMS. It normalizes supported Nigerian phone formats, creates a six-digit code, expires it after five minutes, limits attempts to five and consumes it once. The proof is bound to browser, phone, campaign and publication revision.

Phone/code identities are keyed hashes. A random participant cookie is HttpOnly and SameSite=Strict, with Secure on HTTPS. Production rejects simulator verification. Real OTP delivery and verification must still be implemented and tested before real rewards.

Current fixed-window limits are one phone request/minute, five browser/campaign requests/hour and 100 campaign requests/hour. Repeated browser requests require a local test bot marker. This marker is not real bot protection; a fixed window is not a strict rolling cooldown.

### Eligibility checks

The server checks campaign publication/schedule, active organization, enabled reward action and policy, current verification proof, explicit network selection, required reference, prior entitlement, total allocation, daily cap, participant capacity and review rules.

Networks are MTN, Airtel, Glo and 9mobile. The app does not infer network from number prefixes. A phone question in a feedback form is not reward verification.

An eligibility preview reserves nothing. Claim admission repeats the checks transactionally because another participant may consume remaining capacity in the meantime.

Invitation/customer references use 4–80 letters, digits, hyphens or underscores, normalized for case and surrounding whitespace. Up to 500 can be added per policy save. Only keyed identities are stored; retain the original list privately. Re-saving a used reference does not make it unused.

## 9. Reward accounting and processing

### Policy and budgets

Owner/admin settings include enabled state, amount, total allocation, daily cap, participant limit, required reference, required review, scenario and provider mode. The UI uses naira; accounting uses integer kobo.

These allocations are test values, not a funded wallet. Payment collection, bank funding verification, commissions and provider-fee accounting are not implemented. Policy changes affect new claims independently of page publication. Existing claims retain their original amount and policy/publication terms.

Allocation cannot fall below reserved plus spent amounts. Participant capacity cannot fall below current commitments. Lower daily caps can prevent new admissions. Settings use revision checks to prevent stale overwrites.

### Atomic admission and entitlement

One MongoDB transaction inserts the claim, consumes its reference, reserves capacity/budget, appends the reservation ledger and creates a job if review is unnecessary. Review claims reserve immediately but receive no job until approval.

A unique campaign/phone constraint enforces **one lifetime claim per phone per campaign**, including rejected, failed and reversed claims. Repeating the request recovers the existing claim rather than issuing another entitlement. A different browser or phone formatting does not create a new entitlement.

| State | Meaning | Accounting |
| --- | --- | --- |
| review | Waiting for administrator | Reservation retained |
| queued | Awaiting worker | Reservation retained |
| pending | No final provider outcome yet | Reservation retained |
| unknown | Outcome uncertain, including timeout | Reservation retained |
| succeeded | Confirmed success | Reservation becomes spend |
| failed | Confirmed failure | Reservation released |
| rejected | Review declined | Reservation released |
| reversed | Confirmed reversal | Spend returned, or reservation released if success had not been recorded |

Failure, rejection and reversal release capacity but do not restore phone entitlement or the consumed reference. Other eligible participants may use released capacity. Unknown is not treated as failed.

### Review and availability

Approval/decline requires an administrator reason. A pending-review claim requires an available campaign before approval. Already-approved commitments continue settling after pause, archive, policy disablement or organization suspension. This honors prior admission; it is an explicit policy to confirm before live rollout. Review reservations have no automatic expiry.

### Ledger and durable worker

Ledger kinds are reserve, settle, release and reverse. Allocation changes have their own history. Unique ledger constraints and transactions guard against duplicate settlement.

The MongoDB job document is the durable queue/outbox. Workers take a 30-second lease with a random fencing token. Completion requires current lease ownership; stale workers cannot settle. Expired leases can be recovered. A process restart does not discard the job.

The simulator models success, failure, pending, timeout and reversal. Follow-up local reconciliation becomes due after five seconds. Provider reconciliation uses its persisted request reference and longer bounded backoff. The design manages external uncertainty by querying an existing request rather than automatically purchasing again.

### Receipt and privacy

Receipts expose limited status, amount, network and timestamps. The random receipt ID alone does not authorize another browser. A newly verified browser for the same phone can recover the original claim through the reward flow. Reading a receipt never runs a job. Raw phone, OTP, reference and provider secrets do not appear in receipt URLs.

## 10. VTPass integration

The selected provider was interpreted as VTPass. The implemented adapter is **sandbox-only**, with a fixed sandbox host. Product mapping: MTN `mtn`, Airtel `airtel`, Glo `glo`, 9mobile `etisalat`.

The worker records a request reference before dispatch. Once recorded, recovery queries that reference. A crash between recording and sending may leave an unresolved item; the system does not risk a second purchase to conceal the uncertainty.

Success requires matching reference, amount and delivered transaction state. Ambiguous/malformed responses, timeouts and duplicates retain reservations. Confirmed refusals and reversals follow the accounting rules above.

The callback endpoint treats incoming data as an untrusted hint. It deduplicates and schedules authenticated lookup of a known transaction; a posted callback status cannot directly move money. The reviewed provider documentation did not specify a signature contract, so this is not claimed to be authenticated webhook processing.

Sandbox delivery substitutes documented fictional destinations. It never transmits the participant's actual phone to VTPass. Secure real-recipient handling and a production delivery mode remain new implementation work.

### Local sandbox configuration

Place actual sandbox values in private `.env.local`, never chat or browser code:

```dotenv
VTPASS_SANDBOX_ENABLED=true
VTPASS_SANDBOX_API_KEY=your_sandbox_api_key
VTPASS_SANDBOX_SECRET_KEY=your_sandbox_secret_key
```

Keep the local DB running, then use `npm run vtpass:check`. It records an acceptance reference in `enterpriseqr_qa` before a fictional ₦100 MTN sandbox request. For pending/unknown results, use:

```powershell
npm run vtpass:check -- --requery=THE_ORIGINAL_REQUEST_ID
```

Do not create a new purchase to resolve an uncertain one. Restart app and worker after configuration changes. The October 23 presence check found sandbox enablement and keys absent; it did not display or inspect secret values. Automated provider checks used mocked transport. No account-backed sandbox success or live delivery is claimed.

See [VTPass integration](VTPASS_INTEGRATION.md) for official contract references and acceptance details. Sandbox success alone does not enable production airtime.

## 11. Analytics, exports and audit

### Definitions

| Metric | Meaning |
| --- | --- |
| Recorded visits | Instrumented public-page loads, including shared links; not proven physical scans |
| Estimated browsers | Distinct first-party cookie hashes in selected visit period; not unique people |
| Responses | Submissions created within selected dates |
| Visit conversion | Selected visits linked to a response by report time / selected visits |
| Reward claims | Claims created in selected dates, including unresolved states |
| Verified identities | Distinct phone hashes on selected claims; verification remains simulated |
| Claim success | Succeeded / (succeeded + failed + reversed); other states excluded |
| Net test spend | Dated settlements minus dated reversals; can be negative |
| Budget/queue now | Current all-time snapshot for selected campaigns, independent of date range |

Visits before this instrumentation are not fabricated. Older unlinked responses are excluded from conversion. Zero denominators show an em dash. Daily grouping uses Lagos dates and omits empty days. A 30-day browser cookie supports estimates; no IP/user-agent fingerprint is stored. Blocking JavaScript/cookies or network failures can reduce measured visits.

Filters default to 30 days, allow up to 366 inclusive calendar days and apply campaign scope. Managers see assigned campaigns only; explicit unauthorized IDs return 404.

### CSV exports

Summary, claims, ledger and response exports apply the relevant campaign/date/state/workflow filters on the server. Export actions are audited. CSV has quoted cells, UTF-8 BOM and formula-leading string escaping.

Row exports reject more than 5,000 rows or 10 MB of projected source data; they are not silently truncated. Narrow the filters when rejected. Secrets, phone hashes and lease tokens are excluded, but response exports contain private answers.

### Audit and operations health

Claim history shows job state, provider request identity when present, ledger and recent processing events. Administrator lookup requires a reason and is rate limited. It checks the original request and never submits another reward.

Organization audit has date/exact-action filters and 50-row pagination. It covers relevant campaign, team, policy, review, operation and export actions; it is not a comprehensive log of every read or page view. Platform actions have separate audit records.

Admin health shows unfinished/overdue jobs, expired leases, unknown outcomes and recent worker presence. Public health exposes minimal DB availability. These are in-app indicators; no external notification destination or provider-balance alert is implemented.

## 12. End-to-end workflows

### A. First organizer

1. Start the app; create an account/sign in.
2. Complete hosted email verification when configured; local development writes private mail files.
3. Create/select an organization.
4. Create a template-based campaign and customize identity, content and actions.
5. Write appropriate form/privacy copy; save and preview.
6. Owner/admin publishes, with schedule if needed.
7. Download QR using the final intended origin; inspect public behavior.

### B. Birthday invitation

1. Choose birthday, add cover/profile, event details, gallery and venue link.
2. Customize RSVP and birthday-wish questions.
3. Keep optional marketing permission separate from processing acknowledgement.
4. Save/publish and submit a fictional RSVP to verify it.
5. Configure test reward rules separately if demonstrating airtime; start worker.
6. Review RSVP in Submissions and claim state in Fulfillment.

### C. Leader/community page

1. Choose leader, add biography/priorities and public events.
2. Link official sites and enable feedback/RSVP as needed.
3. Save/publish and distribute QR.
4. Review authorized responses. Do not represent them as verified ballots or votes.

### D. Manager-assisted editing

1. Staff member creates an account.
2. Owner/admin adds the account as manager and assigns campaigns.
3. Manager edits assigned drafts or creates a self-assigned campaign.
4. Owner/admin reviews and publishes.
5. Manager reviews/exports assigned responses but cannot authorize rewards.

### E. Participant response

1. Scan/open link; server checks availability.
2. Select RSVP/message and complete the published form.
3. Accept processing acknowledgement; marketing stays optional.
4. Server validates, deduplicates same-key retries and stores the versioned response.
5. Participant sees confirmation; authorized staff see private answers.

### F. Test reward

1. Organizer enables the reward button, saves and publishes.
2. Admin sets amount, allocation, caps, references and review requirements.
3. Participant verifies a fictional Nigerian phone and selects the network.
4. Eligibility check is followed by transactional claim admission.
5. Admin decides review claims with a reason.
6. Worker processes queued jobs; uncertainty retains reservation and uses lookup.
7. Participant refreshes receipt; staff inspect claim history and accounting.

### G. Complaint resolution

1. Set response workflow to complaint and publish.
2. Participant submits with processing acknowledgement.
3. Assigned staff opens it, marks in review and records notes.
4. Resolve/dismiss with the required note.
5. No automatic payout or outbound message occurs; a linked goodwill flow would need implementation.

### H. Update live content

1. Edit draft without changing the current publication.
2. Save; resolve stale revision conflicts explicitly.
3. Preview and have an admin republish.
4. QR remains stable; an already-open stale form may require reload.
5. Earlier submissions/claims keep their original snapshots.

## 13. Architecture and source map

React/JSX renders screens and client interactions. Next.js server pages and route handlers authorize requests and validate input. MongoDB stores identity, organizations, content, responses and accounting. Images use private local files or S3. A separate Node worker handles durable reward jobs and server-side provider calls.

| Area | Main source |
| --- | --- |
| Routes/layouts | `app/` |
| Interactive UI | `components/` |
| Page schema/templates | `lib/campaign-page.mjs` |
| Form schema/answer validation | `lib/forms.mjs` |
| Reporting dates/CSV | `lib/reporting.mjs` |
| Auth/access/platform privileges | `lib/server/auth.mjs`, `access.mjs`, `platform.mjs` |
| Database/base indexes | `lib/server/db.mjs` |
| Campaign lifecycle/images | `lib/server/campaigns.mjs`, `assets.mjs` |
| Submissions | `lib/server/submissions.mjs` |
| Verification adapters | `lib/server/otp-adapter.mjs`, `verification.mjs` |
| Policy/admission | `lib/server/reward-policy.mjs`, `claims.mjs`, `reward-common.mjs` |
| Worker/provider/reconciliation | `lib/server/reward-worker.mjs`, `vtpass.mjs`, `reconciliation.mjs` |
| Reporting/health | `lib/server/analytics.mjs`, `exports.mjs`, `visits.mjs`, `health.mjs` |
| Operator commands/tests | `scripts/`, `tests/` |
| Runbooks | `docs/` |

The manifest at review lists Next 16.3.8, React 19.2.8, MongoDB driver 7.7.0 and Better Auth 1.7.7. Use `package-lock.json` and `npm ci` for reproducible dependencies; manifest ranges do not identify every installed transitive package. Follow the bundled Next documentation when changing code for this version.

There is no Redis/external queue dependency or separate microservice fleet. MongoDB transactions and lease documents provide durable job behavior. **A replica set is required**; standalone MongoDB cannot support the required transactions.

## 14. Data model

| Data group | Purpose |
| --- | --- |
| Auth-managed records | Users, sessions, credentials/verification and auth limits |
| organizations | Name, active/suspended state and timestamps |
| memberships | User/organization role and status; unique membership pair |
| platformRoles / platformAudit | Separate privilege and platform action history |
| campaigns | Organization, public code, draft/publication, revisions, assignments and schedule |
| campaignVersions | Publication snapshots, unique campaign/revision |
| assets | Organization-scoped image identity, private key and storage metadata |
| submissions | Form/consent snapshots, answers, review state/history, optional visit link |
| pageVisits | Campaign event, cookie-derived hash and date |
| phoneChallenges / verificationLimits | Hashed verification state, expiry and limits |
| rewardPolicies | Policy and current allocation/reservation/spend/capacity |
| rewardReferences | Keyed reference identity and consumption |
| rewardDaily | Lagos daily cap/accounting buckets |
| rewardClaims | Admitted terms, identity hashes and evolving outcome |
| rewardJobs | Durable dispatch/lookup state, due time, lease and provider identity |
| rewardLedger | Application accounting events; unique claim/event kind |
| rewardAllocationHistory | Allocation changes and actor |
| rewardEvents | Processing/lookup event history |
| simulatorTransactions | Idempotent local provider simulation |
| providerHints / callbackLimits | Hint deduplication and intake limits |
| providerAcceptance | Local sandbox acceptance evidence |
| workerHeartbeats | Expiring worker presence records |
| audit | Organization changes and exports |
| submissionRateLimits / visitLimits | Public fixed-window counters |

TTL indexes eventually remove temporary challenges/counters/heartbeats; explicit checks enforce expiry before deletion. Core claims, submissions and history have no complete owner-configured retention/deletion lifecycle.

`BETTER_AUTH_SECRET` is also used for keyed phone/reference/visitor identities. Rotating it without migration can disrupt matching and duplicate detection as well as sessions. Future key separation and versioned rotation deserve deliberate design.

## 15. API inventory

These endpoints serve the app; they are not a published third-party SDK contract. Private APIs use session plus organization/campaign scope. Mutations generally require the exact application Origin; provider callback hints are a separate external path.

| Endpoint family | Purpose |
| --- | --- |
| `/api/auth/[...all]` | Better Auth account/session operations |
| `/api/organizations` | List, create or select organization |
| `/api/team` | Admin membership/assignment management |
| `/api/platform` | Separate super-admin organization controls |
| `/api/campaigns` | Scoped list/create |
| `/api/campaigns/[id]` | Read/edit; admin publication/availability actions |
| `/api/campaigns/[id]/duplicate` | Duplicate permitted campaign |
| `/api/campaigns/[id]/qr` | Scoped QR download |
| `/api/campaigns/[id]/rewards` | Scoped policy/ledger read; admin policy write |
| `/api/assets/[id]` | Available published or authorized private image |
| `/api/public/campaigns/[code]/submissions` | Published form submission |
| `/api/public/campaigns/[code]/visits` | Bounded visit recording |
| `/api/public/campaigns/[code]/verification` | Local verification |
| `/api/public/campaigns/[code]/rewards` | Policy/eligibility/test claim |
| `/api/public/receipts/[id]` | Participant-bound limited receipt |
| `/api/submissions` and `/[id]` | Scoped list/read/review |
| `/api/rewards` and `/[id]` | Claims/history; admin review/process/lookup |
| `/api/analytics` | Stored scoped metrics |
| `/api/reports/export` | Audited scoped CSV |
| `/api/providers` | Admin provider configuration flags |
| `/api/providers/vtpass/callback` | Hint intake; no direct settlement |
| `/api/operations/health` | Admin queue/readiness information |
| `/api/health` | Minimal DB availability |

Typical status codes distinguish unauthenticated (401), forbidden (403), hidden/unavailable (404), stale/conflicting state (409), oversized request/export (413), invalid answers (422 where used) and rate limits (429). Unexpected failures return generic errors rather than raw internal exceptions.

## 16. Local setup and commands

### Prerequisites and first start

The tested local runtime was Node 22.17.0. Use compatible Node/npm and a MongoDB replica set. The provided local launcher manages a persistent loopback replica set; it is development infrastructure without public-facing authentication. Never expose it or `.data` publicly.

From the project directory:

```powershell
npm ci
npm run setup:local
```

Setup creates missing `.env.local` and preserves an existing file. Then keep these running in separate terminals:

```powershell
npm run db:local
```

```powershell
npm run dev
```

Open `http://127.0.0.1:3000/login`. If existing configuration uses Atlas/cloud MongoDB, the normal app continues using it. Starting the local DB does not override `.env.local`. `npm run db:check` is a read-only check of the configured connection.

### QA environment

`npm run dev:qa` starts `http://127.0.0.1:3100`, overrides the DB to loopback port 27018 and `enterpriseqr_qa`, uses `.next-qa` output and local image storage. Use fictional test data. `npm run worker:qa` processes QA jobs independently. Stop continuous workers before suites that control job timing, and run integration suites sequentially to avoid authentication limits and competing consumers.

### Configuration reference

| Variable | Purpose |
| --- | --- |
| `APP_MODE` | Local/production behavior; simulator restricted to loopback |
| `APP_URL` | Exact origin for auth, request checks, links and QR |
| `MONGODB_URI`, `MONGODB_DB` | Private replica-set connection and database |
| `BETTER_AUTH_SECRET` | Stable private auth/HMAC secret; at least 32 characters for preflight |
| `SMTP_HOST`, `SMTP_PORT` | Account mail server; default 587, secure SMTP on 465 |
| `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Mail authentication and sender |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` | Private storage bucket/region and optional compatible endpoint |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Explicit credentials used by current storage adapter |
| `VTPASS_SANDBOX_ENABLED` | Explicit sandbox opt-in |
| `VTPASS_SANDBOX_API_KEY`, `VTPASS_SANDBOX_SECRET_KEY` | Private sandbox credentials |
| `NEXT_DIST_DIR` | Alternative output directory used by QA |

Keep secrets out of JSX, `NEXT_PUBLIC_*`, source archives, reports and chat. `.env.example` records names. Ignored files are not automatically secure backups: `.data/mail` and database snapshots can contain private information.

### Accounts and email

Passwords require at least 12 characters. Sessions expire after 24 hours, with database-backed checks and cookie session caching disabled. Recovery tokens expire after 30 minutes; password reset revokes sessions. Local account mail is stored under `.data/mail`; hosted mode requires HTTPS and SMTP with verified-email signup. The current SMTP implementation requires TLS and uses configured authentication.

### Command reference

| Command | Use |
| --- | --- |
| `npm run dev` | Normal local app |
| `npm run dev:qa` | Isolated QA app |
| `npm run db:local` | Local replica set |
| `npm run setup:local` | Create missing private config |
| `npm run db:check` | Configured DB connectivity |
| `npm run worker` | Configured local-mode worker |
| `npm run worker:qa` | QA worker |
| `node scripts/reward-worker.mjs --qa --once` | At most one due QA job |
| `npm test` | Unit tests |
| `npm run test:integration` | HTTP regression |
| `npm run test:rewards` | Reward/concurrency tests |
| `npm run test:operations` | Reporting/operations/provider-recovery tests |
| `npm run test:backup` | Local restore rehearsal |
| `npm run lint` | Static checks |
| `npm run build` | Production compilation |
| `npm run start` | Standard production server, bound to loopback |
| `node scripts/check-client-secrets.mjs` | Scan built client assets for configured private values |
| `npm run vtpass:check` | Account-backed sandbox acceptance |
| `npm run deploy:check` | Configuration preflight, not publication |

Platform privilege can be granted by the operator command `node --env-file=.env.local scripts/grant-platform-admin.mjs account-email`. Use only for an explicitly intended platform operator; it is not an ordinary organizer step.

### Common troubleshooting

| Symptom | Check/action |
| --- | --- |
| Cannot connect to local DB | Start local DB; verify port/replica-set configuration |
| Transaction errors | Confirm replica set, not standalone MongoDB |
| Organization unavailable | Active membership, selected organization and organization status |
| Campaign not found for manager | Assignment and selected organization; do not weaken authorization |
| Save conflict | Reload newest revision and reapply intended changes |
| Public page unavailable | Publication, schedule, pause/archive and organization state |
| Old form rejected | Reload current publication before resubmitting |
| QR works on desktop but not phone | Localhost is not a shared hosted origin |
| Image upload fails on host | Explicit S3 credentials, endpoint, bucket and policy |
| Claim remains queued | Worker running, correct DB, due time and lease |
| Claim unknown | Keep reservation; query original reference, never resend blindly |
| Verification unavailable on host | Production OTP is unimplemented; simulator is intentionally blocked |
| Export too large | Narrow dates/campaign; rejection is not a partial export |
| Tests return 429 | Avoid concurrent suites; allow the limit window to expire |

## 17. Deployment and recovery

**Current authorization: prepare deployment; do not publish.** No public domain or hosting target was provisioned. The local preview is not a launch.

Standalone build output, multi-stage Dockerfile, secret-exclusion rules and preflight are prepared. The final/default container target is the web app, running as an unprivileged user. A separate worker target exists, but the current worker refuses production mode and cannot yet provide live reward processing. Docker was unavailable locally; container execution remains unverified.

A future authorized deployment needs final HTTPS origin, production mode, replica-set DB, SMTP, private storage, runtime secrets, restart/resource policy and monitoring. Build a fresh artifact; do not upload `.env.local`, `.data` or development `.next` output. Preflight checks configuration shape, not service connectivity or working credentials.

### Release sequence

1. Save a versioned source release without secrets or local data.
2. Run unit, regression, reward and operations checks in their documented environments.
3. Compile and validate container/equivalent artifact.
4. Configure staging secrets, private services and final staging HTTPS origin.
5. Verify indexes and transactions against staging; check existing-data compatibility before unique-index changes.
6. After publication authorization, run email, image, publication, form, scope/export and physical QR acceptance on the host.
7. Keep rewards disabled until production adapters and controlled live acceptance are complete.
8. Record acceptance evidence and known limits before approving production launch.

### Daily operations

- Inspect waiting review claims; their reservations do not expire automatically.
- Check backlog, overdue jobs, leases, unknown outcomes and worker presence.
- Reconcile existing uncertain references; do not create replacements.
- Review team access and export/audit activity.
- Monitor email/storage/database/provider health through the services selected for hosting.
- Preserve restore evidence and release history.

External alerts and provider-balance checks are not implemented. Select notification recipients, escalation rules and operational ownership before live rewards.

### Backup and restoration

The local rehearsal restores collections, indexes and assets, checking exact serialized values, hashes and budget invariants. It is a test, not a scheduled production backup system. Retained `.data/backups` files can contain private data.

Use encrypted managed database backups and private-bucket recovery/versioning. Decide acceptable data-loss window and restore time. Restore to an isolated environment, verify accounts/pages/images/accounting, then record the result. Hosted recovery has not been exercised.

### Rollback

Keep the previous compatible image and configuration. Stop new reward admissions/dispatch before changing live reward behavior. Preserve jobs and provider request identities. Do not blindly restore an old ledger: a provider may have accepted transactions after the backup. Reconcile external outcomes before financial recovery changes.

Read [Deployment and handover](DEPLOYMENT.md) for additional steps. Local Git was initialized October 23, 2026 and the current application/documentation is committed. The initial commit is recorded in `DECISIONS.md`. No remote is configured; arrange remote backup/hosting and repository ownership if desired.

## 18. Verification evidence

### Recorded October 2 results (not rerun October 23)

| Check | Evidence and limit |
| --- | --- |
| Unit suite | 24 tests passed |
| HTTP regression | 76 assertions passed |
| Reward suite | 77 assertions passed |
| Operations suite | 43 assertions passed |
| Lint | Passed |
| Production build | Passed; compilation alone is not launch acceptance |
| Production dependency audit | Zero reported vulnerabilities at that check time |
| Configured-secret client scan | 34 assets, two private values checked, no matches |
| Local restore | 30 collections, one claim and one image; values/indexes/hashes checked |
| Browser journeys | Customization, publication, forms/mobile errors, simulated claim/review/receipt, analytics desktop/mobile and claim history |

Reward checks cover simultaneous budget/entitlement/reference races, immutable terms, review restrictions, private receipts, expired proof, unavailability, simulator outcomes and worker recovery. Operations checks cover seeded totals, CSV formula handling/limits, tenant/manager scope, visit linkage, timeout lookup and repeated callback hints.

Security headers include no-sniff, frame denial, object/base restrictions, referrer/browser-permission controls and HSTS in production builds. The CSP is limited, not a comprehensive nonce-based script policy. Unexpected errors suppress raw internal details. These measures do not constitute an independent penetration test.

Confidence is strong for the specific scenarios with evidence. Real-service delivery, large-scale behavior and complete accessibility remain unverified. Neither passing tests nor the number of checks proves zero defects. This documentation session reviewed source and records; it did not rerun all tests or re-audit current dependencies.

## 19. Remaining work

### Before real rewards

| Work | Type | Evidence required |
| --- | --- | --- |
| Sandbox credentials | Owner configuration | Private configuration and authenticated sandbox access |
| Sandbox acceptance | Integration verification | Success, refusal/balance, pending/timeout query and callback behavior against account |
| Real phone verification | New implementation/provider setup | Actual SMS delivery, proof binding, expiry/replay/rate tests |
| Real bot/risk controls | New implementation/tuning | Verified challenge token/hostname/action/replay handling and abuse checks |
| Actual recipient handling | New implementation | Delivery destination available securely without raw logs/URLs; retention/key decisions |
| Production provider mode | New implementation/acceptance | Explicit environment boundary and an authorized controlled live delivery |
| Funding/fees | Business decision and potentially new implementation | Source of funds, allocation authority, fee treatment and reconciliation |
| Hosted worker/alerts | Deployment and implementation | Independent durable processing, backlog/unknown/balance alerts and support procedure |

**Adding sandbox keys does not complete the other rows.** There is no fully implemented production payout switch merely waiting to be turned on.

### Before hosted launch

1. Choose host/domain and separately authorize publication.
2. Verify email signup, delivery, recovery and session revocation.
3. Configure explicit storage credentials and verify private image upload/read/policy.
4. Build/run the actual container or hosting artifact.
5. Verify replica-set transactions/indexes and least-privilege database access.
6. Exercise admin-to-participant flow on final HTTPS origin and physical phone QR scan.
7. Configure external alerts, operational ownership and provider balance monitoring where relevant.
8. Exercise hosted backup restoration and document recovery targets.
9. Test keyboard/screen-reader use, interrupted/slow networks, sustained load and queue delays.
10. Finalize privacy, reward terms, retention/deletion and support policies.
11. Add the data deletion/export, quotas and cleanup processes needed for real usage.
12. Establish versioned source storage and release/rollback ownership.

### Recommended order

Verify sandbox first; choose OTP/bot providers and funding rules; implement real verification/recipient/delivery behavior; repeat failure/accounting checks; complete accessibility/load/data-lifecycle work; validate private hosting configuration; obtain deployment authorization; run staging acceptance; then conduct an explicitly authorized controlled live reward test.

Some steps need owner accounts or decisions, while others need further coding. Do not describe the entire remainder as “just configuration.” Deployment remains intentionally unperformed, not an accidental failure to publish.

## 20. Future additions

The following are proposed enhancements, not current features or completed work.

### Campaign experience

- More templates, organization style presets and shared template libraries.
- Custom domains/friendly slugs with rules that preserve printed QR compatibility.
- Safe video/audio embeds and downloadable files.
- Version comparison and explicit rollback UI.
- Multilingual pages, accessibility presets and content moderation.
- Formal content approval beyond owner/admin publishing.

### Forms, events and support

- Conditional questions, multi-page forms and saved progress.
- Event capacity, ticketing, check-in and calendar invitations.
- Verified one-response-per-person rules where appropriate.
- Explicit submission-to-reward eligibility links and deduplication.
- Complaint assignment, SLA escalation, participant replies and linked goodwill review.

### Enterprise access

- Read-only analyst, support and finance roles with granular permissions.
- Invitation acceptance/expiry, ownership transfer and branch hierarchy.
- SSO/MFA, privileged approvals and scoped service identities.

### Rewards and commercial model

- Live airtime and additional supported products.
- Carefully designed provider failover that preserves uncertain transaction identity.
- Verified funding, payment collection, wallets, subscriptions and billing.
- Fee-aware accounting and finance reconciliation reports.
- Policy-driven entitlement renewal and review reservation expiry, with migration/tests.

### Reporting and operations

- Campaign/branch comparisons and explicitly defined attribution/cohort reporting.
- Distinct distribution codes for measuring separate QR placements.
- Asynchronous large exports with expiring private downloads.
- Scheduled reports and external alerts.
- Retention/deletion workflows, quotas and orphan-image cleanup.
- Automated releases, load testing and recurring recovery drills.

Select additions deliberately. Payments, communications and new reward products each introduce new workflow and acceptance requirements.

## 21. Owner decisions and continuation guidance

### Decisions still needed

- Supported live product, funded provider account and permitted live test scope.
- Real OTP and bot service choices.
- Who funds rewards/fees and whether organizers can fund their own budgets.
- Entitlement/reference reuse and review-expiry policy before live operation.
- Privacy notice, reward terms, retention/deletion periods and support contact.
- Brand/domain, host, email sender and storage account.
- Alert recipients, incident ownership and who may pause admissions.
- Repository/backup ownership and release approval process.

### Glossary

| Term | Meaning |
| --- | --- |
| Tenant | One organization and its isolated data |
| Publication snapshot | Saved content currently visible to participants |
| Idempotency | Repeating the same request does not create another operation |
| Reservation | Budget held for an admitted unresolved claim |
| Ledger | Durable accounting event history |
| Reconciliation | Checking an existing provider transaction to establish its outcome |
| Lease/fencing token | Temporary worker ownership preventing stale completion |
| Sandbox | Provider test environment, not real participant delivery |
| Acceptance | Evidence that required behavior works in its intended environment |

### For the next developer or AI session

Read this handbook, `AGENTS.md`, the latest top section of `BUILD_STATUS.md` and relevant source first. Read bundled Next docs before code edits. Do not treat historical milestone text or unused demo components as current behavior. Preserve existing environment settings and isolate QA data. Keep secrets out of logs/chat. Continue preparing without publication until the user changes that instruction.

Do not authorize live rewards with local proofs. Preserve original request IDs through uncertainty. Update the status and evidence when behavior changes, distinguishing implemented, verified, blocked and proposed work. Do not convert “code exists” into “production complete.”

### Supporting references

- [Original build workflow](../ENTERPRISE_QR_BUILD_WORKFLOW.md)
- [Current status and historical evidence](BUILD_STATUS.md)
- [Implementation decisions](DECISIONS.md)
- [Reward operations](REWARD_OPERATIONS.md)
- [VTPass integration](VTPASS_INTEGRATION.md)
- [Report definitions](REPORTING.md)
- [Security acceptance](SECURITY_ACCEPTANCE.md)
- [Deployment and recovery](DEPLOYMENT.md)

**Final assessment:** most core local workflows are implemented and tested. Production completion is not established. The remaining work is identifiable, but an exact “90% complete” claim is not supported by a measured baseline.
