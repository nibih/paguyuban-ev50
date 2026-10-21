// Rupiah formatting, shared by every mobile screen.
//
// Screens used to inline `Rp${x.toLocaleString('id-ID')}` at 55 call sites with
// no guard. AppContext replaces the seeded vault wholesale on the first
// Firestore snapshot (`setVault(snap.data())`), so a doc missing `pettyCash`
// threw a TypeError and white-screened MemberDashboard. Formatting once, here,
// makes a missing field render Rp0 instead of crashing the app.
export const rp = (n) => `Rp${(Number(n) || 0).toLocaleString('id-ID')}`;
