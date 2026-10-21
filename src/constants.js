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
