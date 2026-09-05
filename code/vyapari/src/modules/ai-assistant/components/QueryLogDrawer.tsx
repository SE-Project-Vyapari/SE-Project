import React, { useMemo } from 'react';
import { useStore } from '../../../services/store';
import styles from '../styles/ai-assistant.module.css';
import { X, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface QueryLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueryLogDrawer: React.FC<QueryLogDrawerProps> = ({ isOpen, onClose }) => {
  const queryLogs = useStore(state => state.chatbotQueryLogs);

  const { resolvedCount, totalCount, resolutionRate, sortedLogs } = useMemo(() => {
    const total = queryLogs.length;
    const resCount = queryLogs.filter(q => q.resolved !== false).length;
    const rate = total > 0 ? Math.round((resCount / total) * 100) : 100;
    const sorted = [...queryLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      resolvedCount: resCount,
      totalCount: total,
      resolutionRate: rate,
      sortedLogs: sorted
    };
  }, [queryLogs]);

  if (!isOpen) return null;

  return (
    <div className={styles.logDrawerOverlay} onClick={onClose}>
      <div className={styles.logDrawerContent} onClick={e => e.stopPropagation()}>
        <div className={styles.logDrawerHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-dark)' }}>
                Query Evaluation & Audit Logs
              </h3>
              <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                System tracking & intent resolution evaluation
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.clearInputBtn}
            onClick={onClose}
            aria-label="Close Audit Log Drawer"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.logDrawerBody}>
          {/* Resolution Stats Card */}
          <div className={styles.metricMiniGrid}>
            <div className={styles.metricMiniCard}>
              <span className={styles.metricMiniLabel}>Total Queries</span>
              <span className={styles.metricMiniValue}>{totalCount}</span>
            </div>

            <div className={styles.metricMiniCard}>
              <span className={styles.metricMiniLabel}>Resolved Intent</span>
              <span className={styles.metricMiniValue} style={{ color: 'var(--color-success)' }}>
                {resolvedCount}
              </span>
            </div>

            <div className={styles.metricMiniCard}>
              <span className={styles.metricMiniLabel}>Resolution Rate</span>
              <span
                className={styles.metricMiniValue}
                style={{
                  color:
                    resolutionRate >= 80
                      ? 'var(--color-success)'
                      : resolutionRate >= 50
                      ? 'var(--color-warning)'
                      : 'var(--color-danger)'
                }}
              >
                {resolutionRate}%
              </span>
            </div>
          </div>

          {/* Log Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-muted-text)' }}>
              Recent Inquiries ({sortedLogs.length})
            </span>

            {sortedLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-muted-text)', fontSize: 13 }}>
                No assistant queries recorded yet. Ask a question to start logging.
              </div>
            ) : (
              sortedLogs.map(log => {
                const isResolved = log.resolved !== false;
                let formattedTime = log.timestamp;
                try {
                  formattedTime = format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm:ss');
                } catch {
                  // ignore
                }

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isResolved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: isResolved ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {isResolved ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {isResolved ? 'Resolved' : 'Fallback'}
                      </span>

                      <span style={{ fontSize: 11, color: 'var(--color-muted-text)' }}>
                        {formattedTime}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-dark)' }}>
                      "{log.query}"
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-muted-text)' }}>
                      <span>Intent: <code>{log.intent}</code></span>
                    </div>

                    {log.response && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--color-text)',
                          background: 'var(--color-surface)',
                          padding: '6px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        {log.response}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
