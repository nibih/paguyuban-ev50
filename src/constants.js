// Business constants, defined once.
//
// MONTHS used to be redeclared identically in three screens per surface, and the
// monthly fee was hardcoded at nine call sites — so extending the collection
// period meant remembering every copy, and a single miss showed members wrong
// money. Both surfaces now read them from here.
//
// This is a fixed May–September collection period, not "the current month": the
// paguyuban is collecting for a defined window, which is why screens show
// September as the final month regardless of today's date.
export const IURAN_FEE = 100000;
export const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

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
