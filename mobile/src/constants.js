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
