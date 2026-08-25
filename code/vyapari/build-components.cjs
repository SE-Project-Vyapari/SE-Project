const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src/components/ui');

const components = [
  'Button', 'Input', 'Select', 'Checkbox', 'Radio', 'Toggle',
  'Badge', 'Card', 'Table', 'Modal', 'Drawer', 'Toast',
  'Tabs', 'Tooltip', 'Avatar', 'ProgressBar', 'EmptyState', 'Skeleton'
];

components.forEach(comp => {
  const code = `import React from 'react';

export const ${comp} = ({ children, ...props }: any) => {
  return (
    <div className="${comp.toLowerCase()}-base" {...props}>
      {children || '${comp}'}
    </div>
  );
};
`;
  fs.writeFileSync(path.join(componentsDir, `${comp}.tsx`), code);
});

console.log('Components scaffolded');
