import { 
  Transaction, 
  TransactionType, 
  CapitalGainResult, 
  TaxSummary, 
  TaxBracket, 
  Dividend,
  OpenPosition 
} from './types';
import { 
  TAX_BRACKETS_2025, 
  YI_UFE_DATA, 
  getPreviousMonthKey, 
  DIVIDEND_EXEMPTION_LIMIT_2025 
} from './constants';

// ---- Stock Price Fetching Logic ----

// Helper to parse float safely handles both 1.234,56 (TR) and 1,234.56 (US) formats
export const parsePrice = (val: any) => {
  if (!val) return null;
  let str = String(val).trim();
  
  // Remove currency symbols and non-numeric chars except , and .
  str = str.replace(/[^\d.,-]/g, '');

  if (!str) return null;

  // Detect format:
  // If it has a comma at the end part (e.g. 123,45), it's likely TR/EU format.
  // If it has a dot at the end part (e.g. 123.45), it's likely US format.
  
  const lastCommaIndex = str.lastIndexOf(',');
  const lastDotIndex = str.lastIndexOf('.');

  let finalNum = 0;

  if (lastCommaIndex > lastDotIndex) {
    // Likely TR format: 1.500,50 -> remove dots, replace comma with dot
    // Note: replace(',', '.') only replaces first comma. 
    // TR format uses dots for thousands, so we strip all dots first.
    // Then we expect only one comma as decimal separator.
    const clean = str.replace(/\./g, '').replace(',', '.');
    finalNum = parseFloat(clean);
  } else {
    // Likely US format: 1,500.50 -> remove commas
    const clean = str.replace(/,/g, '');
    finalNum = parseFloat(clean);
  }

  // Return with full precision (don't round here)
  return (!isNaN(finalNum) && finalNum > 0) ? finalNum : null;
};

// Strategy: Scrape TradingEconomics / BusinessInsider / BigCharts (More reliable via Proxy)
export const fetchCurrentStockPrice = async (ticker: string): Promise<number | null> => {
  const symbol = ticker.toLowerCase().trim();
  const timestamp = Date.now();

  const strategies = [
    {
      name: 'YahooFinance',
      // Yahoo Finance is usually very reliable for US stocks
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://finance.yahoo.com/quote/${symbol}`)}&t=${timestamp}`,
      parse: (html: string) => {
        // Look for fin-streamer or specific data attributes
        // <fin-streamer ... data-field="regularMarketPrice" ... value="123.45">
        const regex = /data-field="regularMarketPrice"[^>]*value="([0-9.]+)"/i;
        const match = html.match(regex);
        if (match && match[1]) return match[1];
        
        // Fallback: Look for the text content
        const regexText = /regularMarketPrice"[^>]*>\s*([0-9.,]+)\s*<\//i;
        const matchText = html.match(regexText);
        if (matchText && matchText[1]) return matchText[1];
        
        return null;
      }
    },
    {
      name: 'TradingEconomics',
      // Structure: https://tr.tradingeconomics.com/aapl:us
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://tr.tradingeconomics.com/${symbol}:us`)}&t=${timestamp}`,
      parse: (html: string) => {
        // Look for ID "market_last" allowing whitespace
        // <span id="market_last"> 123.45 </span>
        const regex = /id="market_last"[^>]*>\s*([0-9.,]+)\s*<\//i;
        const match = html.match(regex);
        if (match && match[1]) return match[1];
        return null;
      }
    },
    {
      name: 'BusinessInsider',
      // Structure: https://markets.businessinsider.com/stocks/aapl-stock
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://markets.businessinsider.com/stocks/${symbol}-stock`)}&t=${timestamp}`,
      parse: (html: string) => {
        // Look for class "price-section__current-value" allowing whitespace
        const regex = /class="price-section__current-value"[^>]*>\s*([0-9.,]+)\s*<\//i;
        const match = html.match(regex);
        if (match && match[1]) return match[1];
        return null;
      }
    },
    {
      name: 'BigCharts',
      // MarketWatch's BigCharts is very lightweight
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://bigcharts.marketwatch.com/quickchart/quickchart.asp?symb=${symbol}`)}&t=${timestamp}`,
      parse: (html: string) => {
        // Look for the specific div structure in BigCharts allowing whitespace
        const regex = /<div class="quickchart-last">[^<]*<div>\s*([0-9.,]+)\s*<\//i;
        const match = html.match(regex);
        if (match && match[1]) return match[1];
        return null;
      }
    }
  ];

  for (const strat of strategies) {
    try {
      const res = await fetch(strat.url);
      if (res.ok) {
        const json = await res.json();
        const html = json.contents; 
        if (html) {
          const rawPrice = strat.parse(html);
          // Parse string to number
          const price = parsePrice(rawPrice);
          if (price) return price;
        }
      }
    } catch (e) {
      // console.warn(`${strat.name} failed for ${symbol}`);
    }
  }

  return null;
};

// ---- Google Sheet CSV Parser ----
export const fetchPricesFromGoogleSheet = async (csvUrl: string): Promise<Record<string, number>> => {
  // Validate URL roughly
  if (!csvUrl.includes('docs.google.com') || !csvUrl.includes('output=csv')) {
    // If user pasted a normal edit link, try to fix it
    if (csvUrl.includes('/edit')) {
      csvUrl = csvUrl.replace(/\/edit.*$/, '/export?format=csv');
    } else {
      throw new Error("Lütfen Google Sheet 'Web'de Yayınla' (CSV) linkini kullanın.");
    }
  }

  // 3-Stage Fetch Strategy for robustness against CORS
  const fetchStrategies = [
    // 1. CorsProxy.io (Usually most reliable for Google Sheets)
    { 
      url: `https://corsproxy.io/?${encodeURIComponent(csvUrl)}`, 
      isJsonWrapper: false 
    },
    // 2. AllOrigins (Raw mode)
    { 
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`, 
      isJsonWrapper: false 
    },
    // 3. Direct Fetch (Works if sheet permissions are very open)
    { 
      url: csvUrl, 
      isJsonWrapper: false 
    }
  ];

  let csvText = '';
  let fetchError = null;

  for (const strategy of fetchStrategies) {
    try {
      const res = await fetch(strategy.url);
      if (res.ok) {
        csvText = await res.text();
        // Check if we got an HTML error page instead of CSV
        if (csvText.startsWith('<!DOCTYPE') || csvText.includes('<html')) {
          continue; // Try next strategy
        }
        break; // Success
      }
    } catch (e: any) {
      fetchError = e;
      continue;
    }
  }

  if (!csvText) {
    throw new Error("Google Sheet verisi çekilemedi. Linkin herkese açık ve 'Web'de Yayınla' formatında olduğundan emin olun.");
  }

  // Parse CSV
  const priceMap: Record<string, number> = {};
  const lines = csvText.split(/\r?\n/);
  
  lines.forEach(line => {
    if (!line.trim()) return;

    let ticker = '';
    let priceRaw = '';

    // CSV Parsing Logic:
    // If using semicolon (common in EU/TR for Excel CSVs):
    if (line.includes(';') && !line.includes('","')) {
        const parts = line.split(';');
        if (parts.length >= 2) {
            ticker = parts[0];
            priceRaw = parts[1];
        }
    } else {
        // Standard Comma Separated
        // Problem: TR formatted numbers might be quoted: "277,32"
        // Heuristic: Split by FIRST comma only. Ticker usually doesn't have comma.
        const firstComma = line.indexOf(',');
        if (firstComma !== -1) {
            ticker = line.substring(0, firstComma);
            priceRaw = line.substring(firstComma + 1);
        }
    }

    if (ticker && priceRaw) {
      // Cleanup Ticker
      ticker = ticker.replace(/['"]/g, '').trim().toUpperCase();
      
      // Cleanup Price
      // If it's quoted like "277,32", strip quotes
      priceRaw = priceRaw.trim();
      if (priceRaw.startsWith('"') && priceRaw.endsWith('"')) {
        priceRaw = priceRaw.slice(1, -1);
      }
      // If it contains " USD" or similar, parsePrice handles it, 
      // but stripping quotes is crucial for "277,32"

      if (ticker && ticker !== 'SEMBOLLER' && ticker !== 'TICKER') {
        const price = parsePrice(priceRaw);
        if (price) {
          priceMap[ticker] = price;
        }
      }
    }
  });

  if (Object.keys(priceMap).length === 0) {
    throw new Error("CSV okundu ancak geçerli hisse/fiyat bulunamadı. Formatın 'Hisse,Fiyat' şeklinde olduğundan emin olun.");
  }

  return priceMap;
};

// ---- TCMB Fetching Logic ----

export const fetchTcmbRate = async (dateStr: string): Promise<number | null> => {
  // Validate Date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error("Geçersiz tarih.");
  }

  const day = date.getDay();
  // Basic Weekend Warning (TCMB doesn't publish on weekends)
  if (day === 0 || day === 6) {
    throw new Error("Hafta sonları kur açıklanmaz. Lütfen hafta içi bir tarih seçiniz.");
  }

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  
  // TCMB URL: https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml
  const tcmbUrl = `https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`;
  const timestamp = new Date().getTime(); 

  const strategies = [
    {
      name: 'CodeTabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(tcmbUrl)}&t=${timestamp}`,
      type: 'text_xml',
    },
    {
      name: 'AllOrigins',
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(tcmbUrl)}&t=${timestamp}`,
      type: 'json_xml', 
    },
    {
      name: 'Frankfurter',
      // Frankfurter is a backup for generic rates if TCMB fails
      url: `https://api.frankfurter.dev/v1/${dateStr}?base=USD&symbols=TRY`,
      type: 'json_api',
    }
  ];

  // Try strategies sequentially
  for (const strategy of strategies) {
    try {
      const response = await fetch(strategy.url);
      
      if (!response.ok) continue;

      // --- Strategy 3: Frankfurter API (JSON) ---
      if (strategy.type === 'json_api') {
        const data = await response.json();
        if (data && data.rates && data.rates.TRY) {
          return data.rates.TRY;
        }
        continue;
      }

      // --- Strategy 1 & 2: XML Parsing ---
      let xmlString = "";
      if (strategy.type === 'json_xml') {
        const data = await response.json();
        if (data && data.contents) {
          xmlString = data.contents;
        }
      } else if (strategy.type === 'text_xml') {
        xmlString = await response.text();
      }

      if (!xmlString || xmlString.length < 50) continue;

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      
      if (xmlDoc.querySelector("parsererror")) continue;

      const currency = xmlDoc.querySelector('Currency[Kod="USD"]');
      if (!currency) continue;

      const forexBuying = currency.querySelector('ForexBuying')?.textContent;
      
      if (forexBuying) {
        return parseFloat(forexBuying);
      }

    } catch (error) {
      continue;
    }
  }

  throw new Error("Kur verisi otomatik çekilemedi. Bağlantı hatası veya resmi tatil olabilir. Lütfen manuel giriniz.");
};

// Recursive function to find the latest available rate (Today -> Yesterday -> ...)
export const fetchLatestExchangeRate = async (attemptDate: Date = new Date(), depth = 0): Promise<number | null> => {
  if (depth > 5) return null; // Safety break after 5 days back

  // Check if weekend (0=Sun, 6=Sat)
  const day = attemptDate.getDay();
  if (day === 0 || day === 6) {
    // If weekend, try Friday
    const prevDate = new Date(attemptDate);
    prevDate.setDate(attemptDate.getDate() - 1);
    return fetchLatestExchangeRate(prevDate, depth);
  }

  const dateStr = attemptDate.toISOString().split('T')[0];
  try {
    const rate = await fetchTcmbRate(dateStr);
    if (rate) return rate;
    
    // If null (e.g. valid weekday but holiday or not published yet), try previous day
    throw new Error("Rate not found");
  } catch (e) {
    const prevDate = new Date(attemptDate);
    prevDate.setDate(attemptDate.getDate() - 1);
    // Recursively try previous day
    return fetchLatestExchangeRate(prevDate, depth + 1);
  }
};

// ---- Existing Logic ----

export const getOpenPositions = (transactions: Transaction[]): OpenPosition[] => {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const buyQueue: Record<string, Transaction[]> = {};

  // Process FIFO to find what's left
  for (const tx of sorted) {
    if (!buyQueue[tx.ticker]) buyQueue[tx.ticker] = [];
    
    if (tx.type === TransactionType.BUY) {
      buyQueue[tx.ticker].push({ ...tx });
    } else if (tx.type === TransactionType.SELL) {
      let qtyToSell = tx.quantity;
      const currentQueue = buyQueue[tx.ticker];

      while (qtyToSell > 0 && currentQueue.length > 0) {
        const currentBuy = currentQueue[0];
        if (currentBuy.quantity > qtyToSell) {
          currentBuy.quantity -= qtyToSell;
          qtyToSell = 0;
        } else {
          qtyToSell -= currentBuy.quantity;
          currentQueue.shift();
        }
      }
    }
  }

  // Flatten to OpenPosition list
  const results: OpenPosition[] = [];
  Object.keys(buyQueue).forEach(ticker => {
    buyQueue[ticker].forEach(lot => {
      if (lot.quantity > 0.000001) {
         results.push({
           ticker: lot.ticker,
           buyDate: lot.date,
           quantity: lot.quantity,
           buyPriceUsd: lot.priceUsd,
           exchangeRate: lot.exchangeRate,
           totalCostTry: lot.quantity * lot.priceUsd * lot.exchangeRate
         });
      }
    });
  });

  return results;
};

export const calculateCapitalGains = (transactions: Transaction[]): CapitalGainResult[] => {
  // Deep copy to avoid mutating state
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const buys: Transaction[] = []; // Queue of buy lots
  const results: CapitalGainResult[] = [];

  // 1. Separate Buys and Process Sells via FIFO
  for (const tx of sorted) {
    if (tx.type === TransactionType.BUY) {
      buys.push({ ...tx }); // Push a copy of the buy lot
    } else if (tx.type === TransactionType.SELL) {
      let remainingSellQty = tx.quantity;

      while (remainingSellQty > 0) {
        if (buys.length === 0) {
          // Error: Selling more than owned. 
          break;
        }

        const currentBuy = buys[0];
        const matchQty = Math.min(remainingSellQty, currentBuy.quantity);

        // 2. Calculate details for this chunk
        const sellTotalTry = matchQty * tx.priceUsd * tx.exchangeRate;
        // Cost Basis in TL (Historical)
        const buyTotalTry = matchQty * currentBuy.priceUsd * currentBuy.exchangeRate;

        // 3. Indexing Logic (Yİ-ÜFE)
        const buyPrevMonthKey = getPreviousMonthKey(currentBuy.date);
        const sellPrevMonthKey = getPreviousMonthKey(tx.date);
        
        const buyIndex = YI_UFE_DATA[buyPrevMonthKey] || 0;
        const sellIndex = YI_UFE_DATA[sellPrevMonthKey] || 0;

        let inflationRate = 0;
        let isIndexed = false;
        let indexedCostTry = buyTotalTry;

        // Only index if both indices exist and Buy date is significantly before Sell date
        if (buyIndex > 0 && sellIndex > 0) {
           inflationRate = ((sellIndex - buyIndex) / buyIndex);
           // Threshold is 10% (0.10)
           if (inflationRate >= 0.10) {
             isIndexed = true;
             // Formula: Cost * (SellIndex / BuyIndex)
             indexedCostTry = buyTotalTry * (sellIndex / buyIndex);
           }
        }

        // 4. Final Profit Calculation
        const realProfitTry = sellTotalTry - indexedCostTry;
        
        // Push Result
        results.push({
          ticker: tx.ticker,
          sellDate: tx.date,
          buyDate: currentBuy.date,
          quantity: matchQty,
          sellPriceUsd: tx.priceUsd,
          buyPriceUsd: currentBuy.priceUsd,
          profitUsd: (matchQty * tx.priceUsd) - (matchQty * currentBuy.priceUsd),
          sellTotalTry,
          buyTotalTry,
          buyPrevMonthUfe: buyIndex,
          sellPrevMonthUfe: sellIndex,
          inflationRate,
          isIndexed,
          indexedCostTry,
          realProfitTry
        });

        // 5. Update Inventory
        remainingSellQty -= matchQty;
        currentBuy.quantity -= matchQty;

        if (currentBuy.quantity <= 0.000001) {
          buys.shift(); // Remove exhausted buy lot
        }
      }
    }
  }

  return results;
};

// Pure function to calculate tax based on bracket logic
// Exported for use in Scenario Analysis as well
export const calculateTaxLiability = (taxableIncome: number): { tax: number, rate: number } => {
  let calculatedTaxTry = 0;
  let finalBracketRate = 0;

  // Find the bracket
  for (let i = 0; i < TAX_BRACKETS_2025.length; i++) {
    const bracket = TAX_BRACKETS_2025[i];
    const prevLimit = i === 0 ? 0 : TAX_BRACKETS_2025[i-1].limit;
    
    if (taxableIncome <= bracket.limit) {
      // User falls in this bracket
      calculatedTaxTry = bracket.baseTax + (taxableIncome - prevLimit) * bracket.rate;
      finalBracketRate = bracket.rate;
      return { tax: calculatedTaxTry, rate: finalBracketRate };
    }
  }
  
  // Fallback for infinity (should be caught by loop but for safety)
  return { tax: 0, rate: 0 };
};

export const calculateTax = (
  capitalGains: CapitalGainResult[], 
  dividends: Dividend[]
): TaxSummary => {
  // 1. Sum Capital Gains
  const totalCapitalGainsProfitTry = capitalGains.reduce((sum, res) => sum + res.realProfitTry, 0);

  // 2. Sum Dividends
  let totalDividendProfitTry = 0;
  let totalWithholdingTaxTry = 0;

  dividends.forEach(div => {
    const amountTry = div.amountUsd * div.exchangeRate;
    const withholdingTry = div.withholdingTaxUsd * div.exchangeRate;
    
    totalDividendProfitTry += amountTry;
    totalWithholdingTaxTry += withholdingTry;
  });

  // Dividend Exemption Logic
  // If Total Dividend Income <= 18,000 TL, it is NOT declared.
  // If > 18,000 TL, ALL of it is declared.
  let taxableDividendIncome = 0;
  if (totalDividendProfitTry > DIVIDEND_EXEMPTION_LIMIT_2025) {
    taxableDividendIncome = totalDividendProfitTry;
  }

  // 3. Total Taxable Income
  const netCapitalGain = Math.max(0, totalCapitalGainsProfitTry);
  
  const totalTaxableIncomeTry = netCapitalGain + taxableDividendIncome;

  // 4. Progressive Tax Calculation via Helper
  const { tax: calculatedTaxTry, rate: finalBracketRate } = calculateTaxLiability(totalTaxableIncomeTry);

  // 5. Foreign Tax Credit (Mahsup)
  let allowedForeignTaxCredit = 0;
  if (taxableDividendIncome > 0) {
    // Simplified: We deduct full withholding up to the total tax amount
    allowedForeignTaxCredit = Math.min(totalWithholdingTaxTry, calculatedTaxTry);
  }

  const finalTaxPaymentTry = Math.max(0, calculatedTaxTry - allowedForeignTaxCredit);

  return {
    totalCapitalGainsProfitTry,
    totalDividendProfitTry,
    totalTaxableIncomeTry,
    taxBracketPercentage: finalBracketRate * 100,
    calculatedTaxTry,
    foreignTaxCreditTry: allowedForeignTaxCredit,
    finalTaxPaymentTry
  };
};

export const formatCurrency = (amount: number, currency: 'TRY' | 'USD' = 'TRY', decimals: number = 2) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
};

export const formatPercent = (val: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: 2
  }).format(val);
};