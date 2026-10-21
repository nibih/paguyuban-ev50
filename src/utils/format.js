// The single source of truth for rupiah on the web panel.
//
// Everything that renders money goes through here rather than calling
// toLocaleString at the call site. Four screens used to carry their own copy of
// this line and a fifth inlined it unguarded, so a null `amount` from Firestore
// was enough to throw mid-render and blank the screen. Guarding here means a
// missing field degrades to Rp0 instead of taking the panel down.
export const rp = (n) => `Rp${(Number(n) || 0).toLocaleString('id-ID')}`;

// Signed variant for ledger rows: a true minus (U+2212) that lines up with the
// digits, rather than a hyphen that sits at x-height.
export const rpSigned = (n) => {
  const v = Number(n) || 0;
  if (v === 0) return rp(0);
  return v < 0 ? `−${rp(Math.abs(v))}` : rp(v);
};
