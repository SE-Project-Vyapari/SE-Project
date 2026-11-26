import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../context/NotificationContext';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import {
  Check,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Zap,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';
import type { NotificationCategory } from '../types';

const CATEGORIES: ('All' | NotificationCategory)[] = [
  'All',
  'Inventory',
  'Orders',
  'Customers',
  'Finance',
  'System',
];

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markAsRead, isNotificationResolved } =
    useNotificationContext();
  const [selectedCategory, setSelectedCategory] = useState<'All' | NotificationCategory>('All');

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered =
    selectedCategory === 'All'
      ? sorted
      : sorted.filter(n => (n.category || 'System') === selectedCategory);

  const getCategoryCount = (cat: 'All' | NotificationCategory) => {
    if (cat === 'All') return sorted.length;
    return sorted.filter(n => (n.category || 'System') === cat).length;
  };

  const getIcon = (priority?: string, type?: string, resolved?: boolean) => {
    if (resolved) return <CheckCircle2 size={20} color="#16a34a" />;
    if (priority === 'critical' || type === 'alert') {
      return <XCircle size={20} color="#dc2626" />;
    }
    if (priority === 'warning' || type === 'warning') {
      return <AlertTriangle size={20} color="#d97706" />;
    }
    return <Info size={20} color="var(--color-primary)" />;
  };

  const getBorderColor = (priority?: string, type?: string, resolved?: boolean) => {
    if (resolved) return '#9ca3af';
    if (priority === 'critical' || type === 'alert') return '#dc2626';
    if (priority === 'warning' || type === 'warning') return '#d97706';
    return 'var(--color-primary)';
  };

  const getPriorityBadge = (priority?: string, type?: string, resolved?: boolean) => {
    if (resolved) {
      return { label: 'Resolved', bg: '#e6f4ea', color: '#137333' };
    }
    if (priority === 'critical' || type === 'alert') {
      return { label: 'Critical', bg: '#fce8e6', color: '#c5221f' };
    }
    if (priority === 'warning' || type === 'warning') {
      return { label: 'Warning', bg: '#fef7e0', color: '#b06000' };
    }
    return { label: 'Info', bg: '#e8f0fe', color: '#1967d2' };
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>Notification Center</h1>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  padding: '3px 10px',
                  borderRadius: 999,
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--color-muted-text)' }}>
            Real-time alerts across inventory, orders, customers, finance, and system events
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            onClick={() => navigate('/notifications/automation')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <Zap size={16} style={{ marginRight: 6 }} /> Automation Rules
          </Button>
          <Button
            onClick={() => navigate('/message-logs')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <MessageSquare size={16} style={{ marginRight: 6 }} /> Message Logs
          </Button>
          <Button
            onClick={markAllRead}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            <CheckCheck size={16} style={{ marginRight: 6 }} /> Mark All Read
          </Button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: active
                  ? '1px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)',
                color: active ? 'white' : 'var(--color-text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{cat}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 999,
                  backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'var(--color-background)',
                }}
              >
                {getCategoryCount(cat)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--color-muted-text)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
            }}
          >
            No notifications in this category
          </div>
        ) : (
          filtered.map(n => {
            const resolved = isNotificationResolved(n);
            const badge = getPriorityBadge(n.priority, n.type, resolved);
            const borderColor = getBorderColor(n.priority, n.type, resolved);

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  if (n.actionUrl) navigate(n.actionUrl);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: 16,
                  backgroundColor: n.read
                    ? 'var(--color-surface)'
                    : 'rgba(37, 99, 235, 0.04)',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${borderColor}`,
                  cursor: n.actionUrl ? 'pointer' : 'default',
                  opacity: resolved ? 0.72 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                  <div style={{ marginTop: 2 }}>{getIcon(n.priority, n.type, resolved)}</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 4,
                      }}
                    >
                      {!n.read && (
                        <span
                          title="Unread"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: n.read ? 500 : 700,
                          textDecoration: resolved ? 'line-through' : 'none',
                        }}
                      >
                        {n.title}
                      </h4>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-muted-text)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {n.category || 'System'}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: 14,
                        color: n.read ? 'var(--color-muted-text)' : 'var(--color-text)',
                        fontWeight: n.read ? 400 : 500,
                      }}
                    >
                      {n.message}
                    </p>
                    <span style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>
                      {format(new Date(n.createdAt), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  {n.actionUrl && (
                    <Button
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        navigate(n.actionUrl!);
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      Open <ExternalLink size={12} style={{ marginLeft: 4 }} />
                    </Button>
                  )}
                  {!n.read && (
                    <Button
                      onClick={() => markAsRead(n.id)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        backgroundColor: 'transparent',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-primary)',
                      }}
                    >
                      <Check size={14} style={{ marginRight: 4 }} /> Mark Read
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
