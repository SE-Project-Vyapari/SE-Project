# Cross-Module Integration Notes

## Verified Workflow Chains

1. **Sale -> Order -> Invoice -> Inventory Decrement -> Stock Movement -> Ledger Entry -> Analytics / Reports**
   - `mockApi.recordSale()` atomically creates the `Order`, `OrderItem`s, `Sale`, `Invoice` (using `settings.invoice.prefix`), `LedgerEntry`, and `AuditEvent`.
   - **Fixed**: `recordSale()` now also inserts a `StockMovement` (`type: 'sale'`, negative `quantityChange`) for every item sold so `ProductDetail` stock movement history stays in sync with POS sales.
   - **Fixed**: `AuditEvent.details` for `SALE_COMPLETED` now records human-readable text instead of raw JSON so `ActivityFeed` renders cleanly.

2. **Inventory Below Threshold -> Notification -> Forecast / Reorder Suggestion**
   - When `recordSale()` or `adjustStock()` drops `quantity <= reorderLevel`, `Events.STOCK_BELOW_THRESHOLD` is published and consumed live by `NotificationContext` (with 60s per-entity deduplication and live resolved-state tracking when restocked).

3. **Purchase History -> Churn Score -> CRM Alert -> Suggested Retention Action -> Notification**
   - **Fixed**: `mockApi.recordSale()` now automatically calls `computeChurnScore(customerId, productId)` for live customer sales (`!seedControl.fast`), updating `ChurnScore` and publishing `Events.CHURN_RISK_CHANGED` without requiring a manual refresh.

4. **Attendance -> Payroll Calculation -> Ledger Entry -> Finance & Reports**
   - `mockApi.calculatePayrollRun()` reads live `AttendanceRecord`s, and `markPayrollRunPaid()` posts a debit `LedgerEntry` (`sourceType: 'payroll'`) and publishes `Events.PAYROLL_PROCESSED`.

5. **Order Status -> Ready -> Notification -> Simulated Customer Message**
   - `mockApi.updateOrderStatus(orderId, 'ready')` publishes `Events.ORDER_STATUS_CHANGED`, triggering `NotificationContext` to create an in-app notification and invoke `mockMessaging.sendMessage()` with `Customer.optedIn` / `optInForMessages` enforcement.

## Shared Selectors & KPI Consistency Fixes

Created `src/services/selectors.ts` so all modules compute identical numbers:
- **Low-Stock Count (`getLowStockRecords`)**: `BusinessHealth` previously excluded `quantity === 0` while `ActionCenter` included it. Both now use `getLowStockRecords` (`quantity <= reorderLevel`).
- **Stock Health Thresholds (`getStockStatus`)**: `InventoryHealthBar` previously used `reorderLevel / 2` for Critical while `InventoryList` used `reorderLevel * 0.25`. Both now share `getStockStatus`.
- **Outstanding Receivables (`getOutstandingTotal`)**: `BusinessHealth` previously summed full `amount` of all non-`paid` invoices (including `cancelled` and ignoring partial payments). It now uses `getOutstandingTotal` (`amount - amountPaid`, excluding `paid` and `cancelled`).
- **Gross Profit (`BusinessHealth`)**: Updated to compute actual `revenue - sum(orderItem.quantity * product.cost)` matching `SalesAnalyticsTab` and `ReportsPage`.
- **Action Center Deep-Links**: Wired `?filter=` query parameter reading in `InventoryList` (`low`, `out`, `critical`, `healthy`, `overstock`) and `InvoicesList` (`overdue`, `unpaid`, `paid`, `partially_paid`) so clicking Action Center or Inventory Health Bar links applies the exact filter immediately.

