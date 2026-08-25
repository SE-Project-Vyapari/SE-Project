# Vyapari Relational Data Model

This document describes the relationships between entities in the mock data store. All entities reside in an in-memory observable store (`src/services/store.ts`).

## Core Relationships

- **Business**: The top-level tenant. Everything belongs to a business (`businessId`).
- **Outlet**: Belongs to a Business. Represents a physical store location.
- **User**: Belongs to a Business. Can optionally be restricted to a specific Outlet (`outletId`).
- **Employee**: Represents staff for payroll purposes, optionally linked to a `User` account.

## Inventory & Products

- **Product**: Global catalog item per Business.
- **InventoryRecord**: The intersection of `Product` × `Outlet`. Tracks current stock at a specific location.
- **StockMovement**: Audit trail of stock changes (`productId`, `outletId`).
- **StockTransfer**: Movement between `fromOutletId` and `toOutletId`.

## Sales, Orders & Invoices

- **Order**: Created at a specific Outlet by a Cashier. Optionally linked to a Customer.
- **OrderItem**: Links to `Order` and `Product`.
- **Sale**: A completed transactional receipt of an Order.
- **Invoice**: Financial document for an Order. Usually paid immediately in POS, but can be overdue.
- **Payment**: Applied to an `Invoice`.

## Finance

- **LedgerEntry**: General ledger tracking debits/credits. `sourceType` determines the reference:
  - `sale` -> `referenceId` = Sale ID
  - `expense` -> `referenceId` = Expense ID
  - `payroll` -> `referenceId` = PayrollRun ID

## CRM & Intelligence

- **Customer**: Belongs to a Business.
- **CustomerProductStat**: Aggregates RFM metrics per Customer × Product pair.
- **ChurnScore**: Derived intelligence metric per Customer.

## System

- **AuditEvent**: High-fidelity logs for tracking TTI and exact timing of cross-module side effects.
- **MessageLog** & **NotificationRule**: Triggered by the Event Bus (`eventBus.ts`).
