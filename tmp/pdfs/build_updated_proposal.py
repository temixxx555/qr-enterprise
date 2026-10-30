from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)

OUT = Path('output/pdf/Enterprise_QR_Engagement_Rewards_Platform_Updated_Proposal.pdf')
OUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = letter
LEFT = RIGHT = 0.72 * inch
TOP = 0.68 * inch
BOTTOM = 0.62 * inch

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverKicker', fontName='Times-Bold', fontSize=11, leading=14, alignment=TA_CENTER, spaceAfter=16, textColor=colors.black))
styles.add(ParagraphStyle(name='CoverTitle', fontName='Times-Bold', fontSize=23, leading=28, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name='CoverSub', fontName='Times-Roman', fontSize=12, leading=17, alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle(name='CoverMeta', fontName='Times-Roman', fontSize=10, leading=15, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name='H1x', fontName='Times-Bold', fontSize=14, leading=18, spaceBefore=3, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle(name='H2x', fontName='Times-Bold', fontSize=11, leading=14, spaceBefore=7, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle(name='Bodyx', fontName='Times-Roman', fontSize=9.4, leading=13.1, spaceAfter=6, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='Smallx', fontName='Times-Roman', fontSize=8.2, leading=10.5, spaceAfter=2))
styles.add(ParagraphStyle(name='Cellx', fontName='Times-Roman', fontSize=8.1, leading=10.2, spaceAfter=0))
styles.add(ParagraphStyle(name='CellBoldx', fontName='Times-Bold', fontSize=8.1, leading=10.2, spaceAfter=0))
styles.add(ParagraphStyle(name='Calloutx', fontName='Times-Roman', fontSize=9.5, leading=13.2, borderColor=colors.black, borderWidth=0.7, borderPadding=8, spaceBefore=4, spaceAfter=9, backColor=colors.HexColor('#f1f1f1')))
styles.add(ParagraphStyle(name='CenterSmall', fontName='Times-Roman', fontSize=8.5, leading=12, alignment=TA_CENTER))

def P(text, style='Bodyx'):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph('- ' + text, styles['Bodyx'])

def table(rows, widths, header=True, repeatRows=1, font=8.1, padd=5):
    data=[]
    for ri,row in enumerate(rows):
        data.append([P(str(v), 'CellBoldx' if header and ri == 0 else 'Cellx') for v in row])
    t=Table(data, colWidths=widths, repeatRows=repeatRows if header else 0, hAlign='LEFT')
    commands=[
        ('GRID',(0,0),(-1,-1),0.55,colors.black),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),padd),('RIGHTPADDING',(0,0),(-1,-1),padd),
        ('TOPPADDING',(0,0),(-1,-1),padd),('BOTTOMPADDING',(0,0),(-1,-1),padd),
    ]
    if header:
        commands.append(('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e7e7e7')))
    t.setStyle(TableStyle(commands))
    return t

class ProposalDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(str(filename), pagesize=letter, leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM, title='Enterprise QR Engagement & Rewards Platform - Updated Proposal', author='EnterpriseQR Project')
        frame=Frame(LEFT, BOTTOM, PAGE_W-LEFT-RIGHT, PAGE_H-TOP-BOTTOM, id='normal', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id='all', frames=frame, onPage=self._footer)])
    def _footer(self, canvas, doc):
        if doc.page > 1:
            canvas.saveState()
            canvas.setStrokeColor(colors.HexColor('#888888'))
            canvas.setLineWidth(0.4)
            canvas.line(LEFT, 0.43*inch, PAGE_W-RIGHT, 0.43*inch)
            canvas.setFont('Times-Roman', 8)
            canvas.setFillColor(colors.HexColor('#444444'))
            canvas.drawString(LEFT, 0.27*inch, 'Enterprise QR Engagement & Rewards Platform')
            canvas.drawRightString(PAGE_W-RIGHT, 0.27*inch, f'Page {doc.page}')
            canvas.restoreState()

story=[]

# Page 1 - proposal cover, retaining the source document's centered serif layout.
story += [Spacer(1, 0.95*inch), P('PROJECT PROPOSAL', 'CoverKicker'), P('Enterprise QR Engagement &amp; Rewards Platform', 'CoverTitle'), P('Customizable QR campaign pages, forms, organization workflows, simulated rewards and operational reporting', 'CoverSub'), Spacer(1, 0.12*inch), P('Updated: October 23, 2026', 'CoverMeta'), Spacer(1, 0.23*inch), P('<b>PROJECT POSITION</b><br/>Core application implemented and locally verified. Production integrations and hosted acceptance remain.', 'Calloutx'), Spacer(1, 0.1*inch), P('<b>Original commercial terms recorded in the September 29 proposal:</b><br/>NGN 70,000; 4-6 weeks; payment after completion.<br/><i>These are retained as historical proposal terms. Their current status has not been confirmed.</i>', 'CoverMeta'), Spacer(1, 0.25*inch), HRFlowable(width='72%', thickness=0.6, color=colors.black, hAlign='CENTER'), Spacer(1, 0.18*inch), P('Prepared as an implementation update to the original project proposal', 'CoverMeta'), PageBreak()]

# Page 2 - summary and scope.
story += [P('Executive Summary', 'H1x'), P('EnterpriseQR turns a stable QR code into an organization-managed campaign webpage. Organizers can present a person, event, community or business; collect RSVP and feedback; review responses; and, when configured, offer a controlled test reward. The QR address stays stable when a page is edited and republished.', 'Bodyx'), P('<b>Current delivery:</b> the core Next.js application, organization access, campaign editor, publishing, forms, local reward simulator, reporting and operational screens are implemented. A VTPass sandbox adapter and deployment package are prepared. Real SMS verification and real airtime are not enabled.', 'Calloutx'), P('Project objectives', 'H2x')]
for x in [
    'Give each organization a private workspace for campaigns, staff, submissions and reward rules.',
    'Make each campaign QR open a customizable mini webpage rather than a static poster.',
    'Support consent-aware RSVP, feedback, survey and complaint forms.',
    'Protect reward budgets through eligibility checks, one-claim rules, atomic reservations and a ledger.',
    'Provide history, filtered analytics, audited exports and an operator workflow for uncertain outcomes.',
]: story.append(bullet(x))
story += [P('Supported campaign examples', 'H2x'), table([
    ['Use case','Configured experience'],
    ['Birthday invitation','Cover/profile photos, event details, venue links, gallery, RSVP and birthday messages; optional test reward.'],
    ['Leader or community page','Biography, priorities, public events and official links; optional RSVP and feedback. It is not an election or verified voting system.'],
    ['Personal or business page','Introduction, brand images, announcement, gallery and website/social links. Actions can be disabled.'],
    ['Customer feedback','Custom response form, consent record, private review notes and scoped export.'],
], [1.55*inch, 4.95*inch]), Spacer(1,7), P('Scope boundary', 'H2x'), P('The current product handles test rewards only. It does not collect payments, maintain a funded wallet, issue coupons or utility credits, run a ballot, or automatically pay out when someone scans or submits a form. These would require new implementation and acceptance.', 'Bodyx'), PageBreak()]

# Page 3 - roles and access.
story += [P('1. Users, Roles and Access', 'H1x'), P('Private API and page access is checked on the server using the signed-in account, selected organization and campaign assignment. The role shown in the interface does not replace these checks.', 'Bodyx'), table([
    ['Role','Access and responsibilities'],
    ['Platform super administrator','Separate operator grant. Can list organizations and activate/suspend an organization with an audited reason. This role does not automatically grant access to private organization campaign answers.'],
    ['Organization owner','Full organization administration. Manages campaigns, staff, reward rules, publishing, review and reporting. The current team tool reserves granting/managing admin membership to the owner.'],
    ['Organization administrator','Manages campaigns, publication, reward settings, claims and managers. Cannot manage the owner or grant another admin through the current team tool.'],
    ['Campaign manager','Creates a campaign assigned to their account and edits assigned campaign drafts. Can review assigned responses and see assigned campaign reports. Cannot publish/pause/archive campaigns, change reward rules, approve claims or run provider lookups.'],
    ['Public participant','Views an available published page and submits its enabled RSVP/response. Can use local test verification and view their limited test receipt. No organizer login is required.'],
], [1.55*inch, 4.95*inch]), Spacer(1,7), P('Key access rules', 'H2x')]
for x in [
    'Organization data is tenant-scoped. A user must have an active membership and the organization must be active.',
    'Managers only see assigned campaigns; cross-organization or unassigned campaign lookups are rejected.',
    'A staff member needs an existing account before an owner/admin can add them. Email invitation acceptance and ownership transfer are not implemented.',
    'Suspending a member or organization blocks new workspace access. Previously approved reward commitments follow the documented settlement policy.',
]: story.append(bullet(x))
story += [P('At-a-glance permission boundaries', 'H2x'), table([
    ['Function','Owner','Admin','Manager'],
    ['Edit draft','All','All','Assigned'],
    ['Publish / pause / archive','Yes','Yes','No'],
    ['Review submissions','All','All','Assigned'],
    ['Edit reward policy / approve claims','Yes','Yes','No'],
    ['Organization audit / provider readiness','Yes','Yes','No'],
], [2.65*inch,1.15*inch,1.15*inch,1.55*inch]), PageBreak()]

# Page 4 - campaign builder and publishing.
story += [P('2. Campaign Pages, Publishing and QR', 'H1x'), P('The editor is organized into three panels: Identity &amp; design, Page sections, and Buttons &amp; rewards. Four starting templates are available: Personal page, Birthday &amp; invitation, Leader &amp; community, and Business &amp; brand.', 'Bodyx'), table([
    ['Editor area','What can be configured'],
    ['Identity and design','Person/organization name, title, tagline, introduction, cover banner, profile photo/logo, crop position, main website, accent color, background, heading style and header alignment.'],
    ['Text and announcements','Up to 12 total page sections. Add headings and plain text; show, hide, move, duplicate or remove sections.'],
    ['Event','Invitation details, date/time, venue, address, description and a map/event link.'],
    ['Links and imagery','Labeled website/social links, image banner with destination, and galleries. Up to 8 links per links section and 4 gallery images per gallery section.'],
    ['Actions','Independently enable RSVP, feedback/messages and optional reward. Customize button labels and reward explanation.'],
], [1.45*inch,5.05*inch]), P('Saving and publication', 'H2x')]
for x in [
    'Save changes to the private draft and review the preview.',
    'An owner/admin publishes a snapshot. Later edits stay private until republished; old form responses retain their original question and consent snapshot.',
    'Publication can be scheduled in Africa/Lagos time, paused or archived. Start time is inclusive; end time is exclusive. Archive is terminal; duplication starts a new campaign.',
    'The random public QR route remains stable across page edits. Download PNG/SVG or print the QR page. Set the final HTTPS APP_URL before distributing real codes.',
]: story.append(bullet(x))
story += [P('Image and content controls', 'H2x'), P('JPG, PNG and WebP images are decoded, resized to at most 1400 x 1400 and stored as WebP. Local use stores files privately; hosted use requires private S3-compatible storage. The app accepts text and validated HTTP/HTTPS destinations, not arbitrary HTML or scripts. A 4 MB normalized page limit applies.', 'Bodyx'), P('<b>Availability check:</b> a draft, paused, archived, not-yet-started, ended or suspended-organization page is not an active participant campaign. A downloadable QR alone does not publish it.', 'Calloutx'), PageBreak()]

# Page 5 - data collection and participant journey.
story += [P('3. Forms and Participant Workflow', 'H1x'), P('RSVP and response forms are separately configurable and saved with the campaign publication. Response workflows include feedback, survey and complaint.', 'Bodyx'), table([
    ['Form capability','Implemented behavior'],
    ['Question types','Text, long text, email, phone, number, select, radio, checkboxes, rating and consent. Configure labels, help text, required state, length/range, choices and order.'],
    ['Consent','Exactly one required processing/data-use acknowledgement. Optional marketing permission is separate and starts unchecked. The organizer supplies its privacy notice and HTTPS policy link.'],
    ['Validation and version','Server validates answer types/options, required values and current publication version. Responses retain the question, answer, notice and consent snapshot.'],
    ['Duplicate handling','Same idempotency key and same answers return the existing response. Changed answers with the same key are rejected. New keys can create additional ordinary responses; one-person-only response is not enforced.'],
    ['Review','Private inbox filters by campaign, workflow, state and date. Review notes are version-checked. Closing/dismissing a complaint requires a note. Managers are limited to assigned campaigns.'],
], [1.4*inch,5.1*inch]), P('Participant response journey', 'H2x')]
story += [table([
    ['Step','Participant experience','Application behavior'],
    ['1. Open','Scan code or open shared link.','Resolve campaign and check publication, dates and organization status.'],
    ['2. Read','View branded person/event/business page.','Render the published content snapshot and enabled actions.'],
    ['3. Respond','Choose RSVP or message/feedback.','Display only the selected published form.'],
    ['4. Consent','Complete required fields and accept data-use notice.','Validate server-side, preserve consent and form version.'],
    ['5. Confirm','See confirmation.','Store response privately, deduplicate retries and expose it only to authorized staff.'],
], [0.78*inch,2.35*inch,3.37*inch]), Spacer(1,8), P('Privacy and abuse limits', 'H2x'), P('Public submissions are size-limited and use a honeypot plus a campaign-level fixed-window ceiling. This is basic abuse control, not a real bot challenge. A phone field in a form is text validation, not proof of number ownership. Responses are repeatable with new request keys.', 'Bodyx'), PageBreak()]

# Page 6 - verification, eligibility, reward processing.
story += [P('4. Verification and Reward Workflow', 'H1x'), P('The current verified-phone experience is a local simulator. It displays a test code and sends no SMS. Production rejects simulator proofs. Real OTP delivery and real bot protection remain to be built.', 'Calloutx'), P('Test reward setup and claim', 'H2x'), table([
    ['Step','Action','Control applied'],
    ['1. Configure','Owner/admin enables the page reward and separately sets amount, test allocation, daily cap, participant limit, reference/review rules and simulator or sandbox mode.','Amounts are stored in integer kobo. Public input cannot set amount or policy.'],
    ['2. Verify','Participant enters a supported Nigerian number, uses the local test code and chooses MTN, Airtel, Glo or 9mobile.','Five-minute challenge, five attempts, single use; browser/campaign/publication bound. Carrier is not inferred from prefix.'],
    ['3. Check','Participant requests an eligibility check.','Checks active published campaign, reward policy, proof, reference and capacity. Preview does not reserve funds.'],
    ['4. Claim','Participant submits a claim.','The server repeats checks and atomically records one lifetime claim per campaign/verified phone, consumes the reference and reserves budget/capacity.'],
    ['5. Review','If required, owner/admin approves or rejects with a reason.','Review claim reserves budget; approval creates the durable processing job. Manager cannot approve.'],
    ['6. Process','Independent worker handles the job; test admin can process one due QA job.','Lease/fencing controls prevent stale worker completion. Unknown results retain the reservation.'],
    ['7. Receipt','Participant opens/refreshes a private receipt.','Receipt read does not run a job. Receipt ID alone does not authorize another browser.'],
], [0.72*inch,2.5*inch,3.28*inch]), P('Eligibility and budget policy', 'H2x')]
for x in [
    'Total allocation, daily cap and participant limit include active reservations and settled spend.',
    'One lifetime claim per verified phone per campaign, even after a failed, rejected or reversed claim. References are single-use.',
    'Confirmed failure/rejection releases reserved capacity. Unknown/pending keeps it reserved until checked. Reversal returns previously settled spend.',
    'Already-approved work continues after campaign pause or organization suspension; new admissions stop. Review reservations have no automatic expiry.',
]: story.append(bullet(x))
story += [PageBreak()]

# Page 7 - provider, operations and architecture.
story += [P('5. Provider, Operations and Technical Design', 'H1x'), P('VTPass integration', 'H2x'), P("A VTPass sandbox adapter is implemented for airtime products and uses server-side credentials with a fixed sandbox endpoint. For sandbox checks it selects fictional destinations; it does not send the participant's actual phone number. The provider request ID is saved before dispatch. After that point, uncertain work queries the original request instead of creating another purchase.", 'Bodyx'), table([
    ['Provider result','Application handling'],
    ['Matching delivered result','Record success and settle the reservation once.'],
    ['Pending or processing','Keep reservation and schedule a bounded status lookup.'],
    ['Timeout, malformed or ambiguous reply','Mark uncertain; preserve reservation and reconcile using original request ID.'],
    ['Confirmed refusal/failure','Release reservation when failure is established.'],
    ['Callback hint','Deduplicate and schedule lookup. Callback content cannot settle a claim; signature verification is not implemented.'],
], [1.75*inch,4.75*inch]), Spacer(1,7), P('<b>Acceptance status:</b> sandbox credentials and account-backed acceptance are pending. Real participant airtime is disabled.', 'Calloutx'), P('Operations dashboard', 'H2x'), table([
    ['Module','Current functions'],
    ['Overview and campaigns','Stored campaign counts, search, draft/detail views and campaign lifecycle controls.'],
    ['Submissions','Filtered RSVP/response inbox, private answer/review history and CSV export.'],
    ['Fulfillment','Claim decisions, reservation states, job/provider history, ledger and reason-required original-transaction lookup.'],
    ['Analytics','Recorded page visits, estimated browsers, responses, conversion, claim states, test spend and current budget/queue. Filters use campaign and Lagos dates.'],
    ['Audit and health','Organization action/export history; admin queue, expired-lease, unknown-outcome and worker-heartbeat indicators. No external alerts or provider-balance monitor.'],
], [1.35*inch,5.15*inch]), P('Application architecture', 'H2x'), P('Next.js App Router with JavaScript/JSX; Better Auth sessions; MongoDB replica-set transactions and indexes; private local or S3-compatible image storage; server-side APIs; an independent Node reward worker; and provider adapter/reconciliation code. MongoDB-backed job documents provide durable processing. No Redis queue is required by the current app.', 'Bodyx'), PageBreak()]

# Page 8 - as-built status, remaining work and handover.
story += [P('6. Delivery Status and Remaining Work', 'H1x'), table([
    ['Phase','Scope','Current evidence/status'],
    ['0-3','Product foundation, UI, identity, organizations, campaigns, publishing and QR.','Implemented; local verification recorded. Hosted SMTP/storage and physical phone QR acceptance pending.'],
    ['4','Forms, consent, submissions and review.','Implemented and locally tested.'],
    ['5-6','Local verification/eligibility, reward claim, budget reservation, ledger and worker.','Implemented and locally tested with simulator outcomes. Real OTP and bot service pending.'],
    ['7','Provider integration.','VTPass sandbox adapter implemented; account-backed sandbox acceptance pending. Real airtime not implemented.'],
    ['8','Analytics, exports, claim history and operations.','Implemented and locally verified.'],
    ['9','Security and failure verification.','Automated local coverage recorded; broader accessibility, slow-network/load and hosted acceptance remain.'],
    ['10','Deployment and handover.','Dockerfile, preflight and runbooks prepared. Not deployed; hosted acceptance and external monitoring remain.'],
], [0.65*inch,2.05*inch,3.8*inch]), P('Recorded local verification', 'H2x'), P('The October 2, 2026 record lists 24 unit tests, 76 HTTP regression assertions, 77 reward assertions and 43 operations assertions (220 combined checks), plus lint, a production build, a client-secret scan and a local backup/restore rehearsal. These results cover local and simulated behavior; they do not establish production delivery or hosting. Tests were not rerun for this proposal update.', 'Bodyx'), P('Work required before launch', 'H2x')]
for x in [
    'Configure VTPass sandbox credentials privately and complete account-backed acceptance for success, refusal, timeout/requery and repeated callback behavior.',
    'Implement real OTP delivery, real bot checks and secure handling of the actual airtime recipient before any live reward mode.',
    'Choose hosting/domain; configure and verify HTTPS, SMTP, private S3, production database access and the deployment container.',
    'Run hosted signup/recovery, image, campaign, form, isolation/export, physical QR, monitoring and backup-restore acceptance.',
    'Complete accessibility, interrupted/slow-network and sustained-load checks; define privacy, reward, retention and support policies.',
]: story.append(bullet(x))
story += [P('Release position', 'H2x'), P('The core local app is largely built, but the full production platform is not complete. The project is in final acceptance work across Phases 7, 9 and 10. Deployment preparation was requested; no site has been published. The project owner should approve a separate deployment step after hosted requirements and provider acceptance are complete.', 'Calloutx'), P('Current documents', 'H2x'), P('Detailed product, role and workflow reference: docs/ENTERPRISEQR_COMPLETE_HANDBOOK.md. Phase status: docs/BUILD_STATUS.md. Deployment and recovery: docs/DEPLOYMENT.md. VTPass setup: docs/VTPASS_INTEGRATION.md. Local source commit: 0a0e4e9.', 'Bodyx')]

doc=ProposalDoc(OUT)
doc.build(story)
print(OUT.resolve())
