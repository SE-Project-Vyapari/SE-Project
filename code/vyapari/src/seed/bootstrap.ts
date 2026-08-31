import { store } from '../services/store';

export function seedDatabase() {
  if (store.getState().businesses.length > 0) return; // Prevent duplicate seeding on hot reload
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

  // Date helper
  const dateDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  // 5 Customers
  const customerList = [
    {
      id: 'c-1',
      businessId: 'b-1',
      name: 'Aarav Enterprises',
      phone: '+91 98765 43210',
      email: 'aarav.ent@example.com',
      type: 'wholesale' as const,
      address: 'Plot 12, Industrial Area, Phase 1, New Delhi',
      optInForMessages: true,
      totalSpent: 4500,
      outstandingBalance: 1500,
      lastVisit: dateDaysAgo(5),
      createdAt: dateDaysAgo(60)
    },
    {
      id: 'c-2',
      businessId: 'b-1',
      name: 'Priya Sharma',
      phone: '+91 91234 56789',
      email: 'priya.s@example.com',
      type: 'retail' as const,
      address: 'Flat 402, Sunshine Apts, Bengaluru',
      optInForMessages: true,
      totalSpent: 500,
      outstandingBalance: 0,
      lastVisit: dateDaysAgo(5),
      createdAt: dateDaysAgo(30)
    },
    {
      id: 'c-3',
      businessId: 'b-1',
      name: 'Rohan Gupta',
      phone: '+91 99887 76655',
      email: 'rohan.g@example.com',
      type: 'retail' as const,
      address: '15 Residency Road, Mumbai',
      optInForMessages: false, // Opted out of messages
      totalSpent: 750,
      outstandingBalance: 250,
      lastVisit: dateDaysAgo(10),
      createdAt: dateDaysAgo(40)
    },
    {
      id: 'c-4',
      businessId: 'b-1',
      name: 'Meera Patel',
      phone: '+91 94567 12345',
      email: 'meera.patel@example.com',
      type: 'wholesale' as const,
      address: 'Shop 8, Textile Market, Surat',
      optInForMessages: true,
      totalSpent: 3200,
      outstandingBalance: 0,
      lastVisit: dateDaysAgo(15),
      createdAt: dateDaysAgo(50)
    },
    {
      id: 'c-5',
      businessId: 'b-1',
      name: 'Vikram Singh',
      phone: '+91 93456 78901',
      email: 'vikram.singh@example.com',
      type: 'retail' as const,
      address: '74 Civil Lines, Jaipur',
      optInForMessages: true,
      totalSpent: 0, // Brand new customer
      outstandingBalance: 0,
      createdAt: now
    }
  ];
  customerList.forEach(c => store.insert('customers', c));

  // Seed sample follow-ups
  store.insert('followUps', {
    id: 'fu-1',
    customerId: 'c-1',
    note: 'Follow up regarding payment for Overdue Invoice INV-2026-001',
    dueDate: dateDaysAgo(5), // Overdue
    status: 'pending',
    createdAt: dateDaysAgo(15)
  });
  store.insert('followUps', {
    id: 'fu-2',
    customerId: 'c-3',
    note: 'Check customer satisfaction on recent delivery',
    dueDate: dateDaysAgo(-3), // Due in 3 days
    status: 'pending',
    createdAt: dateDaysAgo(5)
  });
  store.insert('followUps', {
    id: 'fu-3',
    customerId: 'c-2',
    note: 'Sent thank you note for prompt payment',
    dueDate: dateDaysAgo(2),
    status: 'completed',
    createdAt: dateDaysAgo(4),
    completedAt: dateDaysAgo(2)
  });

  // Seeding Orders and Invoice data for realistic list/detail displays

  // Seed Order 1 (Unpaid/Overdue for Customer 1)
  const ord1Id = 'ord-1';
  store.insert('orders', {
    id: ord1Id,
    outletId: 'o-1',
    customerId: 'c-1',
    cashierId: 'u-3',
    status: 'processing',
    totalAmount: 1500,
    createdAt: dateDaysAgo(45),
    history: [{ status: 'pending', timestamp: dateDaysAgo(45) }, { status: 'processing', timestamp: dateDaysAgo(44) }]
  });
  store.insert('orderItems', { id: 'oi-1', orderId: ord1Id, productId: 'p-1', quantity: 5, unitPrice: 100, subtotal: 500 });
  store.insert('orderItems', { id: 'oi-2', orderId: ord1Id, productId: 'p-2', quantity: 5, unitPrice: 200, subtotal: 1000 });

  // Seed Invoice 1 (Unpaid/Overdue)
  const inv1Id = 'inv-1';
  store.insert('invoices', {
    id: inv1Id,
    orderId: ord1Id,
    invoiceNumber: 'INV-2026-001',
    customerId: 'c-1',
    amount: 1500,
    status: 'unpaid',
    dueDate: dateDaysAgo(30),
    createdAt: dateDaysAgo(45),
    amountPaid: 0
  });
  store.insert('ledgerEntries', {
    id: 'le-1',
    businessId: 'b-1',
    amount: 1500,
    type: 'credit',
    sourceType: 'sale',
    referenceId: ord1Id,
    createdAt: dateDaysAgo(45)
  });

  // Seed Order 2 (Partially Paid for Customer 3)
  const ord2Id = 'ord-2';
  store.insert('orders', {
    id: ord2Id,
    outletId: 'o-1',
    customerId: 'c-3',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 1000,
    createdAt: dateDaysAgo(10),
    history: [{ status: 'pending', timestamp: dateDaysAgo(10) }, { status: 'completed', timestamp: dateDaysAgo(10) }]
  });
  store.insert('orderItems', { id: 'oi-3', orderId: ord2Id, productId: 'p-3', quantity: 2, unitPrice: 300, subtotal: 600 });
  store.insert('orderItems', { id: 'oi-4', orderId: ord2Id, productId: 'p-4', quantity: 1, unitPrice: 400, subtotal: 400 });

  // Seed Invoice 2 (Partially Paid)
  const inv2Id = 'inv-2';
  store.insert('invoices', {
    id: inv2Id,
    orderId: ord2Id,
    invoiceNumber: 'INV-2026-002',
    customerId: 'c-3',
    amount: 1000,
    status: 'partially_paid',
    dueDate: dateDaysAgo(-5), // Due 5 days in the future
    createdAt: dateDaysAgo(10),
    amountPaid: 750
  });
  const pm1Id = 'pm-1';
  store.insert('payments', {
    id: pm1Id,
    invoiceId: inv2Id,
    amount: 750,
    method: 'upi',
    status: 'success',
    createdAt: dateDaysAgo(10)
  });
  store.insert('ledgerEntries', {
    id: 'le-2',
    businessId: 'b-1',
    amount: 1000,
    type: 'credit',
    sourceType: 'sale',
    referenceId: ord2Id,
    createdAt: dateDaysAgo(10)
  });
  store.insert('ledgerEntries', {
    id: 'le-3',
    businessId: 'b-1',
    amount: 750,
    type: 'credit',
    sourceType: 'payment',
    referenceId: pm1Id,
    createdAt: dateDaysAgo(10)
  });

  // Seed Order 3 (Fully Paid for Customer 2)
  const ord3Id = 'ord-3';
  store.insert('orders', {
    id: ord3Id,
    outletId: 'o-1',
    customerId: 'c-2',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 500,
    createdAt: dateDaysAgo(5),
    history: [{ status: 'pending', timestamp: dateDaysAgo(5) }, { status: 'completed', timestamp: dateDaysAgo(5) }]
  });
  store.insert('orderItems', { id: 'oi-5', orderId: ord3Id, productId: 'p-5', quantity: 1, unitPrice: 500, subtotal: 500 });

  // Seed Invoice 3 (Fully Paid)
  const inv3Id = 'inv-3';
  store.insert('invoices', {
    id: inv3Id,
    orderId: ord3Id,
    invoiceNumber: 'INV-2026-003',
    customerId: 'c-2',
    amount: 500,
    status: 'paid',
    dueDate: dateDaysAgo(-10), // Due in 10 days
    createdAt: dateDaysAgo(5),
    amountPaid: 500
  });
  const pm2Id = 'pm-2';
  store.insert('payments', {
    id: pm2Id,
    invoiceId: inv3Id,
    amount: 500,
    method: 'cash',
    status: 'success',
    createdAt: dateDaysAgo(5)
  });
  store.insert('ledgerEntries', {
    id: 'le-4',
    businessId: 'b-1',
    amount: 500,
    type: 'credit',
    sourceType: 'sale',
    referenceId: ord3Id,
    createdAt: dateDaysAgo(5)
  });
  store.insert('ledgerEntries', {
    id: 'le-5',
    businessId: 'b-1',
    amount: 500,
    type: 'credit',
    sourceType: 'payment',
    referenceId: pm2Id,
    createdAt: dateDaysAgo(5)
  });

  console.log('Database seeded with bootstrap data.');
}
