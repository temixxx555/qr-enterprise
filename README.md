# EnterpriseQR

Next.js App Router application in JavaScript/JSX for customizable campaign mini-webpages, QR links, forms and optional test airtime.

## Current handover

**Start here:** [Complete product and technical handbook](docs/ENTERPRISEQR_COMPLETE_HANDBOOK.md) — features, exact role permissions, workflows, setup, architecture, remaining work and future additions, reviewed October 23, 2026.

Campaigns, forms, local rewards, reporting and operations are implemented. VTPass sandbox integration is prepared but needs account-backed acceptance. Deployment files are ready for review; **nothing has been published**, per the owner's instruction. Live phone verification and airtime remain disabled.

There are 11 phases (0–10). Phase 8 is locally complete; Phase 7 account/live acceptance, broader Phase 9 checks and Phase 10 hosted acceptance remain open. Deployment is preparation-only.

Status was rechecked October 23: VTPass sandbox settings are absent, hosted preflight is not ready, and deployment remains unpublished. Recorded automated results are from October 2 and were not rerun during this documentation update. See the handbook and `docs/BUILD_STATUS.md` for details.

- [Current phase status](docs/BUILD_STATUS.md)
- [VTPass sandbox configuration](docs/VTPASS_INTEGRATION.md)
- [Reporting definitions and exports](docs/REPORTING.md)
- [Deployment, recovery and rollback](docs/DEPLOYMENT.md)
- [Security checks and remaining acceptance](docs/SECURITY_ACCEPTANCE.md)
- [Reward operations](docs/REWARD_OPERATIONS.md)
- [Original workflow](ENTERPRISE_QR_BUILD_WORKFLOW.md)

## Run locally

1. Run `npm ci`, then `npm run setup:local`. Existing `.env.local` is preserved.
2. For a local database, run `npm run db:local` and keep it running. This is an unauthenticated loopback MongoDB replica set for development, with files under `.data/mongo`.
3. Run `npm run dev`. Open http://127.0.0.1:3000/login.
4. Create an account and organization. Create a campaign, save it and open Publication & QR.

If `.env.local` points to Atlas, the normal app uses that configuration. `npm run db:check` performs a read-only check. Transactions require a replica set. QA uses a separate local database at port 3100; integration fixtures do not use the configured cloud database.

## Capabilities

- Accounts, recovery, session revocation, organizations and owner/admin/assigned-manager access. Hosted signup requires verified email and SMTP; local mail is private under `.data/mail`.
- Explicit platform super-admin role, granted separately through `node --env-file=.env.local scripts/grant-platform-admin.mjs account-email`. Organization ownership does not grant platform access.
- Personal, birthday, community/leader and business pages: banners, profiles, galleries, events, links, themes and reorderable sections.
- Server-validated images in private local or S3-compatible storage, versioned publication, scheduling, pause, archive, duplication and stable QR URLs. Finalize `APP_URL` before printing codes.
- Custom RSVP, feedback, survey and complaint forms, separate processing/marketing consent, immutable question snapshots and a private review inbox. Save and republish after changing a form.
- Local phone verification, eligibility, one campaign/phone entitlement, transactional budget reservation, review, ledger and independent worker. Ordinary form responses remain repeatable.
- VTPass sandbox adapter, durable request references and lookup-only recovery after uncertainty. Sandbox uses fictional destinations.
- Recorded visits, database-derived analytics, date/campaign filters, scoped and audited CSV exports, claim history and queue indicators.

## Rewards

Configure Reward rules & test budget on a campaign detail page. Participants verify a fictional Nigerian number, select a network and request a test reward. Use Fulfillment for reviews. Run `npm run worker:qa` for independent QA processing; stop it before integration suites. Local scenarios cover success, failure, pending, timeout and reversal. VTPass sandbox requires the private settings in its setup guide.

Unknown outcomes retain reservations. A status lookup checks the original transaction and never submits another purchase. No real SMS or airtime has been sent.

## Verification

Keep `npm run db:local` and `npm run dev:qa` running. Stop continuous workers. Run suites sequentially to avoid authentication rate limits and competing job consumers:

```powershell
npm test
npm run test:integration
npm run test:rewards
npm run test:operations
npm run test:backup
npm run lint
npm run build
node scripts/check-client-secrets.mjs
```

The latest automated results are 24 unit tests, 76 regression assertions, 77 reward assertions and 43 operations assertions, all passing. Backup restore, lint and build passed. See the acceptance record for exact limits.

`npm run vtpass:check` separately contacts the sandbox after private configuration is added. `npm run deploy:check` checks configuration only; it currently reports missing hosted setup. Docker targets have not been executed because Docker is unavailable locally.

## Hosting

Use production mode, a final HTTPS origin, MongoDB replica set, SMTP and private S3-compatible storage. Store secrets in the host environment; never upload `.env.local`, `.data` or a development `.next` directory. Build a fresh deployment artifact. The Docker web target runs as an unprivileged user. Production rewards remain unavailable.

Hosted SMTP/S3, physical QR scanning, container execution, external alerts, hosted restoration, full accessibility/load testing and owner-approved retention/privacy/reward policies remain acceptance work. Read the deployment guide before any future publication.
