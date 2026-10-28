// Business constants, defined once.
//
// MONTHS used to be redeclared identically in three screens per surface, and the
// monthly fee was hardcoded at nine call sites — so extending the collection
// period meant remembering every copy, and a single miss showed members wrong
// money. Both surfaces now read them from here.
export const IURAN_FEE = 100000;

// The collection period, in order, and the month being collected right now.
//
// Starts at September on the pengurus' instruction: the book before that is
// incomplete (only 8 of 128 drivers ever paid every month, and the expense
// side only starts in September), so showing it invited arguments about
// numbers nobody can verify. The rows still exist in Firestore and the rules
// still accept Mei–Agustus keys, so this is reversible and an older phone in
// the field keeps working.
//
// One list drives the matrix columns, the CSV headers, the member picker and
// the dashboard's month rows, so a new month is one edit here.
//
// Keys are the Indonesian month names the paper book and the BSI statement
// use, not YYYY-MM. The installed Android build predates OTA updates and
// cannot be replaced remotely: changing the key shape would make every phone
// in the field write months the rules reject, so the year-month migration is a
// forced-rollout job, not a code change.
export const MONTHS = ['September', 'Oktober', 'November', 'Desember'];
export const LAST_MONTH = MONTHS[MONTHS.length - 1];

// Month name -> '09'..'12'. Written out, not derived from the array index:
// the derived version assumed index 0 was Mei, so prepending or removing a
// month silently moved every expense into the wrong row.
export const MONTH_NO = { September: '09', Oktober: '10', November: '11', Desember: '12' };

// The month the depot is collecting for: the calendar month while it is inside
// the period, otherwise the last month the list knows. Derived from the clock
// so nobody edits a screen when the month turns over — which is exactly how
// October ended up uncollectable while the period was hardcoded to September.
//
// shortcut: after December the list has no January, so the app keeps treating
// December as current and the rules refuse a Januari key. Upgrade path is the
// YYYY-MM key migration above, gated on the APK rollout.
export const COLLECTION_MONTH = MONTHS.find(
  (m) => MONTH_NO[m] === String(new Date().getMonth() + 1).padStart(2, '0')
) || LAST_MONTH;

// The months one driver actually owes: from the month they joined until the
// month being collected.
//
// New drivers arrive in batches, sometimes on the 25th of a month, and a
// straight count of every month in the book made them look months behind on
// day one. `createdAt` (dd/mm/yyyy, written when the account is created) is
// the only join date the roster has; entries imported from the paper book have
// none, and the book now starts at September.
//
// shortcut: only the month name is read, not the year, so a createdAt after
// the period (e.g. Januari 2027) matches nothing and owes nothing — correct —
// but the same name in a later year would match this year's month. Upgrade
// path is the YYYY-MM migration, together with the January cliff above.
export const dueMonths = (user) => {
  const mm = String(user?.createdAt || '').split('/')[1];
  const start = mm ? MONTHS.findIndex((m) => MONTH_NO[m] === mm) : 0;
  if (start === -1) return [];
  return MONTHS.slice(start, MONTHS.indexOf(COLLECTION_MONTH) + 1);
};

// Which vault a rupiah actually lands in.
//
// The payment forms store the method as free text, so this has to be an exact
// lookup. It used to be `method.includes('Tunai')`, which sent every cash
// method the depot actually uses ("Cash ke Kasir Depo", "Cash ke Admin") into
// the BSI balance, and invented bank cash for "Potong Gaji" — money that
// entered neither account. A method absent from this map moves no vault at
// all, which is the honest answer for a salary deduction and forces a new
// method to be added here deliberately instead of silently picking a vault.
export const VAULT_FOR_METHOD = {
  'Tunai Kasir': 'bsiBalance',
  'Cash ke Kasir Depo': 'bsiBalance',
  'Cash ke Admin': 'bsiBalance',
  'Transfer BSI': 'bsiBalance',
  'Transfer Bank BSI': 'bsiBalance',
  'Potong Gaji': null
};

// Emergency contact routes, in the order the dispatcher wants them.
//
// Contacts carry a route KEY, never a free-text label: a hand-typed
// "Pulo Gadung" would eventually become "PuloGadung" and split one depot
// into two groups on the driver's phone. The admin editor offers these as a
// select, so a key cannot be mistyped through the UI either.
//
// Any key not listed here still renders — both surfaces collect unknown keys
// into a trailing "Rute lainnya" group rather than dropping the contact, so a
// route added here but not here can be delayed, never silently lost.
export const EMERGENCY_ROUTES = [
  { key: 'senen-balkot', label: 'Senen - Blok Kota' },
  { key: 'ragunan-paskela-bulus', label: 'Ragunan - Paskela - Lebak Bulus' },
  { key: 'ramutan-tmii-pgc-melayu', label: 'Kp. Rambutan - TMII - PGC - Kp. Melayu' },
  { key: 'pulogadung-jief-transera-pulogebang', label: 'Pulo Gadung - JIEF - Transera - Pulogebang' },
  { key: 'moi-priok-jis', label: 'MOI - Tanjung Priok - JIS' },
  { key: 'mobile', label: 'Mobile' }
];
