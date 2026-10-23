// Business constants, defined once.
//
// MONTHS used to be redeclared identically in three screens, and the monthly fee
// was hardcoded at nine call sites — so extending the collection period meant
// remembering every copy, and a single miss showed members wrong money.
// Everything now reads them from here.
//
// This is a fixed May–September collection period, not "the current month": the
// paguyuban is collecting for a defined window, which is why MemberDashboard
// shows September as the final month regardless of today's date.
export const IURAN_FEE = 100000;
export const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

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
