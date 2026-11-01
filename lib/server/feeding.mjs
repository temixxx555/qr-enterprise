import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { database, indexes } from './db.mjs';
import { AppError, audit, admin } from './access.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const token = (bytes = 32) => randomBytes(bytes).toString('base64url');
const text = (v, max, label, required = false) => {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new AppError(`Check the ${label}.`);
  return v.trim();
};

export function cleanProgram(input, current = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Invalid program details.');
  const name = text(input.name, 120, 'program name', true);
  const description = text(input.description || '', 4000, 'description');
  const contact = text(input.contact || '', 200, 'contact information');
  const privacyNotice = text(input.privacyNotice || '', 3000, 'privacy notice');
  const timezone = text(input.timezone || 'Africa/Lagos', 80, 'timezone', true);
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date()); } catch { throw new AppError('Choose a valid timezone.'); }
  if (!Array.isArray(input.locations) || input.locations.length > 30) throw new AppError('Add up to 30 distribution locations.');
  const locations = input.locations.map((item, i) => ({
    id: typeof item.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(item.id) ? item.id : `location-${i + 1}`,
    name: text(item.name, 100, 'location name', true), address: text(item.address || '', 500, 'location address'),
    instructions: text(item.instructions || '', 1000, 'location instructions'), active: item.active !== false,
  }));
  if (!Array.isArray(input.sessions) || input.sessions.length > 30) throw new AppError('Add up to 30 serving sessions.');
  const sessions = input.sessions.map((item, i) => {
    if (!Array.isArray(item.days) || item.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new AppError('Choose valid session weekdays.');
    const start = text(item.start || '', 5, 'session start', true); const end = text(item.end || '', 5, 'session end', true);
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) throw new AppError('Session windows must have valid start and end times.');
    const locationIds = Array.isArray(item.locationIds) ? item.locationIds.filter(id => locations.some(location => location.id === id)).slice(0, 30) : [];
    return { id: typeof item.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(item.id) ? item.id : `session-${i + 1}`, name: text(item.name, 80, 'session name', true), days: [...new Set(item.days)], start, end, locationIds, active: item.active !== false };
  });
  const limits = input.limits || {};
  if (![null, undefined, '', 0].includes(limits.maxServings) && (!Number.isSafeInteger(Number(limits.maxServings)) || Number(limits.maxServings) < 1 || Number(limits.maxServings) > 100)) throw new AppError('Serving allowance must be between 1 and 100.');
  const unit = limits.unit || 'household'; const period = limits.period || 'session';
  if (!['household', 'person', 'child'].includes(unit) || !['session', 'day'].includes(period)) throw new AppError('Choose a supported serving limit.');
  const startsAt = input.startsAt ? new Date(input.startsAt) : null; const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if ((startsAt && !Number.isFinite(+startsAt)) || (endsAt && !Number.isFinite(+endsAt)) || (startsAt && endsAt && endsAt <= startsAt)) throw new AppError('Check the program service dates.');
  const status = current.status || 'Draft';
  return { name, description, contact, privacyNotice, timezone, locations, sessions, limits: { unit, period, maxServings: Number(limits.maxServings) || null, countNamedSessions: limits.countNamedSessions !== false }, capacity: Number.isSafeInteger(Number(input.capacity)) && Number(input.capacity) > 0 ? Math.min(Number(input.capacity), 1000000) : null, waitlist: input.waitlist === true, eligibility: { manualReview: input.eligibility?.manualReview !== false, autoApprove: input.eligibility?.autoApprove === true, summary: text(input.eligibility?.summary || '', 1000, 'eligibility summary') }, form: { requirePhoneVerification: input.form?.requirePhoneVerification === true }, startsAt, endsAt, status };
}

export async function createFeedingProgram(ctx, input) {
  if (ctx.membership.role === 'manager') throw new AppError('An administrator must create a Feeding Program.', 403);
  const program = cleanProgram(input);
  const record = { _id: randomUUID(), organizationId: ctx.organization._id, publicCode: randomBytes(12).toString('hex'), ...program, revision: 1, published: null, publishedRevision: null, createdBy: ctx.user.id, createdAt: new Date(), updatedAt: new Date(), enrolledCount: 0 };
  await ctx.db.collection('feedingPrograms').insertOne(record);
  await audit(ctx, 'feeding.program.created', record._id);
  return record;
}

export async function updateFeedingProgram(ctx, id, input) {
  if (ctx.membership.role === 'manager') throw new AppError('An administrator must manage Feeding Programs.', 403);
  const current = await ctx.db.collection('feedingPrograms').findOne({ _id: id, organizationId: ctx.organization._id });
  if (!current) throw new AppError('Feeding Program not found.', 404);
  if (input.revision !== current.revision) throw new AppError('This program changed. Reload and try again.', 409);
  const action = input.action || 'save';
  if (!['save', 'publish', 'pause', 'resume', 'complete', 'archive'].includes(action)) throw new AppError('Unknown program action.');
  if (current.status === 'Archived') throw new AppError('Archived programs cannot be changed.', 409);
  const fields = action === 'save' || action === 'publish' ? cleanProgram(input.program, current) : {};
  if (action === 'publish' && (!fields.locations.length || !fields.sessions.length || !fields.description || !fields.eligibility.summary || !fields.privacyNotice || !fields.limits.maxServings)) throw new AppError('Add a description, privacy information, eligibility summary, location, session and explicit serving allowance before publishing.');
  const transitions = { pause: ['Published', 'Paused'], resume: ['Paused', 'Published'], complete: ['Published', 'Completed'], archive: ['Completed', 'Archived'] };
  if (transitions[action] && current.status !== transitions[action][0]) throw new AppError(`A ${current.status.toLowerCase()} program cannot be ${action}d.`, 409);
  const status = action === 'publish' || action === 'resume' ? 'Published' : action === 'pause' ? 'Paused' : action === 'complete' ? 'Completed' : action === 'archive' ? 'Archived' : current.status;
  const publishedFields = action === 'publish' ? { published: fields, publishedRevision: current.revision + 1 } : {};
  const updated = await ctx.db.collection('feedingPrograms').findOneAndUpdate({ _id: id, organizationId: ctx.organization._id, revision: input.revision }, { $set: { ...fields, ...publishedFields, status, updatedAt: new Date(), revision: current.revision + 1 }, ...(action === 'publish' ? { $push: { versions: { revision: current.revision + 1, snapshot: fields, createdAt: new Date(), createdBy: ctx.user.id } } } : {}) }, { returnDocument: 'after' });
  const result = updated?.value || updated;
  if (!result) throw new AppError('This program changed. Reload and try again.', 409);
  await audit(ctx, `feeding.program.${action}`, id);
  return result;
}

export async function publicProgram(code) {
  if (!/^[a-f0-9]{24}$/.test(code)) return null;
  const { db } = await database(); const p = await db.collection('feedingPrograms').findOne({ publicCode: code, status: 'Published', published: { $ne: null } });
  const config = p?.published;
  if (!config || (config.startsAt && config.startsAt > new Date()) || (config.endsAt && config.endsAt <= new Date())) return null;
  return { id: p._id, code: p.publicCode, revision: p.publishedRevision, name: config.name, description: config.description, contact: config.contact, privacyNotice: config.privacyNotice, timezone: config.timezone, locations: config.locations.filter(x => x.active).map(({ id, name, address, instructions }) => ({ id, name, address, instructions })), sessions: config.sessions.filter(x => x.active).map(({ id, name, days, start, end, locationIds }) => ({ id, name, days, start, end, locationIds })), startsAt: config.startsAt, endsAt: config.endsAt, capacity: config.capacity, waitlist: config.waitlist, eligibility: config.eligibility.summary, requiresPhoneVerification: config.form.requirePhoneVerification };
}

export async function submitFeedingApplication(code, input) {
  if (!/^[a-f0-9]{24}$/.test(code) || !/^[a-f0-9-]{36}$/.test(input.idempotencyKey || '') || !Number.isInteger(input.publicationRevision) || input.processingConsent !== true) throw new AppError('Complete the required application and consent.');
  const name = text(input.name, 120, 'applicant name', true); const phone = text(input.phone, 32, 'phone number', true).replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(phone)) throw new AppError('Enter a valid phone number.');
  const householdSize = Number(input.householdSize);
  if (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 20) throw new AppError('Household size must be between 1 and 20.');
  const members = Array.isArray(input.members) ? input.members.slice(0, 19).map((m, i) => { if (!m || typeof m !== 'object' || Array.isArray(m)) throw new AppError('Check the household member details.'); return { id: `member-${i + 1}`, name: text(m.name || '', 120, 'household member name', true), relationship: text(m.relationship || '', 40, 'relationship'), isChild: m.isChild === true }; }) : [];
  if (members.length !== householdSize - 1) throw new AppError('Add the household members counted in the household size.');
  const { db, client } = await database(); await indexes();
  const program = await db.collection('feedingPrograms').findOne({ publicCode: code, status: 'Published', published: { $ne: null } }); const config = program?.published;
  if (!config || (config.startsAt && config.startsAt > new Date()) || (config.endsAt && config.endsAt <= new Date())) throw new AppError('This program is not accepting applications.', 409);
  if (input.publicationRevision !== program.publishedRevision) throw new AppError('Program details changed. Reload and review them before applying.', 409);
  if (config.form.requirePhoneVerification) throw new AppError('This program requires phone verification. Application submission is unavailable until an OTP provider is configured.', 503);
  const privacyAcceptedText = text(input.processingConsentText || '', 3000, 'privacy consent text', true);
  if (privacyAcceptedText !== config.privacyNotice) throw new AppError('The privacy information changed. Review it and submit again.', 409);
  const communicationsText = text(input.communicationsConsentText || '', 1000, 'communications consent text');
  const idemHash = hash(JSON.stringify([name, phone, householdSize, members, input.processingConsent, input.communicationsConsent === true]));
  const previous = await db.collection('feedingApplications').findOne({ programId: program._id, idempotencyKey: input.idempotencyKey });
  const receipt = createHmac('sha256', process.env.BETTER_AUTH_SECRET || 'local-only-feeding-receipt-key').update(`${program._id}:${input.idempotencyKey}`).digest('base64url');
  if (previous) { if (previous.payloadHash !== idemHash) throw new AppError('This request key was used for different application details.', 409); return { receipt }; }
  const now = new Date(); let result;
  const minute = Math.floor(Date.now() / 60000); const rate = await db.collection('feedingRateLimits').findOneAndUpdate({ _id: `${program._id}:${minute}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 120000) } }, { upsert: true, returnDocument: 'after' });
  if (rate.count > 20) throw new AppError('This program is receiving many applications. Please try again shortly.', 429);
  try { await client.withSession(session => session.withTransaction(async () => {
    const latest = await db.collection('feedingPrograms').findOne({ _id: program._id, status: 'Published' }, { session });
    if (!latest) throw new AppError('This program is not accepting applications.', 409);
    const currentProgram = await db.collection('feedingPrograms').findOne({ _id: program._id, status: 'Published', published: { $ne: null } }, { session });
    const active = currentProgram?.published;
    if (!active) throw new AppError('This program is not accepting applications.', 409);
    if (currentProgram.publishedRevision !== program.publishedRevision) throw new AppError('The program details changed. Reload before applying.', 409);
    const waitlisted = !!(active.capacity && (currentProgram.activeEnrollmentCount || 0) >= active.capacity);
    if (waitlisted && !active.waitlist) throw new AppError('This program is currently full and is not accepting applications.', 409);
    const record = { _id: randomUUID(), organizationId: program.organizationId, programId: program._id, programRevision: program.publishedRevision, applicant: { name, phone }, household: { size: householdSize, members }, consent: { processing: { accepted: true, text: privacyAcceptedText, recordedAt: now }, communications: { accepted: input.communicationsConsent === true, text: input.communicationsConsent === true ? communicationsText : '', recordedAt: input.communicationsConsent === true ? now : null } }, status: waitlisted ? 'waitlisted' : 'submitted', idempotencyKey: input.idempotencyKey, payloadHash: idemHash, receiptHash: hash(receipt), revision: 1, createdAt: now, updatedAt: now, reviewHistory: [] };
    await db.collection('feedingApplications').insertOne(record, { session }); result = { receipt };
  })); } catch (error) {
    if (error.code === 11000) {
      const prior = await db.collection('feedingApplications').findOne({ programId: program._id, idempotencyKey: input.idempotencyKey });
      if (prior && prior.payloadHash === idemHash) return { receipt };
      if (prior) throw new AppError('This request key was used for different application details.', 409);
    }
    throw error;
  }
  return result;
}

export async function reviewFeedingApplication(ctx, applicationId, input) {
  if (ctx.membership.role === 'manager') throw new AppError('An administrator or assigned reviewer is required.', 403);
  const status = input.status;
  if (!['under_review', 'needs_information', 'approved', 'rejected', 'waitlisted', 'withdrawn', 'suspended'].includes(status)) throw new AppError('Choose a valid application decision.');
  const reason = text(input.reason || '', 1000, 'decision reason', status !== 'under_review');
  const filter = { _id: applicationId, organizationId: ctx.organization._id };
  const { client } = await database(); let issued = null;
  await client.withSession(session => session.withTransaction(async () => {
    const app = await ctx.db.collection('feedingApplications').findOne(filter, { session }); if (!app) throw new AppError('Application not found.', 404);
    const program = await ctx.db.collection('feedingPrograms').findOne({ _id: app.programId, organizationId: ctx.organization._id }, { session }); if (!program) throw new AppError('Program not found.', 404);
    const policy = program.published;
    const now = new Date();
    if (status === 'approved' && (program.status !== 'Published' || !policy)) throw new AppError('Only an active program can approve applicants.', 409);
    if (status === 'approved' && app.status !== 'approved') {
      if (policy.capacity) {
        const enrolled = await ctx.db.collection('feedingPrograms').updateOne({ _id: program._id, status: 'Published', $expr: { $lt: [{ $ifNull: ['$activeEnrollmentCount', 0] }, '$published.capacity'] } }, { $inc: { activeEnrollmentCount: 1 } }, { session });
        if (!enrolled.modifiedCount) throw new AppError('Program capacity is full. Move this application to the waitlist.', 409);
      }
      const credential = token(); issued = { token: credential, url: `${process.env.APP_URL}/participant#credential=${credential}` };
      await ctx.db.collection('feedingCredentials').insertOne({ _id: randomUUID(), organizationId: app.organizationId, programId: app.programId, enrollmentId: app._id, credentialHash: hash(credential), status: 'active', issuedAt: now, issuedBy: ctx.user.id }, { session });
    }
    if (app.status === 'approved' && status !== 'approved') {
      await ctx.db.collection('feedingPrograms').updateOne({ _id: program._id, organizationId: ctx.organization._id, activeEnrollmentCount: { $gt: 0 } }, { $inc: { activeEnrollmentCount: -1 } }, { session });
      await ctx.db.collection('feedingCredentials').updateMany({ enrollmentId: app._id, organizationId: ctx.organization._id, status: 'active' }, { $set: { status: 'revoked', revokedAt: now, revokedBy: ctx.user.id, revocationReason: reason } }, { session });
    }
    const participantMessage = text(input.participantMessage || '', 500, 'participant message') || (status === 'needs_information' ? 'Please contact the program using the contact information on its public page.' : status === 'rejected' ? 'The application was not approved. Contact the program if you need more information.' : '');
    const updated = await ctx.db.collection('feedingApplications').updateOne({ ...filter, revision: app.revision, status: app.status }, { $set: { status, updatedAt: now, revision: app.revision + 1, participantMessage }, $push: { reviewHistory: { status, reason, participantMessage, actorId: ctx.user.id, createdAt: now, programRevision: program.revision } } }, { session });
    if (!updated.modifiedCount) throw new AppError('Another reviewer updated this application. Reload it before deciding.', 409);
    await audit(ctx, `feeding.application.${status}`, applicationId, session);
  }));
  return { status, credential: issued };
}

export async function reissueFeedingCredential(ctx, applicationId, reason) {
  if (ctx.membership.role === 'manager') throw new AppError('An administrator must reissue participant credentials.', 403);
  reason = text(reason || '', 500, 'reissue reason', true);
  const app = await ctx.db.collection('feedingApplications').findOne({ _id: applicationId, organizationId: ctx.organization._id, status: 'approved' });
  if (!app) throw new AppError('Only an approved enrollment can receive a new private participant QR.', 409);
  const credential = token(); const now = new Date(); const { client } = await database();
  await client.withSession(session => session.withTransaction(async () => {
    const active = await ctx.db.collection('feedingCredentials').find({ enrollmentId: app._id, organizationId: ctx.organization._id, status: 'active' }, { session }).toArray();
    await ctx.db.collection('feedingCredentials').updateMany({ _id: { $in: active.map(item => item._id) }, organizationId: ctx.organization._id, status: 'active' }, { $set: { status: 'revoked', revokedAt: now, revokedBy: ctx.user.id, revocationReason: reason } }, { session });
    await ctx.db.collection('feedingCredentials').insertOne({ _id: randomUUID(), organizationId: app.organizationId, programId: app.programId, enrollmentId: app._id, credentialHash: hash(credential), status: 'active', issuedAt: now, issuedBy: ctx.user.id, reissueReason: reason }, { session });
    await audit(ctx, 'feeding.credential.reissued', app._id, session);
  }));
  return { url: `${process.env.APP_URL}/participant#credential=${credential}` };
}

export async function checkFeedingCredential(ctx, input, options = {}) {
  const sessionOptions = options.session ? { session: options.session } : undefined;
  if (typeof input.credential !== 'string' || input.credential.length < 32 || input.credential.length > 100) throw new AppError('Invalid participant QR.', 404);
  const credentialHash = hash(input.credential);
  const record = await ctx.db.collection('feedingCredentials').findOne({ credentialHash, organizationId: ctx.organization._id, status: 'active' }, sessionOptions);
  if (!record) throw new AppError('Participant QR is invalid, suspended, or revoked.', 404);
  const [app, program] = await Promise.all([ctx.db.collection('feedingApplications').findOne({ _id: record.enrollmentId, organizationId: ctx.organization._id }, sessionOptions), ctx.db.collection('feedingPrograms').findOne({ _id: record.programId, organizationId: ctx.organization._id }, sessionOptions)]);
  if (!app || !program) throw new AppError('Enrollment not found.', 404);
  if (input.programId !== program._id) throw new AppError('This participant QR belongs to a different Feeding Program.', 409);
  const config = program.published;
  if (app.status !== 'approved' || program.status !== 'Published' || !config) throw new AppError('Enrollment or program is not currently active.', 409);
  const session = config.sessions.find(x => x.id === input.sessionId && x.active); const location = config.locations.find(x => x.id === input.locationId && x.active);
  if (!session || !location || (session.locationIds.length && !session.locationIds.includes(location.id))) throw new AppError('Choose a valid program location and serving session.', 422);
  const now = new Date(); const weekday = new Intl.DateTimeFormat('en-US', { timeZone: config.timezone, weekday: 'short' }).format(now); const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(weekday);
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  if (!session.days.includes(day) || clock < session.start || clock >= session.end) throw new AppError('This serving session is not open now.', 409);
  if ((config.startsAt && config.startsAt > now) || (config.endsAt && config.endsAt <= now)) throw new AppError('Program is outside its service dates.', 409);
  const period = config.limits.period === 'day' ? new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone }).format(now) : session.id;
  const recipientId = config.limits.unit === 'household' ? 'household' : input.recipientId;
  if (config.limits.unit !== 'household' && recipientId) {
    const member = app.household.members.find(m => m.id === recipientId);
    if (recipientId !== 'applicant' && !member) throw new AppError('Choose an enrolled household member.', 422);
    if (config.limits.unit === 'child' && (recipientId === 'applicant' || !member.isChild)) throw new AppError('This allowance applies to children only. Select an enrolled child.', 422);
  }
  const sessionKey = recipientId ? `${app._id}:${recipientId}:${period}` : null;
  const entitlement = sessionKey ? await ctx.db.collection('feedingEntitlements').findOne({ organizationId: ctx.organization._id, enrollmentId: app._id, periodKey: sessionKey }, sessionOptions) : null;
  if (config.limits.maxServings && (entitlement?.used || 0) >= config.limits.maxServings) throw new AppError('This enrollment has already used its allowance for this period.', 409);
  return { enrollmentId: app._id, participant: { name: app.applicant.name, householdSize: app.household.size, recipients: [{ id: 'applicant', name: app.applicant.name, isChild: false }, ...app.household.members.map(m => ({ id: m.id, name: m.name, isChild: m.isChild }))] }, unit: config.limits.unit, program: { id: program._id, name: config.name }, site: location.name, session: session.name, allowanceAvailable: !recipientId || !config.limits.maxServings || (entitlement?.used || 0) < config.limits.maxServings, sessionKey, credentialHash };
}

export async function enforceFeedingScanLimit(ctx) {
  const minute = Math.floor(Date.now() / 60000);
  const result = await ctx.db.collection('feedingScanLimits').findOneAndUpdate({ _id: `${ctx.organization._id}:${ctx.user.id}:${minute}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 120000) } }, { upsert: true, returnDocument: 'after' });
  if (result.count > 120) throw new AppError('Too many scan attempts. Pause briefly and try again.', 429);
}

export async function confirmFeedingRedemption(ctx, input) {
  const key = text(input.idempotencyKey || '', 80, 'confirmation key', true); if (!/^[a-f0-9-]{36}$/.test(key)) throw new AppError('Invalid confirmation key.');
  const requestHash = hash(JSON.stringify([input.programId, input.locationId, input.sessionId, input.recipientId || '', typeof input.credential === 'string' ? hash(input.credential) : '']));
  const existing = await ctx.db.collection('feedingRedemptions').findOne({ organizationId: ctx.organization._id, idempotencyKey: key });
  if (existing) { if (existing.payloadHash !== requestHash) throw new AppError('This confirmation key was reused for another redemption.', 409); return { redemptionId: existing._id, replayed: true }; }
  const checked = await checkFeedingCredential(ctx, input);
  const { client } = await database(); let redemption;
  try { await client.withSession(session => session.withTransaction(async () => {
    const duplicate = await ctx.db.collection('feedingRedemptions').findOne({ organizationId: ctx.organization._id, idempotencyKey: key }, { session });
    if (duplicate) { if (duplicate.payloadHash !== requestHash) throw new AppError('This confirmation key was reused for another redemption.', 409); redemption = duplicate; return; }
    const fresh = await checkFeedingCredential(ctx, input, { session });
    if (fresh.credentialHash !== checked.credentialHash) throw new AppError('Participant credential changed. Rescan.', 409);
    const program = await ctx.db.collection('feedingPrograms').findOne({ _id: checked.program.id, organizationId: ctx.organization._id }, { session });
    const limit = program?.published?.limits?.maxServings;
    if (!program?.published || program.status !== 'Published' || program.publishedRevision === null) throw new AppError('Program is not open for redemption.', 409);
    const entitlementUpdate = limit
      ? await ctx.db.collection('feedingEntitlements').updateOne({ organizationId: ctx.organization._id, enrollmentId: checked.enrollmentId, periodKey: checked.sessionKey, used: { $lt: limit } }, { $inc: { used: 1 }, $setOnInsert: { programId: checked.program.id, createdAt: new Date() }, $set: { updatedAt: new Date() } }, { upsert: true, session })
      : null;
    if (limit && !entitlementUpdate.modifiedCount && !entitlementUpdate.upsertedCount) throw new AppError('This enrollment has already used its allowance for this period.', 409);
    const activeProgram = await ctx.db.collection('feedingPrograms').updateOne({ _id: program._id, organizationId: ctx.organization._id, status: 'Published', publishedRevision: program.publishedRevision }, { $inc: { redemptionCount: 1 } }, { session });
    if (!activeProgram.modifiedCount) throw new AppError('Program settings changed or the program is paused. Rescan before confirming.', 409);
    const record = { _id: randomUUID(), organizationId: ctx.organization._id, programId: checked.program.id, enrollmentId: checked.enrollmentId, credentialHash: checked.credentialHash, locationId: input.locationId, sessionId: input.sessionId, sessionKey: checked.sessionKey, staffId: ctx.user.id, idempotencyKey: key, payloadHash: requestHash, createdAt: new Date() };
    await ctx.db.collection('feedingRedemptions').insertOne(record, { session });
    await audit(ctx, 'feeding.redemption.confirmed', record._id, session); redemption = record;
  })); } catch (error) {
    if (error.code === 11000) {
      const prior = await ctx.db.collection('feedingRedemptions').findOne({ organizationId: ctx.organization._id, idempotencyKey: key });
      if (prior) { if (prior.payloadHash !== requestHash) throw new AppError('This confirmation key was reused for another redemption.', 409); return { redemptionId: prior._id, replayed: true }; }
      throw new AppError('This enrollment has already used its allowance for the selected period.', 409);
    }
    throw error;
  }
  return { redemptionId: redemption._id, replayed: redemption.idempotencyKey === key };
}

export async function getFeedingReceipt(code, receipt) {
  const { db } = await database(); const program = await db.collection('feedingPrograms').findOne({ publicCode: code }, { projection: { _id: 1, name: 1 } });
  if (!program) throw new AppError('Application receipt not found.', 404);
  const app = await db.collection('feedingApplications').findOne({ programId: program._id, receiptHash: hash(receipt) }, { projection: { applicant: 1, household: 1, status: 1, createdAt: 1, updatedAt: 1, reviewHistory: 1 } });
  if (!app) throw new AppError('Application receipt not found.', 404);
  return { programName: program.name, status: app.status, applicant: app.applicant.name, householdSize: app.household.size, submittedAt: app.createdAt, updatedAt: app.updatedAt, participantMessage: app.participantMessage || '', history: app.reviewHistory.map(({ status, participantMessage, createdAt }) => ({ status, message: participantMessage || '', createdAt })) };
}
