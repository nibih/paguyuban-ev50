// Browser-side parsers for the two workbooks the paguyuban actually receives:
// a roster of drivers, and the official "Kartu Pengawasan Perbaikan".
//
// These mirror mobile/src/data/importRepairCards.mjs. The ids are derived the
// same way (NIK + row number), so running either importer is idempotent and the
// two paths converge on the same documents instead of creating duplicates.
//
// Parsing is deliberately strict about what it cannot understand. A row with a
// missing NIK, a date it cannot read, or a name that matches nobody on the
// roster is reported to the operator rather than guessed at — a repair card
// filed against the wrong driver is worse than one not filed at all.

export const clean = (v) =>
  (v === undefined || v === null ? '' : String(v).replace(/\s+/g, ' ').trim());

const digits = (v) => clean(v).replace(/[^\d]/g, '');

/* ------------------------------ shared dates ------------------------------ */

// Card dates come out of Excel as m/d/yy; the app stores dd/mm/yyyy. One card
// holds the malformed "03/062026" — parsed, because the intent is unambiguous,
// but the caller still reports it.
export const toAppDate = (raw) => {
  const s = clean(raw);
  if (!s) return '';

  const broken = s.match(/^(\d{1,2})\/(\d{2})(\d{4})$/);
  if (broken) {
    const [, a, b, y] = broken;
    return `${b}/${a}/${y}`;
  }

  const parts = s.split(/[/-]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return '';

  const [a, b, c] = parts.map(Number);
  if (!a || !b || !c) return '';

  const year = c < 100 ? 2000 + c : c;
  const month = a;
  const day = b;
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

/* ------------------------------ repair cards ------------------------------ */

// "250-267" inside the damage text, or 250233 in the card's BODY column, is a
// unit reference. Anything else stays empty rather than inventing a body.
export const toBody = (cardBody, desc) => {
  const inline = String(desc || '').match(/\b250\s*-\s*(\d{3})\b/);
  if (inline) return `Body ${inline[1]}`;

  const own = String(cardBody || '').match(/^250(\d{3})$/);
  if (own) return `Body ${own[1]}`;
  return '';
};

export const toPrice = (raw) => {
  const d = digits(raw);
  return d ? Number(d) : 0;
};

// NIKs typed one digit wrong on the card. Each was checked against the name and
// the roster; none is a guess about which person is meant.
export const NIK_FIX = {
  '170000778': '17000778',
  '170011011': '17001101',
  '831111896': '831111895'
};

// Cards with no NIK at all, matched on the name printed on them.
export const NAME_FIX = {
  LUTFI: '17002176',
  NICOLAS: '17002197',
  'M FAIZAL A': '17001552',
  NUROHIM: '820811526'
};

const normName = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

export const resolveCardMember = (card, users) => {
  const byNik = new Map(users.map((u) => [String(u.nik), u]));
  const direct = byNik.get(clean(card.nik));
  if (direct) return { user: direct, via: 'nik' };

  const fixed = NIK_FIX[clean(card.nik)];
  if (fixed && byNik.get(fixed)) return { user: byNik.get(fixed), via: 'nik-fix' };

  const alias = NAME_FIX[clean(card.sheet).toUpperCase()] || NAME_FIX[clean(card.name).toUpperCase()];
  if (alias && byNik.get(alias)) return { user: byNik.get(alias), via: 'name-fix' };

  const target = normName(card.name);
  const exact = target ? users.find((u) => normName(u.name) === target) : null;
  if (exact) return { user: exact, via: 'name' };

  return { user: null, via: null };
};

// One workbook → many sheets, each a raw cell matrix. `xlsx` is loaded on
// demand so the panel's first paint does not carry a 400 KB parser.
export const readWorkbook = async (file) => {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: true
    })
  }));
};

/**
 * Turn workbook sheets into incident documents.
 *
 * @returns {{
 *   docs: Array<object>,
 *   unresolved: Array<{ sheet: string, nik: string, name: string, rows: number }>,
 *   skipped: Array<{ sheet: string, row: string, reason: string, desc: string }>,
 *   stats: { cards: number, rows: number, members: number, partPrice: number }
 * }}
 */
export const parseRepairCards = (sheets, users) => {
  const cards = [];

  for (const sheet of sheets) {
    const rows = sheet.rows;

    const field = (label) => {
      for (let i = 0; i < rows.length; i++) {
        const a = clean(rows[i]?.[0]).toUpperCase();
        if (a === label || a.startsWith(`${label} `) || a.startsWith(`${label}:`)) {
          for (let c = 1; c < (rows[i] || []).length; c++) {
            const v = clean(rows[i][c]);
            if (v && !/^[;:.,\-–—]+$/.test(v)) return v;
          }
        }
      }
      return '';
    };

    let header = -1;
    for (let i = 0; i < rows.length; i++) {
      const t = (rows[i] || []).map(clean).join('|').toUpperCase();
      if (t.includes('TANGGAL') && t.includes('URAIAN')) {
        header = i;
        break;
      }
    }
    if (header < 0) continue;

    const repairs = [];
    for (let i = header + 1; i < rows.length; i++) {
      const no = clean(rows[i]?.[0]);
      const date = clean(rows[i]?.[1]);
      const desc = clean(rows[i]?.[2]);
      if (!/^\d+$/.test(no) || (!date && !desc)) continue;
      repairs.push({
        no,
        date,
        desc,
        kind: clean(rows[i]?.[4]),
        part: clean(rows[i]?.[5]),
        partPrice: clean(rows[i]?.[6]),
        cardNote: clean(rows[i]?.[7])
      });
    }

    cards.push({
      sheet: clean(sheet.name),
      name: field('NAMA'),
      nik: field('NIK'),
      body: field('BODY'),
      repairs
    });
  }

  const docs = [];
  const unresolved = [];
  const skipped = [];

  for (const card of cards) {
    const { user } = resolveCardMember(card, users);
    if (!user) {
      unresolved.push({ sheet: card.sheet, nik: card.nik, name: card.name, rows: card.repairs.length });
      continue;
    }

    for (const r of card.repairs) {
      const date = toAppDate(r.date);
      if (!date) {
        skipped.push({ sheet: card.sheet, row: r.no, reason: `tanggal tidak terbaca "${r.date}"`, desc: r.desc });
        continue;
      }

      docs.push({
        id: `INC-KRT-${user.nik}-${String(r.no).padStart(2, '0')}`,
        nik: user.nik,
        driver: user.name,
        body: toBody(card.body, r.desc),
        damage: r.desc || 'Perbaikan (kartu)',
        location: '',
        date,
        status: 'Selesai',
        mechanic: '',
        suketStatus: '',
        needMechanic: false,
        notes: '',
        source: 'kartu-perbaikan',
        kind: r.kind,
        part: r.part,
        partPrice: toPrice(r.partPrice),
        cardNote: r.cardNote
      });
    }
  }

  return {
    docs,
    unresolved,
    skipped,
    stats: {
      cards: cards.length,
      rows: cards.reduce((s, c) => s + c.repairs.length, 0),
      members: new Set(docs.map((d) => d.nik)).size,
      partPrice: docs.reduce((s, d) => s + d.partPrice, 0)
    }
  };
};

/* -------------------------------- roster --------------------------------- */

// Split a pasted line. Drivers are usually copied out of WhatsApp or a
// spreadsheet, so tabs, semicolons and pipes all show up as separators.
const splitLine = (line) =>
  String(line)
    .split(/\t|;|\||,/)
    .map((p) => clean(p).replace(/^'+/, ''));

/**
 * Parse pasted rows: one driver per line, `NIK, Nama, Jabatan`.
 * @returns {Array<{ nik: string, name: string, position: string }>}
 */
export const parseRosterText = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nik, name, position] = splitLine(line);
      return { nik: digits(nik), name: name || '', position: position || '' };
    });

/**
 * Parse a spreadsheet of drivers. Looks for a header row containing NIK and
 * NAMA/NAME in the first fifteen rows; if there is none, falls back to the
 * first three columns as NIK, Nama, Jabatan.
 *
 * @returns {{ rows: Array<{nik: string, name: string, position: string}>, header: boolean }}
 */
export const parseRosterSheet = (sheetRows) => {
  const rows = sheetRows || [];
  let headerIndex = -1;
  let nikCol = 0;
  let nameCol = 1;
  let posCol = 2;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = (rows[i] || []).map((c) => clean(c).toUpperCase());
    const nik = cells.findIndex((c) => c === 'NIK' || c === 'NO. INDUK' || c === 'NO INDUK');
    const name = cells.findIndex((c) => c === 'NAMA' || c === 'NAMA LENGKAP' || c === 'NAME');
    if (nik >= 0 && name >= 0) {
      headerIndex = i;
      nikCol = nik;
      nameCol = name;
      posCol = cells.findIndex((c) =>
        ['JABATAN', 'POSISI', 'POSITION', 'JALUR', 'KETERANGAN'].includes(c)
      );
      break;
    }
  }

  const start = headerIndex >= 0 ? headerIndex + 1 : 0;
  const out = [];

  for (let i = start; i < rows.length; i++) {
    const cells = rows[i] || [];
    const nik = digits(cells[nikCol]);
    const name = clean(cells[nameCol]);
    const position = posCol >= 0 ? clean(cells[posCol]) : '';
    if (!nik && !name) continue;
    out.push({ nik, name, position });
  }

  return { rows: out, header: headerIndex >= 0 };
};
