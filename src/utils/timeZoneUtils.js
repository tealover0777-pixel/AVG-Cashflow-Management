/**
 * TimeZone Utilities for AVG Cashflow Management
 * Handles mapping of US States and Zip codes to IANA TimeZones.
 */

export const US_TIMEZONES = [
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Mountain Time - no DST (MT)", value: "America/Phoenix" },
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Alaska Time (AKT)", value: "America/Anchorage" },
  { label: "Hawaii-Aleutian Time (HAT)", value: "Pacific/Honolulu" },
];

export const STATE_TO_TZ = {
  "AL": "America/Chicago",
  "AK": "America/Anchorage",
  "AZ": "America/Phoenix",
  "AR": "America/Chicago",
  "CA": "America/Los_Angeles",
  "CO": "America/Denver",
  "CT": "America/New_York",
  "DE": "America/New_York",
  "FL": "America/New_York",
  "GA": "America/New_York",
  "HI": "Pacific/Honolulu",
  "ID": "America/Denver",
  "IL": "America/Chicago",
  "IN": "America/Chicago",
  "IA": "America/Chicago",
  "KS": "America/Chicago",
  "KY": "America/New_York",
  "LA": "America/Chicago",
  "ME": "America/New_York",
  "MD": "America/New_York",
  "MA": "America/New_York",
  "MI": "America/New_York",
  "MN": "America/Chicago",
  "MS": "America/Chicago",
  "MO": "America/Chicago",
  "MT": "America/Denver",
  "NE": "America/Chicago",
  "NV": "America/Los_Angeles",
  "NH": "America/New_York",
  "NJ": "America/New_York",
  "NM": "America/Denver",
  "NY": "America/New_York",
  "NC": "America/New_York",
  "ND": "America/Chicago",
  "OH": "America/New_York",
  "OK": "America/Chicago",
  "OR": "America/Los_Angeles",
  "PA": "America/New_York",
  "RI": "America/New_York",
  "SC": "America/New_York",
  "SD": "America/Chicago",
  "TN": "America/Chicago",
  "TX": "America/Chicago",
  "UT": "America/Denver",
  "VT": "America/New_York",
  "VA": "America/New_York",
  "WA": "America/Los_Angeles",
  "WV": "America/New_York",
  "WI": "America/Chicago",
  "WY": "America/Denver",
  "DC": "America/New_York",
};

/**
 * Resolves a TimeZone based on State or Zip code.
 * Zip code resolution is a simple range-based estimation.
 */
export const resolveTimeZone = (state, zip) => {
  // 1. Try Zip prefix (first 3 digits for basic identification)
  if (zip && zip.length >= 3) {
    const prefix = parseInt(zip.substring(0, 3), 10);
    
    // Very simplified US Zip to TZ mapping
    if (prefix >= 0 && prefix <= 199) return "America/New_York";
    if (prefix >= 200 && prefix <= 299) return "America/New_York";
    if (prefix >= 300 && prefix <= 399) return "America/New_York";
    if (prefix >= 400 && prefix <= 499) return "America/New_York"; // mostly ET
    if (prefix >= 500 && prefix <= 599) return "America/Chicago";
    if (prefix >= 600 && prefix <= 699) return "America/Chicago";
    if (prefix >= 700 && prefix <= 799) return "America/Chicago";
    if (prefix >= 800 && prefix <= 849) return "America/Denver";
    if (prefix >= 850 && prefix <= 869) return "America/Phoenix";
    if (prefix >= 870 && prefix <= 889) return "America/Denver";
    if (prefix >= 900 && prefix <= 969) return "America/Los_Angeles";
    if (prefix >= 970 && prefix <= 979) return "America/Los_Angeles";
    if (prefix >= 980 && prefix <= 994) return "America/Los_Angeles";
    if (prefix >= 995 && prefix <= 999) return "America/Anchorage";
  }

  // 2. Fallback to State
  if (state) {
    const s = state.toUpperCase().trim();
    return STATE_TO_TZ[s] || null;
  }

  return null;
};
