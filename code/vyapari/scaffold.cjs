const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const folders = [
  'design-system/components',
  'services',
  'types',
  'app-shell',
  'seed',
  'components/ui',
  'assets'
];

const modules = [
  'pos', 'inventory', 'orders', 'invoices', 'crm', 'churn-insights',
  'finance', 'employees', 'payroll', 'analytics', 'forecasting',
  'ai-assistant', 'notifications', 'scanner', 'reports', 'settings'
];

modules.forEach(m => {
  folders.push(`modules/${m}/components`);
  folders.push(`modules/${m}/hooks`);
  folders.push(`modules/${m}/styles`);
});

folders.forEach(folder => {
  fs.mkdirSync(path.join(srcDir, folder), { recursive: true });
});

modules.forEach(m => {
  fs.writeFileSync(path.join(srcDir, `modules/${m}/index.ts`), '// public exports for ' + m + '\n');
});

console.log('Scaffolding complete');
