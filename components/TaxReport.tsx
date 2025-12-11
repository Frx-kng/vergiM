import React, { useState } from 'react';
import { CapitalGainResult, TaxSummary, Dividend } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { Info, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DIVIDEND_EXEMPTION_LIMIT_2025 } from '../constants';

interface TaxReportProps {
  summary: TaxSummary;
  capitalGains: CapitalGainResult[];
  dividends: Dividend[];
}

interface StockSummary {
  ticker: string;
  totalMatrah: number;
  count: number;
}

export const TaxReport: React.FC<TaxReportProps> = ({ summary, capitalGains, dividends }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (idx: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setExpandedRows(newSet);
  };
  
  // Group profits by Ticker to show "Per Stock" estimates
  const stockBreakdown = capitalGains.reduce((acc, curr) => {
    if (!acc[curr.ticker]) {
      acc[curr.ticker] = {
        ticker: curr.ticker,
        totalMatrah: 0,
        count: 0
      };
    }
    acc[curr.ticker].totalMatrah += curr.realProfitTry;
    acc[curr.ticker].count += 1;
    return acc;
  }, {} as Record<string, StockSummary>);

  const stockList = Object.values(stockBreakdown) as StockSummary[];

  // Helper to calculate estimated tax share for a stock
  const calculateEstimatedTaxShare = (matrah: number) => {
    if (summary.totalTaxableIncomeTry <= 0) return 0;
    // Calculate share based on proportion of total taxable income
    const ratio = matrah / summary.totalTaxableIncomeTry;
    return summary.calculatedTaxTry * ratio;
  };

  const isDividendExempt = summary.totalDividendProfitTry <= DIVIDEND_EXEMPTION_LIMIT_2025;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <h2 className="text-3xl font-bold text-slate-900">2025 Yılı Tahmini Vergi Beyan Raporu</h2>
        <p className="text-slate-500 mt-2">Oluşturulma Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <div className="mt-8 flex justify-center">
          <div className="bg-slate-50 px-8 py-4 rounded-lg border border-slate-200">
             <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ödenecek Gelir Vergisi</p>
             <p className="text-4xl font-extrabold text-slate-800 mt-2">{formatCurrency(summary.finalTaxPaymentTry)}</p>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Genel Hesap Özeti</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
             <div className="flex justify-between py-2 border-b border-slate-100">
               <span className="text-slate-600">Değer Artış Kazancı (Hisse)</span>
               <span className="font-medium">{formatCurrency(summary.totalCapitalGainsProfitTry)}</span>
             </div>
             <div className="flex justify-between py-2 border-b border-slate-100 items-center">
               <span className="text-slate-600">Menkul Sermaye İradı (Temettü)</span>
               <div className="text-right">
                 <span className="font-medium block">{formatCurrency(summary.totalDividendProfitTry)}</span>
                 {isDividendExempt && summary.totalDividendProfitTry > 0 && (
                   <span className="text-[10px] text-green-600 font-bold block bg-green-50 px-1 rounded">
                     İstisna Altı (Beyan Edilmez)
                   </span>
                 )}
               </div>
             </div>
             <div className="flex justify-between py-2 border-b border-slate-100 bg-blue-50/30 px-2 -mx-2 rounded">
               <span className="text-slate-700 font-semibold">Toplam Matrah</span>
               <span className="font-bold text-slate-900">{formatCurrency(summary.totalTaxableIncomeTry)}</span>
             </div>
             <div className="flex justify-between py-2 border-b border-slate-100">
               <span className="text-slate-600">Hesaplanan Vergi</span>
               <span className="font-medium">{formatCurrency(summary.calculatedTaxTry)}</span>
             </div>
             <div className="flex justify-between py-2 border-b border-slate-100">
               <span className="text-slate-600">Mahsup Edilecek Yabancı Vergi</span>
               <span className="font-medium text-green-600">-{formatCurrency(summary.foreignTaxCreditTry)}</span>
             </div>
             <div className="flex justify-between py-2 border-b border-slate-100">
               <span className="text-slate-600">Vergi Dilimi</span>
               <span className="font-medium">{formatPercent(summary.taxBracketPercentage/100)}</span>
             </div>
          </div>
        </div>
      </div>

      {/* FIFO Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">FIFO İşlem Detayları & Matrah Hesabı</h3>
          <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">İİÇY (İlk Giren İlk Çıkar)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Hisse</th>
                <th className="px-4 py-3 whitespace-nowrap">Alış Tarihi</th>
                <th className="px-4 py-3 whitespace-nowrap">Satış Tarihi</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Miktar</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Alış Maliyeti (TL)</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Endeksleme</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Endeksli Maliyet</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Satış Tutarı (TL)</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Matrah (Kar/Zarar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {capitalGains.length === 0 ? (
                 <tr><td colSpan={9} className="text-center py-6 text-slate-400">Hesaplanmış satış işlemi bulunamadı.</td></tr>
              ) : (
                capitalGains.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr className={`hover:bg-slate-50 transition-colors ${expandedRows.has(idx) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">{item.ticker}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.buyDate}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.sellDate}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{formatCurrency(item.buyTotalTry, 'TRY', 4)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {item.isIndexed ? (
                          <div className="flex flex-col items-end">
                            <span className="text-green-600 font-bold text-xs">{formatPercent(item.inflationRate)} (Uygulandı)</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ÜFE: {item.buyPrevMonthUfe.toFixed(1)} → {item.sellPrevMonthUfe.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">{formatPercent(item.inflationRate)} (Altında)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">{formatCurrency(item.indexedCostTry, 'TRY', 4)}</td>
                      <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">{formatCurrency(item.sellTotalTry, 'TRY', 4)}</td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${item.realProfitTry >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        <div className="flex items-center justify-end gap-2">
                          {formatCurrency(item.realProfitTry, 'TRY', 4)}
                          <button 
                            onClick={() => toggleRow(idx)}
                            className="text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                            title="Hesaplama Detayını Göster"
                          >
                            <Info size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable Calculation Details */}
                    {expandedRows.has(idx) && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold text-sm">
                              <Calculator size={16} />
                              <span>Hesaplama Detayı</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                              {/* 1. Satış */}
                              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Satış Geliri (TL)</span>
                                <div className="font-mono text-lg font-medium text-slate-800 mb-1">
                                  {formatCurrency(item.sellTotalTry, 'TRY', 4)}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                  {item.quantity} adet × ${item.sellPriceUsd} × {item.exchangeRate}
                                </div>
                              </div>

                              {/* 2. Maliyet */}
                              <div className="bg-slate-50 p-3 rounded border border-slate-100 relative">
                                <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl hidden md:block">-</span>
                                <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                  {item.isIndexed ? 'Endeksli Maliyet (TL)' : 'Alış Maliyeti (TL)'}
                                </span>
                                <div className="font-mono text-lg font-medium text-slate-800 mb-1">
                                  {formatCurrency(item.indexedCostTry, 'TRY', 4)}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                  {item.quantity} adet × ${item.buyPriceUsd} × {item.exchangeRate} (Ham: {formatCurrency(item.buyTotalTry, 'TRY', 2)})
                                </div>
                                {item.isIndexed && (
                                  <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block font-mono">
                                    Enflasyon: {formatPercent(item.inflationRate)}<br/>
                                    ÜFE Artışı: {item.buyPrevMonthUfe.toFixed(2)} ➔ {item.sellPrevMonthUfe.toFixed(2)}
                                  </div>
                                )}
                              </div>

                              {/* 3. Sonuç */}
                              <div className="bg-blue-50 p-3 rounded border border-blue-100 relative">
                                <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl hidden md:block">=</span>
                                <span className="block text-xs font-semibold text-blue-600 uppercase mb-1">Matrah (Kar/Zarar)</span>
                                <div className={`font-mono text-lg font-bold mb-1 ${item.realProfitTry >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(item.realProfitTry, 'TRY', 4)}
                                </div>
                                <div className="text-xs text-blue-400 font-mono">
                                  (Satış Geliri - Maliyet)
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW: Stock Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
           <h3 className="font-semibold text-slate-800">Hisse Bazlı Tahmini Vergi Dağılımı</h3>
           <span className="text-xs text-slate-500 italic">*Tahmini Vergi Payı, toplam vergiden hisse karına düşen ağırlıklı paydır.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Sembol</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">İşlem Sayısı</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Vergiye Tabi Matrah (TL)</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Tahmini Vergi Payı (TL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockList.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400">Veri yok.</td></tr>
              ) : (
                stockList.map((item) => {
                  const estimatedShare = calculateEstimatedTaxShare(item.totalMatrah);
                  return (
                    <tr key={item.ticker} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold whitespace-nowrap">{item.ticker}</td>
                      <td className="px-6 py-3 text-center whitespace-nowrap">{item.count}</td>
                      <td className={`px-6 py-3 text-right font-medium whitespace-nowrap ${item.totalMatrah > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(item.totalMatrah, 'TRY', 4)}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium whitespace-nowrap ${estimatedShare > 0 ? 'text-slate-700' : 'text-green-600'}`}>
                        {formatCurrency(estimatedShare, 'TRY', 4)}
                        {estimatedShare < 0 && <span className="text-[10px] ml-1 text-slate-400">(İndirim)</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dividends Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`px-6 py-4 border-b border-slate-200 flex justify-between items-center ${isDividendExempt && dividends.length > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
             <h3 className="font-semibold text-slate-800">Temettü Gelirleri Detayı</h3>
             {dividends.length > 0 && (
                isDividendExempt ? (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium border border-green-200">
                    <CheckCircle2 size={12} /> İstisna Kapsamında ({formatCurrency(DIVIDEND_EXEMPTION_LIMIT_2025)} Altı)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full font-medium border border-orange-200">
                    <AlertCircle size={12} /> Beyana Tabi ({formatCurrency(DIVIDEND_EXEMPTION_LIMIT_2025)} Üstü)
                  </span>
                )
             )}
          </div>
          <span className="text-xs text-slate-500">2025 İstisna Sınırı: {formatCurrency(DIVIDEND_EXEMPTION_LIMIT_2025)}</span>
        </div>
        
        {/* Info Box if Exempt */}
        {isDividendExempt && dividends.length > 0 && (
           <div className="px-6 py-3 bg-green-50/50 text-xs text-green-800 border-b border-green-100">
             <p>
               <strong>Bilgi:</strong> Toplam brüt temettü geliriniz ({formatCurrency(summary.totalDividendProfitTry)}), 
               yıllık <strong>{formatCurrency(DIVIDEND_EXEMPTION_LIMIT_2025)}</strong> istisna sınırının altında kaldığı için beyannameye dahil edilmez ve vergi çıkmaz.
               Ancak istisna sınırını geçerseniz, <strong>tamamı</strong> vergi matrahına eklenir.
             </p>
           </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
             <thead className="text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
               <tr>
                 <th className="px-4 py-3 whitespace-nowrap">Sembol</th>
                 <th className="px-4 py-3 whitespace-nowrap">Tarih</th>
                 <th className="px-4 py-3 text-right whitespace-nowrap">Brüt Tutar ($)</th>
                 <th className="px-4 py-3 text-right whitespace-nowrap">Kur (TL)</th>
                 <th className="px-4 py-3 text-right whitespace-nowrap">Brüt Tutar (TL)</th>
                 <th className="px-4 py-3 text-right whitespace-nowrap">Kesinti ($)</th>
                 <th className="px-4 py-3 text-right whitespace-nowrap">Kesinti (TL)</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {dividends.length === 0 ? (
                 <tr><td colSpan={7} className="text-center py-6 text-slate-400">Temettü geliri bulunamadı.</td></tr>
               ) : (
                 dividends.map((div, idx) => (
                   <tr key={div.id || idx} className="hover:bg-slate-50">
                     <td className="px-4 py-3 font-bold whitespace-nowrap">{div.ticker}</td>
                     <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{div.date}</td>
                     <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">${div.amountUsd.toFixed(2)}</td>
                     <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{div.exchangeRate.toFixed(4)}</td>
                     <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap bg-blue-50/20">{formatCurrency(div.amountUsd * div.exchangeRate, 'TRY', 2)}</td>
                     <td className="px-4 py-3 text-right text-red-400 whitespace-nowrap">${div.withholdingTaxUsd.toFixed(2)}</td>
                     <td className="px-4 py-3 text-right text-red-500 whitespace-nowrap">
                       {isDividendExempt ? (
                         <span className="opacity-50 line-through decoration-red-300" title="İstisna nedeniyle mahsup edilemez">{formatCurrency(div.withholdingTaxUsd * div.exchangeRate, 'TRY', 2)}</span>
                       ) : (
                         formatCurrency(div.withholdingTaxUsd * div.exchangeRate, 'TRY', 2)
                       )}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
             {dividends.length > 0 && (
               <tfoot className="bg-slate-50 border-t border-slate-200">
                 <tr>
                   <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-600">TOPLAM:</td>
                   <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(summary.totalDividendProfitTry)}</td>
                   <td></td>
                   <td className="px-4 py-3 text-right font-bold text-red-600">
                     {isDividendExempt ? (
                       <span className="text-slate-400 text-[10px] font-normal">(İstisna)</span>
                     ) : (
                       formatCurrency(dividends.reduce((acc, curr) => acc + (curr.withholdingTaxUsd * curr.exchangeRate), 0), 'TRY', 2)
                     )}
                   </td>
                 </tr>
               </tfoot>
             )}
          </table>
        </div>
      </div>
    </div>
  );
};