import { store } from '../services/store';

export function seedDatabase() {
  const now = new Date().toISOString();
  
  // 1 Business
  store.insert('businesses', {
    id: 'b-1',
    name: 'Aarav General Store',
    currency: 'INR',
    createdAt: now
  });

  // 3 Outlets
  const outlets = [
    { id: 'o-1', businessId: 'b-1', name: 'Downtown Branch', address: '123 Main St', createdAt: now },
    { id: 'o-2', businessId: 'b-1', name: 'Westside Market', address: '456 West Ave', createdAt: now },
    { id: 'o-3', businessId: 'b-1', name: 'Eastside Mall', address: '789 East Blvd', createdAt: now }
  ];
  outlets.forEach(o => store.insert('outlets', o));

  // 5 Users
  store.insert('users', { id: 'u-1', businessId: 'b-1', name: 'Aarav (Owner)', email: 'aarav@test.com', role: 'owner', createdAt: now });
  store.insert('users', { id: 'u-2', businessId: 'b-1', outletId: 'o-1', name: 'Bob Manager', email: 'bob@test.com', role: 'manager', createdAt: now });
  store.insert('users', { id: 'u-3', businessId: 'b-1', outletId: 'o-1', name: 'Charlie Cashier', email: 'charlie@test.com', role: 'cashier', createdAt: now });
  store.insert('users', { id: 'u-4', businessId: 'b-1', outletId: 'o-2', name: 'Dave Cashier', email: 'dave@test.com', role: 'cashier', createdAt: now });
  store.insert('users', { id: 'u-5', businessId: 'b-1', name: 'Eve Accountant', email: 'eve@test.com', role: 'accountant', createdAt: now });

  // 10 Products
  const products = Array.from({ length: 10 }).map((_, i) => ({
    id: `p-${i+1}`,
    businessId: 'b-1',
    name: `Test Product ${i+1}`,
    sku: `SKU-${i+1}`,
    price: (i + 1) * 100,
    cost: (i + 1) * 60,
    category: i % 2 === 0 ? 'Groceries' : 'Electronics',
    createdAt: now
  }));
  products.forEach(p => store.insert('products', p));

  // Inventory for products
  products.forEach(p => {
    store.insert('inventoryRecords', {
      id: `inv-${p.id}`,
      productId: p.id,
      outletId: 'o-1',
      quantity: 50,
      reorderLevel: 10,
      lastUpdated: now
    });
  });

  // 5 Customers
  const customers = Array.from({ length: 5 }).map((_, i) => ({
    id: `c-${i+1}`,
    businessId: 'b-1',
    name: `Customer ${i+1}`,
    totalSpent: 0,
    createdAt: now
  }));
  customers.forEach(c => store.insert('customers', c));

  // A couple of sales
  // These will be properly generated when testing mockApi, but we add dummy ones for now
  console.log('Database seeded with bootstrap data.');
}
