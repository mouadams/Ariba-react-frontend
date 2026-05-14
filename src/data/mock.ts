export const headerRows = [
  { id: "PR-10042", vendor: "Acme Industrial", amount: 12500, status: "Approved", date: "2025-04-21" },
  { id: "PR-10043", vendor: "Globex Corp", amount: 8400, status: "Pending", date: "2025-04-22" },
  { id: "PR-10044", vendor: "Initech Ltd", amount: 22100, status: "Approved", date: "2025-04-23" },
  { id: "PR-10045", vendor: "Umbrella Co", amount: 5320, status: "Rejected", date: "2025-04-24" },
  { id: "PR-10046", vendor: "Stark Holdings", amount: 47800, status: "Approved", date: "2025-04-25" },
  { id: "PR-10047", vendor: "Wayne Supplies", amount: 3210, status: "Pending", date: "2025-04-26" },
];

export const detailsRows = [
  { id: "L-001", parent: "PR-10042", item: "Steel Bracket 2x4", qty: 120, unit: 18.5 },
  { id: "L-002", parent: "PR-10042", item: "M8 Bolt Pack", qty: 50, unit: 4.2 },
  { id: "L-003", parent: "PR-10043", item: "Cable Conduit", qty: 200, unit: 12.0 },
  { id: "L-004", parent: "PR-10044", item: "Hydraulic Pump", qty: 4, unit: 2400 },
  { id: "L-005", parent: "PR-10046", item: "Server Rack 42U", qty: 6, unit: 1850 },
];

export const accountingRows = [
  { id: "A-001", account: "5001-Materials", cc: "CC-100", amount: 12500 },
  { id: "A-002", account: "5002-Services", cc: "CC-200", amount: 8400 },
  { id: "A-003", account: "5001-Materials", cc: "CC-100", amount: 22100 },
  { id: "A-004", account: "5004-Capex", cc: "CC-300", amount: 47800 },
];

export const chartData = [
  { day: "Mon", processed: 24, matched: 22 },
  { day: "Tue", processed: 38, matched: 35 },
  { day: "Wed", processed: 52, matched: 49 },
  { day: "Thu", processed: 41, matched: 39 },
  { day: "Fri", processed: 67, matched: 64 },
  { day: "Sat", processed: 18, matched: 17 },
  { day: "Sun", processed: 12, matched: 12 },
];

export const historyItems = [
  { id: "H-2451", type: "Master Data Extraction", rows: 1240, date: "2025-05-06 14:22", size: "2.4 MB", status: "Completed" },
  { id: "H-2450", type: "Request Form Sync", rows: 312, date: "2025-05-06 11:08", size: "640 KB", status: "Completed" },
  { id: "H-2449", type: "Invoice Reconciliation", rows: 4820, date: "2025-05-05 18:47", size: "8.1 MB", status: "Completed" },
  { id: "H-2448", type: "Vendor Mapping", rows: 84, date: "2025-05-05 09:15", size: "120 KB", status: "Warning" },
  { id: "H-2447", type: "Catalog Import", rows: 2310, date: "2025-05-04 22:01", size: "4.7 MB", status: "Completed" },
];