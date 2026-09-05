import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../services/store';
import type { AnalyticsFilterState } from './types';
import { calculateDateRanges } from './utils/analyticsHelpers';
import { AnalyticsFilterBar } from './components/AnalyticsFilterBar';
import { SalesAnalyticsTab } from './components/SalesAnalyticsTab';
import { ProductAnalyticsTab } from './components/ProductAnalyticsTab';
import { CustomerAnalyticsTab } from './components/CustomerAnalyticsTab';
import { FinancialAnalyticsTab } from './components/FinancialAnalyticsTab';
import styles from './styles/analytics.module.css';
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Download,
  Printer
} from 'lucide-react';

type AnalyticsTabType = 'sales' | 'products' | 'customers' | 'finance';

export const AnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as AnalyticsTabType) || 'sales';

  const setActiveTab = (tab: AnalyticsTabType) => {
    setSearchParams(prev => {
      const updated = new URLSearchParams(prev);
      updated.set('tab', tab);
      return updated;
    });
  };

  // Global Filter State across all tabs
  const [filter, setFilter] = useState<AnalyticsFilterState>({
    preset: '30d',
    startDate: '',
    endDate: '',
    outletId: 'all',
    categoryId: 'all',
    productId: 'all',
    comparePrior: true
  });

  // Calculate synchronized current & prior date ranges
  const dateRanges = useMemo(() => calculateDateRanges(filter), [filter]);

  const sales = useStore(state => state.sales);
  const products = useStore(state => state.products);

  // CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Vyapari Business Analytics Export - Tab: ${activeTab.toUpperCase()}\n`;
    csvContent += `Date Window: ${dateRanges.current.label}\n`;
    csvContent += `Outlet: ${filter.outletId}, Category: ${filter.categoryId}, Product: ${filter.productId}\n\n`;

    if (activeTab === 'sales') {
      csvContent += 'Sale ID,Order ID,Outlet ID,Customer ID,Total Amount,Created At\n';
      sales.forEach(s => {
        csvContent += `"${s.id}","${s.orderId}","${s.outletId}","${s.customerId || ''}",${s.total},"${s.createdAt}"\n`;
      });
    } else if (activeTab === 'products') {
      csvContent += 'Product ID,Name,SKU,Category,Price,Cost\n';
      products.forEach(p => {
        csvContent += `"${p.id}","${p.name}","${p.sku}","${p.category}",${p.price},${p.cost}\n`;
      });
    } else {
      csvContent += 'Export generated for selected filter configuration.\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vyapari_analytics_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.analyticsContainer}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Analytics & Deep Intelligence</h1>
          <p className={styles.headerSubtitle}>
            Multi-dimensional performance diagnostics across sales velocity, inventory Pareto, customer cohorts, and financial trajectory
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.actionButton} onClick={handlePrint}>
            <Printer size={15} />
            <span>Print Report</span>
          </button>
          <button type="button" className={`${styles.actionButton} ${styles.actionButtonPrimary}`} onClick={handleExportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <AnalyticsFilterBar
        filter={filter}
        onChange={setFilter}
        dateRanges={dateRanges}
      />

      {/* Sub-Tab Navigation Bar */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'sales' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <TrendingUp size={16} />
          <span>Sales Analytics</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'products' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} />
          <span>Product Analytics</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'customers' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={16} />
          <span>Customer Analytics</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'finance' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('finance')}
        >
          <DollarSign size={16} />
          <span>Financial Analytics</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'sales' && (
        <SalesAnalyticsTab filter={filter} dateRanges={dateRanges} />
      )}
      {activeTab === 'products' && (
        <ProductAnalyticsTab filter={filter} dateRanges={dateRanges} />
      )}
      {activeTab === 'customers' && (
        <CustomerAnalyticsTab filter={filter} dateRanges={dateRanges} />
      )}
      {activeTab === 'finance' && (
        <FinancialAnalyticsTab filter={filter} dateRanges={dateRanges} />
      )}
    </div>
  );
};
