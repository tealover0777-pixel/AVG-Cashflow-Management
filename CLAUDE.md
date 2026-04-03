# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Vite dev server (--host flag included)
npm run build            # Build for production → dist/

# Firebase deployment
firebase deploy --only hosting    # Deploy frontend only
firebase deploy                   # Deploy everything (functions + hosting + rules)

# Cloud Functions (from functions/ directory)
npm run serve            # Start Firebase emulator locally
npm run deploy           # Deploy Cloud Functions only
npm run logs             # View Firebase function logs
```

## Architecture

**Stack:** React 19 + Vite SPA, Firebase (Firestore + Auth + Cloud Functions), BigQuery exports via Firebase Extensions, Firebase Data Connect with PostgreSQL (Cloud SQL).

The build uses `vite-plugin-singlefile` to bundle the entire app into a single HTML file served from `dist/`.

### Multi-Tenant Data Model

All tenant data lives under `tenants/{tenantId}/` in Firestore:
- `users/`, `deals/`, `parties/`, `investments/`, `paymentSchedules/`, `payments/`, `fees/`, `roles/`, `dimensions/`

Global collections: `global_users/`, `role_types/`, `dimensions/`

### Authentication & Permissions

`src/AuthContext.jsx` manages auth state. Custom JWT claims carry `role`, `tenantId`, and `isGlobal`. Permissions are loaded from the `role_types/{role}` Firestore collection, with fallback defaults in `src/permissions.js`.

Three access scopes:
- **Member**: Sees only data linked to their `PartyID`
- **Tenant Admin**: Sees all data within their `tenantId`
- **Super/Global Admin**: Sees consolidated data across all tenants (uses "GLOBAL" tenant ID)

Firestore rules (`firestore.rules`) enforce multi-tenancy at the database level in addition to app-level checks.

### Data Flow

1. `src/app.jsx` — root router/state manager, fetches all collections via `useFirestoreCollection.js`, filters by `activeTenantId`
2. `src/hooks/useDashboardData.js` — computes dashboard metrics (Total Income, Missed Payments, Active Investments, Avg Yield, quarterly charts) from the fetched data
3. `src/pages/*.jsx` — 15 page components (Dashboard, Deals, Parties, Investments, Schedule, Payments, Fees, Reports, Tenants, UserProfiles, Roles, SuperAdmin, Profile, Dimensions, AdminHelp); navigation and visible pages are gated by `hasPermission()` checks
4. `src/components.jsx` — shared UI components (cards, tables, buttons, tooltips, pagination)
5. `src/components/SidebarHelp.jsx` — contextual help sidebar component
6. `functions/index.js` — Cloud Functions for `inviteUser` (creates Auth user, sets claims, creates Firestore profiles), `resendVerification`, `createFirstAdmin`

### Key Files

| File | Purpose |
|------|---------|
| `src/AuthContext.jsx` | Auth state, role/permission resolution |
| `src/permissions.js` | Fallback permission definitions for all roles |
| `src/useFirestoreCollection.js` | Generic Firestore collection hook |
| `src/hooks/useDashboardData.js` | Dashboard metrics computation |
| `src/app.jsx` | Root component, routing, global state |
| `src/utils.jsx` | Theme definitions, formatting, nav constants |
| `functions/index.js` | All Cloud Functions (user management) |
| `firestore.rules` | Multi-tenant security rules |
| `firebase.json` | Hosting, Functions, BigQuery extension configs |

### BigQuery Integration

11 Firebase Extensions auto-export Firestore collection changes to BigQuery in real-time (deals, parties, investments, paymentSchedules, payments, fees, tenant-users). Configured in `firebase.json` under `extensions`.

**Note:** One extension is still named `firestore-bigquery-export-projects` but exports the `deals/` collection (reflects legacy naming from projects → deals refactoring).

### Firebase Data Connect

`dataconnect/` contains a PostgreSQL schema (Cloud SQL instance `avgcashflowmanagement-fdc`) and auto-generated SDK in `src/dataconnect-generated/`. This is separate from the primary Firestore database.

## Recent Changes

- **Projects → Deals Terminology**: The codebase has undergone a refactoring to rename "Projects" to "Deals" throughout the application. The Firestore collection is now `deals/`, and all components reference `DEALS` instead of `PROJECTS`. See `scripts/README.md` for migration details.
- **Contracts → Investments Terminology**: The codebase has been refactored to rename "Contracts" to "Investments". The Firestore collection is now `investments/`, permissions use `INVESTMENT_*` instead of `CONTRACT_*`, and the page is `PageInvestments`.
