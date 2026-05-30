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
  IN_PaymentType: [],
  OUT_PaymentType: [],
  PaymentType: []
};

/**
 * Resolve a dimension by canonical name.
 * Handles aliases and provides consistent fallbacks.
 */
export function getDimension(DIMENSIONS = [], name) {
  if (!Array.isArray(DIMENSIONS)) {
    DIMENSIONS = [];
  }

  // 1. Direct lookup
  const found = DIMENSIONS.find(d => d && d.name === name);
  if (found?.items?.length) return found.items;

  // 2. Try canonical alias
  const canonical = ALIASES[name];
  if (canonical && canonical !== name) {
    const aliased = DIMENSIONS.find(d => d && d.name === canonical);
    if (aliased?.items?.length) return aliased.items;
  }

  // 3. Reverse alias: check if any alias of the canonical name exists
  if (canonical) {
    const allAliases = Object.entries(ALIASES)
      .filter(([_, v]) => v === canonical)
      .map(([k]) => k);
    for (const alias of allAliases) {
      const dim = DIMENSIONS.find(d => d && d.name === alias);
      if (dim?.items?.length) return dim.items;
    }
  }

  // 4. Fallback
  return DEFAULTS[canonical || name] || [];
}
