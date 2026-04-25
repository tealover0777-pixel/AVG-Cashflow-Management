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

**Stack:** React 19 + Vite SPA, Firebase (Firestore + Auth + Cloud Functions), Firebase Data Connect with PostgreSQL (Cloud SQL).

The build uses `vite-plugin-singlefile` to bundle the entire app into a single HTML file served from `dist/`.

### Multi-Tenant Data Model

All tenant data lives under `tenants/{tenantId}/` in Firestore:
- `users/`, `deals/`, `contacts/`, `investments/`, `paymentSchedules/`, `payments/`, `fees/`, `roles/`, `dimensions/`

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
3. `src/pages/*.jsx` — 15 page components (Dashboard, Deals, Contacts, Investments, Schedule, Payments, Fees, Reports, Tenants, UserProfiles, Roles, SuperAdmin, Profile, Dimensions, AdminHelp); navigation and visible pages are gated by `hasPermission()` checks
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
| `firebase.json` | Hosting, Functions, Data Connect configs |


### Firebase Data Connect

`dataconnect/` contains a PostgreSQL schema (Cloud SQL instance `avgcashflowmanagement-fdc`) and auto-generated SDK in `src/dataconnect-generated/`. This is separate from the primary Firestore database.

## Coding Rules

### No Hard-Coded Option Lists
Dropdown options, status values, payment types, frequency labels, roles, and any other user-facing enumeration **must** come from `DIMENSIONS` (Firestore `dimensions/` collection), not hard-coded arrays.

Pattern to follow:
```javascript
const myOpts = (DIMENSIONS.find(d => d.name === "DimensionName") || {}).items
  ?.map(i => String(i || "").trim()).filter(Boolean)
  || ["Fallback1", "Fallback2"]; // only as last-resort safety net
```

- Look up by the exact dimension `name` field; include common aliases (e.g. `"ScheduleStatus" || "Schedule Status"`).
- A short fallback array is acceptable **only** when the dimension may legitimately be absent (e.g. a brand-new tenant with no data yet). The fallback must never be the primary source.
- If a dimension doesn't exist yet in Firestore, add it there — don't patch the code.

## Recent Changes

- **Terminology Migrations**: Projects → Deals, Contracts → Investments, Parties → Contacts. Firestore collections are `deals/`, `investments/`, `contacts/`. Permissions use `DEAL_*`, `INVESTMENT_*`, `CONTACT_*`. See `scripts/README.md` for migration details.
