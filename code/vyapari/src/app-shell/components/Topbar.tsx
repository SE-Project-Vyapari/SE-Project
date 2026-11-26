import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../../services/store';
import { useNotificationContext } from '../../context/NotificationContext';
import {
  Search,
  Bell,
  LogOut,
  ChevronDown,
  CheckCheck,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  Menu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const Topbar = ({
  onSearchOpen,
  onMobileMenuOpen,
}: {
  onSearchOpen: () => void;
  onMobileMenuOpen?: () => void;
}) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const outlets = useStore(state => state.outlets);
  const userOutlets = outlets.filter(o => o.businessId === currentUser?.businessId);

  const { notifications, unreadCount, markAsRead, markAllRead, isNotificationResolved } =
    useNotificationContext();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  const recentNotifications = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const getPriorityIcon = (priority?: string, type?: string) => {
    if (priority === 'critical' || type === 'alert') {
      return <XCircle size={16} color="var(--color-danger, #dc2626)" />;
    }
    if (priority === 'warning' || type === 'warning') {
      return <AlertTriangle size={16} color="#d97706" />;
    }
    return <Info size={16} color="var(--color-primary)" />;
  };

  return (
    <header
      style={{
        height: 64,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--page-padding)',
        gap: 12,
        position: 'relative',
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="app-mobile-menu-btn ui-hover-outline"
          aria-label="Open navigation menu"
          onClick={onMobileMenuOpen}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 8,
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={20} color="var(--color-dark)" />
        </button>
        <div
          className="app-outlet-pill ui-hover-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            height: 36,
            padding: '0 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {currentUser?.outletId
            ? userOutlets.find(o => o.id === currentUser.outletId)?.name
            : 'All Outlets'}
          <ChevronDown size={16} color="var(--color-muted-text)" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onSearchOpen}
          aria-label="Open command search (Ctrl+K)"
          className="ui-hover-outline"
          style={{
            height: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-muted-text)',
          }}
        >
          <Search size={16} />
          <span className="app-search-text" style={{ fontSize: 14 }}>Search... (Ctrl+K)</span>
        </button>

        {/* Bell Icon + Notification Overlay */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Open notifications"
            aria-expanded={bellOpen}
            onClick={() => setBellOpen(prev => !prev)}
            className="ui-hover-tint"
            style={{
              position: 'relative',
              background: bellOpen ? 'var(--color-background)' : 'transparent',
              border: 'none',
              padding: 8,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={20} color="var(--color-dark)" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: 'var(--color-danger, #dc2626)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10,
                  minWidth: 16,
                  textAlign: 'center',
                  lineHeight: '14px',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 390,
                maxWidth: '90vw',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '2px 7px',
                        borderRadius: 999,
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {recentNotifications.length === 0 ? (
                  <div
                    style={{
                      padding: 28,
                      textAlign: 'center',
                      color: 'var(--color-muted-text)',
                      fontSize: 14,
                    }}
                  >
                    You&apos;re all caught up!
                  </div>
                ) : (
                  recentNotifications.map(n => {
                    const resolved = isNotificationResolved(n);
                    const borderColor = resolved
                      ? '#9ca3af'
                      : n.priority === 'critical' || n.type === 'alert'
                      ? '#dc2626'
                      : n.priority === 'warning' || n.type === 'warning'
                      ? '#d97706'
                      : 'var(--color-primary)';

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          setBellOpen(false);
                          navigate(n.actionUrl || '/notifications');
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border)',
                          borderLeft: `4px solid ${borderColor}`,
                          backgroundColor: n.read
                            ? 'var(--color-surface)'
                            : 'rgba(37, 99, 235, 0.05)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                          opacity: resolved ? 0.72 : 1,
                        }}
                      >
                        <div style={{ marginTop: 2 }}>{getPriorityIcon(n.priority, n.type)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                              marginBottom: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: n.read ? 500 : 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {!n.read && (
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--color-primary)',
                                    display: 'inline-block',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              {n.title}
                            </span>
                            {resolved && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  backgroundColor: '#e6f4ea',
                                  color: '#137333',
                                  padding: '1px 6px',
                                  borderRadius: 999,
                                }}
                              >
                                Resolved
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: 12,
                              color: 'var(--color-muted-text)',
                              lineHeight: 1.4,
                            }}
                          >
                            {n.message}
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 11,
                              color: 'var(--color-muted-text)',
                            }}
                          >
                            <span>{n.category || 'System'}</span>
                            <span>{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-background)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setBellOpen(false);
                    navigate('/notifications/automation');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted-text)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Zap size={13} /> Automation Rules
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBellOpen(false);
                    navigate('/notifications');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: '1px solid var(--color-border)',
            paddingLeft: 24,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {currentUser?.name ? currentUser.name.replace(/\s*\(Owner\)/i, '').trim() : 'Admin'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-muted-text)',
                textTransform: 'capitalize',
              }}
            >
              {currentUser?.role === 'owner' ? 'Administrator' : currentUser?.role}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            {(currentUser?.name ? currentUser.name.replace(/\s*\(Owner\)/i, '').trim() : 'Admin').charAt(0)}
          </div>
          <button
            onClick={logout}
            aria-label="Logout"
            className="ui-hover-tint"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted-text)',
              padding: 8,
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
            }}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
