export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface Transaction {
  id: string;
  ticker: string;
  type: TransactionType;
  date: string; // ISO Date YYYY-MM-DD
  quantity: number;
  priceUsd: number;
  exchangeRate: number; // TCMB Buying Rate on transaction date
  commissionUsd: number;
}

export interface Dividend {
  id: string;
  ticker: string;
  date: string;
  amountUsd: number;
  withholdingTaxUsd: number; // Usually 15% or 30%
  exchangeRate: number;
}

// Represents a stock lot currently held in portfolio
export interface OpenPosition {
  ticker: string;
  buyDate: string;
  quantity: number;
  buyPriceUsd: number;
  exchangeRate: number; // Buy Exchange Rate
  totalCostTry: number; // Historical Cost
}

// Result of a FIFO match (A sell transaction matched with a buy transaction)
export interface CapitalGainResult {
  ticker: string;
  sellDate: string;
  buyDate: string;
  quantity: number;
  
  // USD Values
  sellPriceUsd: number;
  buyPriceUsd: number;
  profitUsd: number;

  // TRY Values (Raw)
  sellTotalTry: number;
  buyTotalTry: number; // Cost basis
  
  // Indexing Data
  buyPrevMonthUfe: number;
  sellPrevMonthUfe: number;
  inflationRate: number; // (SellUfe - BuyUfe) / BuyUfe
  isIndexed: boolean; // True if inflation > 10%
  indexedCostTry: number;
  
  // Final Calculation
  realProfitTry: number; // Taxable amount
}

export interface TaxSummary {
  totalCapitalGainsProfitTry: number;
  totalDividendProfitTry: number;
  totalTaxableIncomeTry: number;
  taxBracketPercentage: number;
  calculatedTaxTry: number;
  foreignTaxCreditTry: number; // Deductible withholding
  finalTaxPaymentTry: number;
}

export interface TaxBracket {
  limit: number;
  rate: number;
  baseTax: number;
}

export interface YiUfeMap {
  [key: string]: number; // "YYYY-MM" -> Index Value
}