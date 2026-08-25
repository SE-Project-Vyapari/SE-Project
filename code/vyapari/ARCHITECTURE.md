# Vyapari Architecture - Change-Isolation Rules

## 0.1 Folder Structure

```
src/
  design-system/        # tokens, base UI primitives ONLY (Button, Input, Card, Table, Modal, etc.)
                         # nothing domain-specific ever lives here.
  services/              # mock data layer, entity types, business logic functions
                         # (recordSale, computeChurnScore, computeForecast, etc.)
                         # this is the ONLY place cross-module data logic lives.
  types/                 # shared entity types (Product, Customer, Order, etc.)
  modules/
    pos/
      components/        # POS-only components (Cart, ProductSearch, PaymentPanel...)
      hooks/              # POS-only hooks
      styles/             # POS-only CSS Modules / styled files
      index.ts            # the ONLY file other modules are allowed to import from
    inventory/
    orders/
    invoices/
    crm/
    churn-insights/
    finance/
    employees/
    payroll/
    analytics/
    forecasting/
    ai-assistant/
    notifications/
    scanner/
    reports/
    settings/
  app-shell/             # sidebar, topbar, routing, role-permission config
  seed/                  # demo data generation
```

## 0.2 The Isolation Rules

1. **No cross-module imports of internals.** Module A may only import from Module B's `index.ts`. Never reach into `modules/B/components/...` directly.
2. **Styling is scoped per module.** Use CSS Modules so styles cannot leak. The only globally-shared style surface is `design-system/tokens.ts`.
3. **Shared UI primitives are generic, never feature-specific.** `design-system/` components must stay free of any domain knowledge.
4. **Business logic lives only in `services/`, never duplicated inside a module.** A module's components call functions from `services/` rather than reimplementing them locally.
5. **One module, one PR-sized change.** Scoped edits to specific domain folders.
6. **Design-token changes are the one intentional exception.** Changing `design-system/tokens.ts` propagates safely everywhere.
7. **Every module's `index.ts` is a stable contract.** Keep exports consistent.
