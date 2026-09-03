import React, { useState, useMemo } from 'react';
import type { LedgerEntry } from '../../../types';
import { formatINR } from '../../../utils/format';
import {
  Search,
  Download,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import styles from '../styles/finance.module.css';

export interface LedgerRowWithBalance extends LedgerEntry {
  runningBalance: number;
}

interface LedgerTableProps {
  entriesWithBalance: LedgerRowWithBalance[];
  dateRangeLabel: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  entriesWithBalance,
  dateRangeLabel
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');

  // Extract unique categories from entries
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    entriesWithBalance.forEach(e => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).sort();
  }, [entriesWithBalance]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return entriesWithBalance.filter(row => {
      // 1. Search
      if (search) {
        const q = search.toLowerCase();
        const descMatch = row.description ? row.description.toLowerCase().includes(q) : false;
        const refMatch = row.referenceId ? row.referenceId.toLowerCase().includes(q) : false;
        const catMatch = row.category ? row.category.toLowerCase().includes(q) : false;
        if (!descMatch && !refMatch && !catMatch) return false;
      }

      // 2. Category filter
      if (categoryFilter !== 'all' && row.category !== categoryFilter) {
        return false;
      }

      // 3. Type filter
      if (typeFilter !== 'all' && row.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [entriesWithBalance, search, categoryFilter, typeFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      alert('No rows available to export.');
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Type', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)'];
    const csvLines = [headers.join(',')];

    filteredRows.forEach(row => {
      const formattedDate = `"${new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })} ${new Date(row.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}"`;

      const desc = `"${(row.description || 'Transaction').replace(/"/g, '""')}"`;
      const cat = `"${(row.category || 'General').replace(/"/g, '""')}"`;
      const type = row.type.toUpperCase();
      const debit = row.type === 'debit' ? row.amount : 0;
      const credit = row.type === 'credit' ? row.amount : 0;
      const balance = row.runningBalance;

      csvLines.push([formattedDate, desc, cat, type, debit, credit, balance].join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvLines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `vyapari-financial-ledger-${dateRangeLabel.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.tableCard}>
      {/* Table Toolbar */}
      <div className={styles.tableToolbar}>
        <div className={styles.tableFilters}>
          {/* Search */}
          <div className={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="Search description, ref #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <Search
              size={15}
              color="var(--color-muted-text)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className={styles.filterSelect}
          >
            <option value="all">All Types (Debit & Credit)</option>
            <option value="credit">Credits (Inflows)</option>
            <option value="debit">Debits (Outflows)</option>
          </select>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          className={styles.btnExport}
          title="Export filtered rows to CSV"
        >
          <Download size={14} />
          Export CSV ({filteredRows.length})
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {filteredRows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-muted-text)', fontSize: 13 }}>
            No ledger transactions match the active criteria.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Date & Time</th>
                <th>Description</th>
                <th style={{ width: 130 }}>Category</th>
                <th style={{ width: 90 }}>Type</th>
                <th style={{ width: 120, textAlign: 'right' }}>Debit (Dr)</th>
                <th style={{ width: 120, textAlign: 'right' }}>Credit (Cr)</th>
                <th style={{ width: 140, textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const isDebit = row.type === 'debit';
                const isNegativeBalance = row.runningBalance < 0;

                return (
                  <tr key={row.id} className={styles.tableRow}>
                    {/* Date */}
                    <td style={{ color: 'var(--color-muted-text)', fontSize: 12 }}>
                      {new Date(row.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}{' '}
                      <span style={{ fontSize: 11 }}>
                        {new Date(row.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </td>

                    {/* Description */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-dark)' }}>
                        {row.description || (isDebit ? 'Operating Expense' : 'Revenue Inflow')}
                      </div>
                      {row.referenceId && (
                        <div style={{ fontSize: 11, color: 'var(--color-muted-text)', marginTop: 2 }}>
                          Ref: #{row.referenceId.substring(0, 10)}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      <span className={`${styles.badge} ${styles.badgeCategory}`}>
                        {row.category || (isDebit ? 'Expense' : 'Sales')}
                      </span>
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`${styles.badge} ${isDebit ? styles.badgeDebit : styles.badgeCredit}`}>
                        {isDebit ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {isDebit ? 'Debit' : 'Credit'}
                      </span>
                    </td>

                    {/* Debit */}
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {isDebit ? (
                        <span className={styles.amountDebit}>{formatINR(row.amount)}</span>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)' }}>—</span>
                      )}
                    </td>

                    {/* Credit */}
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {!isDebit ? (
                        <span className={styles.amountCredit}>{formatINR(row.amount)}</span>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)' }}>—</span>
                      )}
                    </td>

                    {/* Running Balance */}
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      <span
                        className={`${styles.balanceCell} ${isNegativeBalance ? styles.balanceNegative : ''}`}
                        title={isNegativeBalance ? 'Warning: Negative running cash position' : 'Cumulative running balance'}
                      >
                        {formatINR(row.runningBalance)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
