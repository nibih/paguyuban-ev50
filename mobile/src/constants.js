// Business constants, defined once.
//
// MONTHS used to be redeclared identically in three screens, and the monthly fee
// was hardcoded at nine call sites — so extending the collection period meant
// remembering every copy, and a single miss showed members wrong money.
// Everything now reads them from here.
export const IURAN_FEE = 100000;

// The collection period, in order, and the month being collected right now —
// see the web copy of these constants for why the keys are month names rather
// than YYYY-MM, and for the January cliff.
export const MONTHS = ['September', 'Oktober', 'November', 'Desember'];
export const LAST_MONTH = MONTHS[MONTHS.length - 1];

// Month name -> '09'..'12' — see the web copy for why this is written out
// instead of derived from the array index.
export const MONTH_NO = { September: '09', Oktober: '10', November: '11', Desember: '12' };

// The month the depot is collecting for: the calendar month while it is inside
// the period, otherwise the last month the list knows.
export const COLLECTION_MONTH = MONTHS.find(
  (m) => MONTH_NO[m] === String(new Date().getMonth() + 1).padStart(2, '0')
) || LAST_MONTH;


// The months one driver actually owes — see the web copy of `dueMonths` for
// why a driver who joined this month must not read as six months behind.
export const dueMonths = (user) => {
  const mm = String(user?.createdAt || '').split('/')[1];
  const start = mm ? MONTHS.findIndex((m) => MONTH_NO[m] === mm) : 0;
  if (start === -1) return [];
  return MONTHS.slice(start, MONTHS.indexOf(COLLECTION_MONTH) + 1);
};

// Which vault a rupiah actually lands in — see the web copy of this constant
// for why the lookup is exact rather than a substring match. Mobile and web
// are separate bundles, so the table is defined once per surface; both must
// list the same methods or the two apps disagree about where money went.
export const VAULT_FOR_METHOD = {
  'Tunai Kasir': 'bsiBalance',
  'Cash ke Kasir Depo': 'bsiBalance',
  'Cash ke Admin': 'bsiBalance',
  'Transfer BSI': 'bsiBalance',
  'Transfer Bank BSI': 'bsiBalance',
  'Potong Gaji': null
};

// The hazard board belongs to ANOTHER TEAM. The paguyuban has no control over
// this form, cannot add a trigger to it, and cannot read what gets submitted —
// so there is nothing here to integrate with. It is a handoff link, nothing
// more, and the app keeps no record of what is reported.
//
// Opened in the device's EXTERNAL browser on purpose: Google returns 401 to
// non-browser clients, so an in-app WebView would most likely be refused.
export const HAZARD_FORM_URL = 'https://forms.gle/K8vdy8G3xdPuLmZp6';

// Emergency contact routes, in the order the dispatcher wants them.
//
// Contacts carry a route KEY, never a free-text label: a hand-typed
// "Pulo Gadung" would eventually become "PuloGadung" and split one depot
// into two groups on the driver's phone. The admin editor offers these as a
// select, so a key cannot be mistyped through the UI either.
//
// Any key not listed here still renders — unknown keys are collected into a
// trailing "Rute lainnya" group rather than dropped, so a contact can be
// delayed by a stale build, never silently lost.
export const EMERGENCY_ROUTES = [
  { key: 'senen-balkot', label: 'Senen - Blok Kota' },
  { key: 'ragunan-paskela-bulus', label: 'Ragunan - Paskela - Lebak Bulus' },
  { key: 'ramutan-tmii-pgc-melayu', label: 'Kp. Rambutan - TMII - PGC - Kp. Melayu' },
  { key: 'pulogadung-jief-transera-pulogebang', label: 'Pulo Gadung - JIEF - Transera - Pulogebang' },
  { key: 'moi-priok-jis', label: 'MOI - Tanjung Priok - JIS' },
  { key: 'mobile', label: 'Mobile' }
];
