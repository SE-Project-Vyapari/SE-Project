import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, useStore } from '../../services/store';
import { useAuth } from '../../app-shell/auth/AuthContext';
import { PERMISSIONS } from '../../app-shell/permissions';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Role, NotificationCategory } from '../../types';
import {
  Building2,
  Store as StoreIcon,
  Users,
  Receipt,
  FileText,
  Bell,
  Barcode,
  Shield,
  Plug,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Zap,
  Database,
  RefreshCw,
} from 'lucide-react';
import { generateDemoData, type DemoDataSummary } from '../../seed/generateDemoData';

type SettingsTab =
  | 'business'
  | 'outlets'
  | 'users'
  | 'tax'
  | 'invoice'
  | 'notifications'
  | 'barcode'
  | 'security'
  | 'integrations'
  | 'demo';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'business', label: 'Business Profile', icon: <Building2 size={16} /> },
  { id: 'outlets', label: 'Outlets', icon: <StoreIcon size={16} /> },
  { id: 'users', label: 'Users & Roles', icon: <Users size={16} /> },
  { id: 'tax', label: 'Tax / GST', icon: <Receipt size={16} /> },
  { id: 'invoice', label: 'Invoice Settings', icon: <FileText size={16} /> },
  { id: 'notifications', label: 'Notification Settings', icon: <Bell size={16} /> },
  { id: 'barcode', label: 'Barcode Settings', icon: <Barcode size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'integrations', label: 'Integrations', icon: <Plug size={16} /> },
  { id: 'demo', label: 'Demo Data', icon: <Database size={16} /> },
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^\+?[0-9\s-]{10,15}$/;

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const businesses = useStore(s => s.businesses);
  const outlets = useStore(s => s.outlets);
  const users = useStore(s => s.users);
  const settings = useStore(s => s.settings);

  const biz = businesses[0];

  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Business Profile state
  const [bizName, setBizName] = useState(biz?.name || 'Vyapari Superstore');
  const [gstin, setGstin] = useState(biz?.taxId || '29AAAAA1111A1Z5');
  const [bizPhone, setBizPhone] = useState(biz?.phone || '+91 98100 00001');
  const [bizAddress, setBizAddress] = useState(biz?.address || '123 Main St, Downtown');
  const [logoUrl, setLogoUrl] = useState(biz?.logoUrl || '');

  // Outlets state
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletAddress, setNewOutletAddress] = useState('');
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [editOutletName, setEditOutletName] = useState('');
  const [editOutletAddress, setEditOutletAddress] = useState('');

  // Users & Roles state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('cashier');
  const [newUserOutletId, setNewUserOutletId] = useState(outlets[0]?.id || '');

  // Tax/GST state
  const [defaultGstRate, setDefaultGstRate] = useState(settings.tax.defaultGstRate);
  const [defaultHsnCode, setDefaultHsnCode] = useState(settings.tax.defaultHsnCode);

  // Invoice settings state
  const [invPrefix, setInvPrefix] = useState(settings.invoice.prefix);
  const [invDueDays, setInvDueDays] = useState(settings.invoice.defaultDueDays);
  const [invNotes, setInvNotes] = useState(settings.invoice.notesTemplate);

  // Barcode settings state
  const [barcodeFormat, setBarcodeFormat] = useState(settings.barcode.format);
  const [barcodePrefix, setBarcodePrefix] = useState(settings.barcode.prefix);

  // Security state
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const showBanner = (ok: boolean, text: string) => {
    setStatusMsg({ ok, text });
  };

  const [regenerating, setRegenerating] = useState(false);
  const [demoSummary, setDemoSummary] = useState<DemoDataSummary | null>(null);

  const handleRegenerate = async () => {
    if (!window.confirm('This resets ALL current data and generates a fresh demo dataset. Continue?')) return;
    setRegenerating(true);
    setStatusMsg(null);
    try {
      // Yield once so the "Generating..." state can paint before the synchronous-heavy seed runs
      await new Promise(resolve => setTimeout(resolve, 50));
      const summary = await generateDemoData();
      setDemoSummary(summary);
      showBanner(true, 'Demo data regenerated successfully.');
    } catch (err: any) {
      showBanner(false, err?.message || 'Failed to regenerate demo data.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setStatusMsg(null);
  };

  // --- Handlers ---
  const saveBusinessProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin && !GSTIN_REGEX.test(cleanGstin)) {
      showBanner(false, 'Invalid GSTIN format. Expected 15-character GSTIN (e.g. 29AAAAA1111A1Z5).');
      return;
    }
    if (bizPhone.trim() && !PHONE_REGEX.test(bizPhone.trim())) {
      showBanner(false, 'Invalid phone number format. Enter 10-15 digits.');
      return;
    }
    if (biz) {
      store.update('businesses', biz.id, {
        name: bizName.trim(),
        taxId: cleanGstin,
        phone: bizPhone.trim(),
        address: bizAddress.trim(),
        logoUrl: logoUrl.trim(),
      });
    }
    showBanner(true, 'Business profile updated.');
  };

  const addOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim() || !newOutletAddress.trim()) return;
    store.insert('outlets', {
      id: `o-${Date.now()}`,
      businessId: biz?.id || 'b-1',
      name: newOutletName.trim(),
      address: newOutletAddress.trim(),
      createdAt: new Date().toISOString(),
    });
    setNewOutletName('');
    setNewOutletAddress('');
    showBanner(true, 'Outlet added.');
  };

  const saveEditOutlet = (id: string) => {
    if (!editOutletName.trim()) return;
    store.update('outlets', id, {
      name: editOutletName.trim(),
      address: editOutletAddress.trim(),
    });
    setEditingOutletId(null);
    showBanner(true, 'Outlet updated.');
  };

  const ownerCount = users.filter(u => u.role === 'owner').length;

  const handleRoleChange = (userId: string, nextRole: Role) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (target.role === 'owner' && nextRole !== 'owner' && ownerCount <= 1) {
      showBanner(false, 'Cannot demote the last Owner. At least one Owner-role user is required.');
      return;
    }
    store.update('users', userId, { role: nextRole });
    showBanner(true, `Updated ${target.name}'s role to ${nextRole.toUpperCase()}. Access updated live.`);
  };

  const handleRemoveUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (target.role === 'owner' && ownerCount <= 1) {
      showBanner(false, 'Cannot remove the last Owner. At least one Owner-role user is required.');
      return;
    }
    if (target.id === currentUser?.id) {
      showBanner(false, 'You cannot remove the currently signed-in user.');
      return;
    }
    store.setState({ users: users.filter(u => u.id !== userId) });
    showBanner(true, `Removed user ${target.name}.`);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    store.insert('users', {
      id: `u-${Date.now()}`,
      businessId: biz?.id || 'b-1',
      outletId: newUserRole === 'owner' || newUserRole === 'accountant' ? undefined : newUserOutletId,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      createdAt: new Date().toISOString(),
    });
    setNewUserName('');
    setNewUserEmail('');
    showBanner(true, 'User added.');
  };

  const saveTaxSettings = (e: React.FormEvent) => {
    e.preventDefault();
    store.setState({
      settings: {
        ...settings,
        tax: {
          defaultGstRate: Number(defaultGstRate),
          defaultHsnCode: defaultHsnCode.trim() || '990000',
        },
      },
    });
    showBanner(true, 'Default Tax/GST settings saved. Historical invoices remain unchanged.');
  };

  const saveInvoiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    store.setState({
      settings: {
        ...settings,
        invoice: {
          prefix: invPrefix.trim() || 'INV',
          defaultDueDays: Math.max(0, Number(invDueDays)),
          notesTemplate: invNotes,
        },
      },
    });
    showBanner(true, 'Invoice settings saved.');
  };

  const toggleNotificationCategory = (cat: NotificationCategory) => {
    store.setState({
      settings: {
        ...settings,
        notifications: {
          ...settings.notifications,
          [cat]: !settings.notifications[cat],
        },
      },
    });
    showBanner(true, `Updated ${cat} notification preference.`);
  };

  const saveBarcodeSettings = (e: React.FormEvent) => {
    e.preventDefault();
    store.setState({
      settings: {
        ...settings,
        barcode: {
          format: barcodeFormat,
          prefix: barcodePrefix.trim() || '8901058',
        },
      },
    });
    showBanner(true, 'Barcode settings saved.');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currPwd || newPwd.length < 6) {
      showBanner(false, 'New password must be at least 6 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      showBanner(false, 'New password and confirmation do not match.');
      return;
    }
    setCurrPwd('');
    setNewPwd('');
    setConfirmPwd('');
    showBanner(true, 'Password updated (mock security simulation).');
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    padding: 24,
  };

  return (
    <div style={{ padding: 'var(--page-padding)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: '0 0 6px 0', fontSize: 24 }}>Settings</h1>
        <p style={{ margin: 0, color: 'var(--color-muted-text)' }}>
          Manage business configuration, outlets, user roles &amp; permissions, taxes, and system defaults
        </p>
      </div>

      <div className="vy-settings-layout">
        {/* Left Sub-nav */}
        <nav
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                  color: active ? 'white' : 'var(--color-text)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
          {currentUser?.role === 'owner' && (
            <button
              type="button"
              onClick={() => navigate('/settings/evaluation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px dashed var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: 6,
              }}
            >
              <Zap size={16} />
              <span>Evaluation Dashboard →</span>
            </button>
          )}
        </nav>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {statusMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: statusMsg.ok ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${statusMsg.ok ? '#86efac' : '#fca5a5'}`,
                color: statusMsg.ok ? '#166534' : '#991b1b',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {statusMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 1. Business Profile */}
          {activeTab === 'business' && (
            <form onSubmit={saveBusinessProfile} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Business Profile</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Business Name</label>
                  <Input value={bizName} onChange={(e: any) => setBizName(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>GSTIN</label>
                  <Input value={gstin} onChange={(e: any) => setGstin(e.target.value)} placeholder="29AAAAA1111A1Z5" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Contact Phone</label>
                  <Input value={bizPhone} onChange={(e: any) => setBizPhone(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Logo URL (Optional)</label>
                  <Input value={logoUrl} onChange={(e: any) => setLogoUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Registered Address</label>
                <Input value={bizAddress} onChange={(e: any) => setBizAddress(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  Save Business Profile
                </Button>
              </div>
            </form>
          )}

          {/* 2. Outlets */}
          {activeTab === 'outlets' && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Outlets</h2>
              <form onSubmit={addOutlet} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Input placeholder="New Outlet Name" value={newOutletName} onChange={(e: any) => setNewOutletName(e.target.value)} required style={{ flex: 1, minWidth: 180 }} />
                <Input placeholder="Address" value={newOutletAddress} onChange={(e: any) => setNewOutletAddress(e.target.value)} required style={{ flex: 2, minWidth: 220 }} />
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  <Plus size={15} style={{ marginRight: 4 }} /> Add Outlet
                </Button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {outlets.map(o => (
                  <div
                    key={o.id}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {editingOutletId === o.id ? (
                      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                        <Input value={editOutletName} onChange={(e: any) => setEditOutletName(e.target.value)} />
                        <Input value={editOutletAddress} onChange={(e: any) => setEditOutletAddress(e.target.value)} style={{ flex: 1 }} />
                        <Button type="button" onClick={() => saveEditOutlet(o.id)} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Save</Button>
                        <Button type="button" onClick={() => setEditingOutletId(null)} style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 600 }}>{o.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>{o.address}</div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            setEditingOutletId(o.id);
                            setEditOutletName(o.name);
                            setEditOutletAddress(o.address);
                          }}
                          style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 12 }}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Users & Roles */}
          {activeTab === 'users' && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: 18 }}>Users &amp; Role Permissions</h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-text)' }}>
                  Role changes propagate live to sidebar navigation and module guards. At least one Owner is required.
                </p>
              </div>

              <form onSubmit={handleAddUser} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Input placeholder="Full Name" value={newUserName} onChange={(e: any) => setNewUserName(e.target.value)} required style={{ flex: 1, minWidth: 140 }} />
                <Input placeholder="Email" type="email" value={newUserEmail} onChange={(e: any) => setNewUserEmail(e.target.value)} required style={{ flex: 1, minWidth: 170 }} />
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="accountant">Accountant</option>
                </select>
                <select value={newUserOutletId} onChange={e => setNewUserOutletId(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  <Plus size={15} style={{ marginRight: 4 }} /> Add User
                </Button>
              </form>

              <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-muted-text)' }}>
                    <th style={{ padding: 10 }}>User</th>
                    <th style={{ padding: 10 }}>Role</th>
                    <th style={{ padding: 10 }}>Accessible Routes</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isLastOwner = u.role === 'owner' && ownerCount <= 1;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: 10 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {u.name} {u.id === currentUser?.id && <span style={{ fontSize: 11, color: 'var(--color-primary)' }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-muted-text)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: 10 }}>
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                          >
                            <option value="owner">Owner</option>
                            <option value="manager" disabled={isLastOwner}>Manager</option>
                            <option value="cashier" disabled={isLastOwner}>Cashier</option>
                            <option value="accountant" disabled={isLastOwner}>Accountant</option>
                          </select>
                        </td>
                        <td style={{ padding: 10, fontSize: 12, color: 'var(--color-muted-text)' }}>
                          {(PERMISSIONS[u.role] || []).length} modules
                        </td>
                        <td style={{ padding: 10, textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(u.id)}
                            disabled={isLastOwner || u.id === currentUser?.id}
                            title={isLastOwner ? 'Cannot remove last Owner' : 'Remove user'}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isLastOwner || u.id === currentUser?.id ? '#9ca3af' : '#dc2626',
                              cursor: isLastOwner || u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* 4. Tax / GST */}
          {activeTab === 'tax' && (
            <form onSubmit={saveTaxSettings} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Tax / GST Defaults</h2>
              <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-muted-text)' }}>
                Changes to default GST rate and HSN/SAC apply to <strong>new invoices only</strong>. Historical invoices are never retroactively altered.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Default GST Rate (%)</label>
                  <select value={defaultGstRate} onChange={e => setDefaultGstRate(Number(e.target.value))} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Default HSN / SAC Code</label>
                  <Input value={defaultHsnCode} onChange={(e: any) => setDefaultHsnCode(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Save Tax Settings</Button>
              </div>
            </form>
          )}

          {/* 5. Invoice Settings */}
          {activeTab === 'invoice' && (
            <form onSubmit={saveInvoiceSettings} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Invoice Settings</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Invoice Number Prefix</label>
                  <Input value={invPrefix} onChange={(e: any) => setInvPrefix(e.target.value)} placeholder="INV" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Default Due-Date Terms (Days)</label>
                  <Input type="number" min={0} value={invDueDays} onChange={(e: any) => setInvDueDays(Number(e.target.value))} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Default Notes Template</label>
                <Input value={invNotes} onChange={(e: any) => setInvNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Save Invoice Settings</Button>
              </div>
            </form>
          )}

          {/* 6. Notification Settings */}
          {activeTab === 'notifications' && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 18 }}>Notification Preferences</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-text)' }}>Toggle in-app notification categories</p>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate('/notifications/automation')}
                  style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Zap size={15} style={{ marginRight: 6 }} /> Automation Rules
                </Button>
              </div>
              {(['Inventory', 'Orders', 'Customers', 'Finance', 'System'] as NotificationCategory[]).map(cat => (
                <label
                  key={cat}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{cat} Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications[cat]}
                    onChange={() => toggleNotificationCategory(cat)}
                    style={{ width: 18, height: 18 }}
                  />
                </label>
              ))}
            </div>
          )}

          {/* 7. Barcode Settings */}
          {activeTab === 'barcode' && (
            <form onSubmit={saveBarcodeSettings} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Barcode Settings</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Default Barcode Format</label>
                  <select value={barcodeFormat} onChange={e => setBarcodeFormat(e.target.value as any)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                    <option value="EAN-13">EAN-13</option>
                    <option value="UPC-A">UPC-A</option>
                    <option value="Code-128">Code-128</option>
                    <option value="QR">QR Code</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Prefix Convention</label>
                  <Input value={barcodePrefix} onChange={(e: any) => setBarcodePrefix(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Save Barcode Settings</Button>
              </div>
            </form>
          )}

          {/* 8. Security */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Security (Password Change)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 380 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Current Password</label>
                <Input type="password" value={currPwd} onChange={(e: any) => setCurrPwd(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 380 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>New Password</label>
                <Input type="password" value={newPwd} onChange={(e: any) => setNewPwd(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 380 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Confirm New Password</label>
                <Input type="password" value={confirmPwd} onChange={(e: any) => setConfirmPwd(e.target.value)} required />
              </div>
              <div>
                <Button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Update Password</Button>
              </div>
            </form>
          )}

          {/* 10. Demo Data */}
          {activeTab === 'demo' && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Demo Data</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-text)' }}>
                Regenerates a full synthetic dataset (60 products, 50 customers, 90 days of sales, invoices,
                expenses, attendance and 2 months of payroll) through the same service-layer functions the app
                uses, so ledgers, inventory and invoices stay consistent. All current data is replaced.
              </p>
              <div>
                <Button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  <RefreshCw size={15} style={{ marginRight: 6 }} />
                  {regenerating ? 'Generating...' : 'Regenerate demo data'}
                </Button>
              </div>
              {demoSummary && (
                <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
                  {[
                    ['Products', demoSummary.products],
                    ['Customers', demoSummary.customers],
                    ['Employees', demoSummary.employees],
                    ['Orders', demoSummary.orders],
                    ['Invoices', demoSummary.invoices],
                    ['Expenses', demoSummary.expenses],
                    ['Attendance records', demoSummary.attendanceRecords],
                    ['Payroll runs', demoSummary.payrollRuns],
                    ['Churn scores', demoSummary.churnScores],
                    ['Notifications', demoSummary.notifications],
                    ['Message logs', demoSummary.messageLogs],
                  ].map(([label, value]) => (
                    <div key={label as string} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-muted-text)' }}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 9. Integrations */}
          {activeTab === 'integrations' && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>External Integrations</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-text)' }}>
                This prototype runs entirely on local mock/sandbox services. No external API credentials are stored or transmitted.
              </p>
              {[
                {
                  name: 'WhatsApp Business API',
                  desc: 'Simulated locally via mockMessaging.ts with Queued → Sent → Delivered/Failed states.',
                },
                {
                  name: 'SMS Gateway (Twilio / MSG91)',
                  desc: 'Simulated locally in sandbox mode; customer opt-in rules are strictly enforced.',
                },
                {
                  name: 'Payment Gateway (Razorpay / UPI)',
                  desc: 'POS and Invoice payments are recorded locally in the mock ledger.',
                },
              ].map(item => (
                <div
                  key={item.name}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-muted-text)' }}>{item.desc}</div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: '#f3f4f6',
                      color: '#4b5563',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Not Connected (Sandbox)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

