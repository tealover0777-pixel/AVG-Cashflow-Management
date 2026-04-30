const normalizeDateAtNoon = (date) => {
  if (!date) return null;
  let d;
  if (typeof date === "string") {
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d_part] = date.split("-").map(Number);
      d = new Date(y, m - 1, d_part, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
};

const calculateScheduledDate = (baseDateStr, config) => {
  if (!baseDateStr || !config || config.enabled === false) return baseDateStr;
  const baseDate = normalizeDateAtNoon(baseDateStr);
  if (!baseDate) return baseDateStr;

  let result = new Date(baseDate);
  const type = (config.type || "").toUpperCase().replace(/ /g, "_").replace(/-/g, "_");

  switch (type) {
    case "DAYS":
      result.setDate(result.getDate() + (Number(config.value) || 0));
      break;
    case "MONTHS":
      result.setMonth(result.getMonth() + (Number(config.value) || 0));
      break;
    case "SPECIFIC_DAY":
    case "SPECIFIC_DAY_OF_THE_FOLLOWING_MONTH": {
      const offset = Number(config.month_offset) || 1;
      result.setMonth(result.getMonth() + offset);
      const day = Number(config.specific_day || config.value) || 15;
      const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      result.setDate(Math.min(day, lastDay));
      break;
    }
    case "QUARTER_END":
    case "QUARTER_OFFSET":
    case "QUATER_END": {
      const month = result.getMonth();
      const quarterEndMonth = Math.floor(month / 3) * 3 + 2;
      result.setMonth(quarterEndMonth);
      const lastDayOfQuarter = new Date(result.getFullYear(), quarterEndMonth + 1, 0).getDate();
      result.setDate(lastDayOfQuarter);
      const dayOffset = Number(config.value) || 15;
      result.setDate(result.getDate() + dayOffset);
      break;
    }
    default:
      break;
  }
  return result.toISOString().split("T")[0];
};

// Test Cases
const tests = [
  {
    name: "Days Lag (30 days)",
    base: "2024-01-01",
    config: { enabled: true, type: "Days", value: 30 },
    expected: "2024-01-31"
  },
  {
    name: "Months Lag (1 month)",
    base: "2024-01-31",
    config: { enabled: true, type: "Months", value: 1 },
    expected: "2024-03-02" // Jan 31 + 1 month = Feb 31 -> Mar 2 (native JS behavior)
  },
  {
    name: "Specific Day (Day 15, Offset 1)",
    base: "2024-01-01",
    config: { enabled: true, type: "Specific Day of the following Month", month_offset: 1, specific_day: 15 },
    expected: "2024-02-15"
  },
  {
    name: "Specific Day (End of Feb check)",
    base: "2024-01-01",
    config: { enabled: true, type: "Specific Day", month_offset: 1, specific_day: 31 },
    expected: "2024-02-29" // 2024 is leap year
  },
  {
    name: "Quarter-End (Q1 -> Apr 15)",
    base: "2024-01-15",
    config: { enabled: true, type: "Quarter-End", value: 15 },
    expected: "2024-04-15"
  },
  {
    name: "Quarter-End (Q1 -> Apr 15) using typo variant",
    base: "2024-02-15",
    config: { enabled: true, type: "Quater-End", value: 15 },
    expected: "2024-04-15"
  }
];

tests.forEach(t => {
  const actual = calculateScheduledDate(t.base, t.config);
  console.log(`${t.name}: ${actual === t.expected ? "PASS" : "FAIL (Expected " + t.expected + ", got " + actual + ")"}`);
});
