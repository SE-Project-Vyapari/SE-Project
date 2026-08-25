import { seedDatabase } from './seed/bootstrap';
import { mockApi } from './services/mockApi';
import { store } from './services/store';

async function runTest() {
  console.log('Seeding...');
  seedDatabase();
  
  console.log('Initial Inventory of P1:', store.getState().inventoryRecords.find(i => i.productId === 'p-1')?.quantity);
  
  console.log('Recording sale...');
  await mockApi.recordSale({
    businessId: 'b-1',
    outletId: 'o-1',
    cashierId: 'u-3',
    items: [{ productId: 'p-1', quantity: 2, unitPrice: 100 }]
  });

  const state = store.getState();
  console.log('Post Sale Inventory of P1:', state.inventoryRecords.find(i => i.productId === 'p-1')?.quantity);
  console.log('Sales Count:', state.sales.length);
  console.log('Invoices Count:', state.invoices.length);
  console.log('LedgerEntries Count:', state.ledgerEntries.length);
  console.log('AuditEvents Count:', state.auditEvents.length);
}

runTest();
