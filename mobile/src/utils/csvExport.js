import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * CSV export for the monthly DAMRI reporting meeting.
 *
 * Written by hand rather than pulled in as a spreadsheet dependency: the
 * output only needs to survive a round-trip through Excel, and Excel is
 * notoriously aggressive about mangling UTF-8 unless the file carries a BOM.
 * Every value is therefore quoted and escaped, and the file is written with
 * an explicit BOM so Indonesian characters (é in "Cawang", rupiah labels)
 * render correctly instead of as mojibake.
 */

const BOM = '\uFEFF';

/** Escape a single CSV field per RFC 4180. */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes when the value contains a delimiter, quote, newline or
  // leading/trailing space — the space case matters because Excel would
  // otherwise silently trim it.
  if (/[",\n\r]/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV document from a header list and rows.
 *
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 * @returns {string}
 */
export function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  // Trailing newline: some parsers treat the last line as incomplete without it.
  return BOM + lines.join('\r\n') + '\r\n';
}

/** Format a number as an unquoted rupiah integer so Excel sums it as a number. */
const rupiah = (n) => (Number(n) || 0);

/**
 * Render the iuran matrix: one row per driver, one column per month.
 *
 * @param {Array<{nik:string,name:string}>} users
 * @param {Record<string, Record<string, {status?:string, nominal?:number}>>} iuranRecords
 * @param {string[]} months
 */
export function iuranCsv(users, iuranRecords, months) {
  const headers = ['NIK', 'Nama Pramudi', ...months, 'Jumlah Lunas', 'Total Setoran'];
  const rows = users.map(u => {
    const rec = iuranRecords[u.nik] || {};
    let lunas = 0;
    let total = 0;
    const cells = months.map(m => {
      const d = rec[m];
      if (d?.status === 'lunas') {
        lunas += 1;
        total += rupiah(d.nominal);
        return 'LUNAS';
      }
      if (d?.status === 'partial') return `SEBAGIAN Rp${rupiah(d.nominal)}`;
      return 'BELUM';
    });
    return [u.nik, u.name, ...cells, lunas, rupiah(total)];
  });
  return buildCsv(headers, rows);
}

/**
 * Render the cash-out ledger.
 *
 * @param {Array<Object>} expenses
 */
export function expenseCsv(expenses) {
  const headers = ['ID', 'Tanggal', 'Kategori', 'Uraian', 'Nominal', 'PIC', 'Sumber Kas', 'Keterangan'];
  const rows = expenses.map(e => [
    e.id, e.date, e.category, e.title, rupiah(e.amount), e.pic, e.source, e.body
  ]);
  return buildCsv(headers, rows);
}

/**
 * Render the receivables book.
 *
 * @param {Array<Object>} debts
 */
export function debtCsv(debts) {
  const headers = ['ID', 'NIK', 'Nama', 'Kasus', 'Mulai', 'Tenor', 'Nilai Pokok', 'Sudah Dibayar', 'Sisa', 'Status'];
  const rows = debts.map(d => {
    const sisa = rupiah(d.amount) - rupiah(d.paid);
    return [
      d.id, d.nik, d.name, d.incident, d.startDate, d.tenor,
      rupiah(d.amount), rupiah(d.paid), sisa,
      sisa <= 0 ? 'LUNAS' : (d.status || 'BELUM')
    ];
  });
  return buildCsv(headers, rows);
}

/**
 * Render the fleet body-shop logbook.
 *
 * @param {Array<Object>} incidents
 */
export function incidentCsv(incidents) {
  const headers = ['ID', 'Tanggal', 'Body', 'Nama Pramudi', 'NIK', 'Lokasi', 'Kerusakan', 'Suket', 'Status', 'Mekanik', 'Jumlah Foto'];
  const rows = incidents.map(i => [
    i.id, i.date, i.body, i.driver, i.nik, i.location, i.damage,
    i.suketStatus, i.status, i.mechanic,
    Array.isArray(i.photos) ? i.photos.length : 0
  ]);
  return buildCsv(headers, rows);
}

/**
 * Write the CSV to a temp file and open the OS share sheet.
 *
 * Refuses cleanly when sharing is unavailable (some Android builds ship
 * without a share target) rather than failing silently with a white screen.
 *
 * @param {string} csv
 * @param {string} filename
 * @returns {Promise<boolean>} whether the share sheet was presented
 */
export async function exportCsv(csv, filename) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Perangkat ini tidak mendukung berbagi berkas. Coba dari perangkat lain.');
  }

  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_');
  const uri = FileSystem.cacheDirectory + safeName;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: safeName,
    UTI: 'public.comma-separated-values-text'
  });
  return true;
}
