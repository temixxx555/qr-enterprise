# Implementation decisions

## Confirmed by request

- Use Next.js App Router, JavaScript and JSX, with Tailwind CSS.
- Follow the supplied Enterprise QR workflow; start with Phases 0 and 1.
- Keep the current task scoped to the application foundation, not live reward activation.

## Repository inspection

The folder was empty when implementation began, despite a scaffold being present in the earlier planning turn. No existing application files were overwritten. The user's pasted workflow was copied back into the project as the reference.

## Foundation choices

- Recreated the previously documented Next.js 16.3.8 and React 19.2.8 setup. Dependencies are locked in package-lock.json.
- Restrained green and neutral visual direction, system fonts, Lucide icons and accessible focus states.
- Fictional sample organizations and values are visibly labelled throughout the preview.
- The overview chart is an illustrative index, explicitly not a real count/time series.
- Demo draft creation uses browser localStorage and offers JSON download. It has no publication or payout side effects.
- The three-step demo builder is an early subset of the planned eight-step production builder.
- Public campaign previews reject unknown and draft codes and show paused campaigns as unavailable.
- SVG QR icon is decorative. Scannable QR generation belongs to Phase 3 and is not claimed as implemented.
- Unbuilt modules show their planned phase rather than fabricated live records.

## Defaults to confirm before production

Nigeria and NGN; Africa/Lagos campaign timezone; airtime first; mandatory verification for monetary rewards; one reward per phone per campaign; platform-funded allocations; manual complaint reward approval.

## Missing inputs for later phases

MongoDB connection and authentication approach; official branding; reward and OTP provider selection and credentials; funding/fee model; approved privacy/terms and retention rules; hosting/domain; commercial model. These are not needed to run the current demo. No provider, database or payment service is currently connected.

## October 1 customization update

- User requested flexible personal mini webpages, including leader/community pages and birthday invitations with optional airtime.
- Replaced the initial three-step demo wizard with a section editor and shared participant renderer. This supersedes the earlier wizard decision.
- Version 2 page data supports six section types, images, appearance settings and independent actions. Older local drafts retain their title, owner and introduction.
- Save updates the existing draft ID. Drafts now reopen for editing and full preview; preview URLs are local-browser references, not published links.
- Raster photos are decoded/resized locally and stored as JPEG data URLs. Accept JPG/PNG/WebP up to 8 MB, reject SVG and limit encoded image size. Quota failures leave prior saved data intact and offer a JSON backup.
- Link rendering accepts only HTTP/HTTPS without embedded credentials. User content is rendered as text, never arbitrary HTML.
- Empty/hidden sections are omitted from the page. Event times preserve the organizer's wall-clock time and show the explicit timezone label.
- Header and section images share the page schema that future object storage can replace with hosted assets. Publishing, live RSVP storage and rewards remain pending backend phases.

## October 2 backend and publishing update

- User authorized proceeding with the next phases: implement Phases 2 and 3 before participant forms/rewards.
- Better Auth with MongoDB adapter replaces the public dashboard preview. MongoDB replica-set transactions protect multi-record writes. Sessions are read from the database without cookie caching.
- Owner/admin/assigned-manager roles are organization-scoped; platform super-admin is a separate explicit operator-granted role. No default privileged user is created.
- Existing cloud connection settings are preserved. A separate loopback database and port 3100 support isolated integration tests. APP_MODE=local is restricted to a localhost application origin.
- Authentication requires SMTP and HTTPS outside local mode. Local account mail is written only to .data/mail and is never served by HTTP. Password reset revokes existing sessions.
- Branding images are validated/decoded on the server and stored separately from campaign documents. S3-compatible private storage is supported; local development uses .data/assets. Published assets are served through an availability-checked route.
- Publishing snapshots the saved draft; editing does not alter the public version. Every mutation uses a revision guard. Archive is terminal; duplicate makes a fresh private campaign and QR address.
- Publication dates explicitly use Africa/Lagos. Event section timezones remain display labels for organizer-entered wall-clock event information.
- QR codes use APP_URL; it must be finalized before printing for real visitors. PDF export uses the browser's print dialog.
- Cloud email/storage and physical-phone acceptance cannot be claimed from local tests and remain open. No live rewards or submissions were enabled.

## Phase 4 forms and responses

- Keep forms attached to their action (RSVP or response). Feedback, surveys and complaints share the response action while retaining a server-saved workflow type. Rewards remain separate.
- Store a full immutable form and consent snapshot on each submission. It costs additional storage but keeps old answers interpretable when organizers edit or remove questions.
- Anonymous submissions receive a random receipt reference without an endpoint exposing their personal answers. Organizer access remains authenticated and campaign-scoped.
- Use a per-request idempotency key to handle retry/double-clicks. This is not participant identity or reward eligibility; phone verification belongs to Phase 5.
- Submit transactions write campaign and organization counters, so a concurrent pause/suspension conflicts and retries the availability check.
- Preserve older published pages without forms as closed to responses until explicit save/publication. New templates include defaults that organizers can customize.
- Processing and marketing consent are distinct. Marketing is always optional and initially unchecked. No response triggers a payout or outbound notification.
- Local browser checks use only fictional data in enterpriseqr_qa.

## October 2, 2026 — Local phone verification milestone
The first phone flow is a Nigeria-only simulator, gated to local mode and a loopback app URL. Simulator results cannot authorize rewards. Production SMS, participant eligibility, references, and bot protection remain outstanding. Phone identities and OTPs are keyed hashes; verification challenges expire and are consumed atomically.


## October 2, 2026 — Phases 5–6 complete in local simulator

This supersedes the earlier Phase 5 milestone. Eligibility, invitation references, participant limits, manual review, claim uniqueness, atomic reservation, daily caps, ledger, outbox, worker leasing and all five simulator outcomes are implemented. The live OTP/bot/airtime adapters belong to provider integration; local proofs never authorize a real payout.

One lifetime claim per campaign/verified phone, including failed or rejected claims. Failure/rejection/reversal release budget and participant capacity but retain the entitlement and reference consumption. Unknown outcomes retain reservations. Existing approved commitments continue settling after a campaign pause or organization suspension; new admissions stop. Review claims require an available campaign before approval. Amounts, publication/policy versions and simulator scenario are immutable per claim.

Use server-owned integer kobo, MongoDB transactions and unique constraints. Public clients cannot set amounts. The durable job is inserted with the reservation transaction and uses the claim ID as its provider idempotency key. Fenced leases and unique ledger events prevent double settlement. See REWARD_OPERATIONS.md for the complete operational contract.

## October 2, 2026 — Phases 7–10 preparation

The provider reply was interpreted as VTPass. Implement its documented sandbox only until account acceptance and explicit live authorization. Sandbox dispatch uses fictional server-owned destinations, never participant numbers. Persist a request reference before sending; after that point only requery. Unsigned callback bodies are hints and cannot settle money. Keep unknown reservations intact.

Reports use Lagos date boundaries, visit-cohort conversion, final-outcome claim success and dated net ledger spend. Current budget/queue snapshots are separate from date-filtered activity. All monetary results are test values. Scoped CSV exports are bounded, formula-escaped and audited.

The owner explicitly chose deployment preparation without publication and will add sandbox keys locally. No host was provisioned and no production credentials were requested in chat. The container and hosted services remain unverified. Local automation and backup restoration do not satisfy the original real-product/live deployment acceptance criteria; preserve those open gates in BUILD_STATUS.md.

## October 23, 2026 — Status and source-control handover

Rechecked the private configuration by presence only: VTPass sandbox enablement and keys are absent. The deployment preflight still reports non-production mode, no final HTTPS APP_URL, and missing SMTP sender/host and S3 bucket/region. No credential values were printed. The Docker CLI executable is now present, but no image build or container run has been verified. No deployment was performed.

The working folder had no Git metadata. At the owner's request, local Git was initialized and the source/documentation was committed as `e8d614a` (`Add EnterpriseQR application and handover documentation`). `.env.local`, `.data`, `.next`, `.next-qa` and `node_modules` are excluded by `.gitignore`; no remote is configured. Recorded automated test results remain October 2 evidence and were not rerun for this documentation update.
