# Dashboard Development Plan

Transform the current dashboard into a high-end financial command center with dynamic, role-based views.

## 1. System Architecture
### Data Slicing by Role
*   **Member Dashboard (Read Only)**: Filter all views to ONLY show data linked to the logged-in user's `PartyID` (found in `global_users` or tenant-specific `users`).
*   **Tenant Dashboard**: View all members, deals, and payments scoped to the current `TenantID`.
*   **Global Dashboard (L2 Admin)**: System-wide aggregation, tenant performance metrics, and global capital summary.

### Data Sources
*   **User/Org**: `global_users`, `tenants/{tid}/users`, `role_types`
*   **Financial**: `deals`, `contacts`, `investments`, `payment_schedules`, `payments`, `fees`

## 2. Dashboard Components (Based on Reference UI)
### A. Header & Key Metrics
- **Premium Wallet Card**: Show "Total Capital Under Management" (Sum of Active Project Valuations).
- **Secondary Stat Cards**: 
    - **Total Income**: Sum of all "Paid" schedule entries.
    - **Missed/Late**: Count/Value of payments past due date.
    - **Yield %**: Average interest rate of the active investment portfolio.

### B. Visualizations
- **Cashflow Analysis**: Bar Chart showing Projected vs. Actual monthly cashflow ($ value).
- **Portfolio Breakdown**: Circular chart showing distribution by Project Type (e.g., Real Estate, Debt, Construction).

### C. Activity & Operations
- **Recent Activity Feed**: Real-time log of investment creations, payment receipts, and user invitations.
- **Top Actions**: Quick links to "New Project", "Issue Payment", "Export Report".
- **Upcoming Payments**: Mini-table showing the next 5 expected cash inflows.

## 3. Implementation Roadmap
1.  **Stage 1: Logic Hook**: Completed.
2.  **Stage 2: Modern UI**: Completed.
3.  **Stage 3: Role Security & Global Filtering**: Completed. Member data is isolated globally.
