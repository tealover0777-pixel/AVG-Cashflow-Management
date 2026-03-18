# Database Migration Scripts

This directory contains Firestore migration scripts for the AVG Cashflow Management application.

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
