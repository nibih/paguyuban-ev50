// Rupiah formatting, shared by every mobile screen.
//
// Screens used to inline `Rp${x.toLocaleString('id-ID')}` at 55 call sites with
// no guard. AppContext replaces the seeded vault wholesale on the first
// Firestore snapshot (`setVault(snap.data())`), so a doc missing `bsiBalance`
// threw a TypeError and white-screened MemberDashboard. Formatting once, here,
// makes a missing field render Rp0 instead of crashing the app.
export const rp = (n) => `Rp${(Number(n) || 0).toLocaleString('id-ID')}`;

// ---- phone numbers ------------------------------------------------------
//
// Emergency contacts are stored in the international digit form
// (6281319206080) because one stored value has to build two links that
// disagree about formatting:
//
//   tel:+6281319206080            the dialer wants the +
//   https://wa.me/6281319206080   WhatsApp refuses the + and a leading 0
//
// Normalising on the way in is what keeps those two from drifting apart.
//
// Returns '' when the input cannot be a complete Indonesian mobile number.
// The 12-digit floor (62 + 10) is deliberate, and it is why this helper
// exists at all: a truncated number looks exactly like a real one until the
// moment you need it, which is the worst possible place to find out. The
// first batch of contacts handed over contained precisely one — and an entry
// with no number is honest where a short one is a trap. Callers therefore
// keep the contact with a blank number and badge it, rather than saving
// something that will fail to dial.
//
// Idempotent: feeding an already-normalised value back through it returns it
// unchanged, so link builders can call it defensively on stored data.
export const normalizePhone = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  let n = digits;
  if (n.startsWith('0')) n = `62${n.slice(1)}`;
  else if (n.startsWith('8')) n = `62${n}`;
  if (!n.startsWith('62')) return '';
  if (n.length < 12 || n.length > 15) return '';
  return n;
};

// Display form: +62 813 1920-6080 rather than a wall of digits.
export const prettyPhone = (raw) => {
  const n = normalizePhone(raw);
  if (!n) return '';
  const local = n.slice(2);
  const head = local.slice(0, 3);
  const tail = (local.slice(3).match(/.{1,4}/g) || []).join('-');
  return `+62 ${head}${tail ? ` ${tail}` : ''}`;
};

// Both return '' for an unusable number so a caller can gate the whole
// action on truthiness instead of re-implementing the validation.
export const telHref = (raw) => {
  const n = normalizePhone(raw);
  return n ? `tel:+${n}` : '';
};

export const waHref = (raw) => {
  const n = normalizePhone(raw);
  return n ? `https://wa.me/${n}` : '';
};
