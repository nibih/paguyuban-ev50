import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-react-native';
import { iuranCsv, expenseCsv, debtCsv, incidentCsv, exportCsv } from '../../utils/csvExport';
import { rp } from '../../utils/format';
import { MONTHS } from '../../constants';

// Expense records carry ISO dates (2026-09-01); the iuran book is keyed by
// month name. Map one to the other so a per-month row can line them up.
const MONTH_NO = { Mei: '05', Juni: '06', Juli: '07', Agustus: '08', September: '09' };

// A1: the money in and the money out. Read-only — the other tabs do the
// writing.
//
// This screen used to lead with the vault: total aset, kas kecil, rekening
// BSI, piutang, bank account, an operational summary. That was four different
// ways of describing the same balance, and none of them answered the question
// a cashier actually opens the app with — did we take in more than we spent?
//
// The vault balance is deliberately NOT shown here. It is a stored figure that
// the seeded history never fed, so presenting it beside the income totals
// invites a comparison that cannot be reconciled from this data. The iuran
// tab carries that reconciliation, with its gaps stated.
export default function AdminKas() {
  const { expenses, debts, users, incidents, iuranRecords } = useApp();
  const [exporting, setExporting] = useState(null);

  // Pemasukan: every iuran marked lunas, whichever route it arrived by.
  // Pending claims are excluded — they are not money yet.
  const finance = useMemo(() => {
    const perMonth = {};
    MONTHS.forEach(m => { perMonth[m] = { in: 0, out: 0 }; });

    let income = 0;
    let pending = 0;

    users.forEach(u => {
      const rec = iuranRecords[u.nik] || {};
      MONTHS.forEach(m => {
        const d = rec[m];
        if (!d) return;
        const nominal = Number(d.nominal) || 0;
        if (d.status === 'lunas') {
          income += nominal;
          perMonth[m].in += nominal;
        } else if (d.status === 'pending') {
          pending += nominal;
        }
      });
    });

    let expense = 0;
    expenses.forEach(e => {
      const amt = e.amount || 0;
      expense += amt;
      const no = String(e.date || '').slice(5, 7);
      const m = MONTHS.find(k => MONTH_NO[k] === no);
      if (m) perMonth[m].out += amt;
    });

    return { perMonth, income, expense, pending };
  }, [users, iuranRecords, expenses]);

  const net = finance.income - finance.expense;

  const stamp = new Date().toISOString().slice(0, 10);

  const doExport = async (kind) => {
    setExporting(kind);
    try {
      let csv;
      let name;
      switch (kind) {
        case 'iuran':
          csv = iuranCsv(users, iuranRecords, MONTHS);
          name = `iuran-paguyuban-${stamp}.csv`;
          break;
        case 'expenses':
          csv = expenseCsv(expenses);
          name = `pengeluaran-${stamp}.csv`;
          break;
        case 'debts':
          csv = debtCsv(debts);
          name = `piutang-talangan-${stamp}.csv`;
          break;
        case 'incidents':
          csv = incidentCsv(incidents);
          name = `logbook-armada-${stamp}.csv`;
          break;
        default:
          return;
      }
      await exportCsv(csv, name);
    } catch (e) {
      // A cancelled share sheet rejects on some platforms — that's not an
      // error worth alarming the cashier over.
      if (!/cancel/i.test(e?.message || '')) {
        Alert.alert('Export gagal', e?.message || 'Coba lagi.');
      }
    } finally {
      setExporting(null);
    }
  };

  const EXPORTS = [
    { key: 'iuran', label: 'Matriks Iuran', sub: `${users.length} pramudi × ${MONTHS.length} bulan` },
    { key: 'expenses', label: 'Buku Pengeluaran', sub: `${expenses.length} transaksi` },
    { key: 'debts', label: 'Buku Piutang', sub: `${debts.length} kartu talangan` },
    { key: 'incidents', label: 'Logbook Armada', sub: `${incidents.length} laporan bodi` }
  ];

  return (
    <View>
      {/* Two figures, side by side */}
      <View style={styles.pair}>
        <View style={[styles.figure, styles.figureIn]}>
          <View style={styles.figureHead}>
            <TrendingUp size={13} color="#059669" />
            <Text style={[styles.figureLabel, { color: '#059669' }]}>PEMASUKAN</Text>
          </View>
          <Text style={[styles.figureVal, { color: '#047857' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {rp(finance.income)}
          </Text>
          <Text style={styles.figureSub}>iuran masuk</Text>
        </View>

        <View style={[styles.figure, styles.figureOut]}>
          <View style={styles.figureHead}>
            <TrendingDown size={13} color="#E11D48" />
            <Text style={[styles.figureLabel, { color: '#E11D48' }]}>PENGELUARAN</Text>
          </View>
          <Text style={[styles.figureVal, { color: '#B91C1C' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {rp(finance.expense)}
          </Text>
          <Text style={styles.figureSub}>{expenses.length} transaksi</Text>
        </View>
      </View>

      {/* Net */}
      <View style={[styles.netBox, net < 0 && styles.netBoxNeg]}>
        <Text style={styles.netLabel}>SELISIH (MASUK − KELUAR)</Text>
        <Text style={[styles.netVal, { color: net < 0 ? '#B91C1C' : '#047857' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {net < 0 ? '−' : '+'}{rp(Math.abs(net))}
        </Text>
      </View>

      {finance.pending > 0 && (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingText}>
            {rp(finance.pending)} masih menunggu verifikasi dan belum dihitung
            sebagai pemasukan.
          </Text>
        </View>
      )}

      {/* Per-month */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PER BULAN</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 1 }]}>Bulan</Text>
          <Text style={[styles.th, { textAlign: 'right' }]}>Masuk</Text>
          <Text style={[styles.th, { textAlign: 'right' }]}>Keluar</Text>
        </View>
        {MONTHS.map(m => {
          const r = finance.perMonth[m];
          return (
            <View key={m} style={styles.tr}>
              <Text style={[styles.td, { flex: 1, fontWeight: 'bold' }]}>{m}</Text>
              <Text style={[styles.td, { textAlign: 'right', color: '#047857' }]}>
                {rp(r.in)}
              </Text>
              <Text style={[styles.td, { textAlign: 'right', color: '#B91C1C' }]}>
                {rp(r.out)}
              </Text>
            </View>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={[styles.td, { flex: 1, fontWeight: '900' }]}>Total</Text>
          <Text style={[styles.td, { textAlign: 'right', fontWeight: '900', color: '#047857' }]}>
            {rp(finance.income)}
          </Text>
          <Text style={[styles.td, { textAlign: 'right', fontWeight: '900', color: '#B91C1C' }]}>
            {rp(finance.expense)}
          </Text>
        </View>

        <Text style={styles.tableNote}>
          Pengeluaran baru tercatat mulai September, jadi bulan sebelumnya memang kosong.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>EXPORT LAPORAN CSV (RAPAT BULANAN DAMRI)</Text>
        <Text style={styles.exportHint}>
          Berkas .csv langsung bisa dibuka di Excel ataupun dibagikan ke grup WhatsApp depo.
        </Text>
        {EXPORTS.map(x => {
          const busy = exporting === x.key;
          return (
            <TouchableOpacity
              key={x.key}
              style={styles.exportRow}
              onPress={() => doExport(x.key)}
              disabled={!!exporting}
              activeOpacity={0.8}
            >
              <View style={styles.exportIcon}>
                {busy
                  ? <ActivityIndicator size="small" color="#0B2F64" />
                  : <FileSpreadsheet size={15} color="#0B2F64" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportLabel}>{x.label}</Text>
                <Text style={styles.exportSub}>{x.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  figure: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1
  },
  figureIn: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  figureOut: { borderColor: '#FECDD3', backgroundColor: '#FFF1F2' },
  figureHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  figureLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  figureVal: { fontSize: 16, fontWeight: '900', marginTop: 6, fontVariant: ['tabular-nums'] },
  figureSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  netBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    alignItems: 'center'
  },
  netBoxNeg: { borderColor: '#FECDD3', backgroundColor: '#FFF8F8' },
  netLabel: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 0.6 },
  netVal: { fontSize: 22, fontWeight: '900', marginTop: 4, fontVariant: ['tabular-nums'] },

  pendingBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 11,
    marginBottom: 12
  },
  pendingText: { fontSize: 10, color: '#92400E', lineHeight: 15 },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardTitle: { fontSize: 10, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8, marginBottom: 10 },

  tableHead: {
    flexDirection: 'row',
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  th: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.4 },
  tr: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  td: { fontSize: 11, color: '#475569', fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    paddingTop: 9,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  tableNote: { fontSize: 9, color: '#64748B', marginTop: 10, lineHeight: 13 },

  exportHint: { fontSize: 10, color: '#94A3B8', marginBottom: 10, lineHeight: 15 },
  exportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 11, marginBottom: 8
  },
  exportIcon: {
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center'
  },
  exportLabel: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  exportSub: { fontSize: 10, color: '#94A3B8', marginTop: 1 }
});
