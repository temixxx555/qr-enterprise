# EnterpriseQR product brief

EnterpriseQR turns stable QR links into branded engagement campaigns for organizations, branches, businesses and initiatives. Administrators configure actions, forms, eligibility and reward budgets. Participants scan, respond, verify when needed and receive eligible rewards through controlled server processing.

## Customizable campaign pages

Each campaign is also a configurable mini webpage for an individual, celebration, leader, community or business. It can showcase a cover banner, profile picture, introduction, main website, photo galleries, linked image posters, event invitations and social links. Text, announcements, events, links, galleries and banners can be reordered, duplicated, hidden or removed. Appearance includes background, accent colour, heading style and header alignment.

## Feeding Program QR type

An organization can create a Feeding Program with a stable public QR for program information and household applications. Applications are manually reviewed by default. Approval issues a separate private opaque participant credential; authenticated distribution staff select the program, site and serving session, check current eligibility/allowance, then confirm a handover. The public program QR never grants food or records a redemption. Applications, household members, credential hashes and redemptions are private organization-owned records. The initial implementation is under active development; detailed gaps and external acceptance gates are in `docs/BUILD_STATUS.md`.

Page content is independent of actions. Owners can enable RSVP, messages and optional airtime rewards, customize button labels or disable every action. A birthday page can combine an invitation and a reward; a leader page can introduce the person, priorities and public events. Production reward eligibility and funding remain separate server-controlled features.

## Roles

Organization owner, administrator, assigned campaign manager, public participant and a separately granted platform super administrator are implemented. Private access is enforced on the server. Managers can create and edit assigned drafts and review assigned responses, but cannot publish or authorize rewards. See ENTERPRISEQR_COMPLETE_HANDBOOK.md for the full access matrix and current implementation boundaries.

## MVP

Organization isolation; campaign lifecycle and dynamic QR; published form versions; feedback, complaints, surveys and reward claims; consent; phone verification; duplicate prevention; atomic budget reservation; durable jobs; one selected airtime provider; reconciliation; audit; analytics and controlled exports.

## Journeys

Admin: sign in → select organization → configure campaign → preview → publish → distribute QR → monitor submissions and fulfillment.

Participant: scan → branded page → choose action → submit → verify → eligibility → reserved claim → asynchronous fulfillment → receipt.

## Requirement map

- Phase 0: brief, decisions, requirements and progress tracking.
- Phase 1: responsive dashboard, reusable UI, navigation, participant preview and loading/error states.
- Phase 2: MongoDB, secure authentication, memberships, organizations and permissions.
- Phase 3: persisted campaign builder, QR downloads, lifecycle, publication and branding assets.
- Phase 4: versioned forms, consent, submissions and complaint review.
- Phase 5: verification, eligibility and abuse controls.
- Phase 6: claim state machine, ledger, transactional reservations and durable jobs.
- Phase 7: production reward adapter, webhooks and reconciliation.
- Phase 8: live operations, analytics and exports.
- Phase 9: security, concurrency, integration and browser tests.
- Phase 10: staging, deployment, monitoring and handover.

## Scope boundary

Subscriptions, wallets, random-winner draws, advanced surveys, provider failover, white-label domains and additional bill-payment products are later work. A scan must never trigger a payout. An unknown provider outcome must never cause an automatic second payment.
