import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../../services/store';
import { SAMPLE_CATALOG } from './SampleCatalog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthContext';

const steps = [
  'Business Info',
  'Business Scale',
  'Initial Catalog',
  'Employees',
  'Initial Inventory',
  'Complete'
];

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Form States
  const [businessInfo, setBusinessInfo] = useState({ name: '', type: '', gstin: '', phone: '', email: '', address: '', state: '', city: '' });
  const [scale, setScale] = useState('');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any>({});

  const isGSTINValid = (gstin: string) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const loadDemo = () => {
    loginAsDemo();
    navigate('/');
  };

  const handleFinish = () => {
    const now = new Date().toISOString();
    const bId = `b-${Date.now()}`;
    const oId = `o-${Date.now()}`;
    
    // Save Business
    store.insert('businesses', { id: bId, name: businessInfo.name, currency: 'INR', taxId: businessInfo.gstin, createdAt: now });
    
    // Save Outlet
    store.insert('outlets', { id: oId, businessId: bId, name: 'Main Outlet', address: businessInfo.address, createdAt: now });

    // Save Users (Owner)
    const uId = `u-${Date.now()}`;
    store.insert('users', { id: uId, businessId: bId, name: 'Owner', email: businessInfo.email, role: 'owner', createdAt: now });

    // Save Employees
    employees.forEach((emp, i) => {
      store.insert('employees', {
        id: `emp-${Date.now()}-${i}`,
        businessId: bId,
        outletId: oId,
        name: emp.name,
        role: emp.role || 'Staff',
        department: 'Operations',
        phone: '+91 98765 00000',
        joiningDate: now.split('T')[0],
        salary: emp.salary || 20000,
        hourlyRate: (emp.salary || 20000) / (30 * 8),
        status: 'active',
        leaveBalance: { paid: 12, casual: 8, sick: 6 }
      });
    });

    // Save Products and Inventory
    catalog.forEach((prod, i) => {
      const pId = `p-${Date.now()}-${i}`;
      store.insert('products', { id: pId, businessId: bId, name: prod.name, sku: prod.sku, price: prod.price, cost: prod.cost, category: prod.category, createdAt: now });
      
      const invData = inventory[prod.sku] || { opening: 0, reorder: 10 };
      store.insert('inventoryRecords', { id: `inv-${pId}`, productId: pId, outletId: oId, quantity: invData.opening, reorderLevel: invData.reorder, lastUpdated: now });
    });

    // Login and redirect
    const newUser = store.getState().users.find(u => u.id === uId);
    if(newUser) {
      // Mock login handled inside AuthContext, here we just force it if we had a dedicated state, but since we rely on demo/login we can just loginAsDemo for simplicity or simulate it.
      // To simulate it properly, we should call a context method `loginUserObj(newUser)`. 
      // For now, redirect to login page where they can use their email.
      navigate('/login');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '1px solid var(--color-border)', paddingBottom: 20 }}>
        {steps.map((label, idx) => (
          <div key={idx} style={{ color: idx <= currentStep ? 'var(--color-primary)' : 'var(--color-muted-text)', fontWeight: idx === currentStep ? 'bold' : 'normal' }}>
            {idx + 1}. {label}
          </div>
        ))}
      </div>

      <Card style={{ padding: 32 }}>
        {currentStep === 0 && (
          <div>
            <h2>Business Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
              <Input placeholder="Business Name" value={businessInfo.name} onChange={(e: any) => setBusinessInfo({...businessInfo, name: e.target.value})} />
              <Input placeholder="Business Type" value={businessInfo.type} onChange={(e: any) => setBusinessInfo({...businessInfo, type: e.target.value})} />
              <div>
                <Input placeholder="GSTIN" value={businessInfo.gstin} onChange={(e: any) => setBusinessInfo({...businessInfo, gstin: e.target.value})} />
                {businessInfo.gstin && !isGSTINValid(businessInfo.gstin) && <span style={{color: 'var(--color-danger)', fontSize: 12}}>Invalid GSTIN Format</span>}
              </div>
              <Input placeholder="Phone (+91)" value={businessInfo.phone} onChange={(e: any) => setBusinessInfo({...businessInfo, phone: e.target.value})} />
              <Input placeholder="Email" value={businessInfo.email} onChange={(e: any) => setBusinessInfo({...businessInfo, email: e.target.value})} />
              <Input placeholder="Address" value={businessInfo.address} onChange={(e: any) => setBusinessInfo({...businessInfo, address: e.target.value})} />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h2>Business Scale</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
              {['Single Outlet', 'Multiple Outlets', 'Wholesale', 'Retail', 'Retail + Wholesale'].map(s => (
                <Card key={s} onClick={() => setScale(s)} style={{ padding: 20, cursor: 'pointer', border: scale === s ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
                  <h4>{s}</h4>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2>Initial Catalog</h2>
            <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
              <Button onClick={() => setCatalog(SAMPLE_CATALOG)}>Use Sample Catalog (15 Items)</Button>
              <Button style={{backgroundColor: 'var(--color-secondary)'}} onClick={() => setCatalog([])}>Clear</Button>
            </div>
            {catalog.length > 0 && (
              <p style={{ marginTop: 20 }}>{catalog.length} items loaded.</p>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2>Employees</h2>
            <p>Add your staff details.</p>
            {employees.map((emp, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <Input value={emp.name} onChange={(e: any) => { const newE = [...employees]; newE[idx].name = e.target.value; setEmployees(newE); }} placeholder="Name" />
                <Input value={emp.salary} type="number" onChange={(e: any) => { const newE = [...employees]; newE[idx].salary = Number(e.target.value); setEmployees(newE); }} placeholder="Monthly Salary" />
              </div>
            ))}
            <Button style={{marginTop: 20}} onClick={() => setEmployees([...employees, {name: '', role: 'cashier', phone: '', salary: 15000}])}>+ Add Employee</Button>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h2>Initial Inventory</h2>
            <p>Set opening stock for your catalog.</p>
            {catalog.map(prod => (
              <div key={prod.sku} style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                <span style={{flex: 1}}>{prod.name}</span>
                <Input type="number" placeholder="Stock" onChange={(e: any) => setInventory({...inventory, [prod.sku]: {...(inventory[prod.sku]||{}), opening: Number(e.target.value)}})} />
                <Input type="number" placeholder="Reorder Lvl" onChange={(e: any) => setInventory({...inventory, [prod.sku]: {...(inventory[prod.sku]||{}), reorder: Number(e.target.value)}})} />
              </div>
            ))}
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <h2>Complete Setup</h2>
            <p>You have configured:</p>
            <ul>
              <li><strong>{businessInfo.name}</strong> ({scale})</li>
              <li>{catalog.length} Products</li>
              <li>{employees.length} Employees</li>
            </ul>
            <p>Ready to go?</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          <Button onClick={loadDemo} style={{ backgroundColor: 'var(--color-secondary)' }}>Load Demo Business</Button>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button disabled={currentStep === 0} onClick={handleBack}>Back</Button>
            {currentStep < steps.length - 1 ? (
              <Button style={{backgroundColor: 'var(--color-primary)', color: 'white'}} onClick={handleNext}>Next</Button>
            ) : (
              <Button style={{backgroundColor: 'var(--color-primary)', color: 'white'}} onClick={handleFinish}>Go to Dashboard</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
