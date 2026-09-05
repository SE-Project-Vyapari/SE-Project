import type { Role } from '../types';

export type NavItem = {
  label: string;
  path: string;
  icon: string;
};

export type NavGroup = {
  name: string;
  items: NavItem[];
};

export const NAVIGATION_CONFIG: NavGroup[] = [
  {
    name: 'OPERATIONS',
    items: [
      { label: 'Overview', path: '/', icon: 'LayoutDashboard' },
      { label: 'Sales / POS', path: '/pos', icon: 'ShoppingCart' },
      { label: 'Orders', path: '/orders', icon: 'Package' },
      { label: 'Inventory', path: '/inventory', icon: 'Archive' },
      { label: 'Invoices', path: '/invoices', icon: 'FileText' },
    ]
  },
  {
    name: 'RELATIONSHIPS',
    items: [
      { label: 'Customers', path: '/customers', icon: 'Users' },
      { label: 'Customer Insights', path: '/insights', icon: 'LineChart' },
    ]
  },
  {
    name: 'FINANCE',
    items: [
      { label: 'Finance', path: '/finance', icon: 'DollarSign' },
      { label: 'Payroll', path: '/payroll', icon: 'CreditCard' },
    ]
  },
  {
    name: 'INTELLIGENCE',
    items: [
      { label: 'Analytics', path: '/analytics', icon: 'PieChart' },
      { label: 'Forecasting', path: '/forecasting', icon: 'TrendingUp' },
      { label: 'AI Assistant', path: '/ai-assistant', icon: 'Bot' },
    ]
  },
  {
    name: 'COMMUNICATION',
    items: [
      { label: 'Notifications', path: '/notifications', icon: 'Bell' },
    ]
  },
  {
    name: 'ADMIN',
    items: [
      { label: 'Employees', path: '/employees', icon: 'Briefcase' },
      { label: 'Reports', path: '/reports', icon: 'FileBarChart' },
      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]
  }
];

export const PERMISSIONS: Record<Role, string[]> = {
  owner: [
    '/', '/pos', '/orders', '/inventory', '/invoices', 
    '/customers', '/insights', '/finance', '/payroll', 
    '/analytics', '/forecasting', '/ai-assistant', 
    '/notifications', '/employees', '/reports', '/settings'
  ],
  manager: [
    '/', '/pos', '/orders', '/inventory', '/invoices', 
    '/customers', '/insights', '/finance', // Limited finance logic handled at page level
    '/analytics', '/forecasting', '/ai-assistant', 
    '/notifications', '/employees', '/reports', '/settings'
  ],
  cashier: [
    '/', '/pos', '/orders', '/inventory', '/invoices', '/customers'
  ],
  accountant: [
    '/', '/invoices', '/finance', '/payroll', '/employees', '/reports'
  ]
};

export const hasPermission = (role: Role, path: string): boolean => {
  const rolePerms = PERMISSIONS[role] || [];
  if (rolePerms.includes(path)) return true;
  // Subroute check (e.g., /employees/attendance, /employees/emp-1, /inventory/transfers)
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    const rootPath = `/${segments[0]}`;
    if (rolePerms.includes(rootPath)) return true;
  }
  return false;
};
