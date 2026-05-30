// Canonical name aliases — maps any historical name to the canonical key
const ALIASES = {
  "ContactRole": "ContactRole",
  "Contact Role": "ContactRole",
  "ContactType": "ContactType",
  "Contact Type": "ContactType",
  "InvestorType": "InvestorType",
  "PaymentStatus": "PaymentStatus",
  "Payment Status": "PaymentStatus",
  "ScheduleStatus": "PaymentStatus",
  "Schedule Status": "PaymentStatus",
  "Payment Method": "PaymentMethod",
  "PaymentMethod": "PaymentMethod",
  "ACHBatchStatus": "ACHBatchStatus",
  "ACH Batch Status": "ACHBatchStatus",
  "PaymentLag": "PaymentLag",
  "InvestmentStatus": "InvestmentStatus",
  "Investment Status": "InvestmentStatus",
  "InvestorInvestmentEditType": "InvestorInvestmentEditType",
  "BorrowerInvestmentEditType": "BorrowerInvestmentEditType",
  "InvestorInvestmentNewType": "InvestorInvestmentNewType",
  "BorrowerInvestmentNewType": "BorrowerInvestmentNewType",
  "ScheduleFrequency": "ScheduleFrequency",
  "Schedule Frequency": "ScheduleFrequency",
  "Calculator": "CalculatorType",
  "CalculatorType": "CalculatorType",
  "AssetType": "AssetType",
  "Deal Status": "DealStatus",
  "DealStatus": "DealStatus",
  "Deal Type": "DealType",
  "DealType": "DealType",
  "FeeChargeAt": "FeeChargeAt",
  "FeeFrequency": "FeeFrequency",
  "FeeType": "FeeType",
  "Fees": "Fees",
  "Permissions": "Permissions",
  "Permissions_Global": "Permissions_Global",
  "EmailTags": "EmailTags",
  "IN_PaymentType": "IN_PaymentType",
  "OUT_PaymentType": "OUT_PaymentType",
  "PaymentType": "PaymentType"
};

// Default fallbacks (single source of truth)
const DEFAULTS = {
  ContactRole: ["Investor", "Borrower", "Member"],
  ContactType: ["Individual", "Company", "Trust", "Partnership"],
  InvestorType: ["Fixed", "Equity", "Both"],
  PaymentStatus: [
    "Paid", "Due", "Partial", "Hold", "Not Paid", "Reinvested",
    "Pending", "Scheduled", "Processing", "Sent", "Failed",
    "Cancelled", "Missed", "Waived", "Rollover", "Withdrawal"
  ],
  PaymentMethod: ["ACH", "Wire", "Check"],
  ACHBatchStatus: ["1. VERSION_CREATED", "2. FILE_GENERATED", "3. PROCESS_COMPLETED", "4. PAYMENT_FAILED"],
  PaymentLag: ["Days", "Months", "Quarter-End"],
  InvestmentStatus: ["Open", "Active", "Closed"],
  InvestorInvestmentEditType: [],
  BorrowerInvestmentEditType: [],
  InvestorInvestmentNewType: [],
  BorrowerInvestmentNewType: [],
  ScheduleFrequency: ["Monthly", "Quarterly", "Semi-Annual", "Annual", "At Maturity"],
  CalculatorType: ["ACT/360", "30/360", "ACT/ACT", "ACT/365"],
  AssetType: ["Multi-family", "Retail", "Industrial", "Office", "Mixed-Use", "Other"],
  DealStatus: ["Active", "Closed"],
  DealType: [],
  FeeChargeAt: [],
  FeeFrequency: [],
  FeeType: [],
  Fees: [],
  Permissions: [],
  Permissions_Global: [],
  EmailTags: [
    "First name", "Last name", "Full name", "Current year",
    "Current quarter", "Last quarter", "Total distributed",
    "Total Invested", "Capital balance"
  ],
  IN_PaymentType: [
    "INVESTOR_PRINCIPAL_DEPOSIT",
    "INVESTOR_ROLLOVER",
    "FEE",
    "BORROWER_PRINCIPAL_RECEIVED",
    "BORROWER_INTEREST_PAYMENT"
  ],
  OUT_PaymentType: [
    "INVESTOR_WITHDRAWAL",
    "INVESTOR_INTEREST_PAYMENT",
    "INVESTOR_PRINCIPAL_PAYMENT",
    "BORROWER_DISBURSEMENT"
  ],
  PaymentType: [
    "INVESTOR_PRINCIPAL_DEPOSIT",
    "INVESTOR_ROLLOVER",
    "FEE",
    "BORROWER_PRINCIPAL_RECEIVED",
    "BORROWER_INTEREST_PAYMENT",
    "INVESTOR_WITHDRAWAL",
    "INVESTOR_INTEREST_PAYMENT",
    "INVESTOR_PRINCIPAL_PAYMENT",
    "BORROWER_DISBURSEMENT",
    "INVESTOR_INTEREST_ACCRUAL",
    "BORROWER_INTEREST_PAYMENT_ACCRUAL",
    "BORROWER_INTEREST_PAYMENT_RECEIVED"
  ]
};

/**
 * Helper to convert rich object items to string arrays or filter them
 */
function processItems(items, filterDir) {
  if (!Array.isArray(items)) return [];
  
  let result = items;
  
  // Filter inactive items
  result = result.filter(item => {
    if (item && typeof item === 'object') {
      return item.active !== false;
    }
    return true;
  });

  if (filterDir) {
    result = result.filter(item => {
      if (typeof item === 'string') return true;
      const dir = (item?.direction || '').toUpperCase();
      return dir === filterDir || dir === 'BOTH';
    });
  }

  // Sort by order if available
  const sorted = [...result].sort((a, b) => {
    const orderA = (a && typeof a === 'object' && typeof a.order === 'number') ? a.order : 999;
    const orderB = (b && typeof b === 'object' && typeof b.order === 'number') ? b.order : 999;
    return orderA - orderB;
  });

  return sorted.map(item => {
    if (typeof item === 'string') return item;
    return item?.value || item?.label || '';
  }).filter(Boolean);
}

/**
 * Resolve a dimension by canonical name.
 * Handles aliases and provides consistent fallbacks.
 */
export function getDimension(DIMENSIONS = [], name) {
  if (!Array.isArray(DIMENSIONS)) {
    DIMENSIONS = [];
  }

  // Handle special dynamic filters for consolidated PaymentType
  if (name === "IN_PaymentType" || name === "OUT_PaymentType") {
    const parentDim = DIMENSIONS.find(d => d && (d.name === "PaymentType" || d.name === "Payment Type"));
    if (parentDim?.items?.length) {
      return processItems(parentDim.items, name === "IN_PaymentType" ? "IN" : "OUT");
    }
    return DEFAULTS[name];
  }

  // 1. Direct lookup
  const found = DIMENSIONS.find(d => d && d.name === name);
  if (found?.items?.length) {
    return processItems(found.items);
  }

  // 2. Try canonical alias
  const canonical = ALIASES[name];
  if (canonical && canonical !== name) {
    if (canonical === "IN_PaymentType" || canonical === "OUT_PaymentType") {
      return getDimension(DIMENSIONS, canonical);
    }
    const aliased = DIMENSIONS.find(d => d && d.name === canonical);
    if (aliased?.items?.length) {
      return processItems(aliased.items);
    }
  }

  // 3. Reverse alias: check if any alias of the canonical name exists
  if (canonical) {
    const allAliases = Object.entries(ALIASES)
      .filter(([_, v]) => v === canonical)
      .map(([k]) => k);
    for (const alias of allAliases) {
      const dim = DIMENSIONS.find(d => d && d.name === alias);
      if (dim?.items?.length) {
        return processItems(dim.items);
      }
    }
  }

  // 4. Fallback
  return DEFAULTS[canonical || name] || [];
}
