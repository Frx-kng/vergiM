import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, Dividend, TaxSummary } from '../types';
import { formatCurrency, formatPercent, fetchTcmbRate, fetchLatestExchangeRate, getOpenPositions, fetchCurrentStockPrice, fetchPricesFromGoogleSheet, parsePrice, calculateTaxLiability } from '../utils';
import { PlusCircle, Trash2, TrendingUp, TrendingDown, RefreshCw, Download, Calculator, Briefcase, DollarSign, CloudDownload, FileText, CheckCircle, XCircle, Sheet } from 'lucide-react';
import { YI_UFE_DATA, getPreviousMonthKey } from '../constants';

interface PortfolioProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  dividends: Dividend[];
  setDividends: React.Dispatch<React.SetStateAction<Dividend[]>>;
  summary: TaxSummary; 
  // New props for persisted state
  scenarioRate: string;
  setScenarioRate: (val: string) => void;
  currentPrices: Record<string, string>;
  setCurrentPrices: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const Portfolio: React.FC<PortfolioProps> = ({ 
  transactions, 
  setTransactions, 
  dividends, 
  setDividends, 
  summary,
  scenarioRate,
  setScenarioRate,
  currentPrices,
  setCurrentPrices
}) => {
  const [activeTab, setActiveTab] = useState<'stocks' | 'dividends' | 'assets'>('assets');
  const [loadingRate, setLoadingRate] = useState(false);
  
  // Batch Fetching State
  const [isFetching, setIsFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
  const [statusMap, setStatusMap] = useState<Record<string, 'success' | 'error' | 'loading' | null>>({});

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Google Sheet Sync State
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRkH263uwYdYmqQrjs-zsbnDZS8jI0M32vGhSXQnDPgt14POdD6fZeAT23pxO5H6uZf5ByXDsLAolnZ/pub?output=csv');
  
  // Stock Form State
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [rate, setRate] = useState('');

  // Dividend Form State
  const [divTicker, setDivTicker] = useState('');
  const [divDate, setDivDate] = useState('');
  const [divAmount, setDivAmount] = useState('');
  const [divTax, setDivTax] = useState('');
  const [divRate, setDivRate] = useState('');

  // Derived Data
  const openPositions = useMemo(() => getOpenPositions(transactions), [transactions]);
  const uniqueTickers = useMemo(() => Array.from(new Set(openPositions.map(p => p.ticker))), [openPositions]);

  // ---- AUTO LOAD SCENARIO RATE ----
  useEffect(() => {
    // Only fetch if empty to avoid overwriting user input
    if (!scenarioRate) {
      const loadRate = async () => {
        const rate = await fetchLatestExchangeRate();
        if (rate) {
          // Format with comma for TR display (e.g. 35,50)
          setScenarioRate(rate.toFixed(2).replace('.', ','));
        }
      };
      loadRate();
    }
  }, []); // Run once on mount

  // ---- SINGLE FETCH LOGIC ----
  const fetchSinglePrice = async (tick: string) => {
    setStatusMap(prev => ({ ...prev, [tick]: 'loading' }));
    try {
      const price = await fetchCurrentStockPrice(tick);
      if (price !== null) {
        // Format with comma
        setCurrentPrices(prev => ({ ...prev, [tick]: price.toFixed(2).replace('.', ',') }));
        setStatusMap(prev => ({ ...prev, [tick]: 'success' }));
      } else {
        setStatusMap(prev => ({ ...prev, [tick]: 'error' }));
      }
    } catch (e) {
      setStatusMap(prev => ({ ...prev, [tick]: 'error' }));
    }
  };

  // ---- BATCH FETCH LOGIC ----
  const handleFetchAllPrices = async () => {
    if (uniqueTickers.length === 0) return;
    
    setIsFetching(true);
    setFetchProgress({ current: 0, total: uniqueTickers.length, success: 0, fail: 0 });
    setStatusMap({});

    // Reduced batch size to 2 to minimize rate limiting on free proxies
    const BATCH_SIZE = 2; 
    const newPrices = { ...currentPrices };
    let success = 0;
    let fail = 0;

    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
      const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (tick) => {
        setStatusMap(prev => ({ ...prev, [tick]: 'loading' }));
        try {
          // Increased delay to avoid spamming
          await new Promise(r => setTimeout(r, Math.random() * 500 + 800));
          
          const price = await fetchCurrentStockPrice(tick);
          if (price !== null) {
            newPrices[tick] = price.toFixed(2).replace('.', ',');
            setStatusMap(prev => ({ ...prev, [tick]: 'success' }));
            success++;
          } else {
            setStatusMap(prev => ({ ...prev, [tick]: 'error' }));
            fail++;
          }
        } catch (e) {
          setStatusMap(prev => ({ ...prev, [tick]: 'error' }));
          fail++;
        }
      });

      await Promise.all(promises);
      
      setFetchProgress({
        current: Math.min(i + BATCH_SIZE, uniqueTickers.length),
        total: uniqueTickers.length,
        success,
        fail
      });
      
      setCurrentPrices({ ...newPrices });
    }

    setIsFetching(false);
  };

  // ---- BULK IMPORT LOGIC ----
  const handleBulkImport = () => {
    const lines = bulkText.split('\n');
    const newPrices = { ...currentPrices };
    let count = 0;

    lines.forEach(line => {
      // Try to parse: "TICKER PRICE" or "TICKER,PRICE" or "TICKER \t PRICE"
      const cleanLine = line.trim();
      if (!cleanLine) return;
      
      // Attempt to split by first whitespace or tab
      const match = cleanLine.match(/^([A-Za-z]+)[\s,;]+(.+)$/);
      
      if (match) {
        const symbol = match[1].toUpperCase();
        const priceRaw = match[2];
        const price = parsePrice(priceRaw);

        if (symbol && price !== null) {
          newPrices[symbol] = price.toFixed(2).replace('.', ',');
          count++;
        }
      }
    });

    setCurrentPrices(newPrices);
    setShowBulkModal(false);
    setBulkText('');
    alert(`${count} adet fiyat güncellendi.`);
  };

  // ---- GOOGLE SHEET SYNC LOGIC ----
  const handleSheetSync = async () => {
    if (!sheetUrl) return;
    setIsFetching(true);
    setStatusMap({}); // Clear status to show new results

    try {
      const prices = await fetchPricesFromGoogleSheet(sheetUrl);
      const newPrices = { ...currentPrices };
      let successCount = 0;
      let totalFetched = Object.keys(prices).length;

      Object.entries(prices).forEach(([tick, price]) => {
        newPrices[tick] = price.toFixed(2).replace('.', ',');
        // Mark as success if this ticker exists in our portfolio
        if (uniqueTickers.includes(tick)) {
          setStatusMap(prev => ({ ...prev, [tick]: 'success' }));
          successCount++;
        }
      });

      setCurrentPrices(newPrices);
      setShowSheetModal(false);
      alert(`BAŞARILI!\n\nGoogle Sheet'ten ${totalFetched} adet fiyat çekildi.\nPortföyünüzdeki ${successCount} hisse güncellendi.`);

    } catch (error: any) {
      alert("HATA: " + error.message);
    } finally {
      setIsFetching(false);
    }
  };

  // ---- TCMB RATE FETCH ----
  const handleFetchRate = async (dateStr: string, isDividend: boolean) => {
    if (!dateStr) {
      alert("Lütfen önce bir tarih seçiniz.");
      return;
    }
    setLoadingRate(true);
    try {
      const fetchedRate = await fetchTcmbRate(dateStr);
      if (fetchedRate) {
        if (isDividend) setDivRate(fetchedRate.toString());
        else setRate(fetchedRate.toString());
      } else {
        alert("Bu tarih için kur bulunamadı (Tatil olabilir).");
      }
    } catch (err: any) {
      alert(err.message || "Kur çekilirken hata oluştu.");
    } finally {
      setLoadingRate(false);
    }
  };

  // ---- CRUD HANDLERS ----
  const addTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      ticker: ticker.toUpperCase(),
      type,
      date,
      quantity: Number(qty),
      priceUsd: Number(price),
      exchangeRate: Number(rate),
      commissionUsd: 0, 
    };
    setTransactions([...transactions, newTx]);
    setTicker(''); setQty(''); setPrice(''); setRate('');
  };

  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const addDividend = (e: React.FormEvent) => {
    e.preventDefault();
    const newDiv: Dividend = {
      id: Math.random().toString(36).substr(2, 9),
      ticker: divTicker.toUpperCase(),
      date: divDate,
      amountUsd: Number(divAmount),
      withholdingTaxUsd: Number(divTax),
      exchangeRate: Number(divRate),
    };
    setDividends([...dividends, newDiv]);
    setDivTicker(''); setDivAmount(''); setDivTax(''); setDivRate('');
  };

  const removeDividend = (id: string) => {
    setDividends(dividends.filter(d => d.id !== id));
  };

  // Helper to handle price input change
  const handlePriceChange = (ticker: string, value: string) => {
    setCurrentPrices(prev => ({ ...prev, [ticker]: value }));
  };

  // Calculation Logic for Scenario Row
  const calculateScenario = (pos: any) => {
    // USE PARSEPRICE TO HANDLE COMMA INPUTS
    const currentPrice = parsePrice(currentPrices[pos.ticker]) || 0;
    const sRate = parsePrice(scenarioRate) || 0;
    
    const marketValueTry = pos.quantity * currentPrice * sRate;
    
    // Indexing Logic Check
    const today = new Date();
    const sellDateStr = today.toISOString().split('T')[0];
    
    const buyPrevMonthKey = getPreviousMonthKey(pos.buyDate);
    const sellPrevMonthKey = getPreviousMonthKey(sellDateStr);
    
    const buyIndex = YI_UFE_DATA[buyPrevMonthKey] || 0;
    const latestKey = Object.keys(YI_UFE_DATA).sort().pop() || '';
    const sellIndex = YI_UFE_DATA[sellPrevMonthKey] || YI_UFE_DATA[latestKey] || 0;

    let indexedCost = pos.totalCostTry;
    let isIndexed = false;
    let inflationRate = 0;

    if (buyIndex > 0 && sellIndex > 0) {
      inflationRate = ((sellIndex - buyIndex) / buyIndex);
      if (inflationRate >= 0.10) {
        isIndexed = true;
        indexedCost = pos.totalCostTry * (sellIndex / buyIndex);
      }
    }

    const potentialProfit = marketValueTry - indexedCost;

    // --- ACCURATE TAX CALCULATION (Marginal Impact) ---
    const currentTotalIncome = summary.totalTaxableIncomeTry;
    const currentTotalTax = summary.calculatedTaxTry;

    // Simulate new total income
    const newTotalIncome = currentTotalIncome + Math.max(0, potentialProfit);
    
    // Calculate new total tax liability
    const { tax: newTotalTax } = calculateTaxLiability(newTotalIncome);
    
    // The estimated tax for this specific transaction is the difference
    const estimatedTax = Math.max(0, newTotalTax - currentTotalTax);

    return { marketValueTry, potentialProfit, isIndexed, estimatedTax };
  };

  // CSV Export
  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (activeTab === 'stocks') {
      const headers = ['ID,Sembol,Islem,Tarih,Adet,Fiyat(USD),Kur(TL)'];
      const rows = transactions.map(t => `${t.id},${t.ticker},${t.type},${t.date},${t.quantity},${t.priceUsd},${t.exchangeRate}`);
      downloadCSV(headers.concat(rows).join('\n'), `hisse_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      {/* --- BULK IMPORT MODAL --- */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Toplu Fiyat Girişi
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-3">
                Excel veya Text dosyasından kopyaladığınız verileri aşağıya yapıştırın. <br/>
                Format: <span className="font-mono bg-slate-100 px-1 rounded">HİSSE FİYAT</span> (Örn: AAPL 175,50)
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"AAPL 175,20\nMSFT 420,00\nGOOGL 150.50"}
                className="w-full h-48 border border-slate-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={handleBulkImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Verileri İşle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- GOOGLE SHEET MODAL --- */}
      {showSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200 flex justify-between items-center">
              <h3 className="font-bold text-green-800 flex items-center gap-2">
                <Sheet size={20} className="text-green-600" />
                Google Sheet Entegrasyonu
              </h3>
              <button onClick={() => setShowSheetModal(false)} className="text-green-400 hover:text-green-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 text-sm">
              <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 mb-6 space-y-2">
                <h4 className="font-bold text-green-800">Nasıl Kullanılır? (En Güvenilir Yöntem)</h4>
                <ol className="list-decimal list-inside text-slate-700 space-y-1">
                  <li>Yeni bir Google Sheet oluşturun.</li>
                  <li>
                    <strong>A Sütununa</strong> hisse sembollerini, <strong>B Sütununa</strong> 
                    <code className="bg-white px-1 border rounded mx-1 text-green-700 font-mono">=GOOGLEFINANCE(A1)</code> formülünü yazın.
                  </li>
                  <li className="text-red-600 font-bold">
                    ÖNEMLİ: Google Sheet'te fiyat hücrelerini seçip, virgülden sonra en az 4 basamak (123,4567) görünecek şekilde formatlayın. CSV sadece ekranda görüneni verir.
                  </li>
                  <li>
                    Sol üstten <strong>Dosya &gt; Paylaş &gt; Web'de Yayınla</strong> menüsüne gidin.
                  </li>
                  <li>
                    "Link" sekmesinde, "Tüm Belge" yerine ilgili sayfayı seçin ve "Web Sayfası" yerine <strong>"Virgülle Ayrılmış Değerler (.csv)"</strong> seçeneğini seçin.
                  </li>
                  <li>
                    Oluşan linki kopyalayıp aşağıdaki kutuya yapıştırın.
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Yayınlanan CSV Linki:</label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv"
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setShowSheetModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={handleSheetSync}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Sheet size={18} />
                  Fiyatları Getir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER & TABS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Portföy Yönetimi</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== 'assets' && (
            <button
              onClick={handleExport}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors shadow-sm"
              title="CSV İndir"
            >
              <Download size={18} />
            </button>
          )}

          <div className="bg-white rounded-lg p-1 border border-slate-200 flex shadow-sm">
             <button 
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'assets' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Briefcase size={16} />
              Senaryo Analizi
            </button>
            <button 
              onClick={() => setActiveTab('stocks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'stocks' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <TrendingUp size={16} />
              İşlemler
            </button>
            <button 
              onClick={() => setActiveTab('dividends')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'dividends' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <DollarSign size={16} />
              Temettüler
            </button>
          </div>
        </div>
      </div>

      {/* --- ASSETS TAB (SCENARIO) --- */}
      {activeTab === 'assets' && (
         <div className="space-y-4">
           {/* Scenario Config Bar */}
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
               
               {/* Description */}
               <div className="flex items-start gap-4 max-w-2xl">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600 hidden sm:block">
                    <Calculator size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Vergi Simülasyonu</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Hisselerinizi bugün satsanız ne kadar vergi ödersiniz?
                      <br/>
                      <span className="text-xs text-orange-500 font-medium">İpucu:</span> Verileri otomatikleştirmek için "Getir" butonunu kullanın veya Excel'den toplu yapıştırın.
                    </p>
                  </div>
               </div>
               
               {/* Controls */}
               <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                 {/* Scenario Rate */}
                 <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                   <label className="text-xs font-bold text-slate-500 uppercase mr-3">Senaryo Kuru:</label>
                   <input 
                     type="text"
                     inputMode="decimal"
                     placeholder="Yükleniyor..."
                     value={scenarioRate}
                     onChange={(e) => setScenarioRate(e.target.value)}
                     className="w-24 bg-transparent text-right font-bold text-slate-800 outline-none border-b border-transparent focus:border-blue-500"
                   />
                   <span className="text-xs font-bold text-slate-400 ml-1">TL</span>
                 </div>

                 <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                 {/* Buttons */}
                 <div className="flex gap-2">
                   <button 
                    onClick={() => setShowSheetModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm font-medium border border-green-200"
                    title="Kendi Google Sheet dosyanızdan veri çekin"
                   >
                     <Sheet size={16} />
                     <span className="hidden sm:inline">Google Sheet</span>
                     <span className="sm:hidden">Sheet</span>
                   </button>

                   <button 
                    onClick={() => setShowBulkModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors text-sm font-medium border border-indigo-200"
                   >
                     <FileText size={16} />
                     <span className="hidden sm:inline">Manuel Yapıştır</span>
                     <span className="sm:hidden">Manuel</span>
                   </button>

                   <button 
                    onClick={handleFetchAllPrices}
                    disabled={isFetching}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg shadow-sm transition-all text-sm font-medium ${isFetching ? 'bg-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                    title="TradingEconomics / BusinessInsider vb. kaynaklardan çek"
                   >
                     {isFetching ? <RefreshCw size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                     {isFetching ? 'Getir' : 'Otomatik'}
                   </button>
                 </div>
               </div>
             </div>

             {/* Progress Bar for Batch Fetching */}
             {isFetching && (
               <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                 <div className="flex justify-between text-xs text-slate-500 mb-1">
                   <span>Veriler güncelleniyor... ({fetchProgress.current}/{fetchProgress.total})</span>
                   <span> Başarılı: <span className="text-green-600 font-bold">{fetchProgress.success}</span> | Hata: <span className="text-red-500 font-bold">{fetchProgress.fail}</span></span>
                 </div>
                 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${(fetchProgress.current / Math.max(fetchProgress.total, 1)) * 100}%` }}
                   ></div>
                 </div>
               </div>
             )}
           </div>

           {/* Assets Table */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Hisse</th>
                      <th className="px-6 py-3 whitespace-nowrap">Alış Tarihi</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Adet</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Maliyet (TL)</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap bg-blue-50/50 w-48 border-l border-blue-100">
                        Güncel Fiyat ($)
                      </th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Potansiyel Kar (TL)</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Vergi (Marjinal)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {openPositions.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">Portföyünüzde açık pozisyon bulunmamaktadır.</td></tr>
                    ) : (
                      openPositions.map((pos, idx) => {
                        const { potentialProfit, isIndexed, estimatedTax } = calculateScenario(pos);
                        const status = statusMap[pos.ticker];

                        return (
                          <tr key={`${pos.ticker}-${idx}`} className="hover:bg-slate-50 group">
                            <td className="px-6 py-3 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                {pos.ticker}
                                {status === 'success' && <CheckCircle size={14} className="text-green-500" />}
                                {status === 'error' && (
                                  <button 
                                    onClick={() => fetchSinglePrice(pos.ticker)} 
                                    title="Tekrar Dene"
                                    className="hover:scale-110 transition-transform"
                                  >
                                    <XCircle size={14} className="text-red-500" />
                                  </button>
                                )}
                                {status === 'loading' && <RefreshCw size={14} className="animate-spin text-blue-500" />}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-slate-600">{pos.buyDate}</td>
                            <td className="px-6 py-3 text-right">{pos.quantity}</td>
                            <td className="px-6 py-3 text-right text-slate-500 font-mono">{formatCurrency(pos.totalCostTry, 'TRY', 0)}</td>
                            
                            {/* Input Cell */}
                            <td className="px-4 py-2 text-right bg-blue-50/20 border-l border-blue-50 group-hover:bg-white transition-colors">
                              <input 
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={currentPrices[pos.ticker] || ''}
                                onChange={(e) => handlePriceChange(pos.ticker, e.target.value)}
                                className="w-full text-right px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-blue-800 font-bold bg-white shadow-sm"
                              />
                            </td>

                            <td className={`px-6 py-3 text-right font-medium ${potentialProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {formatCurrency(potentialProfit, 'TRY', 0)}
                              {isIndexed && <span className="block text-[10px] text-slate-400 font-normal">Endekslendi</span>}
                            </td>
                            <td className="px-6 py-3 text-right font-bold text-slate-800">
                              {potentialProfit > 0 ? formatCurrency(estimatedTax, 'TRY', 0) : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {openPositions.length > 0 && (
                     <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-right font-bold text-slate-600">TOPLAM TAHMİNİ VERGİ YÜKÜ:</td>
                          <td colSpan={2} className="px-6 py-4 text-right">
                            <span className="text-xl font-black text-slate-800 bg-white px-3 py-1 rounded shadow-sm border border-slate-200">
                              {formatCurrency(openPositions.reduce((sum, pos) => sum + calculateScenario(pos).estimatedTax, 0), 'TRY', 2)}
                            </span>
                          </td>
                        </tr>
                     </tfoot>
                  )}
                </table>
             </div>
           </div>
         </div>
      )}

      {/* --- STOCK / DIVIDEND FORMS (unchanged logic, just rendered when active) --- */}
      {(activeTab === 'stocks' || activeTab === 'dividends') && (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        {activeTab === 'stocks' ? (
          <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sembol</label>
              <input required type="text" placeholder="AAPL" value={ticker} onChange={e => setTicker(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">İşlem</label>
              <select value={type} onChange={(e) => setType(e.target.value as TransactionType)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value={TransactionType.BUY}>ALIŞ</option>
                <option value={TransactionType.SELL}>SATIŞ</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tarih</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Adet</label>
              <input required type="number" min="0.0001" step="any" placeholder="10" value={qty} onChange={e => setQty(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fiyat ($)</label>
              <input required type="number" min="0" step="any" placeholder="150.00" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-1 relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Kur (TL)</label>
              <div className="flex gap-1">
                <input required type="number" min="0" step="any" placeholder="32.50" value={rate} onChange={e => setRate(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button 
                  type="button"
                  onClick={() => handleFetchRate(date, false)}
                  disabled={loadingRate}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded px-2 text-slate-600 disabled:opacity-50"
                  title="TCMB'den Getir"
                >
                  <RefreshCw size={16} className={loadingRate ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="md:col-span-1">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded flex items-center justify-center gap-1 transition-colors">
                <PlusCircle size={16} /> Ekle
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={addDividend} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sembol</label>
              <input required type="text" placeholder="MSFT" value={divTicker} onChange={e => setDivTicker(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tarih</label>
              <input required type="date" value={divDate} onChange={e => setDivDate(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Brüt Tutar ($)</label>
              <input required type="number" step="any" placeholder="50.00" value={divAmount} onChange={e => setDivAmount(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Kesinti ($)</label>
              <input required type="number" step="any" placeholder="7.50" value={divTax} onChange={e => setDivTax(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Kur (TL)</label>
              <div className="flex gap-1">
                <input required type="number" step="any" placeholder="30.00" value={divRate} onChange={e => setDivRate(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
                <button 
                  type="button"
                  onClick={() => handleFetchRate(divDate, true)}
                  disabled={loadingRate}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded px-2 text-slate-600 disabled:opacity-50"
                  title="TCMB'den Getir"
                >
                  <RefreshCw size={16} className={loadingRate ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded flex items-center justify-center gap-1">
                <PlusCircle size={16} /> Ekle
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* --- LISTS (unchanged structure) --- */}
      {(activeTab === 'stocks' || activeTab === 'dividends') && (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Tarih</th>
                <th className="px-6 py-3 whitespace-nowrap">Sembol</th>
                <th className="px-6 py-3 whitespace-nowrap">İşlem</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Miktar</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Fiyat ($)</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Kur (TL)</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Toplam (TL)</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'stocks' ? (
                transactions.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">Henüz hisse işlemi eklenmedi.</td></tr>
                ) : (
                  transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-700 whitespace-nowrap">{tx.date}</td>
                      <td className="px-6 py-3 font-bold whitespace-nowrap">{tx.ticker}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${tx.type === TransactionType.BUY ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tx.type === TransactionType.BUY ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                          {tx.type === TransactionType.BUY ? 'ALIŞ' : 'SATIŞ'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">{tx.quantity}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">${tx.priceUsd.toFixed(4)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">₺{tx.exchangeRate.toFixed(4)}</td>
                      <td className="px-6 py-3 text-right font-medium whitespace-nowrap">{formatCurrency(tx.quantity * tx.priceUsd * tx.exchangeRate, 'TRY', 4)}</td>
                      <td className="px-6 py-3 text-center whitespace-nowrap">
                        <button onClick={() => removeTransaction(tx.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                dividends.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">Henüz temettü eklenmedi.</td></tr>
                ) : (
                  dividends.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((div) => (
                    <tr key={div.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-700 whitespace-nowrap">{div.date}</td>
                      <td className="px-6 py-3 font-bold whitespace-nowrap">{div.ticker}</td>
                      <td className="px-6 py-3 whitespace-nowrap"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">TEMETTÜ</span></td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">-</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">${div.amountUsd.toFixed(4)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">₺{div.exchangeRate.toFixed(4)}</td>
                      <td className="px-6 py-3 text-right font-medium whitespace-nowrap">{formatCurrency(div.amountUsd * div.exchangeRate, 'TRY', 4)}</td>
                      <td className="px-6 py-3 text-center whitespace-nowrap">
                        <button onClick={() => removeDividend(div.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};