# Database Migration Scripts

This directory contains Firestore migration scripts for the AVG Cashflow Management application.

## Migration: Convert Payment Amounts to Numbers

### Purpose
Converts formatted currency strings (e.g., `"$8,000.00"`) to numeric values in the `paymentSchedules` collection.

### Prerequisites

1. **Service Account Key**: Download your Firebase service account key from the Firebase Console:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `serviceAccountKey.json` in the **project root directory** (not in scripts/)

2. **Dependencies**: Ensure `firebase-admin` is installed (should already be installed)

### Running the Migration

**⚠️ IMPORTANT: Always run in dry-run mode first to preview changes!**

1. Place your `serviceAccountKey.json` in the **project root** directory
2. Run in dry-run mode (no changes made):
   ```bash
   node scripts/migrate-amounts-to-numbers.cjs
   ```
3. Review the output to see what will be changed
4. If everything looks correct, apply the changes:
   ```bash
   node scripts/migrate-amounts-to-numbers.cjs --apply
   ```

### What This Migration Does

Converts the following fields from formatted strings to numbers in all `paymentSchedules` documents:
- `signed_payment_amount`: `"$8,000.00"` → `8000`
- `payment_amount`: `"$1,234.56"` → `1234.56`
- `original_payment_amount`: `"$5,000.00"` → `5000`
- `principal_amount`: `"$10,000.00"` → `10000`
- `basePayment`: `"$500.00"` → `500`

The script:
- Processes all tenants automatically
- Only updates documents that have formatted strings
- Skips documents that already have numeric values
- Shows detailed progress for each tenant

### Why This Is Needed

Storing amounts as formatted strings causes issues:
- Difficult to perform calculations and aggregations
- Breaks pivot tables and reports
- Inefficient storage
- Unreliable sorting and querying

After this migration, all new payment schedules will automatically be saved with numeric values.

---

## Migration: Projects → Deals

### Prerequisites

1. **Service Account Key**: Download your Firebase service account key from the Firebase Console:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `serviceAccountKey.json` in this `scripts/` directory

2. **Dependencies**: Ensure `firebase-admin` is installed:
   ```bash
   npm install firebase-admin
   ```

### Running the Migration

**⚠️ IMPORTANT: Always test on a staging/development Firebase project first!**

1. Place your `serviceAccountKey.json` in the `scripts/` directory
2. Run the migration:
   ```bash
   node scripts/migrateProjectsToDeals.js
   ```

### What This Migration Does

1. **Renames Collections**:
   - `tenants/{tenantId}/projects` → `tenants/{tenantId}/deals`

2. **Renames Fields** (in all migrated documents):
   - `project_name` → `deal_name`
   - `project_id` → `deal_id`

3. **Updates Related Collections**:
   - **Contracts**: Updates `project_id` → `deal_id`, `project_name` → `deal_name`
   - **Payment Schedules**: Updates `project_id` → `deal_id`

### Post-Migration Steps

1. **Verify** data integrity in Firebase Console
2. **Test** the application thoroughly
3. **Deploy** updated security rules: `firebase deploy --only firestore:rules`
4. **Deploy** updated frontend: `npm run build && firebase deploy --only hosting`
5. **Delete** old `projects` collections manually (only after verification)

### Rollback

If you need to rollback:
1. Use Firebase's backup/restore feature if available
2. The old `projects` collections remain until you manually delete them
3. Revert frontend code and security rules to previous versions

### Security

- **Never commit** `serviceAccountKey.json` to version control
- The `.gitignore` file should already exclude `*.json` files in the scripts directory
- Store service account keys securely (use environment variables in production)
