import { useState } from 'react';
import { scanMetrics } from '../services/scanMetrics';
import { Button } from '../components/ui/Button';
import { RefreshCw, ScanLine, Clock, Keyboard } from 'lucide-react';
import { format } from 'date-fns';

export const EvaluationMetricsPage = () => {
  const [snapshot, setSnapshot] = useState(() => scanMetrics.getSnapshot());

  const refresh = () => setSnapshot(scanMetrics.getSnapshot());

  const speedupPct =
    snapshot.avgManualToBillMs > 0 && snapshot.avgScanToBillMs > 0
      ? Math.round(
          ((snapshot.avgManualToBillMs - snapshot.avgScanToBillMs) / snapshot.avgManualToBillMs) *
            100
        )
      : 0;

  return (
    <div
      style={{
        padding: 'var(--spacing-32)',
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
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>POS Scan-to-Bill Evaluation</h1>
          <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
            Live comparison of barcode scan-initiated vs. manual-entry cart &amp; checkout timings
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

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 20,
            borderRadius: 10,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-muted-text)', fontSize: 13 }}>
            <ScanLine size={16} color="var(--color-primary)" /> Avg Scan-to-Bill Time
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {(snapshot.avgScanToBillMs / 1000).toFixed(2)}s
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 4 }}>
            Across {snapshot.scanBillCount} scan bills ({snapshot.scanAdditions} item scans)
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 10,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-muted-text)', fontSize: 13 }}>
            <Keyboard size={16} /> Avg Manual-Entry Bill Time
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {(snapshot.avgManualToBillMs / 1000).toFixed(2)}s
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 4 }}>
            Across {snapshot.manualBillCount} manual bills ({snapshot.manualAdditions} manual adds)
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 10,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-muted-text)', fontSize: 13 }}>
            <Clock size={16} color="#16a34a" /> Scan Speedup
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#16a34a' }}>
            {speedupPct > 0 ? `${speedupPct}% faster` : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-text)', marginTop: 4 }}>
            Scan vs. manual cart-to-checkout duration
          </div>
        </div>
      </div>

      {/* Recent Bill Sessions */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
          Logged Checkout Sessions
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

