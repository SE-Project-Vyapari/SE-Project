import { store } from '../services/store';
import { mockApi } from '../services/mockApi';

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

  // 10 Products with realistic grocery & retail inventory
  const productCatalogue = [
    { name: 'Basmati Rice (5kg)', category: 'Grains & Staples', price: 450, cost: 350 },
    { name: 'Organic Toor Dal (1kg)', category: 'Pulses', price: 180, cost: 130 },
    { name: 'Fortune Sunflower Oil (1L)', category: 'Edible Oils', price: 165, cost: 135 },
    { name: 'Chakki Fresh Atta (10kg)', category: 'Grains & Staples', price: 420, cost: 330 },
    { name: 'Tata Salt (1kg)', category: 'Spices & Seasoning', price: 28, cost: 20 },
    { name: 'Masala Chai Gold (500g)', category: 'Beverages', price: 290, cost: 210 },
    { name: 'California Almonds (500g)', category: 'Dry Fruits', price: 450, cost: 360 },
    { name: 'Whole Cashews (500g)', category: 'Dry Fruits', price: 520, cost: 410 },
    { name: 'Pure Cow Ghee (1L)', category: 'Dairy & Ghee', price: 650, cost: 510 },
    { name: 'Stainless Steel Kadhai', category: 'Cookware', price: 850, cost: 600 }
  ];

  const products = productCatalogue.map((p, i) => ({
    id: `p-${i+1}`,
    businessId: 'b-1',
    name: p.name,
    sku: `SKU-${1000 + i + 1}`,
    price: p.price,
    cost: p.cost,
    category: p.category,
    createdAt: now
  }));
  products.forEach(p => store.insert('products', p));

  // Inventory for products (p-10 Stainless Steel Kadhai is out of stock)
  products.forEach(p => {
    store.insert('inventoryRecords', {
      id: `inv-${p.id}`,
      productId: p.id,
      outletId: 'o-1',
      quantity: p.id === 'p-10' ? 0 : 50,
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
    outletId: 'o-1',
    amount: 1500,
    type: 'credit',
    sourceType: 'sale',
    referenceId: ord1Id,
    description: 'Order Sale #ord-1 (INV-2026-001)',
    category: 'Sales',
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
    outletId: 'o-1',
    amount: 1000,
    type: 'credit',
    sourceType: 'sale',
    referenceId: ord2Id,
    description: 'Order Sale #ord-2 (INV-2026-002)',
    category: 'Sales',
    createdAt: dateDaysAgo(10)
  });
  store.insert('ledgerEntries', {
    id: 'le-3',
    businessId: 'b-1',
    outletId: 'o-1',
    amount: 750,
    type: 'credit',
    sourceType: 'payment',
    referenceId: pm1Id,
    description: 'Invoice Payment #INV-2026-002 (UPI)',
    category: 'Receivables',
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
    outletId: 'o-1',
    amount: 500,
    type: 'credit',
    sourceType: 'sale',
    referenceId: ord3Id,
    description: 'Order Sale #ord-3 (INV-2026-003)',
    category: 'Sales',
    createdAt: dateDaysAgo(5)
  });
  store.insert('ledgerEntries', {
    id: 'le-5',
    businessId: 'b-1',
    outletId: 'o-1',
    amount: 500,
    type: 'credit',
    sourceType: 'payment',
    referenceId: pm2Id,
    description: 'Invoice Payment #INV-2026-003 (Cash)',
    category: 'Receivables',
    createdAt: dateDaysAgo(5)
  });

  // Seed sample expenses across 7 standard categories with corresponding debit ledger entries
  const seedExpenses = [
    { id: 'exp-1', category: 'Rent', amount: 25000, description: 'Store Premises Rent (Downtown Branch)', daysAgo: 5, recurring: true },
    { id: 'exp-2', category: 'Utilities', amount: 4500, description: 'Commercial Electricity & Water Bill', daysAgo: 12, recurring: true },
    { id: 'exp-3', category: 'Salaries', amount: 35000, description: 'Store Staff & Cashier Salaries', daysAgo: 15, recurring: true },
    { id: 'exp-4', category: 'Inventory', amount: 18000, description: 'Bulk Wholesale Staples Restocking', daysAgo: 22, recurring: false },
    { id: 'exp-5', category: 'Logistics', amount: 3200, description: 'Inter-branch Delivery & Freight Charges', daysAgo: 8, recurring: false },
    { id: 'exp-6', category: 'Marketing', amount: 5000, description: 'Local Festival Flyers & Promotion', daysAgo: 18, recurring: false },
    { id: 'exp-7', category: 'Miscellaneous', amount: 1200, description: 'Packaging Materials & Shelf Repair', daysAgo: 3, recurring: false }
  ];

  seedExpenses.forEach(exp => {
    store.insert('expenses', {
      id: exp.id,
      businessId: 'b-1',
      outletId: 'o-1',
      category: exp.category,
      amount: exp.amount,
      description: exp.description,
      date: dateDaysAgo(exp.daysAgo),
      recordedBy: 'u-1',
      recurring: exp.recurring,
      status: 'paid',
      createdAt: dateDaysAgo(exp.daysAgo)
    });

    store.insert('ledgerEntries', {
      id: `le-${exp.id}`,
      businessId: 'b-1',
      outletId: 'o-1',
      amount: exp.amount,
      type: 'debit',
      sourceType: 'expense',
      referenceId: exp.id,
      description: exp.description,
      category: exp.category,
      createdAt: dateDaysAgo(exp.daysAgo)
    });
  });

  // Non-sale Income sample
  store.insert('ledgerEntries', {
    id: 'le-inc-1',
    businessId: 'b-1',
    outletId: 'o-1',
    amount: 2500,
    type: 'credit',
    sourceType: 'income',
    referenceId: 'inc-1',
    description: 'Cardboard Carton & Scrap Resale',
    category: 'Other Income',
    createdAt: dateDaysAgo(6)
  });

  // Additional historical orders for RFM repurchase pattern training & scoring
  // c-1 (Aarav Enterprises): History of Basmati Rice (p-1) purchased 85d and 65d ago (combined with ord-1 45d ago -> High Churn Risk)
  const ordHist1Id = 'ord-hist-1';
  store.insert('orders', {
    id: ordHist1Id,
    outletId: 'o-1',
    customerId: 'c-1',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 900,
    createdAt: dateDaysAgo(85)
  });
  store.insert('orderItems', { id: 'oi-h1', orderId: ordHist1Id, productId: 'p-1', quantity: 2, unitPrice: 450, subtotal: 900 });

  const ordHist2Id = 'ord-hist-2';
  store.insert('orders', {
    id: ordHist2Id,
    outletId: 'o-1',
    customerId: 'c-1',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 900,
    createdAt: dateDaysAgo(65)
  });
  store.insert('orderItems', { id: 'oi-h2', orderId: ordHist2Id, productId: 'p-1', quantity: 2, unitPrice: 450, subtotal: 900 });

  // c-1 also bought p-10 (out of stock item) in ord-1 45d ago
  store.insert('orderItems', { id: 'oi-h2b', orderId: ord1Id, productId: 'p-10', quantity: 1, unitPrice: 850, subtotal: 850 });

  // c-2 (Priya Sharma): History of Sunflower Oil (p-3) purchased 35d, 20d, and 5d ago (interval ~15d, on track -> Low Risk / Positive trend)
  const ordHist3Id = 'ord-hist-3';
  store.insert('orders', {
    id: ordHist3Id,
    outletId: 'o-1',
    customerId: 'c-2',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 330,
    createdAt: dateDaysAgo(35)
  });
  store.insert('orderItems', { id: 'oi-h3', orderId: ordHist3Id, productId: 'p-3', quantity: 2, unitPrice: 165, subtotal: 330 });

  const ordHist4Id = 'ord-hist-4';
  store.insert('orders', {
    id: ordHist4Id,
    outletId: 'o-1',
    customerId: 'c-2',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 330,
    createdAt: dateDaysAgo(20)
  });
  store.insert('orderItems', { id: 'oi-h4', orderId: ordHist4Id, productId: 'p-3', quantity: 2, unitPrice: 165, subtotal: 330 });

  // And c-2 recent order ord-3 also bought p-3 5d ago
  store.insert('orderItems', { id: 'oi-h5', orderId: ord3Id, productId: 'p-3', quantity: 2, unitPrice: 165, subtotal: 330 });

  // c-4 (Meera Patel): History of Chakki Atta (p-4) purchased 55d and 28d ago (interval 27d, 28d elapsed -> Medium Risk)
  const ordHist5Id = 'ord-hist-5';
  store.insert('orders', {
    id: ordHist5Id,
    outletId: 'o-1',
    customerId: 'c-4',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 840,
    createdAt: dateDaysAgo(55)
  });
  store.insert('orderItems', { id: 'oi-h6', orderId: ordHist5Id, productId: 'p-4', quantity: 2, unitPrice: 420, subtotal: 840 });

  const ordHist6Id = 'ord-hist-6';
  store.insert('orders', {
    id: ordHist6Id,
    outletId: 'o-1',
    customerId: 'c-4',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 840,
    createdAt: dateDaysAgo(28)
  });
  store.insert('orderItems', { id: 'oi-h7', orderId: ordHist6Id, productId: 'p-4', quantity: 2, unitPrice: 420, subtotal: 840 });

  // c-5 (Vikram Singh): Single historical purchase of p-5 (Tata Salt) 35d ago -> Insufficient History / At risk from day one
  const ordHist7Id = 'ord-hist-7';
  store.insert('orders', {
    id: ordHist7Id,
    outletId: 'o-1',
    customerId: 'c-5',
    cashierId: 'u-3',
    status: 'completed',
    totalAmount: 56,
    createdAt: dateDaysAgo(35)
  });
  store.insert('orderItems', { id: 'oi-h8', orderId: ordHist7Id, productId: 'p-5', quantity: 2, unitPrice: 28, subtotal: 56 });

  // =========================================================================
  // SEED 90-DAY COMPREHENSIVE SALES & FINANCIAL HISTORY (For Deep Analytics)
  // =========================================================================
  const sampleCustIds = ['c-1', 'c-2', 'c-3', 'c-4', 'c-5', undefined, undefined];
  const sampleOutlets = ['o-1', 'o-2', 'o-3'];

  for (let day = 89; day >= 1; day--) {
    // Generate 1 to 3 sales per day across outlets
    const numSales = (day % 3 === 0) ? 3 : (day % 2 === 0) ? 2 : 1;

    for (let s = 0; s < numSales; s++) {
      const orderId = `ord-90d-${day}-${s}`;
      const outletId = sampleOutlets[(day + s) % sampleOutlets.length];
      const customerId = sampleCustIds[(day * 3 + s) % sampleCustIds.length];
      const orderDate = dateDaysAgo(day);

      // Select 1 to 3 items
      const pIdx1 = (day + s * 2) % products.length;
      const pIdx2 = (day + s + 3) % products.length;
      const prod1 = products[pIdx1];
      const prod2 = (day % 2 === 0) ? products[pIdx2] : null;

      const qty1 = customerId === 'c-1' || customerId === 'c-4' ? 4 : 2;
      const sub1 = prod1.price * qty1;
      let totalAmount = sub1;

      store.insert('orderItems', {
        id: `oi-90d-${day}-${s}-1`,
        orderId,
        productId: prod1.id,
        quantity: qty1,
        unitPrice: prod1.price,
        subtotal: sub1
      });

      if (prod2 && prod2.id !== prod1.id && prod2.id !== 'p-10') { // p-10 is out of stock recently
        const qty2 = 1;
        const sub2 = prod2.price * qty2;
        totalAmount += sub2;

        store.insert('orderItems', {
          id: `oi-90d-${day}-${s}-2`,
          orderId,
          productId: prod2.id,
          quantity: qty2,
          unitPrice: prod2.price,
          subtotal: sub2
        });
      }

      store.insert('orders', {
        id: orderId,
        outletId,
        customerId,
        cashierId: 'u-3',
        status: 'completed',
        totalAmount,
        history: [{ status: 'completed', timestamp: orderDate }],
        createdAt: orderDate
      });

      store.insert('sales', {
        id: `sale-90d-${day}-${s}`,
        orderId,
        outletId,
        customerId,
        total: totalAmount,
        createdAt: orderDate
      });

      store.insert('ledgerEntries', {
        id: `le-90d-${day}-${s}`,
        businessId: 'b-1',
        outletId,
        amount: totalAmount,
        type: 'credit',
        sourceType: 'sale',
        referenceId: orderId,
        description: `POS Sale #${orderId}`,
        category: 'Sales',
        createdAt: orderDate
      });
    }

    // Occasional operating expense entry every ~10 days
    if (day % 10 === 0) {
      const expId = `exp-90d-${day}`;
      const expAmount = (day % 30 === 0) ? 25000 : 3500;
      const expCat = (day % 30 === 0) ? 'Rent' : (day % 20 === 0) ? 'Utilities' : 'Logistics';
      const expDesc = `${expCat} Operational Expense`;

      store.insert('expenses', {
        id: expId,
        businessId: 'b-1',
        outletId: 'o-1',
        category: expCat,
        amount: expAmount,
        description: expDesc,
        date: dateDaysAgo(day),
        recordedBy: 'u-1',
        recurring: true,
        status: 'paid',
        createdAt: dateDaysAgo(day)
      });

      store.insert('ledgerEntries', {
        id: `le-${expId}`,
        businessId: 'b-1',
        outletId: 'o-1',
        amount: expAmount,
        type: 'debit',
        sourceType: 'expense',
        referenceId: expId,
        description: expDesc,
        category: expCat,
        createdAt: dateDaysAgo(day)
      });
    }
  }

  // Initialize churn scores for all customer-product pairs
  mockApi.computeAllChurnScores().catch(err => {
    console.error('Failed to compute initial churn scores:', err);
  });

  // =========================================================================
  // SEED EMPLOYEES (24 Employees across 3 Outlets + Central Office)
  // =========================================================================
  const employeesData = [
    { id: 'emp-1', userId: 'u-1', name: 'Aarav Sharma', role: 'Owner & Managing Director', department: 'Executive', outletId: 'o-1', phone: '+91 98111 22334', email: 'aarav@aaravstores.in', salary: 75000, daysJoined: 365, status: 'active' as const },
    { id: 'emp-2', userId: 'u-2', name: 'Bob Verma', role: 'Store Manager', department: 'Operations', outletId: 'o-1', phone: '+91 98222 33445', email: 'bob.v@aaravstores.in', salary: 55000, daysJoined: 240, status: 'active' as const },
    { id: 'emp-3', userId: 'u-3', name: 'Charlie Nair', role: 'Senior Cashier', department: 'Front Desk', outletId: 'o-1', phone: '+91 98333 44556', email: 'charlie.n@aaravstores.in', salary: 28000, daysJoined: 180, status: 'active' as const },
    { id: 'emp-4', userId: 'u-4', name: 'Dave Gupta', role: 'Cashier', department: 'Front Desk', outletId: 'o-2', phone: '+91 98444 55667', email: 'dave.g@aaravstores.in', salary: 24000, daysJoined: 150, status: 'active' as const },
    { id: 'emp-5', userId: 'u-5', name: 'Eve Sundaram', role: 'Head Accountant', department: 'Finance & Accounts', outletId: 'o-1', phone: '+91 98555 66778', email: 'eve.s@aaravstores.in', salary: 60000, daysJoined: 300, status: 'active' as const },
    { id: 'emp-6', name: 'Rajesh Kulkarni', role: 'Store Manager', department: 'Operations', outletId: 'o-2', phone: '+91 98666 77889', email: 'rajesh.k@aaravstores.in', salary: 52000, daysJoined: 210, status: 'active' as const },
    { id: 'emp-7', name: 'Ananya Iyer', role: 'Store Manager', department: 'Operations', outletId: 'o-3', phone: '+91 98777 88990', email: 'ananya.i@aaravstores.in', salary: 54000, daysJoined: 190, status: 'active' as const },
    { id: 'emp-8', name: 'Vikram Malhotra', role: 'Inventory Supervisor', department: 'Logistics & Warehouse', outletId: 'o-1', phone: '+91 98888 99001', email: 'vikram.m@aaravstores.in', salary: 38000, daysJoined: 140, status: 'active' as const },
    { id: 'emp-9', name: 'Pooja Deshmukh', role: 'Senior Cashier', department: 'Front Desk', outletId: 'o-3', phone: '+91 98999 00112', email: 'pooja.d@aaravstores.in', salary: 27000, daysJoined: 120, status: 'active' as const },
    { id: 'emp-10', name: 'Suresh Reddy', role: 'Stock & Logistics Clerk', department: 'Logistics & Warehouse', outletId: 'o-1', phone: '+91 97111 11223', email: 'suresh.r@aaravstores.in', salary: 22000, daysJoined: 90, status: 'active' as const },
    { id: 'emp-11', name: 'Sneha Patel', role: 'Sales Associate', department: 'Sales & Floor', outletId: 'o-2', phone: '+91 97222 22334', email: 'sneha.p@aaravstores.in', salary: 23000, daysJoined: 80, status: 'active' as const },
    { id: 'emp-12', name: 'Amit Joshi', role: 'Sales Associate', department: 'Sales & Floor', outletId: 'o-3', phone: '+91 97333 33445', email: 'amit.j@aaravstores.in', salary: 23000, daysJoined: 75, status: 'active' as const },
    { id: 'emp-13', name: 'Neha Choudhary', role: 'Junior Accountant', department: 'Finance & Accounts', outletId: 'o-1', phone: '+91 97444 44556', email: 'neha.c@aaravstores.in', salary: 32000, daysJoined: 60, status: 'active' as const },
    { id: 'emp-14', name: 'Manoj Tiwari', role: 'Delivery & Dispatch Lead', department: 'Delivery & Dispatch', outletId: 'o-1', phone: '+91 97555 55667', email: 'manoj.t@aaravstores.in', salary: 25000, daysJoined: 55, status: 'active' as const },
    { id: 'emp-15', name: 'Kavita Menon', role: 'Customer Relations Executive', department: 'Customer Service', outletId: 'o-3', phone: '+91 97666 66778', email: 'kavita.m@aaravstores.in', salary: 26000, daysJoined: 50, status: 'active' as const },
    { id: 'emp-16', name: 'Deepak Chauhan', role: 'Cashier', department: 'Front Desk', outletId: 'o-2', phone: '+91 97777 77889', email: 'deepak.c@aaravstores.in', salary: 22000, daysJoined: 45, status: 'active' as const },
    { id: 'emp-17', name: 'Sunita Rathi', role: 'Inventory Clerk', department: 'Logistics & Warehouse', outletId: 'o-2', phone: '+91 97888 88990', email: 'sunita.r@aaravstores.in', salary: 21000, daysJoined: 40, status: 'active' as const },
    { id: 'emp-18', name: 'Harish Bhat', role: 'Security & Facilities Lead', department: 'Security & Facilities', outletId: 'o-1', phone: '+91 97999 99001', email: 'harish.b@aaravstores.in', salary: 24000, daysJoined: 35, status: 'active' as const },
    { id: 'emp-19', name: 'Ritu Agarwal', role: 'Cashier', department: 'Front Desk', outletId: 'o-3', phone: '+91 96111 00112', email: 'ritu.a@aaravstores.in', salary: 22000, daysJoined: 32, status: 'active' as const },
    { id: 'emp-20', name: 'Alok Pandey', role: 'Warehouse Assistant', department: 'Logistics & Warehouse', outletId: 'o-1', phone: '+91 96222 11223', email: 'alok.p@aaravstores.in', salary: 20000, daysJoined: 30, status: 'active' as const },
    { id: 'emp-21', name: 'Meenakshi Pillai', role: 'Sales Associate', department: 'Sales & Floor', outletId: 'o-1', phone: '+91 96333 22334', email: 'meenakshi.p@aaravstores.in', salary: 22000, daysJoined: 28, status: 'active' as const },
    { id: 'emp-22', name: 'Tarun Rawat', role: 'Delivery Executive', department: 'Delivery & Dispatch', outletId: 'o-2', phone: '+91 96444 33445', email: 'tarun.r@aaravstores.in', salary: 19000, daysJoined: 20, status: 'active' as const },
    // Mid-month joiners to test pre-employment greyed-out edge case:
    { id: 'emp-23', name: 'Divya Saxena', role: 'Junior Cashier (Mid-Month Joiner)', department: 'Front Desk', outletId: 'o-1', phone: '+91 96555 44556', email: 'divya.s@aaravstores.in', salary: 20000, daysJoined: 12, status: 'active' as const },
    { id: 'emp-24', name: 'Sandeep Yadav', role: 'Trainee Associate (Recent Joiner)', department: 'Sales & Floor', outletId: 'o-3', phone: '+91 96666 55667', email: 'sandeep.y@aaravstores.in', salary: 18000, daysJoined: 6, status: 'active' as const },
    { id: 'emp-25', name: 'Kiran Gokhale', role: 'Former Cashier', department: 'Front Desk', outletId: 'o-1', phone: '+91 96777 66778', email: 'kiran.g@aaravstores.in', salary: 20000, daysJoined: 180, status: 'inactive' as const }
  ];

  employeesData.forEach(e => {
    store.insert('employees', {
      id: e.id,
      userId: e.userId,
      businessId: 'b-1',
      outletId: e.outletId,
      name: e.name,
      role: e.role,
      department: e.department,
      phone: e.phone,
      email: e.email,
      joiningDate: dateDaysAgo(e.daysJoined).split('T')[0],
      salary: e.salary,
      hourlyRate: Math.round(e.salary / (30 * 8)),
      status: e.status,
      leaveBalance: {
        paid: 12,
        casual: 8,
        sick: 6
      },
      panNumber: `ABCDE${1000 + parseInt(e.id.split('-')[1])}F`,
      bankDetails: {
        accountNo: `91827364${100 + parseInt(e.id.split('-')[1])}`,
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank, Connaught Place'
      },
      emergencyContact: {
        name: 'Family Contact',
        relation: 'Spouse / Parent',
        phone: '+91 99000 11222'
      }
    });
  });

  // Seed sample Leave Records
  store.insert('leaveRecords', {
    id: 'lv-1',
    employeeId: 'emp-3',
    type: 'casual',
    startDate: dateDaysAgo(15).split('T')[0],
    endDate: dateDaysAgo(14).split('T')[0],
    days: 2,
    reason: 'Family wedding function in hometown',
    status: 'approved',
    appliedOn: dateDaysAgo(20),
    approvedBy: 'u-1'
  });

  store.insert('leaveRecords', {
    id: 'lv-2',
    employeeId: 'emp-8',
    type: 'sick',
    startDate: dateDaysAgo(8).split('T')[0],
    endDate: dateDaysAgo(8).split('T')[0],
    days: 1,
    reason: 'Viral fever & medical checkup',
    status: 'approved',
    appliedOn: dateDaysAgo(9),
    approvedBy: 'u-2'
  });

  store.insert('leaveRecords', {
    id: 'lv-3',
    employeeId: 'emp-13',
    type: 'paid',
    startDate: dateDaysAgo(4).split('T')[0],
    endDate: dateDaysAgo(3).split('T')[0],
    days: 2,
    reason: 'Personal vacation',
    status: 'approved',
    appliedOn: dateDaysAgo(10),
    approvedBy: 'u-1'
  });

  // =========================================================================
  // SEED 30 DAYS OF ATTENDANCE HISTORY FOR ALL EMPLOYEES
  // =========================================================================
  employeesData.forEach(emp => {
    const joiningDateStr = dateDaysAgo(emp.daysJoined).split('T')[0];

    for (let dayAgo = 29; dayAgo >= 0; dayAgo--) {
      const recordDate = new Date();
      recordDate.setDate(recordDate.getDate() - dayAgo);
      const dateStr = recordDate.toISOString().split('T')[0];

      // If date is before joining date, do not seed attendance (pre-employment)
      if (dateStr < joiningDateStr) {
        continue;
      }

      // If inactive employee and date is recent, skip
      if (emp.status === 'inactive' && dayAgo < 15) {
        continue;
      }

      const dayOfWeek = recordDate.getDay(); // 0 = Sunday
      const empNum = parseInt(emp.id.split('-')[1]);

      let status: 'present' | 'absent' | 'late' | 'leave' = 'present';
      let checkIn: string | undefined = '09:00';
      let checkOut: string | undefined = '18:00';
      let hoursWorked = 9.0;
      let isIncomplete = false;
      let notes: string | undefined = undefined;

      // Handle specific leaves
      if (emp.id === 'emp-3' && (dayAgo === 15 || dayAgo === 14)) {
        status = 'leave';
        checkIn = undefined;
        checkOut = undefined;
        hoursWorked = 0;
        notes = 'Approved Casual Leave';
      } else if (emp.id === 'emp-8' && dayAgo === 8) {
        status = 'leave';
        checkIn = undefined;
        checkOut = undefined;
        hoursWorked = 0;
        notes = 'Approved Sick Leave';
      } else if (emp.id === 'emp-13' && (dayAgo === 4 || dayAgo === 3)) {
        status = 'leave';
        checkIn = undefined;
        checkOut = undefined;
        hoursWorked = 0;
        notes = 'Approved Paid Leave';
      } else if (emp.id === 'emp-16' && dayAgo === 2) {
        // Edge case: Incomplete checkout (punched in at 09:15, forgot punch out)
        status = 'present';
        checkIn = '09:15';
        checkOut = undefined;
        hoursWorked = 0;
        isIncomplete = true;
        notes = 'Missing punch-out recorded by terminal';
      } else if (emp.id === 'emp-11' && dayAgo === 18) {
        // Edge case: Unexcused Absent
        status = 'absent';
        checkIn = undefined;
        checkOut = undefined;
        hoursWorked = 0;
        notes = 'Unexcused absence without prior notice';
      } else if (emp.id === 'emp-22' && dayAgo === 7) {
        // Edge case: Absent
        status = 'absent';
        checkIn = undefined;
        checkOut = undefined;
        hoursWorked = 0;
        notes = 'Absent - Sick';
      } else if ((dayAgo + empNum) % 11 === 0) {
        // Occasional Late arrival pattern
        status = 'late';
        checkIn = '09:45';
        checkOut = '18:15';
        hoursWorked = 8.5;
        notes = 'Traffic delay - 45 min late';
      } else if ((dayAgo + empNum) % 19 === 0 && empNum > 10) {
        // Occasional Planned Casual Leave
        status = 'leave';
        checkIn = undefined;
        checkOut = undefined;
        hoursWorked = 0;
        notes = 'Single-day leave';
      } else {
        // Regular Present Day
        status = 'present';
        checkIn = dayOfWeek === 6 ? '09:30' : '09:00';
        checkOut = dayOfWeek === 6 ? '17:30' : '18:00';
        hoursWorked = dayOfWeek === 6 ? 8.0 : 9.0;
      }

      store.insert('attendanceRecords', {
        id: `att-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        date: dateStr,
        status,
        checkIn,
        checkOut,
        hoursWorked,
        isIncomplete,
        isEdited: false,
        notes
      });
    }
  });

  // =========================================================================
  // SEED 2 MONTHS OF PAYROLL RUNS (Prior Month Paid + Current Month Calculated)
  // =========================================================================
  const activeEmps = employeesData.filter(e => e.status === 'active');

  // 1. Prior Month (2026-08 / August 2026) - Fully Paid
  const augRunId = 'pr-2026-08-seed';
  const augLineItems: any[] = activeEmps.map(emp => {
    const totalDaysInMonth = 31;
    const isProRated = emp.daysJoined < 35; // e.g. recent joiners
    const daysEmployed = isProRated ? Math.min(totalDaysInMonth, emp.daysJoined) : totalDaysInMonth;
    const baseSalary = isProRated ? Math.round((daysEmployed / totalDaysInMonth) * emp.salary) : emp.salary;
    const basicSalary = Math.round(baseSalary * 0.50);
    const hra = Math.round(baseSalary * 0.30);
    const specialAllowance = Math.max(0, baseSalary - basicSalary - hra);
    const grossEarnings = basicSalary + hra + specialAllowance;

    const dailyRate = Math.round((emp.salary / totalDaysInMonth) * 100) / 100;
    const absentDays = emp.id === 'emp-11' ? 1 : 0;
    const attendanceDeduction = Math.round(absentDays * dailyRate);
    const statutoryDeductions = Math.round(basicSalary * 0.12);
    const totalDeductions = attendanceDeduction + statutoryDeductions;
    const netPay = Math.max(0, grossEarnings - totalDeductions);

    return {
      id: `pli-${augRunId}-${emp.id}`,
      payrollRunId: augRunId,
      employeeId: emp.id,
      baseSalary,
      hra,
      specialAllowance,
      grossEarnings,
      workingDays: totalDaysInMonth,
      presentDays: totalDaysInMonth - absentDays - (emp.id === 'emp-3' ? 2 : 0),
      lateDays: 2,
      leaveDays: emp.id === 'emp-3' ? 2 : 0,
      absentDays,
      hoursWorked: (totalDaysInMonth - absentDays) * 8.5,
      dailyRate,
      attendanceDeduction,
      statutoryDeductions,
      totalDeductions,
      netPay,
      isProRated,
      isAttendanceIncomplete: false,
      paymentStatus: 'paid' as const
    };
  });

  augLineItems.forEach(item => store.insert('payrollLineItems', item));

  const augTotalGross = augLineItems.reduce((sum, i) => sum + i.grossEarnings, 0);
  const augTotalDeductions = augLineItems.reduce((sum, i) => sum + i.totalDeductions, 0);
  const augTotalAmount = augLineItems.reduce((sum, i) => sum + i.netPay, 0);
  const augPaidDate = dateDaysAgo(5);

  store.insert('payrollRuns', {
    id: augRunId,
    businessId: 'b-1',
    month: '2026-08',
    totalEmployees: activeEmps.length,
    totalGross: augTotalGross,
    totalDeductions: augTotalDeductions,
    totalAmount: augTotalAmount,
    status: 'paid',
    calculatedAt: dateDaysAgo(7),
    approvedAt: dateDaysAgo(6),
    approvedBy: 'u-1',
    paidAt: augPaidDate,
    paidBy: 'u-5',
    ledgerEntryId: `le-pr-${augRunId}`,
    createdAt: dateDaysAgo(8)
  });

  // Finance debit ledger entry for August payroll
  store.insert('ledgerEntries', {
    id: `le-pr-${augRunId}`,
    businessId: 'b-1',
    outletId: 'o-1',
    amount: augTotalAmount,
    type: 'debit',
    sourceType: 'payroll',
    referenceId: augRunId,
    description: `Monthly Payroll Disbursement - 2026-08 (${activeEmps.length} Employees)`,
    category: 'Salaries',
    createdAt: augPaidDate
  });

  // 2. Current Month (2026-09 / September 2026) - Calculated / Ready for Review
  const sepRunId = 'pr-2026-09-seed';
  const sepLineItems: any[] = activeEmps.map(emp => {
    return mockApi.computeEmployeePayroll(emp.id, '2026-09', sepRunId);
  });

  sepLineItems.forEach(item => store.insert('payrollLineItems', item));

  const sepTotalGross = sepLineItems.reduce((sum, i) => sum + i.grossEarnings, 0);
  const sepTotalDeductions = sepLineItems.reduce((sum, i) => sum + i.totalDeductions, 0);
  const sepTotalAmount = sepLineItems.reduce((sum, i) => sum + i.netPay, 0);

  store.insert('payrollRuns', {
    id: sepRunId,
    businessId: 'b-1',
    month: '2026-09',
    totalEmployees: activeEmps.length,
    totalGross: sepTotalGross,
    totalDeductions: sepTotalDeductions,
    totalAmount: sepTotalAmount,
    status: 'calculated',
    calculatedAt: now,
    createdAt: now
  });

  console.log('Database seeded with bootstrap data, RFM churn history, 25 employees, 30-day attendance, and 2 months payroll history.');
}


