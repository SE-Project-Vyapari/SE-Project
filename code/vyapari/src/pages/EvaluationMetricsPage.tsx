import { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { useAuth } from '../app-shell/auth/AuthContext';
import { scanMetrics } from '../services/scanMetrics';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  RefreshCw,
  ScanLine,
  Clock,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';

interface StockAuditEntry {
  id: string;
  productId: string;
  productName: string;
  outletName: string;
  systemQty: number;
  physicalQty: number;
  agreementPct: number;
  auditedAt: string;
}

export const EvaluationMetricsPage = () => {
  const { currentUser } = useAuth();
  const state = useStore();
  const [snapshot, setSnapshot] = useState(() => scanMetrics.getSnapshot());

  // Physical Stock Audit state
  const [auditProductId, setAuditProductId] = useState(state.products[0]?.id || '');
  const [auditOutletId, setAuditOutletId] = useState(state.outlets[0]?.id || 'o-1');
  const [physicalCount, setPhysicalCount] = useState('');
  const [stockAudits, setStockAudits] = useState<StockAuditEntry[]>([]);

  const refresh = () => setSnapshot(scanMetrics.getSnapshot());

  // 1. Median Time-to-Invoice (from scanMetrics bill durations)
  const medianTtiMs = useMemo(() => {
    const times = snapshot.recentBills.map(b => b.timeToBillMs).sort((a, b) => a - b);
    if (times.length === 0) return null;
    const mid = Math.floor(times.length / 2);
    return times.length % 2 !== 0 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
  }, [snapshot.recentBills]);

  // 2. Stock Accuracy (from physical audit entries)
  const stockAccuracyPct = useMemo(() => {
    if (stockAudits.length === 0) return null;
    const avg = stockAudits.reduce((s, a) => s + a.agreementPct, 0) / stockAudits.length;
    return Math.round(avg * 10) / 10;
  }, [stockAudits]);

  // 3. Forecast Suggestion Acceptance Rate (from AuditEvent)
  const forecastStats = useMemo(() => {
    const reviews = state.auditEvents.filter(e => e.entityType === 'forecast_suggestion');
    if (reviews.length === 0) return null;
    const accepted = reviews.filter(e => e.action === 'forecast_accepted').length;
    return {
      total: reviews.length,
      accepted,
      rate: Math.round((accepted / reviews.length) * 100),
    };
  }, [state.auditEvents]);

  // 4. Churn Flagged vs. Follow-up / Repurchase Engagement Rate
  const churnStats = useMemo(() => {
    const highRisk = state.churnScores.filter(c => c.riskLevel === 'high');
    if (highRisk.length === 0) return null;
    const engaged = highRisk.filter(
      c =>
        c.reviewed ||
        state.followUps.some(f => f.customerId === c.customerId && f.status === 'completed')
    ).length;
    return {
      total: highRisk.length,
      engaged,
      rate: Math.round((engaged / highRisk.length) * 100),
    };
  }, [state.churnScores, state.followUps]);

  // 5. Chatbot Resolution Rate (from ChatbotQueryLog)
  const chatbotStats = useMemo(() => {
    const logs = state.chatbotQueryLogs;
    if (logs.length === 0) return null;
    const resolved = logs.filter(l => l.resolved !== false).length;
    return {
      total: logs.length,
      resolved,
      rate: Math.round((resolved / logs.length) * 100),
    };
  }, [state.chatbotQueryLogs]);

  // 6. Notification Delivery Success Rate & Avg Delay (from MessageLog)
  const messagingStats = useMemo(() => {
    const attempted = state.messageLogs.filter(
      m => m.status === 'delivered' || m.status === 'failed'
    );
    if (attempted.length === 0) return null;
    const delivered = attempted.filter(m => m.status === 'delivered');
    const rate = Math.round((delivered.length / attempted.length) * 100);
    const delays = delivered.map(m => m.delayMs || 0).filter(d => d > 0);
    const avgDelayMs =
      delays.length > 0 ? Math.round(delays.reduce((s, d) => s + d, 0) / delays.length) : 0;
    return {
      totalAttempted: attempted.length,
      deliveredCount: delivered.length,
      rate,
      avgDelayMs,
    };
  }, [state.messageLogs]);

  const speedupPct =
    snapshot.avgManualToBillMs > 0 && snapshot.avgScanToBillMs > 0
      ? Math.round(
          ((snapshot.avgManualToBillMs - snapshot.avgScanToBillMs) / snapshot.avgManualToBillMs) *
            100
        )
      : 0;

  const selectedInv = state.inventoryRecords.find(
    r => r.productId === auditProductId && r.outletId === auditOutletId
  );

  // Owner-only gate (placed after all hooks to satisfy Rules of Hooks)
  if (currentUser && currentUser.role !== 'owner') {
    return (
      <div style={{ padding: 'var(--page-padding)' }}>
        <div
          style={{
            padding: 32,
            borderRadius: 10,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <ShieldAlert size={24} color="var(--color-danger)" />
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 18 }}>Owner Access Required</h2>
            <p style={{ margin: 0, color: 'var(--color-muted-text)', fontSize: 14 }}>
              The Project Evaluation Dashboard is restricted to Owner-role users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAddAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const phys = Number(physicalCount);
    if (Number.isNaN(phys) || phys < 0) return;
    const sys = selectedInv?.quantity ?? 0;
    const diff = Math.abs(phys - sys);
    const agreementPct =
      sys === 0 && phys === 0
        ? 100
        : Math.max(0, Math.round((1 - diff / Math.max(1, sys, phys)) * 1000) / 10);
    const prod = state.products.find(p => p.id === auditProductId);
    const outlet = state.outlets.find(o => o.id === auditOutletId);
    setStockAudits(prev => [
      {
        id: crypto.randomUUID(),
        productId: auditProductId,
        productName: prod?.name || auditProductId,
        outletName: outlet?.name || auditOutletId,
        systemQty: sys,
        physicalQty: phys,
        agreementPct,
        auditedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setPhysicalCount('');
  };

  const renderStatusPill = (status: 'pass' | 'fail' | 'insufficient', label: string) => {
    const styles =
      status === 'pass'
        ? { bg: '#dcfce7', color: '#166534', icon: <CheckCircle2 size={13} /> }
        : status === 'fail'
        ? { bg: '#fee2e2', color: '#991b1b', icon: <AlertTriangle size={13} /> }
        : { bg: '#f3f4f6', color: '#4b5563', icon: <HelpCircle size={13} /> };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: styles.bg,
          color: styles.color,
        }}
      >
        {styles.icon} {label}
      </span>
    );
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  return (
    <div
      style={{
        padding: 'var(--page-padding)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-24)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: 24 }}>System Evaluation Dashboard</h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
            Live metrics computed from logged activity across POS, Inventory, Forecasting, CRM, AI Assistant, and Messaging
          </p>
        </div>
        <Button
          onClick={refresh}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <RefreshCw size={16} style={{ marginRight: 6 }} /> Refresh Metrics
        </Button>
      </div>

      {/* Proposal Section 6 Evaluation Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {/* 1. Median Time-to-Invoice */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              Median Time-to-Invoice
            </span>
            {medianTtiMs === null
              ? renderStatusPill('insufficient', 'Insufficient data')
              : medianTtiMs <= 5000
              ? renderStatusPill('pass', 'Target ≤ 5.0s')
              : renderStatusPill('fail', 'Above 5.0s target')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {medianTtiMs === null ? 'Insufficient data' : `${(medianTtiMs / 1000).toFixed(2)}s`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            Computed across {snapshot.recentBills.length} logged checkout sessions
          </div>
        </div>

        {/* 2. Stock Accuracy */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              Stock Accuracy (Audit)
            </span>
            {stockAccuracyPct === null
              ? renderStatusPill('insufficient', 'Insufficient data')
              : stockAccuracyPct >= 95
              ? renderStatusPill('pass', 'Target ≥ 95%')
              : renderStatusPill('fail', 'Below 95% target')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {stockAccuracyPct === null ? 'Insufficient data' : `${stockAccuracyPct}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {stockAudits.length === 0
              ? 'Log a physical stock count below to compute accuracy'
              : `Across ${stockAudits.length} audited product counts`}
          </div>
        </div>

        {/* 3. Forecast Acceptance Rate */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              Forecast Acceptance Rate
            </span>
            {forecastStats === null
              ? renderStatusPill('insufficient', 'Insufficient data')
              : forecastStats.rate >= 70
              ? renderStatusPill('pass', 'Target ≥ 70%')
              : renderStatusPill('fail', 'Below 70% target')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {forecastStats === null ? 'Insufficient data' : `${forecastStats.rate}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {forecastStats === null
              ? 'Accept or reject reorder suggestions in Forecasting to populate'
              : `${forecastStats.accepted} accepted of ${forecastStats.total} reviewed`}
          </div>
        </div>

        {/* 4. Churn Flagged vs Engagement */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              High-Churn Follow-Up Rate
            </span>
            {churnStats === null
              ? renderStatusPill('insufficient', 'Insufficient data')
              : churnStats.rate >= 60
              ? renderStatusPill('pass', 'Target ≥ 60%')
              : renderStatusPill('fail', 'Below 60% target')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {churnStats === null ? 'Insufficient data' : `${churnStats.rate}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {churnStats === null
              ? 'No high-risk churn flags recorded yet'
              : `${churnStats.engaged} engaged/reviewed of ${churnStats.total} high-risk flags`}
          </div>
        </div>

        {/* 5. Chatbot Resolution Rate */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              Chatbot Resolution Rate
            </span>
            {chatbotStats === null
              ? renderStatusPill('insufficient', 'Insufficient data')
              : chatbotStats.rate >= 80
              ? renderStatusPill('pass', 'Target ≥ 80%')
              : renderStatusPill('fail', 'Below 80% target')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {chatbotStats === null ? 'Insufficient data' : `${chatbotStats.rate}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {chatbotStats === null
              ? 'Ask questions in AI Assistant to populate query logs'
              : `${chatbotStats.resolved} resolved of ${chatbotStats.total} queries`}
          </div>
        </div>

        {/* 6. Notification Delivery Success Rate */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              Notification Delivery Rate
            </span>
            {messagingStats === null
              ? renderStatusPill('insufficient', 'Insufficient data')
              : messagingStats.rate >= 85
              ? renderStatusPill('pass', 'Target ≥ 85%')
              : renderStatusPill('fail', 'Below 85% target')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {messagingStats === null ? 'Insufficient data' : `${messagingStats.rate}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {messagingStats === null
              ? 'No delivered/failed messages logged'
              : `${messagingStats.deliveredCount}/${messagingStats.totalAttempted} delivered • Avg delay ${(messagingStats.avgDelayMs / 1000).toFixed(2)}s`}
          </div>
        </div>

        {/* 7. Scan-to-Bill vs Manual */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted-text)', fontWeight: 600 }}>
              Scan vs. Manual Speedup
            </span>
            {speedupPct > 0
              ? renderStatusPill('pass', `${speedupPct}% faster`)
              : renderStatusPill('insufficient', 'Pending comparison')}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>
              <ScanLine size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {(snapshot.avgScanToBillMs / 1000).toFixed(2)}s
            </span>
            <span style={{ fontSize: 14, color: 'var(--color-muted-text)' }}>
              vs <Keyboard size={14} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              {(snapshot.avgManualToBillMs / 1000).toFixed(2)}s manual
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
            {snapshot.scanAdditions} scan adds • {snapshot.manualAdditions} manual adds
          </div>
        </div>
      </div>

      {/* Physical Stock Audit Entry Form */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardCheck size={18} color="var(--color-primary)" />
          <h2 style={{ margin: 0, fontSize: 18 }}>Physical Stock Audit Entry</h2>
        </div>
        <form onSubmit={handleAddAudit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Product</label>
            <select
              value={auditProductId}
              onChange={e => setAuditProductId(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}
            >
              {state.products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Outlet</label>
            <select
              value={auditOutletId}
              onChange={e => setAuditOutletId(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}
            >
              {state.outlets.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>System Stock</span>
            <strong style={{ padding: '8px 0', fontSize: 15 }}>{selectedInv?.quantity ?? 0}</strong>
          </div>
          <div style={{ minWidth: 150, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Physical Count</label>
            <Input
              type="number"
              min={0}
              required
              placeholder="Enter count"
              value={physicalCount}
              onChange={(e: any) => setPhysicalCount(e.target.value)}
            />
          </div>
          <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            Log Audit
          </Button>
        </form>

        {stockAudits.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted-text)' }}>
                  <th style={{ padding: 10 }}>Product</th>
                  <th style={{ padding: 10 }}>Outlet</th>
                  <th style={{ padding: 10 }}>System</th>
                  <th style={{ padding: 10 }}>Physical</th>
                  <th style={{ padding: 10 }}>Agreement</th>
                </tr>
              </thead>
              <tbody>
                {stockAudits.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 10, fontWeight: 600 }}>{a.productName}</td>
                    <td style={{ padding: 10 }}>{a.outletName}</td>
                    <td style={{ padding: 10 }}>{a.systemQty}</td>
                    <td style={{ padding: 10 }}>{a.physicalQty}</td>
                    <td style={{ padding: 10, fontWeight: 600, color: a.agreementPct >= 95 ? '#166534' : '#991b1b' }}>
                      {a.agreementPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Bill Sessions */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} /> Logged POS Checkout Sessions
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', fontSize: 13 }}>
              <th style={{ padding: 14 }}>Completed At</th>
              <th style={{ padding: 14 }}>Mode</th>
              <th style={{ padding: 14 }}>Items (Scan / Manual)</th>
              <th style={{ padding: 14 }}>Time to Bill</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.recentBills.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 14, fontSize: 13, color: 'var(--color-muted-text)' }}>
                  {format(new Date(b.completedAt), 'MMM d, h:mm:ss a')}
                </td>
                <td style={{ padding: 14 }}>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      backgroundColor:
                        b.mode === 'scan' ? '#dcfce7' : b.mode === 'manual' ? '#f3f4f6' : '#e0f2fe',
                      color:
                        b.mode === 'scan' ? '#166534' : b.mode === 'manual' ? '#374151' : '#0369a1',
                    }}
                  >
                    {b.mode}
                  </span>
                </td>
                <td style={{ padding: 14, fontSize: 14 }}>
                  {b.itemCount} total ({b.scanCount} scan, {b.manualCount} manual)
                </td>
                <td style={{ padding: 14, fontWeight: 600 }}>
                  {(b.timeToBillMs / 1000).toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
