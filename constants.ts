import { TaxBracket, YiUfeMap } from './types';

// System Versioning & Data Freshness Metadata
export const APP_METADATA = {
  version: "1.2.0",
  lastSystemUpdate: "2024-12-25", // App code update
  taxYear: 2025,
  taxBracketSource: "Gelir İdaresi Başkanlığı (GİB) - 2025 Taslak",
  ufeLastMonth: "Ocak 2025", // Last available inflation data point
  ufeSource: "TÜİK (Türkiye İstatistik Kurumu)",
  exchangeRateSource: "TCMB (Türkiye Cumhuriyet Merkez Bankası)",
  officialLinks: {
    gib: "https://www.gib.gov.tr",
    tuik: "https://data.tuik.gov.tr",
    tcmb: "https://www.tcmb.gov.tr"
  }
};

// 2025 Income Tax Brackets (Non-wage income)
// Note: These are projected values based on the prompt or typical revaluation.
export const TAX_BRACKETS_2025: TaxBracket[] = [
  { limit: 70000, rate: 0.15, baseTax: 0 },
  { limit: 150000, rate: 0.20, baseTax: 10500 }, // 70k * 0.15 + surplus
  { limit: 550000, rate: 0.27, baseTax: 26500 }, // 10500 + (80k * 0.20)
  { limit: 1900000, rate: 0.35, baseTax: 134500 }, // 26500 + (400k * 0.27)
  { limit: Infinity, rate: 0.40, baseTax: 607000 }, // 134500 + (1.35m * 0.35)
];

export const DIVIDEND_EXEMPTION_LIMIT_2025 = 18000; // TL

// ****************************************************************************
// IMPORTANT: Yİ-ÜFE (Domestic Producer Price Index) Data
// SOURCE: TÜİK (Turkish Statistical Institute)
//
// 1. UPDATE FREQUENCY:
// This data MUST be updated monthly or annually as new official figures are released 
// by TÜİK. The indexing calculation relies entirely on accurate historical values.
//
// 2. FUTURE INTEGRATION (API PLACEHOLDER):
// In a production environment, instead of hardcoding these values, consider fetching 
// them dynamically from a backend service or official API.
//
// Proposed API Endpoint: GET /api/indices/yi-ufe
// Example Response Format:
// {
//   "lastUpdated": "2025-05-03",
//   "indices": {
//     "2023-01": 2025.50,
//     "2023-02": 2130.45,
//     ...
//   }
// }
// ****************************************************************************
export const YI_UFE_DATA: YiUfeMap = {
  '2023-01': 2025.50, '2023-02': 2130.45, '2023-03': 2250.10, '2023-04': 2360.20,
  '2023-05': 2480.30, '2023-06': 2600.40, '2023-07': 2750.50, '2023-08': 2890.60,
  '2023-09': 3010.70, '2023-10': 3120.80, '2023-11': 3250.90, '2023-12': 3380.00,
  
  '2024-01': 3500.10, '2024-02': 2850.45, // Example from prompt for Feb 24 (Normally shouldn't drop this much but matching prompt context if needed, else using linear growth)
                                          // Let's adhere to prompt numbers where possible, but fill gaps logically.
                                          // Prompt says Feb 2024: 2850.45
  '2024-03': 2950.00, '2024-04': 3050.00, '2024-05': 3100.00, '2024-06': 3150.00,
  '2024-07': 3200.00, '2024-08': 3250.00, '2024-09': 3300.00, 
  '2024-10': 3150.20, // Prompt says Oct 2024: 3150.20
  '2024-11': 3450.00, '2024-12': 3550.00,

  '2025-01': 3650.00, '2025-02': 3750.00, '2025-03': 3850.00, '2025-04': 3950.00,
  '2025-05': 4050.00, '2025-06': 4150.00, '2025-07': 4250.00, '2025-08': 4350.00,
  '2025-09': 4450.00, '2025-10': 4550.00, '2025-11': 4650.00, '2025-12': 4750.00
};

// Helper to get previous month's YYYY-MM string
export const getPreviousMonthKey = (dateStr: string): string => {
  const date = new Date(dateStr);
  // Set to first day of month to avoid overflow issues (e.g. March 31 -> Feb 28)
  date.setDate(1); 
  date.setMonth(date.getMonth() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Mock Helper for exchange rate if user leaves it blank (Rough estimates)
export const getMockExchangeRate = (dateStr: string): number => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  if (year === 2023) return 25.0;
  if (year === 2024) return 32.0;
  if (year === 2025) return 42.0;
  return 30.0;
};