/**
 * Comprehensive synthetic demo-data generator.
 *
 * All transactional data is created through the real service-layer functions in
 * `mockApi` (recordSale, createOrder, updateOrderStatus, markInvoicePaid,
 * addExpense, recordAttendance, payroll runs, computeAllChurnScores, ...) so that
 * ledger entries, invoices, inventory, customer balances and churn scores stay
 * internally consistent.
 *
 * Because those functions stamp records with the current time, a temporary
 * virtual clock back-dates each call to give a realistic 90-day history.
 */
import { store } from '../services/store';
import { mockApi, seedControl } from '../services/mockApi';
import { eventBus } from '../services/eventBus';
import { DEFAULT_TEMPLATES, interpolateTemplate } from '../services/mockMessaging';
import type { MessageLog, Notification, Role } from '../types';

const RealDate = Date;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Utilities: seeded PRNG + virtual clock
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let virtualMs: number | null = null;
const usedMs = new Set<number>();

function installClock() {
  class FakeDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(virtualMs ?? RealDate.now());
      } else {
        super(...(args as [any]));
      }
    }
    static now() {
      return virtualMs ?? RealDate.now();
    }
  }
  (globalThis as any).Date = FakeDate;
}

function restoreClock() {
  (globalThis as any).Date = RealDate;
  virtualMs = null;
}

function setClock(ms: number) {
  let m = Math.floor(ms);
  while (usedMs.has(m)) m += 1; // keep Date.now()-based invoice numbers unique
  usedMs.add(m);
  virtualMs = m;
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (ms: number) => {
  const d = new RealDate(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ---------------------------------------------------------------------------
// Static catalogues
// ---------------------------------------------------------------------------
const OUTLETS = [
  { id: 'o-1', name: 'Downtown Branch', address: '123 Main St, Downtown' },
  { id: 'o-2', name: 'Westside Market', address: '456 West Ave' },
  { id: 'o-3', name: 'Eastside Mall', address: '789 East Blvd' },
];
const CASHIER_BY_OUTLET: Record<string, string> = { 'o-1': 'u-3', 'o-2': 'u-4', 'o-3': 'u-7' };

type ProductTemplate = [name: string, price: number, cost: number];
const PRODUCT_CATALOGUE: { category: string; items: ProductTemplate[] }[] = [
  { category: 'Grocery & Staples', items: [['Basmati Rice (5kg)', 450, 350], ['Chakki Fresh Atta (10kg)', 420, 330], ['Organic Toor Dal (1kg)', 180, 130], ['Sugar (5kg)', 235, 190], ['Poha (1kg)', 70, 52]] },
  { category: 'Edible Oils', items: [['Fortune Sunflower Oil (1L)', 165, 135], ['Mustard Oil (1L)', 190, 155], ['Groundnut Oil (1L)', 210, 170], ['Olive Oil (500ml)', 520, 430], ['Rice Bran Oil (1L)', 155, 125]] },
  { category: 'Spices & Seasoning', items: [['Tata Salt (1kg)', 28, 20], ['Turmeric Powder (200g)', 65, 45], ['Red Chilli Powder (200g)', 80, 58], ['Garam Masala (100g)', 95, 68], ['Cumin Seeds (250g)', 120, 88]] },
  { category: 'Beverages', items: [['Masala Chai Gold (500g)', 290, 210], ['Filter Coffee (250g)', 260, 190], ['Green Tea (100 bags)', 340, 250], ['Mango Juice (1L)', 110, 80], ['Coconut Water (200ml)', 40, 28]] },
  { category: 'Dry Fruits', items: [['California Almonds (500g)', 450, 360], ['Whole Cashews (500g)', 520, 410], ['Raisins (500g)', 210, 160], ['Walnuts (250g)', 380, 300], ['Dates (500g)', 240, 180]] },
  { category: 'Dairy & Ghee', items: [['Pure Cow Ghee (1L)', 650, 510], ['Paneer (200g)', 90, 68], ['Butter (500g)', 270, 215], ['Cheese Slices (200g)', 135, 100], ['Curd (1kg)', 75, 55]] },
  { category: 'Packaged Food', items: [['Instant Noodles (Pack of 6)', 90, 66], ['Salted Biscuits (400g)', 55, 38], ['Tomato Ketchup (1kg)', 145, 105], ['Corn Flakes (500g)', 195, 145], ['Peanut Butter (340g)', 220, 165]] },
  { category: 'Cookware', items: [['Stainless Steel Kadhai', 850, 600], ['Pressure Cooker (5L)', 1450, 1080], ['Non-stick Tawa', 640, 450], ['Steel Lunch Box', 380, 270], ['Glass Container Set', 720, 520]] },
  { category: 'Household', items: [['Dish Wash Liquid (1L)', 130, 95], ['Floor Cleaner (1L)', 160, 118], ['Laundry Detergent (2kg)', 340, 255], ['Garbage Bags (30pc)', 110, 78], ['Kitchen Towels (2 rolls)', 140, 100]] },
  { category: 'Personal Care', items: [['Herbal Shampoo (340ml)', 245, 180], ['Bathing Soap (Pack of 4)', 160, 115], ['Toothpaste (200g)', 105, 75], ['Face Wash (100ml)', 190, 135], ['Hand Sanitizer (500ml)', 180, 130]] },
  { category: 'Stationery', items: [['Notebook Pack (6)', 240, 170], ['Ball Pens (Box of 20)', 180, 125], ['A4 Paper Ream', 380, 290], ['Marker Set', 150, 105], ['Stapler', 110, 75]] },
  { category: 'Electronics', items: [['LED Bulb 9W (Pack of 4)', 320, 230], ['Extension Board 6-Socket', 540, 390], ['Power Bank 10000mAh', 1299, 980], ['USB Charger 20W', 599, 430], ['Earphones', 449, 310]] },
];

const MISSING_BARCODE_IDX = new Set([7, 22, 41, 53]);
const MALFORMED_BARCODES: Record<number, string> = {
  13: 'BAD!!CODE#99',
  29: 'X1',
  47: '89010 5885 1',
  58: '#NOBARCODE#',
};

function ean13(body12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  return body12 + String((10 - (sum % 10)) % 10);
}

const CUSTOMER_FIRST = ['Aarav', 'Priya', 'Rohan', 'Meera', 'Vikram', 'Anjali', 'Karan', 'Sneha', 'Arjun', 'Divya', 'Rahul', 'Pooja', 'Amit', 'Neha', 'Sanjay', 'Kavita', 'Manish', 'Ritu', 'Deepak', 'Swati', 'Nikhil', 'Isha', 'Varun', 'Tanvi', 'Harsh'];
const CUSTOMER_LAST = ['Sharma', 'Gupta', 'Patel', 'Singh', 'Mehta', 'Iyer', 'Reddy', 'Nair', 'Kapoor', 'Joshi'];
const BUSINESS_SUFFIX = ['Traders', 'Enterprises', 'Stores', 'Mart', 'Distributors'];

const EMPLOYEE_ROSTER: { name: string; role: string; department: string; salary: number }[] = [
  { name: 'Ramesh Kulkarni', role: 'Store Manager', department: 'Operations', salary: 55000 },
  { name: 'Sunita Deshmukh', role: 'Assistant Manager', department: 'Operations', salary: 42000 },
  { name: 'Mohan Das', role: 'Senior Cashier', department: 'Billing', salary: 24000 },
  { name: 'Lakshmi Pillai', role: 'Cashier', department: 'Billing', salary: 20000 },
  { name: 'Farhan Sheikh', role: 'Cashier', department: 'Billing', salary: 19500 },
  { name: 'Geeta Bhatt', role: 'Cashier', department: 'Billing', salary: 19000 },
  { name: 'Suresh Yadav', role: 'Inventory Lead', department: 'Inventory', salary: 32000 },
  { name: 'Anita Chauhan', role: 'Stock Associate', department: 'Inventory', salary: 18000 },
  { name: 'Prakash Jadhav', role: 'Stock Associate', department: 'Inventory', salary: 17500 },
  { name: 'Rekha Menon', role: 'Sales Associate', department: 'Sales', salary: 21000 },
  { name: 'Imran Qureshi', role: 'Sales Associate', department: 'Sales', salary: 21500 },
  { name: 'Shalini Rao', role: 'Sales Associate', department: 'Sales', salary: 20500 },
  { name: 'Dinesh Verma', role: 'Sales Executive', department: 'Sales', salary: 26000 },
  { name: 'Kiran Naik', role: 'Delivery Executive', department: 'Delivery', salary: 18500 },
  { name: 'Ajay Thakur', role: 'Delivery Executive', department: 'Delivery', salary: 18000 },
  { name: 'Salma Khan', role: 'Delivery Executive', department: 'Delivery', salary: 18200 },
  { name: 'Vinod Pandey', role: 'Security Guard', department: 'Operations', salary: 15000 },
  { name: 'Usha Rani', role: 'Housekeeping', department: 'Operations', salary: 14000 },
  { name: 'Tarun Malhotra', role: 'Accounts Executive', department: 'Admin', salary: 34000 },
  { name: 'Bhavna Shah', role: 'HR Executive', department: 'Admin', salary: 33000 },
  { name: 'Gopal Krishnan', role: 'Warehouse Supervisor', department: 'Inventory', salary: 29000 },
  { name: 'Nandini Bose', role: 'Customer Support', department: 'Sales', salary: 22000 },
  { name: 'Yash Agarwal', role: 'Sales Associate', department: 'Sales', salary: 20000 }, // joins mid previous month
  { name: 'Pallavi Hegde', role: 'Cashier', department: 'Billing', salary: 19000 }, // joins mid month before that
  { name: 'Rohit Chauhan', role: 'Floor Supervisor', department: 'Operations', salary: 31000 },
  { name: 'Kavita Nair', role: 'Billing Lead', department: 'Billing', salary: 27500 },
  { name: 'Manoj Tiwari', role: 'Inventory Associate', department: 'Inventory', salary: 18500 },
  { name: 'Deepika Joshi', role: 'Sales Executive', department: 'Sales', salary: 25500 },
  { name: 'Sandeep Kulkarni', role: 'Delivery Lead', department: 'Delivery', salary: 24500 },
  { name: 'Meenakshi Iyer', role: 'Cashier', department: 'Billing', salary: 19500 }, // inactive
  { name: 'Rajeshwari Devi', role: 'Housekeeping', department: 'Operations', salary: 14500 }, // inactive
  { name: 'Ashok Rane', role: 'Packer', department: 'Inventory', salary: 16000 }, // inactive
];

const BANKS = [
  { name: 'HDFC Bank', ifscPrefix: 'HDFC000' },
  { name: 'ICICI Bank', ifscPrefix: 'ICIC000' },
  { name: 'State Bank of India', ifscPrefix: 'SBIN000' },
  { name: 'Axis Bank', ifscPrefix: 'UTIB000' },
  { name: 'Kotak Mahindra Bank', ifscPrefix: 'KKBK000' },
];
const RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Guardian'];

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------
interface SalePlan {
  daysAgo: number;
  hour: number;
  minute: number;
  outletId: string;
  custIdx?: number;
  items: { p: number; q: number }[];
  returned?: boolean;
}

export interface DemoDataSummary {
  outlets: number;
  users: number;
  employees: number;
  products: number;
  customers: number;
  orders: number;
  ordersByStatus: Record<string, number>;
  invoices: number;
  invoicesByStatus: Record<string, number>;
  sales: number;
  expenses: number;
  attendanceRecords: number;
  payrollRuns: number;
  churnScores: number;
  notifications: number;
  messageLogs: number;
}

let generating = false;

export async function generateDemoData(): Promise<DemoDataSummary> {
  if (generating) throw new Error('Demo data generation already in progress');
  generating = true;

  const rng = mulberry32((RealDate.now() ^ 0x9e3779b9) >>> 0);
  const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
  const chance = (p: number) => rng() < p;

  seedControl.fast = true;
  eventBus.muted = true;
  store.beginBatch();
  usedMs.clear();

  try {
    installClock();
    store.reset();

    const todayStart = (() => {
      const d = new RealDate();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const atDay = (daysAgo: number, hour = 10, minute = 0) =>
      todayStart - daysAgo * DAY_MS + (hour * 60 + minute) * 60_000;

    // ----- Business, outlets, users (no service layer for these) -----
    setClock(atDay(200, 9));
    const nowIso = () => new RealDate().toISOString();
    store.insert('businesses', {
      id: 'b-1',
      name: 'Vyapari Superstore',
      taxId: '29AAAAA1111A1Z5',
      address: '123 Main St, Downtown',
      phone: '+91 98100 00001',
      currency: 'INR',
      createdAt: nowIso(),
    });
    OUTLETS.forEach(o => store.insert('outlets', { ...o, businessId: 'b-1', createdAt: nowIso() }));

    const userSeeds: { id: string; name: string; email: string; role: Role; outletId?: string }[] = [
      { id: 'u-1', name: 'Admin', email: 'admin@vyapari.com', role: 'owner' },
      { id: 'u-2', name: 'Bob Manager', email: 'bob@test.com', role: 'manager', outletId: 'o-1' },
      { id: 'u-3', name: 'Charlie Cashier', email: 'charlie@test.com', role: 'cashier', outletId: 'o-1' },
      { id: 'u-4', name: 'Dave Cashier', email: 'dave@test.com', role: 'cashier', outletId: 'o-2' },
      { id: 'u-5', name: 'Eve Accountant', email: 'eve@test.com', role: 'accountant' },
      { id: 'u-6', name: 'Fiona Manager', email: 'fiona@test.com', role: 'manager', outletId: 'o-2' },
      { id: 'u-7', name: 'Gita Cashier', email: 'gita@test.com', role: 'cashier', outletId: 'o-3' },
    ];
    userSeeds.forEach(u => store.insert('users', { ...u, businessId: 'b-1', createdAt: nowIso() }));

    // ----- Product specs (stock-status plan, barcodes, popularity) -----
    const flatProducts: { category: string; name: string; price: number; cost: number }[] = [];
    PRODUCT_CATALOGUE.forEach(c =>
      c.items.forEach(([name, price, cost]) => flatProducts.push({ category: c.category, name, price, cost }))
    );
    const PRODUCT_COUNT = flatProducts.length; // 60

    // Stock status plan: 28 Healthy, 10 Low, 8 Critical, 6 Out of Stock, 8 Overstock
    const statusPlan: ('healthy' | 'low' | 'critical' | 'oos' | 'overstock')[] = [
      ...Array(28).fill('healthy'),
      ...Array(10).fill('low'),
      ...Array(8).fill('critical'),
      ...Array(6).fill('oos'),
      ...Array(8).fill('overstock'),
    ];
    for (let i = statusPlan.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [statusPlan[i], statusPlan[j]] = [statusPlan[j], statusPlan[i]];
    }

    const reorderLevels = flatProducts.map(() => [10, 15, 20, 25][randInt(0, 3)]);
    const stockTargetFor = (status: string, r: number) => {
      switch (status) {
        case 'oos':
          return 0;
        case 'critical':
          return randInt(1, Math.max(1, Math.floor(r * 0.25)));
        case 'low':
          return randInt(Math.floor(r * 0.25) + 1, r);
        case 'overstock':
          return randInt(r * 3, r * 5 + 20);
        default:
          return randInt(r + 1, r * 3 - 1);
      }
    };
    const targetO1 = flatProducts.map((_, i) => stockTargetFor(statusPlan[i], reorderLevels[i]));
    const targetOther = flatProducts.map((_, i) => ({
      'o-2': stockTargetFor('healthy', reorderLevels[i]),
      'o-3': stockTargetFor('healthy', reorderLevels[i]),
    }));

    // Popularity weights give varying sales-history depth (drives forecast confidence)
    const weights = flatProducts.map(() => 0.15 + Math.pow(rng(), 2) * 3);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const pickProduct = (exclude: Set<number>) => {
      for (let attempt = 0; attempt < 30; attempt++) {
        let r = rng() * totalWeight;
        for (let i = 0; i < PRODUCT_COUNT; i++) {
          r -= weights[i];
          if (r <= 0) {
            if (!exclude.has(i)) return i;
            break;
          }
        }
      }
      for (let i = 0; i < PRODUCT_COUNT; i++) if (!exclude.has(i)) return i;
      return 0;
    };
    const pickDistinct = (n: number) => {
      const used = new Set<number>();
      const out: number[] = [];
      for (let k = 0; k < n; k++) {
        const p = pickProduct(used);
        used.add(p);
        out.push(p);
      }
      return out;
    };

    // ----- Customer specs: 50 customers across 10 behavioural groups -----
    interface CustSpec {
      name: string;
      type: 'retail' | 'wholesale';
      optIn: boolean;
      group: number;
      phone: string;
      email: string;
      address: string;
    }
    const GROUPS = [
      { label: 'Loyal frequent', interval: 14, lastAgo: [3, 5], maxPurchases: 7 },
      { label: 'Regular monthly (on track)', interval: 30, lastAgo: [16, 22], maxPurchases: 3 },
      { label: 'Slightly overdue', interval: 20, lastAgo: [30, 33], maxPurchases: 3 },
      { label: 'Significantly overdue', interval: 14, lastAgo: [44, 48], maxPurchases: 4 },
      { label: 'Lapsed wholesale', interval: 12, lastAgo: [62, 66], maxPurchases: 3 },
      { label: 'Single recent purchase', interval: 0, lastAgo: [5, 25], maxPurchases: 1 },
      { label: 'Single old purchase', interval: 0, lastAgo: [40, 85], maxPurchases: 1 },
      { label: 'Never purchased', interval: 0, lastAgo: [0, 0], maxPurchases: 0 },
      { label: 'Opted-out messaging', interval: 21, lastAgo: [38, 42], maxPurchases: 3 },
      { label: 'Credit wholesale accounts', interval: 0, lastAgo: [0, 0], maxPurchases: 0 },
    ];
    const customerSpecs: CustSpec[] = Array.from({ length: 50 }, (_, i) => {
      const group = Math.floor(i / 5);
      const type: 'retail' | 'wholesale' =
        group === 4 || group === 9 || (group === 1 && i % 5 === 4) ? 'wholesale' : 'retail';
      const first = CUSTOMER_FIRST[i % 25];
      const last = CUSTOMER_LAST[(i * 3 + Math.floor(i / 25)) % 10];
      const name = type === 'wholesale' ? `${last} ${BUSINESS_SUFFIX[i % 5]}` : `${first} ${last}`;
      const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
      return {
        name,
        type,
        optIn: group !== 8,
        group,
        phone: `+91 9${randInt(1000, 9999)} ${randInt(10000, 99999)}`,
        email: `${slug}${i}@example.com`,
        address: `${randInt(1, 200)}, ${['MG Road', 'Station Road', 'Market Street', 'Gandhi Nagar', 'Civil Lines'][i % 5]}, ${['New Delhi', 'Bengaluru', 'Mumbai', 'Pune', 'Jaipur'][Math.floor(i / 10)]}`,
      };
    });

    // ----- Sale plans -----
    const salePlans: SalePlan[] = [];
    const customerFavourites: number[][] = [];
    customerSpecs.forEach((c, idx) => {
      const g = GROUPS[c.group];
      customerFavourites[idx] = pickDistinct(c.group === 9 ? 3 : chance(0.4) ? 2 : 1);
      if (g.maxPurchases === 0) return;
      const last = randInt(g.lastAgo[0], g.lastAgo[1]);
      const outletId = OUTLETS[idx % 3].id;
      for (let k = 0; k < g.maxPurchases; k++) {
        let daysAgo = last + k * g.interval;
        if (k > 0 && g.interval >= 20) daysAgo += randInt(-1, 1);
        if (daysAgo > 88 || daysAgo < 1) break;
        salePlans.push({
          daysAgo,
          hour: randInt(9, 20),
          minute: randInt(0, 59),
          outletId,
          custIdx: idx,
          items: customerFavourites[idx].map(p => ({
            p,
            q: c.type === 'wholesale' ? randInt(6, 24) : randInt(1, 4),
          })),
        });
      }
    });

    // Walk-in sales with a gently growing 90-day trend and weekend bumps
    let walkInCount = 0;
    for (let d = 89; d >= 1; d--) {
      const weekday = new RealDate(atDay(d, 12)).getDay();
      const base = 0.5 + 1.3 * (1 - d / 95) + (weekday === 0 || weekday === 6 ? 0.6 : 0);
      const n = Math.floor(base + rng() * 1.1);
      for (let k = 0; k < n; k++) {
        const roll = rng();
        const outletId = roll < 0.55 ? 'o-1' : roll < 0.83 ? 'o-2' : 'o-3';
        const picked = pickDistinct(randInt(1, 4));
        const hasOosOnO1 = outletId === 'o-1' && picked.some(p => statusPlan[p] === 'oos');
        const plan: SalePlan = {
          daysAgo: d,
          hour: randInt(9, 20),
          minute: randInt(0, 59),
          outletId,
          items: picked.map(p => ({ p, q: randInt(1, 3) })),
        };
        walkInCount += 1;
        if (!hasOosOnO1 && walkInCount % 13 === 5 && d > 3 && salePlans.filter(s => s.returned).length < 8) {
          plan.returned = true;
        }
        salePlans.push(plan);
      }
    }

    // Run sales chronologically (oldest first) so inventory never dips below 0 before restock/returns
    salePlans.sort((a, b) => b.daysAgo - a.daysAgo || a.hour - b.hour || a.minute - b.minute);

    // ----- Opening stock = target + net sold - planned restock -----
    const sold: Record<string, number[]> = {
      'o-1': Array(PRODUCT_COUNT).fill(0),
      'o-2': Array(PRODUCT_COUNT).fill(0),
      'o-3': Array(PRODUCT_COUNT).fill(0),
    };
    salePlans.forEach(plan => {
      if (plan.returned) return;
      plan.items.forEach(it => {
        sold[plan.outletId][it.p] += it.q;
      });
    });
    const restockQty = flatProducts.map((_, i) =>
      i % 4 === 1 && targetO1[i] > 0 && statusPlan[i] !== 'overstock'
        ? Math.min(targetO1[i], randInt(10, 40))
        : 0
    );

    // ----- Products via addProduct (+ inventory for other outlets) -----
    const productIds: string[] = [];
    for (let i = 0; i < PRODUCT_COUNT; i++) {
      const spec = flatProducts[i];
      let barcode: string | undefined;
      if (MISSING_BARCODE_IDX.has(i)) barcode = undefined;
      else if (MALFORMED_BARCODES[i]) barcode = MALFORMED_BARCODES[i];
      else barcode = ean13(`8901058${String(i + 1).padStart(5, '0')}`);

      setClock(atDay(120, 9, i % 50));
      const open1 = targetO1[i] + sold['o-1'][i] - restockQty[i];
      const { product } = await mockApi.addProduct({
        businessId: 'b-1',
        name: spec.name,
        sku: `SKU-${1001 + i}`,
        barcode,
        category: spec.category,
        price: spec.price,
        cost: spec.cost,
        initialStock: open1,
        reorderLevel: reorderLevels[i],
        outletId: 'o-1',
      });
      productIds.push(product.id);

      (['o-2', 'o-3'] as const).forEach(oid => {
        const open = targetOther[i][oid] + sold[oid][i];
        store.insert('inventoryRecords', {
          id: `inv-${product.id}-${oid}`,
          productId: product.id,
          outletId: oid,
          quantity: open,
          reorderLevel: reorderLevels[i],
          lastUpdated: nowIso(),
        });
        if (open > 0) {
          store.insert('stockMovements', {
            id: `sm-open-${product.id}-${oid}`,
            productId: product.id,
            outletId: oid,
            quantityChange: open,
            type: 'in',
            createdAt: nowIso(),
          });
        }
      });
    }

    // ----- Customers via createCustomer -----
    const customerIds: string[] = [];
    for (let i = 0; i < customerSpecs.length; i++) {
      const c = customerSpecs[i];
      setClock(atDay(randInt(100, 170), randInt(9, 18), randInt(0, 59)));
      const created = await mockApi.createCustomer({
        businessId: 'b-1',
        name: c.name,
        phone: c.phone,
        email: c.email,
        type: c.type,
        address: c.address,
        optInForMessages: c.optIn,
      });
      customerIds.push(created.id);
    }

    // ----- Execute POS sales via recordSale (returns restocked immediately) -----
    const productPrice = (p: number) => flatProducts[p].price;
    let returnedOrders = 0;
    for (const plan of salePlans) {
      const saleMs = atDay(plan.daysAgo, plan.hour, plan.minute);
      setClock(saleMs);
      const { order } = await mockApi.recordSale({
        businessId: 'b-1',
        outletId: plan.outletId,
        cashierId: CASHIER_BY_OUTLET[plan.outletId],
        customerId: plan.custIdx !== undefined ? customerIds[plan.custIdx] : undefined,
        items: plan.items.map(it => ({
          productId: productIds[it.p],
          quantity: it.q,
          unitPrice: productPrice(it.p),
        })),
      });
      // recordSale does not write stock movements — record them for consistency
      plan.items.forEach((it, n) => {
        store.insert('stockMovements', {
          id: `sm-sale-${order.id}-${n}`,
          productId: productIds[it.p],
          outletId: plan.outletId,
          quantityChange: -it.q,
          type: 'sale',
          referenceId: order.id,
          createdAt: order.createdAt,
        });
      });

      if (plan.returned) {
        setClock(saleMs + 3 * 3_600_000);
        await mockApi.updateOrderStatus(order.id, 'returned');
        store.insert('ledgerEntries', {
          id: `le-refund-${order.id}`,
          businessId: 'b-1',
          outletId: plan.outletId,
          amount: order.totalAmount,
          type: 'debit',
          sourceType: 'adjustment',
          referenceId: order.id,
          description: `Refund for returned order #${order.id.substring(0, 8)}`,
          category: 'Refunds',
          createdAt: nowIso(),
        });
        returnedOrders += 1;
      }
    }

    // ----- Manual credit orders for group 9 (every order status & payment status) -----
    type Outcome = {
      ago: number;
      final: 'pending' | 'confirmed' | 'processing' | 'ready' | 'cancelled';
      pay?: 'partial' | 'full';
    };
    const baseOutcomes: Outcome[] = [
      { ago: 72, final: 'ready' }, // overdue
      { ago: 54, final: 'processing' }, // overdue
      { ago: 36, final: 'ready', pay: 'partial' }, // partially paid, past due
      { ago: 22, final: 'ready', pay: 'full' }, // paid in full
      { ago: 9, final: 'confirmed' },
      { ago: 2, final: 'pending' },
    ];
    const STATUS_PATH = ['confirmed', 'processing', 'ready'] as const;
    for (let c = 45; c < 50; c++) {
      const outcomes = baseOutcomes.map((o, j) =>
        j === 5 && c < 47 ? ({ ago: 4, final: 'cancelled' } as Outcome) : o
      );
      for (const o of outcomes) {
        const orderMs = atDay(o.ago + randInt(0, 2), randInt(9, 17), randInt(0, 59));
        setClock(orderMs);
        const picks = pickDistinct(randInt(2, 4));
        const order = await mockApi.createOrder({
          outletId: OUTLETS[c % 3].id,
          cashierId: CASHIER_BY_OUTLET[OUTLETS[c % 3].id],
          customerId: customerIds[c],
          items: picks.map(p => ({ productId: productIds[p], quantity: randInt(8, 30), unitPrice: productPrice(p) })),
        });

        let tMs = orderMs;
        if (o.final === 'cancelled') {
          setClock((tMs += 3 * 3_600_000));
          await mockApi.updateOrderStatus(order.id, 'cancelled');
          continue;
        }
        for (const step of STATUS_PATH) {
          if (o.final === 'pending') break;
          setClock((tMs += 2 * 3_600_000));
          await mockApi.updateOrderStatus(order.id, step);
          if (step === o.final) break;
        }
        if (o.pay) {
          const inv = store.getState().invoices.find(i => i.orderId === order.id);
          if (inv) {
            setClock(tMs + DAY_MS);
            const amount = o.pay === 'full' ? inv.amount : Math.floor(inv.amount * 0.4);
            await mockApi.markInvoicePaid(inv.id, amount, chance(0.5) ? 'upi' : 'bank_transfer');
          }
        }
      }
    }

    // Walk-in manual orders that end up cancelled
    for (let k = 0; k < 6; k++) {
      const ms = atDay(randInt(6, 80), randInt(9, 18), randInt(0, 59));
      setClock(ms);
      const outletId = OUTLETS[k % 3].id;
      const picks = pickDistinct(randInt(1, 3));
      const order = await mockApi.createOrder({
        outletId,
        cashierId: CASHIER_BY_OUTLET[outletId],
        items: picks.map(p => ({ productId: productIds[p], quantity: randInt(1, 4), unitPrice: productPrice(p) })),
      });
      setClock(ms + 3_600_000);
      await mockApi.updateOrderStatus(order.id, 'cancelled');
    }

    // Restock receipts via adjustStock (keeps stock movements consistent with levels)
    for (let i = 0; i < PRODUCT_COUNT; i++) {
      if (restockQty[i] > 0) {
        setClock(atDay(3, 11, i % 50));
        await mockApi.adjustStock({
          productId: productIds[i],
          outletId: 'o-1',
          change: restockQty[i],
          reason: 'in',
        });
      }
    }

    // ----- Employees + 30+ days of attendance -----
    const empRng = (n: number) => randInt(0, n);
    const yNow = new RealDate(todayStart).getFullYear();
    const moNow = new RealDate(todayStart).getMonth();
    const ym = (off: number) => {
      const d = new RealDate(yNow, moNow - off, 1);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    };
    const m1 = ym(1);
    const m2 = ym(2);
    const m2Start = new RealDate(yNow, moNow - 2, 1).getTime();
    const attendanceSpan = Math.round((todayStart - m2Start) / DAY_MS);

    const employeeIds: { id: string; joining: string; inactive: boolean; idx: number }[] = [];
    for (let i = 0; i < EMPLOYEE_ROSTER.length; i++) {
      const e = EMPLOYEE_ROSTER[i];
      let joiningDate = fmtDate(atDay(randInt(180, 1600)));
      if (i === 22) joiningDate = `${m1}-10`;
      if (i === 23) joiningDate = `${m2}-18`;
      const inactive = i >= EMPLOYEE_ROSTER.length - 3;
      const bank = BANKS[i % BANKS.length];
      const lastName = e.name.split(' ').slice(-1)[0];
      const emp = await mockApi.createEmployee({
        businessId: 'b-1',
        outletId: OUTLETS[i % 3].id,
        name: e.name,
        role: e.role,
        department: e.department,
        phone: `+91 9${randInt(1000, 9999)} ${randInt(10000, 99999)}`,
        email: `${e.name.toLowerCase().replace(/[^a-z]+/g, '.')}@vyapari.com`,
        joiningDate,
        salary: e.salary,
        status: inactive ? 'inactive' : 'active',
        panNumber: `${String.fromCharCode(65 + (i % 20))}BCDE${randInt(1000, 9999)}F`,
        bankDetails: {
          accountNo: `${randInt(10000000, 99999999)}${randInt(1000, 9999)}`,
          ifsc: `${bank.ifscPrefix}${randInt(1000, 9999)}`,
          bankName: bank.name,
        },
        emergencyContact: {
          name: `${CUSTOMER_FIRST[(i * 3) % CUSTOMER_FIRST.length]} ${lastName}`,
          relation: RELATIONS[i % RELATIONS.length],
          phone: `+91 9${randInt(1000, 9999)} ${randInt(10000, 99999)}`,
        },
      });
      // Vary leave balances realistically
      store.update('employees', emp.id, {
        leaveBalance: {
          paid: randInt(4, 15),
          casual: randInt(2, 10),
          sick: randInt(1, 8),
        },
      });
      employeeIds.push({ id: emp.id, joining: joiningDate, inactive, idx: i });
    }

    let incompleteEmployeeMarked = 0;
    for (let d = attendanceSpan; d >= 1; d--) {
      const dayMs = atDay(d, 20);
      if (new RealDate(dayMs).getDay() === 0) continue; // closed Sundays
      setClock(dayMs);
      const dateStr = fmtDate(dayMs);
      for (const emp of employeeIds) {
        if (emp.inactive || emp.joining > dateStr) continue;
        // Employees #6 and #14 forget to check out on recent working days (incomplete attendance edge case)
        if ((emp.idx === 6 || emp.idx === 14) && d <= 4 && incompleteEmployeeMarked < 4) {
          incompleteEmployeeMarked += 1;
          await mockApi.recordAttendance({
            employeeId: emp.id,
            date: dateStr,
            status: 'present',
            checkIn: '09:05',
            notes: 'Missing check-out',
          });
          continue;
        }

        // Distinct attendance profiles so the employee dashboard displays varied rates
        const profile = emp.idx % 5;
        const roll = rng();
        if (profile === 0) {
          // Exemplary / Punctual (~98-100%)
          if (roll < 0.03) {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'late',
              checkIn: `09:${pad(20 + empRng(15))}`,
              checkOut: `18:${pad(15 + empRng(30))}`,
            });
          } else {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'present',
              checkIn: `08:${pad(45 + empRng(14))}`,
              checkOut: `18:${pad(empRng(35))}`,
            });
          }
        } else if (profile === 1) {
          // Frequent Latecomer (~85-92%, high late ratio)
          if (roll < 0.06) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'absent' });
          } else if (roll < 0.42) {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'late',
              checkIn: `10:${pad(5 + empRng(45))}`,
              checkOut: `18:${pad(15 + empRng(35))}`,
              notes: 'Delayed arrival',
            });
          } else {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'present',
              checkIn: `09:${pad(empRng(15))}`,
              checkOut: `18:${pad(empRng(30))}`,
            });
          }
        } else if (profile === 2) {
          // High Absenteeism (<75% attendance)
          if (roll < 0.24) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'absent', notes: 'Unexcused absence' });
          } else if (roll < 0.34) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'leave', notes: 'Sick / personal leave' });
          } else if (roll < 0.48) {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'late',
              checkIn: `10:${pad(15 + empRng(35))}`,
              checkOut: `17:${pad(30 + empRng(29))}`,
            });
          } else {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'present',
              checkIn: `09:${pad(empRng(12))}`,
              checkOut: `18:${pad(empRng(20))}`,
            });
          }
        } else if (profile === 3) {
          // Leave-heavy (~80-86%)
          if (roll < 0.08) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'absent' });
          } else if (roll < 0.22) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'leave', notes: 'Approved leave' });
          } else if (roll < 0.32) {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'late',
              checkIn: `09:${pad(45 + empRng(14))}`,
              checkOut: `18:${pad(empRng(30))}`,
            });
          } else {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'present',
              checkIn: `08:${pad(52 + empRng(7))}`,
              checkOut: `18:${pad(empRng(30))}`,
            });
          }
        } else {
          // Standard (~90-95%)
          if (roll < 0.05) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'absent' });
          } else if (roll < 0.1) {
            await mockApi.recordAttendance({ employeeId: emp.id, date: dateStr, status: 'leave', notes: 'Approved leave' });
          } else if (roll < 0.18) {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'late',
              checkIn: `10:${pad(10 + empRng(30))}`,
              checkOut: `18:${pad(empRng(30))}`,
            });
          } else {
            await mockApi.recordAttendance({
              employeeId: emp.id,
              date: dateStr,
              status: 'present',
              checkIn: `08:${pad(50 + empRng(9))}`,
              checkOut: `18:${pad(empRng(30))}`,
            });
          }
        }
      }
    }

    // Seed varied Leave Records (approved, pending, rejected across types)
    const leaveTemplates: {
      empIdx: number;
      type: 'paid' | 'casual' | 'sick' | 'unpaid';
      startAgo: number;
      days: number;
      status: 'approved' | 'pending' | 'rejected';
      reason: string;
    }[] = [
      { empIdx: 1, type: 'paid', startAgo: 18, days: 2, status: 'approved', reason: 'Family function out of town' },
      { empIdx: 2, type: 'sick', startAgo: 12, days: 1, status: 'approved', reason: 'Seasonal fever' },
      { empIdx: 3, type: 'casual', startAgo: 5, days: 1, status: 'pending', reason: 'Personal bank work' },
      { empIdx: 5, type: 'unpaid', startAgo: 22, days: 3, status: 'approved', reason: 'Extended travel' },
      { empIdx: 7, type: 'casual', startAgo: 2, days: 2, status: 'pending', reason: 'Relocation assistance' },
      { empIdx: 8, type: 'paid', startAgo: 28, days: 2, status: 'rejected', reason: 'Peak festival weekend staffing' },
      { empIdx: 10, type: 'sick', startAgo: 9, days: 2, status: 'approved', reason: 'Dental procedure & recovery' },
      { empIdx: 12, type: 'casual', startAgo: 1, days: 1, status: 'pending', reason: 'Doctor appointment' },
      { empIdx: 15, type: 'unpaid', startAgo: 15, days: 2, status: 'approved', reason: 'Urgent family travel' },
      { empIdx: 18, type: 'paid', startAgo: 25, days: 3, status: 'approved', reason: 'Annual vacation' },
    ];
    for (const lt of leaveTemplates) {
      const targetEmp = employeeIds[lt.empIdx];
      if (!targetEmp) continue;
      setClock(atDay(lt.startAgo + 2, 11));
      const leave = await mockApi.applyLeave({
        employeeId: targetEmp.id,
        type: lt.type,
        startDate: fmtDate(atDay(lt.startAgo)),
        endDate: fmtDate(atDay(Math.max(1, lt.startAgo - lt.days + 1))),
        reason: lt.reason,
      });
      if (lt.status !== 'pending') {
        store.update('leaveRecords', leave.id, {
          status: lt.status,
          approvedBy: 'u-1',
        });
      }
    }

    // ----- Payroll history via service layer -----
    const runMonth = async (month: string, calcMs: number, approveMs: number, paidMs: number) => {
      const clamp = (ms: number) => Math.min(ms, atDay(1, 10));
      setClock(clamp(calcMs));
      const run = await mockApi.startPayrollRun('b-1', month);
      await mockApi.calculatePayrollRun(run.id);
      setClock(clamp(approveMs));
      await mockApi.approvePayrollRun(run.id, 'u-1');
      setClock(clamp(paidMs));
      await mockApi.markPayrollRunPaid(run.id, 'u-5');
    };
    await runMonth(m2, new RealDate(yNow, moNow - 1, 2, 10).getTime(), new RealDate(yNow, moNow - 1, 3, 10).getTime(), new RealDate(yNow, moNow - 1, 5, 11).getTime());
    await runMonth(m1, new RealDate(yNow, moNow, 1, 10).getTime(), new RealDate(yNow, moNow, 2, 10).getTime(), new RealDate(yNow, moNow, 3, 11).getTime());

    // ----- Expenses (7 categories) and misc income via service layer -----
    const expenseJobs: Parameters<typeof mockApi.addExpense>[0][] = [];
    const rentBase: Record<string, number> = { 'o-1': 45000, 'o-2': 32000, 'o-3': 28000 };
    [85, 55, 25].forEach(ago =>
      OUTLETS.forEach(o =>
        expenseJobs.push({ outletId: o.id, category: 'Rent', amount: rentBase[o.id], description: `Monthly rent - ${o.name}`, date: new RealDate(atDay(ago, 10)).toISOString(), recurring: true, recordedBy: 'u-5' })
      )
    );
    [80, 50, 20].forEach((ago, idx) =>
      OUTLETS.forEach(o =>
        expenseJobs.push({ outletId: o.id, category: 'Utilities', amount: randInt(6500, 11500), description: `Electricity & water - ${o.name}`, date: new RealDate(atDay(ago, 11)).toISOString(), recurring: true, status: idx === 2 && o.id === 'o-3' ? 'unpaid' : 'paid', recordedBy: 'u-5' })
      )
    );
    ['Festival bonus - store staff', 'Salary advance - delivery team', 'Overtime payout', 'Staff training stipend'].forEach(desc =>
      expenseJobs.push({ outletId: 'o-1', category: 'Salaries', amount: randInt(6000, 22000), description: desc, date: new RealDate(atDay(randInt(5, 80), 15)).toISOString(), recordedBy: 'u-5' })
    );
    for (let k = 0; k < 10; k++) {
      expenseJobs.push({ outletId: OUTLETS[k % 3].id, category: 'Inventory', amount: randInt(20000, 90000), description: `Supplier purchase PO-${1000 + k}`, date: new RealDate(atDay(randInt(4, 85), 14)).toISOString(), recordedBy: 'u-2' });
    }
    for (let k = 0; k < 8; k++) {
      expenseJobs.push({ outletId: OUTLETS[k % 3].id, category: 'Logistics', amount: randInt(1800, 9500), description: `Freight & delivery - batch ${k + 1}`, date: new RealDate(atDay(randInt(3, 85), 16)).toISOString(), recordedBy: 'u-2' });
    }
    for (let k = 0; k < 6; k++) {
      expenseJobs.push({ outletId: 'o-1', category: 'Marketing', amount: randInt(3000, 18000), description: ['Flyer printing', 'Social media ads', 'In-store signage', 'Festival campaign', 'Loyalty cards', 'Local radio spot'][k], date: new RealDate(atDay(randInt(2, 80), 12)).toISOString(), status: k === 5 ? 'unpaid' : 'paid', recordedBy: 'u-1' });
    }
    for (let k = 0; k < 8; k++) {
      expenseJobs.push({ outletId: OUTLETS[k % 3].id, category: 'Miscellaneous', amount: randInt(500, 6500), description: ['Cleaning supplies', 'Stationery', 'Repairs & maintenance', 'Tea & refreshments', 'Packaging material', 'Pest control', 'Printer toner', 'Licence renewal'][k], date: new RealDate(atDay(randInt(1, 85), 13)).toISOString(), recordedBy: 'u-6' });
    }
    for (const job of expenseJobs) {
      await mockApi.addExpense({ businessId: 'b-1', ...job });
    }
    for (const [ago, desc, amt] of [[60, 'Scrap & packaging resale', 3200], [35, 'Supplier rebate received', 7800], [12, 'Shelf space rental income', 5000]] as [number, string, number][]) {
      await mockApi.addIncome({ businessId: 'b-1', outletId: 'o-1', category: 'Other Income', amount: amt, description: desc, date: new RealDate(atDay(ago, 12)).toISOString() });
    }

    // ----- Real "now": churn scores computed against the real clock -----
    restoreClock();
    const churnScores = await mockApi.computeAllChurnScores();

    // Follow-ups for at-risk customers and overdue payers
    const state = store.getState();
    const highRisk = churnScores
      .filter(s => s.riskLevel === 'high' && s.status === 'active')
      .sort((a, b) => b.score - a.score);
    const seenCust = new Set<string>();
    const createdFollowUps: string[] = [];
    for (const s of highRisk) {
      if (seenCust.has(s.customerId) || seenCust.size >= 8) continue;
      seenCust.add(s.customerId);
      const cust = state.customers.find(c => c.id === s.customerId);
      const prod = state.products.find(p => p.id === s.productId);
      const fu = await mockApi.createFollowUp({
        customerId: s.customerId,
        note: `Retention follow-up: ${cust?.name} is ${s.daysOverdue} days overdue on ${prod?.name}`,
        dueDate: new RealDate(RealDate.now() + randInt(-3, 5) * DAY_MS).toISOString(),
        isSuggested: true,
      });
      createdFollowUps.push(fu.id);
    }
    for (const id of createdFollowUps.slice(0, 2)) await mockApi.completeFollowUp(id);
    const overduePayers = new Set<string>();
    for (const inv of store.getState().invoices) {
      if (inv.customerId && inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate && new RealDate(inv.dueDate).getTime() < RealDate.now() && !overduePayers.has(inv.customerId) && overduePayers.size < 4) {
        overduePayers.add(inv.customerId);
        const cust = store.getState().customers.find(c => c.id === inv.customerId);
        await mockApi.createFollowUp({
          customerId: inv.customerId,
          note: `Collect overdue payment for ${inv.invoiceNumber} from ${cust?.name}`,
          dueDate: new RealDate(RealDate.now() - 2 * DAY_MS).toISOString(),
        });
      }
    }

    buildNotificationsAndMessages(rng);

    const final = store.getState();
    const countBy = <T,>(items: T[], key: (t: T) => string) =>
      items.reduce<Record<string, number>>((acc, it) => {
        acc[key(it)] = (acc[key(it)] || 0) + 1;
        return acc;
      }, {});
    const summary: DemoDataSummary = {
      outlets: final.outlets.length,
      users: final.users.length,
      employees: final.employees.length,
      products: final.products.length,
      customers: final.customers.length,
      orders: final.orders.length,
      ordersByStatus: countBy(final.orders, o => o.status),
      invoices: final.invoices.length,
      invoicesByStatus: countBy(final.invoices, i => i.status),
      sales: final.sales.length,
      expenses: final.expenses.length,
      attendanceRecords: final.attendanceRecords.length,
      payrollRuns: final.payrollRuns.length,
      churnScores: final.churnScores.length,
      notifications: final.notifications.length,
      messageLogs: final.messageLogs.length,
    };
    console.log(
      `Demo data generated (${returnedOrders} returned orders):`,
      summary
    );
    return summary;
  } finally {
    restoreClock();
    seedControl.fast = false;
    eventBus.muted = false;
    store.endBatch();
    generating = false;
  }
}

/** Notifications, automation rules and message logs derived from the final data. */
function buildNotificationsAndMessages(rng: () => number) {
  const s = store.getState();
  const nowMs = RealDate.now();
  const ago = (hours: number) => new RealDate(nowMs - hours * 3_600_000).toISOString();
  const randHours = (min: number, max: number) => min + rng() * (max - min);

  const notifications: Notification[] = [];
  const addNotif = (n: Omit<Notification, 'id' | 'businessId' | 'read' | 'createdAt'>, hours: number) => {
    notifications.push({
      ...n,
      id: crypto.randomUUID(),
      businessId: 'b-1',
      read: rng() < 0.35,
      createdAt: ago(hours),
    });
  };

  const messages: MessageLog[] = [];
  const addMessage = (opts: {
    templateKey: string;
    data: Record<string, any>;
    customerId?: string;
    recipientName: string;
    recipient: string;
    channel: 'whatsapp' | 'sms';
    optedIn: boolean;
    hours: number;
  }) => {
    const tpl = DEFAULT_TEMPLATES[opts.templateKey];
    let status: MessageLog['status'] = 'delivered';
    let errorReason: string | undefined;
    if (!opts.optedIn) {
      status = 'skipped';
      errorReason = 'Customer opted out of automated messages';
    } else {
      const r = rng();
      if (r < 0.6) status = 'delivered';
      else if (r < 0.75) status = 'sent';
      else if (r < 0.9) {
        status = 'failed';
        errorReason = 'Simulated gateway timeout (sandbox)';
      } else status = 'queued';
    }
    messages.push({
      id: crypto.randomUUID(),
      recipient: opts.recipient,
      recipientName: opts.recipientName,
      customerId: opts.customerId,
      channel: opts.channel,
      templateName: tpl.name,
      content: interpolateTemplate(tpl.body, opts.data),
      status,
      delayMs: status === 'delivered' ? 2000 + Math.floor(rng() * 800) : status === 'sent' ? 1000 : 0,
      errorReason,
      sentAt: ago(opts.hours),
    });
  };

  const outletName = (id?: string) => s.outlets.find(o => o.id === id)?.name || 'Downtown Branch';
  const isOptedIn = (c?: { optedIn?: boolean; optInForMessages?: boolean }) =>
    !c || (c.optedIn !== false && c.optInForMessages !== false);

  // Low stock / out of stock (Downtown Branch)
  const lowStock = s.inventoryRecords
    .filter(r => r.outletId === 'o-1' && r.quantity <= r.reorderLevel)
    .sort((a, b) => a.quantity / Math.max(1, a.reorderLevel) - b.quantity / Math.max(1, b.reorderLevel))
    .slice(0, 10);
  lowStock.forEach((r, i) => {
    const p = s.products.find(x => x.id === r.productId);
    if (!p) return;
    const out = r.quantity === 0;
    addNotif(
      {
        title: out ? 'Out of Stock' : 'Low Stock Alert',
        message: `${p.name} at ${outletName(r.outletId)} ${out ? 'is out of stock' : `is low (${r.quantity} left, reorder at ${r.reorderLevel})`}.`,
        type: out ? 'alert' : 'warning',
        category: 'Inventory',
        priority: out ? 'critical' : 'warning',
        entityType: 'product',
        entityId: p.id,
        actionUrl: `/inventory/${p.id}`,
      },
      randHours(1, 60)
    );
    if (i < 4) {
      addMessage({
        templateKey: 'stock.belowThreshold',
        data: { productName: p.name, outletName: outletName(r.outletId), remaining: r.quantity, reorderLevel: r.reorderLevel },
        recipientName: 'Owner / Manager',
        recipient: 'Owner / Manager (+91 98100 00001)',
        channel: 'whatsapp',
        optedIn: true,
        hours: randHours(1, 60),
      });
    }
  });

  // Overdue invoices
  s.invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate && new RealDate(inv.dueDate).getTime() < nowMs)
    .slice(0, 8)
    .forEach((inv, i) => {
      const cust = s.customers.find(c => c.id === inv.customerId);
      addNotif(
        {
          title: 'Invoice Overdue',
          message: `Invoice ${inv.invoiceNumber}${cust ? ` (${cust.name})` : ''} is overdue.`,
          type: 'alert',
          category: 'Finance',
          priority: 'critical',
          entityType: 'invoice',
          entityId: inv.id,
          actionUrl: `/invoices/${inv.id}`,
        },
        randHours(2, 96)
      );
      if (cust && i < 5) {
        addMessage({
          templateKey: 'invoice.overdue',
          data: { invoiceNumber: inv.invoiceNumber, amount: inv.amount },
          customerId: cust.id,
          recipientName: cust.name,
          recipient: cust.phone || cust.email || cust.name,
          channel: 'sms',
          optedIn: isOptedIn(cust),
          hours: randHours(2, 90),
        });
      }
    });

  // High churn risk
  const seenCust = new Set<string>();
  s.churnScores
    .filter(c => c.riskLevel === 'high' && c.status === 'active')
    .sort((a, b) => b.score - a.score)
    .forEach(c => {
      if (seenCust.has(c.customerId) || seenCust.size >= 8) return;
      seenCust.add(c.customerId);
      const cust = s.customers.find(x => x.id === c.customerId);
      const prod = s.products.find(p => p.id === c.productId);
      if (!cust) return;
      addNotif(
        {
          title: 'High Churn Risk Detected',
          message: `${cust.name} crossed into High churn risk (score ${c.score}).`,
          type: 'warning',
          category: 'Customers',
          priority: 'warning',
          entityType: 'customer',
          entityId: cust.id,
          actionUrl: `/customers/${cust.id}`,
        },
        randHours(3, 120)
      );
      addMessage({
        templateKey: 'churn.riskChanged',
        data: { customerName: cust.name, favoriteProduct: prod?.name || 'your favourite items' },
        customerId: cust.id,
        recipientName: cust.name,
        recipient: cust.phone || cust.email || cust.name,
        channel: 'whatsapp',
        optedIn: isOptedIn(cust),
        hours: randHours(3, 110),
      });
    });

  // Orders ready for pickup
  s.orders
    .filter(o => o.status === 'ready')
    .slice(0, 8)
    .forEach(o => {
      const cust = s.customers.find(c => c.id === o.customerId);
      addNotif(
        {
          title: 'Order Ready for Pickup',
          message: `Order #${o.id}${cust ? ` for ${cust.name}` : ''} is ready for pickup at ${outletName(o.outletId)}.`,
          type: 'info',
          category: 'Orders',
          priority: 'info',
          entityType: 'order',
          entityId: o.id,
          actionUrl: `/orders/${o.id}`,
        },
        randHours(4, 150)
      );
      if (cust) {
        addMessage({
          templateKey: 'order.statusChanged',
          data: { customerName: cust.name, orderId: o.id, amount: o.totalAmount, outletName: outletName(o.outletId) },
          customerId: cust.id,
          recipientName: cust.name,
          recipient: cust.phone || cust.email || cust.name,
          channel: 'whatsapp',
          optedIn: isOptedIn(cust),
          hours: randHours(4, 140),
        });
      }
    });

  // Payroll
  s.payrollRuns
    .filter(r => r.status === 'paid')
    .forEach(r => {
      addNotif(
        {
          title: 'Payroll Processed',
          message: `Payroll for ${r.month} processed for ${r.totalEmployees} employees (Rs. ${Math.round(r.totalAmount).toLocaleString('en-IN')}).`,
          type: 'info',
          category: 'Finance',
          priority: 'info',
          entityType: 'payroll',
          entityId: r.id,
          actionUrl: '/payroll',
        },
        r.paidAt ? Math.max(1, (nowMs - new RealDate(r.paidAt).getTime()) / 3_600_000) : 200
      );
    });

  addNotif(
    {
      title: 'Demo Data Ready',
      message: 'Demo dataset generated: 60 products, 50 customers, 90 days of sales and 2 months of payroll.',
      type: 'info',
      category: 'System',
      priority: 'info',
    },
    0.1
  );
  addNotif(
    {
      title: 'Sandbox Messaging Active',
      message: 'WhatsApp & SMS automation simulator is running in sandbox mode.',
      type: 'info',
      category: 'System',
      priority: 'info',
    },
    30
  );

  notifications.forEach(n => store.insert('notifications', n));
  messages.forEach(m => store.insert('messageLogs', m));

  // Default automation rules
  const rules = [
    { id: 'rule-low-stock', name: 'Low Stock Alert', triggerEvent: 'stock.belowThreshold', triggerLabel: 'Stock < Reorder Level', recipientType: 'Owner / Manager' as const },
    { id: 'rule-order-ready', name: 'Order Ready', triggerEvent: 'order.statusChanged', triggerLabel: 'Order Status = Ready', recipientType: 'Customer' as const },
    { id: 'rule-customer-retention', name: 'Customer Retention', triggerEvent: 'churn.riskChanged', triggerLabel: 'Churn Risk Crosses High Threshold', recipientType: 'Customer' as const },
  ];
  rules.forEach(r =>
    store.insert('notificationRules', {
      id: r.id,
      businessId: 'b-1',
      name: r.name,
      triggerEvent: r.triggerEvent,
      triggerLabel: r.triggerLabel,
      recipientType: r.recipientType,
      action: 'whatsapp',
      template: DEFAULT_TEMPLATES[r.triggerEvent].body,
      enabled: true,
    })
  );
}

/** Generates the demo dataset only when the store is empty (first launch). */
export async function ensureDemoData(): Promise<void> {
  if (store.getState().businesses.length > 0) return;
  await generateDemoData();
}

