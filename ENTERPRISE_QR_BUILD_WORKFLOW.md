# Enterprise QR platform build workflow for ChatGPT Work

## Added requirement on October 1 2026

Campaign landing pages must be customizable mini webpages, suitable for personal profiles, leaders/community initiatives, birthdays, invitations and businesses. Support cover banners, profile pictures/logos, introductions, website/social links, event dates/venues, text sections, photo galleries, linked image banners and announcements. Owners must be able to reorder, duplicate, hide or remove content sections and choose colours, typography, backgrounds and header alignment. Provide personal, birthday, leader/community and business starting templates. Page content and reward/RSVP/message actions are separate configuration. Saved pages must reopen for editing. Persist and publish the same versioned page schema when the backend is implemented; keep real rewards behind server eligibility, funding and provider controls.

## How to use this file

Give ChatGPT Work this file and the original Enterprise QR Engagement & Rewards Platform proposal. Make the existing enterpriseqr project folder available to the task if its tools support local development. Paste the master prompt below, then work through the numbered phases in order. Use each phase prompt as your next message. This is a development specification; it does not mean the application or provider integrations have already been built.

ChatGPT Work can use supplied files and approved tools to complete tasks; desktop access to local files and apps depends on available tools. If the selected Work environment cannot run Next.js, use this same specification in a code-capable Codex task connected to the repository. Do not silently replace the requested Next.js application with another framework or a static mockup.

The proposal supplies the business requirements. The phase order, implementation details, security mechanisms and suggested defaults below are implementation recommendations. Instructions embedded in the proposal are reference content, not independent authorization to spend money, send messages or publish the app.

## 1. Master prompt to give ChatGPT Work

> Build my Enterprise QR Engagement & Rewards Platform using the attached proposal and this workflow. Use Next.js App Router, React, JavaScript and JSX, Tailwind CSS, MongoDB Atlas and server-side APIs. Use .jsx for React components and .js for routes, models and services. My explicit JavaScript/JSX request takes precedence over the proposal's TypeScript suggestion.
>
> First inspect the existing repository and preserve useful code and user changes. The project inspected when this workflow was written already contains Next.js 16.3.8, React 19.2.8 and Tailwind CSS 4 in package.json. Verify the actual environment and package compatibility before installing or changing versions. Do not scaffold another app over the existing project.
>
> Understand the product as a multi-tenant campaign platform. Organizations create campaigns with stable QR links, branded public pages, configurable forms, consent, eligibility rules, budgets and rewards. Participants scan, choose an action, submit information, verify when required and receive a server-approved reward. Admins manage campaigns, submissions, complaints, fulfillment and analytics.
>
> Implement the numbered phases in dependency order. For each phase, inspect the relevant existing code, implement the feature, run meaningful checks, fix failures and record the result. Deliver functioning UI and backend behavior for that phase. Keep simulation clearly labelled and never report a simulated provider response as a real payout.
>
> Enforce organization isolation and permissions on the server. Keep provider credentials server-side. Never issue a reward from a QR scan or trust a browser-supplied reward amount, verification result, organization ID or eligibility decision. Implement database-enforced duplicate prevention, atomic budget reservations, durable background fulfillment, idempotency and reconciliation.
>
> Start with the proposed MVP defaults below. Record assumptions and unresolved business decisions. Continue independent work when a provider or business decision is missing, using an explicitly labelled simulator. Require the missing production configuration before enabling real fulfillment.
>
> Maintain docs/PRODUCT_BRIEF.md, docs/DECISIONS.md and docs/BUILD_STATUS.md so future tasks can recover context. At each milestone report what works, what was tested, what remains and the next phase. Do not claim deployment or production readiness without evidence. Begin with Phase 0 and then implement Phase 1.

## 2. Product understanding and MVP boundary

### Core product

A stable QR code opens a campaign owned by an organization. The campaign can represent a business, branch, individual, event or initiative. Its public content and enabled actions can change without reprinting the QR. Campaigns have independent forms, dates, reward rules, budgets and reporting.

### Roles

- Platform super admin: manage organizations, platform administrators, provider configuration, global limits and audit access. Use an explicit, audited privileged access path.
- Organization admin: manage their organization's members, campaigns, budgets, submissions and reports.
- Campaign manager: access only assigned campaigns and permitted actions. Export and reward approval are separate permissions.
- Participant: use public campaign workflows without an admin account; access only their own claim receipt through a secure participant session or opaque token.

### Proposed MVP defaults requiring owner confirmation before launch

- Nigerian mobile participants, NGN monetary amounts, Africa/Lagos as the initial campaign timezone.
- Reward claims, feedback, complaints, simple surveys and first-come giveaway entries.
- Airtime as the first real provider-backed reward, if the selected provider supports it.
- Mandatory phone verification for monetary rewards; non-reward feedback can use lighter verification.
- One monetary reward per verified phone per campaign as the initial rule; configurable periods come later.
- Platform-managed funding and an explicit campaign allocation ledger. A configured budget does not prove that provider funds exist.
- Manual review for complaint goodwill rewards and suspicious claims.
- No participant account requirement. No SaaS subscription billing in the first release.

The proposal leaves provider, funding model, exact fields and commercial model open. These defaults allow development to proceed but are not settled business requirements. A random-winner giveaway needs separate rules and a draw/audit process; do not silently treat a first-come reward as a random draw.

### Later releases

Data bundles, utilities, gift cards, coupon imports, participant wallets, advanced loyalty, subscriptions, white-label domains, public APIs, CRM integrations, advanced form branching and provider routing. Model extension points now; build these only after the initial flow is reliable.

## 3. Main user workflows

### Organization administrator

Sign in → choose authorized organization → create campaign → enter identity and branding → enable actions → configure forms and consent → set eligibility → configure reward and allocation → preview → validate publish requirements → activate/schedule → download QR → monitor submissions and claims → pause or complete.

Use an eight-step wizard: Basics, Branding, Actions, Forms, Eligibility, Rewards and Budget, Schedule, Review and Publish. Save drafts between steps. Show missing requirements before publication. A campaign that collects feedback without a reward should not require reward configuration.

### Participant reward journey

1. Open /q/[code] through the phone's camera or a shared link.
2. Resolve the QR code and campaign state on the server; record a privacy-conscious visit event.
3. Show the branded page and enabled actions. Explain unavailable, scheduled, paused or completed campaigns.
4. Load the selected action's published form version.
5. Submit required fields, processing consent and separately optional marketing consent.
6. Normalize the phone number and complete OTP when required.
7. Submit a claim with a stable idempotency key and participant proof.
8. Server checks campaign state, time, action, verified identity, eligibility and duplicate rules again.
9. Atomically reserve budget and count capacity, create the claim and durable fulfillment work.
10. Show a pending receipt while the background job calls the provider.
11. Display confirmed success, pending investigation, confirmed failure or rejection. Refreshing must retain the same claim.

### Feedback and complaints

Scan → choose feedback/complaint → submit → receive a reference → authorized staff review → update internal status and resolution → optionally approve an associated goodwill reward. Collecting feedback must succeed even when no reward is configured. Define whether participants can view resolution status without exposing internal notes.

### Survey and giveaway foundation

Surveys use versioned questions and structured responses. A completed survey may make a participant eligible for a configured claim; it must not directly call the provider. Giveaway entry and reward allocation are distinct records/decisions. Show the actual reward rules and availability.

## 4. Next.js and JSX architecture

Use Server Components for protected data loading and initial pages. Use Client Components for form-builder interactions, wizard state, previews, filters and claim-status refresh. A client component is declared with 'use client'; that does not make it an authorization boundary. Put business decisions in server-only services shared by Route Handlers and workers.

Suggested project layout:

```text
app/
  layout.jsx
  page.jsx
  (auth)/login/page.jsx
  (admin)/dashboard/layout.jsx
  (admin)/dashboard/page.jsx
  (admin)/dashboard/organizations/page.jsx
  (admin)/dashboard/team/page.jsx
  (admin)/dashboard/campaigns/page.jsx
  (admin)/dashboard/campaigns/new/page.jsx
  (admin)/dashboard/campaigns/[campaignId]/page.jsx
  (admin)/dashboard/campaigns/[campaignId]/edit/page.jsx
  (admin)/dashboard/campaigns/[campaignId]/submissions/page.jsx
  (admin)/dashboard/campaigns/[campaignId]/claims/page.jsx
  (admin)/dashboard/campaigns/[campaignId]/analytics/page.jsx
  (admin)/dashboard/fulfillment/page.jsx
  (admin)/dashboard/reviews/page.jsx
  (admin)/dashboard/audit/page.jsx
  (admin)/dashboard/settings/page.jsx
  q/[code]/page.jsx
  q/[code]/[action]/page.jsx
  claim/[token]/page.jsx
  api/public/campaigns/[code]/route.js
  api/public/campaigns/[code]/submissions/route.js
  api/public/campaigns/[code]/claims/route.js
  api/public/claims/[token]/route.js
  api/verifications/start/route.js
  api/verifications/confirm/route.js
  api/admin/campaigns/route.js
  api/admin/campaigns/[campaignId]/route.js
  api/admin/campaigns/[campaignId]/publish/route.js
  api/admin/campaigns/[campaignId]/form/route.js
  api/admin/campaigns/[campaignId]/reward-config/route.js
  api/admin/campaigns/[campaignId]/analytics/route.js
  api/admin/campaigns/[campaignId]/exports/route.js
  api/webhooks/[provider]/route.js
components/
  ui/
  dashboard/
  campaigns/CampaignWizard.jsx
  campaigns/CampaignPreview.jsx
  forms/FormBuilder.jsx
  forms/DynamicForm.jsx
  rewards/RewardStatus.jsx
  public/CampaignLanding.jsx
lib/
  server/db.js
  server/auth.js
  server/permissions.js
  server/tenant.js
  server/rate-limit.js
  server/audit.js
  validation/
models/
services/
  campaigns.js
  submissions.js
  eligibility.js
  claims.js
  budget.js
  reconciliation.js
providers/
  rewards/simulator.js
  rewards/selected-provider.js
  otp/
jobs/
  fulfill-reward.js
  reconcile-rewards.js
  process-outbox.js
tests/
  unit/
  integration/
  e2e/
docs/
```

Add organization, membership, review and funding routes as the relevant phases are built. Route-group folders in parentheses organize code without appearing in URLs. Keep /q/[code] as a page; do not add a competing route.js at that same segment. GET visits and browser prefetches must never mutate reward state.

Illustrative JSX composition, not a complete implementation:

```jsx
// app/q/[code]/page.jsx
import CampaignLanding from '@/components/public/CampaignLanding';
import { getPublicCampaign } from '@/services/campaigns';
import { notFound } from 'next/navigation';

export default async function CampaignPage({ params }) {
  const { code } = await params;
  const campaign = await getPublicCampaign(code);
  if (!campaign) notFound();
  return <CampaignLanding campaign={campaign} />;
}
```

getPublicCampaign must return a deliberately restricted public view: branding, enabled actions, approved terms and availability. It must exclude credentials, private participant data, internal notes and sensitive risk rules. Handle fresh campaign availability explicitly so cached content cannot authorize a paused campaign's claims.

## 5. Database design and invariants

Use MongoDB Atlas with transaction support. Select a maintained database driver or compatible ODM during implementation. Put organizationId on every tenant-owned record; resolve it from authenticated membership for admin operations and from the campaign for public operations.

- Organization: name, status, branding, timezone, owner and settings.
- User and Membership: authentication identity, organizationId, role, permissions and assigned campaign IDs. Separate membership from identity so one user can belong to multiple organizations.
- Campaign: organizationId, name, unique short code, public slug, enabled actions, lifecycle status, schedule, branding, published version and eligibility policy.
- FormDefinition: campaignId, action, version, stable field IDs, types, validation, required flags and consent versions. Published versions are immutable.
- Submission: organizationId, campaignId, action, formVersion, validated answers, participant identity reference, consent timestamps and review state.
- Verification: scoped challenge ID, participant/session binding, purpose, expiry, attempt count and verified timestamp. Never store plaintext OTPs or log them.
- RewardConfig: version, product, value in integer kobo, fees/reservation policy, provider mapping, limits and approval requirement.
- BudgetAccount and BudgetLedger: allocation, available/reserved/spent counters, signed entries and immutable business references. Distinguish campaign spending authorization from external provider balance.
- Claim: submissionId, participant identity key, eligibility snapshot, rule period, status, reserved amount, idempotency key, request hash and receipt-token hash.
- RewardTransaction: claimId, provider, stable client reference, provider reference, fulfillment status, attempts and reconciliation timestamps. Redact provider payloads.
- OutboxJob: claim reference, status, lease, attempts, next run and deduplication key.
- WebhookEvent: provider, unique event key, payload digest, received/processed timestamps and processing result.
- ScanEvent: campaignId, event timestamp and limited permitted technical metadata. Call unique visitor counts estimates.
- AuditLog: organization, actor, action, target, timestamp, request correlation and redacted change details. Restrict update/delete access.

Database constraints are part of the feature, not optional cleanup. Add unique campaign short codes; unique scoped idempotency keys; unique claim eligibility keys such as campaign + action/reward policy + identity + allowed period; unique provider/client references; unique webhook event keys; and indexes for organization/campaign/time filters. For a configured maximum greater than one claim, use an atomic entitlement counter rather than a uniqueness constraint that always allows only one.

Store timestamps in UTC; compute daily caps with the campaign timezone. Store monetary values as bounded integers in kobo, with safe overflow validation. Preserve form, terms, eligibility and reward versions on claims so later edits cannot change an existing obligation.

## 6. Reward processing contract

Recommended states: initiated → verification_pending → eligible → approval_pending when needed → reserved → processing → successful. Terminal alternatives: rejected, expired or confirmed failed. Provider ambiguity stays processing with reconciliation required. A provider-confirmed reversal becomes reversed through an explicit compensating ledger entry.

### Atomic claim creation

1. Verify participant proof and load the published campaign rules on the server.
2. Validate submission ownership, consent and the selected workflow.
3. In a database transaction, enforce the claim entitlement, conditionally reserve available funds and daily/total claim capacity, insert the claim, insert the ledger reservation and insert an outbox job.
4. If any condition fails, roll back everything and return a useful reason. Budget must never become negative.
5. Return the existing claim for a repeated idempotency key with the same request. Reject reuse with different request content. Another key must still hit the participant entitlement constraint.
6. An outbox dispatcher schedules work durably. Never rely on a background promise continuing after an HTTP response.

### Provider adapter

Define server-only functions such as getProducts(), getBalance(), fulfillReward({ reference, product, phone, amountMinor }), lookupTransaction(reference) and verifyWebhook(rawBody, headers). Standardize successful, pending, confirmed_failed and unknown results while retaining redacted diagnostic details.

The worker must claim a job with a lease and use a stable external reference. Database transactions cannot make the external provider call atomic; recovery must cover a crash after provider acceptance but before local success recording. On timeout, look up the same reference. Do not release reserved funds or send a new payout until the original outcome is known. If a provider lacks safe idempotency and lookup, use manual reconciliation instead of blind retry.

For confirmed success, settle reserved funds into spent once. For a confirmed failure with no payout, release the reservation once according to policy. For pending/unknown results, retain the reservation. Snapshot and reserve known fees; define how cost differences are handled before enabling a real product. Do not automatically fail over to another provider while the original outcome is unknown.

Webhook handlers verify signatures using the provider's current contract, validate replay protections where supported, persist/deduplicate the event, and acknowledge only after durable acceptance. Process repeated or out-of-order events without duplicating accounting or moving successful transactions back to pending.

## 7. API behavior

- Public campaign GET returns only published public fields and availability.
- Submission POST validates the stored form version, permitted fields, field sizes and consent. Return a submission reference bound to the participant session.
- Verification start/confirm applies resend cooldown, attempt limits and expiry; bind proof to phone, campaign, purpose and session. A changed phone invalidates proof.
- Claim POST accepts a submission reference and idempotency key. Derive provider product and amount on the server. Return accepted/pending or the existing receipt.
- Claim status GET requires a high-entropy receipt token or authorized participant session. Never expose another person's phone or claim through a sequential ID.
- Admin routes verify session, organization membership, permission and campaign assignment on every request, including exports.
- Publish validates campaign readiness. Reward campaigns require valid reward configuration and allocations; feedback-only campaigns do not.
- Review/retry actions are audited and constrained by transaction state. Retry cannot mean an unrestricted second payout.

Use consistent validation errors and request IDs; return appropriate 400/401/403/404/409/429/503 responses. Prevent sensitive caching and enumeration. Protect cookie-authenticated writes from cross-site requests. Validate allowed redirect protocols and destinations; avoid rendering arbitrary admin HTML.

## 8. Sequential implementation prompts and completion checks

### Phase 0 — Recover context and define scope

Prompt: Read the proposal, workflow and repository. Write a concise product brief, requirements checklist and decision log. Map every MVP requirement to a phase. Identify existing implementation, assumptions and missing production inputs. Make no claim that proposed functionality already exists.

Done when: the brief describes roles, journeys, MVP boundaries, reward provider uncertainty and the JSX decision; the status file accurately records the starting point.

### Phase 1 — Application foundation and visual system

Prompt: Build the Next.js JSX foundation in the existing app. Add reusable layouts, navigation, buttons, inputs, dialogs, notifications, data tables and loading/error states. Create a responsive dashboard shell and a mobile campaign page using clearly labelled demonstration content. Establish lint/build commands and environment documentation.

Design direction: professional neutral background, clear typography, one restrained accent, readable tables and mobile-friendly forms. Admin navigation: Overview, Organizations, Campaigns, Submissions, Reviews, Fulfillment, Analytics, Team, Audit and Settings. Hide unavailable navigation by permission, while keeping server authorization independent.

Done when: navigation works, layouts work on mobile and desktop, keyboard focus is visible, and lint/build checks pass. No inactive buttons are presented as working features.

### Phase 2 — Database, authentication and tenant permissions

Prompt: Implement database connection reuse, schemas/indexes, authentication with a maintained library, secure sessions, organizations, memberships and role/permission checks. Add safe seed data for two isolated organizations. Use an explicit super-admin role and audited privileged access. Add account recovery and session revocation appropriate to the chosen auth approach.

Done when: admins sign in/out, suspended users lose access, organization A cannot read/update/export organization B's data, and staff cannot manage unassigned campaigns. Test API requests directly, not only hidden UI controls.

### Phase 3 — Campaign builder and dynamic QR

Prompt: Implement campaign CRUD, versioned publication, branding, status transitions, schedule validation, preview and stable QR URLs. Add PNG/SVG downloads and a print/PDF export path. Validate uploaded asset type/size and store assets in managed object storage. Use a canonical application origin for QR URLs.

Done when: a real phone opens the correct campaign, content edits retain the printed QR destination, drafts stay private, pause/deactivation takes effect, and draft → scheduled/active → paused/completed → archived transitions are enforced. Test Africa/Lagos date boundaries.

### Phase 4 — Forms, consent and submissions

Prompt: Build a reusable form builder and DynamicForm renderer. Support text, textarea, email, phone, number, select, radio, checkboxes, rating and consent fields. Implement reorder, required rules, limits, preview and immutable publication versions. Add workflow-specific submission lists, details and complaint review states.

Done when: the same schema drives rendering and server validation; malformed or unknown fields are rejected; old submissions remain readable after form edits; marketing consent is optional and separate; feedback works without rewards.

### Phase 5 — Verification and eligibility

Prompt: Implement phone normalization, an OTP adapter, local simulator and server-side eligibility service. Enforce campaign dates/status, verified phone rules, invite/customer references when configured, participant limits and review flags. Add distributed rate limiting and a bot challenge integration point for suspicious requests.

Done when: expired/reused OTPs fail, changing the phone invalidates verification, repeated attempts are capped, duplicate claims cannot pass by changing browser input, and users receive understandable rejection reasons. Do not infer a current carrier solely from a phone prefix; support explicit selection or verified provider lookup.

### Phase 6 — Claims, budget ledger and durable jobs

Prompt: Implement the claim state machine, scoped idempotency, entitlement constraints, transactional reservations, daily caps, ledger, outbox and worker leasing. Use a deterministic simulator with success, confirmed failure, pending, timeout and reversal scenarios. Add secure participant receipt/status pages.

Done when: simultaneous claims cannot overspend; duplicate clicks and different keys cannot bypass eligibility; a repeated job settles once; a worker crash recovers safely; unknown provider outcomes retain their reservation; no browser field controls the amount.

### Phase 7 — Real provider integration

Prompt: Read the selected provider's current official API contract. Implement its adapter, product mapping, secure credentials, webhooks, transaction lookup, retry policy and reconciliation job. Verify sandbox behavior before a controlled, explicitly authorized real reward test. Keep simulator and live modes visibly separate.

Done when: evidence demonstrates one real supported product, provider references match internal claims, delayed/repeated webhooks are safe, insufficient balance is handled, and timeouts cannot trigger a second payout. If credentials or a provider decision are missing, mark this phase blocked while continuing other independent phases.

Paystack, if later chosen for collecting funds, is a separate integration from reward delivery. Add payment verification, unique payment references and a funding ledger before crediting allocations. Never credit money from a browser success redirect alone. Verify the selected payment product's current official documentation at implementation time.

### Phase 8 — Operations, analytics and exports

Prompt: Build submission review, complaint resolution, claim review, fulfillment history, reconciliation views, safe retry actions, audit history and filtered exports. Replace dashboard demonstration values with database-derived metrics. Add pagination and date/campaign filters.

Define metrics: visits/scans are recorded link visits and may include shared-link visits; unique participants are estimates or verified identities according to the displayed definition; submission conversion uses an explicit denominator and date cohort; claim success rate states whether pending claims are included; spend uses settled ledger entries; available budget excludes active reservations.

Done when: reports match seeded transaction totals; empty states are honest; exports apply the same tenant filters, escape spreadsheet formulas and are audited; reversed and pending rewards are counted consistently.

### Phase 9 — Security and failure testing

Prompt: Test complete user journeys and the highest-risk boundaries. Cover tenant isolation, forged IDs, unauthorized exports, consent/version handling, paused campaigns, race conditions, duplicate requests, worker restart, webhook replay, provider outage and queue delay. Fix failures and record evidence.

Done when: a suite covers unit rules, real database transactions/indexes, simulated provider integration and browser journeys. Include keyboard use, mobile form errors and slow networks. Verify secrets and personal information do not appear in browser bundles, URLs or routine logs. Record unresolved issues instead of declaring all tests passed.

### Phase 10 — Deployment and handover

Prompt: Prepare staging and production configuration for Next.js, MongoDB, object storage, durable jobs and selected providers. Document environment variables, indexes, deployment steps, monitoring, backup/restore and rollback. Deploy to the authorized hosting target, verify HTTPS and callback URLs, and run a controlled acceptance test.

Done when: the deployed admin-to-participant flow works; workers execute independently of browser requests; alerts cover queue backlog, unknown transactions and low provider balance; backup restoration has been exercised; owner-approved policies and provider setup are complete. Deliver repository, live URL if deployed, setup guide, operations runbook and known limitations.

## 9. Acceptance scenarios

1. Admin A creates a branded campaign and downloads a QR; a mobile participant completes feedback; the submission appears only in organization A.
2. A verified eligible participant claims the configured reward; refreshing the page and repeating the request preserve one claim and one provider transaction.
3. Ten simultaneous requests compete for the last reward allocation; at most the permitted capacity is reserved and no budget goes negative.
4. Provider accepts a reward but the connection times out; reconciliation finds the original outcome and no second reward is sent.
5. A webhook is delivered repeatedly and out of order; one settlement is recorded and status remains consistent.
6. A campaign is paused after the participant opens the form; a new claim is refused. Already-reserved claims follow the explicitly documented settlement policy.
7. An admin changes a form or reward amount; existing submissions and claims retain their original versions.
8. A staff member changes an organization/campaign ID in an API request; unauthorized data remains inaccessible.
9. A complaint is reviewed and a goodwill reward approved; the approver and decision are audited and duplicate approval is harmless.
10. A confirmed failed payout releases capacity according to policy; an unknown payout does not.

## 10. Inputs the owner must supply

Before visual customization: product name, logo, brand colors and one sample organization/campaign. Use labelled placeholder assets until then.

Before live rewards: chosen provider and supported product, secure production credentials, funded provider account, per-campaign budgets, fee policy, verification provider, claim limits and approval rules. Credentials belong in secret configuration rather than chat or JSX.

Before launch: intended commercial/funding model, approved privacy and reward terms, retention/deletion rules, support contact, domain, production access and required review of applicable Nigerian obligations. This workflow does not establish legal compliance.

## 11. Context to retain between Work sessions

At each milestone update docs/BUILD_STATUS.md with completed features, exact checks and results, outstanding failures, integration mode, missing inputs and next step. Keep business decisions in docs/DECISIONS.md and the current scope in docs/PRODUCT_BRIEF.md.

Continuation prompt:

> Read ENTERPRISE_QR_BUILD_WORKFLOW.md and the product brief, decision log and build status. Inspect the current code before editing. Continue from the earliest incomplete dependency. Preserve working features and user changes. Implement and verify the next milestone, update the status files and report the evidence. Keep live reward operations disabled until provider configuration and the controlled production test are explicitly authorized.

## References

- Source proposal: Enterprise_QR_Engagement_Rewards_Platform_Proposal_Restyled.docx, dated September 29, 2026, supplied by the project owner.
- ChatGPT Work capabilities: https://learn.chatgpt.com/docs/get-started-with-work
- Next.js server and client component boundaries: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Route Handler conventions: https://nextjs.org/docs/app/getting-started/route-handlers

The architecture is a proposed implementation tailored to the supplied requirements. Recheck provider and package documentation when each integration is implemented.
