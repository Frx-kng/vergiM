import React, { useMemo } from 'react';
import { TaxSummary, CapitalGainResult, Transaction } from '../types';
import { TAX_BRACKETS_2025, YI_UFE_DATA, getPreviousMonthKey } from '../constants';
import { formatCurrency, formatPercent, getOpenPositions, parsePrice, calculateTaxLiability } from '../utils';
import { TrendingDown, AlertTriangle, Target, CheckCircle2, Hourglass, ShieldCheck, Info, Briefcase, Calculator } from 'lucide-react';

interface OptimizationProps {
  summary: TaxSummary;
  capitalGains: CapitalGainResult[];
  transactions: Transaction[];
  currentPrices: Record<string, string>;
  scenarioRate: string;
}

export const Optimization: React.FC<OptimizationProps> = ({ summary, capitalGains, transactions, currentPrices, scenarioRate }) => {
  // 1. Calculate Bracket Logic
  const currentIncome = summary.totalTaxableIncomeTry;
  let nextBracketLimit = 0;
  let currentRate = 0;
  let nextRate = 0;

  for (let i = 0; i < TAX_BRACKETS_2025.length; i++) {
    if (currentIncome <= TAX_BRACKETS_2025[i].limit) {
      nextBracketLimit = TAX_BRACKETS_2025[i].limit;
      currentRate = TAX_BRACKETS_2025[i].rate;
      nextRate = TAX_BRACKETS_2025[i+1]?.rate || 0.40;
      break;
    }
  }

  // If already in top bracket
  if (nextBracketLimit === 0) {
      nextBracketLimit = Infinity;
      currentRate = 0.40;
      nextRate = 0.40;
  }

  const distanceToNextBracket = nextBracketLimit - currentIncome;
  const percentageUsed = nextBracketLimit === Infinity ? 100 : Math.min(100, (currentIncome / nextBracketLimit) * 100);

  // 2. Analyze Portfolio Opportunities
  const openPositions = useMemo(() => getOpenPositions(transactions), [transactions]);
  
  // Analyze "Almost Indexed" positions (Inflation rate between 8% and 10%)
  const today = new Date();
  const currentMonthKey = getPreviousMonthKey(today.toISOString().split('T')[0]); 
  const latestUfeKey = Object.keys(YI_UFE_DATA).sort().pop() || currentMonthKey;
  const currentUfe = YI_UFE_DATA[latestUfeKey] || 0;

  const timingOpportunities = openPositions.map(pos => {
    const buyPrevMonthKey = getPreviousMonthKey(pos.buyDate);
    const buyUfe = YI_UFE_DATA[buyPrevMonthKey] || 0;
    
    if (buyUfe === 0 || currentUfe === 0) return null;

    const inflationRate = (currentUfe - buyUfe) / buyUfe;
    const currentRateForCalc = currentRate || 0.15; // Fallback if 0
    
    // Calculate potential tax saving if it becomes indexed
    const costIncrease = pos.totalCostTry * inflationRate;
    const potentialTaxSaving = costIncrease * currentRateForCalc;

    return {
      ticker: pos.ticker,
      buyDate: pos.buyDate,
      inflationRate,
      costBasis: pos.totalCostTry,
      isIndexed: inflationRate > 0.10,
      isClose: inflationRate > 0.08 && inflationRate < 0.10,
      potentialTaxSaving
    };
  }).filter(Boolean);

  const almostIndexed = timingOpportunities.filter(t => t?.isClose);
  const totalPotentialSaving = almostIndexed.reduce((sum, item) => sum + (item?.potentialTaxSaving || 0), 0);

  // --- NEW: Calculate Unrealized Profit & Potential Tax Liability ---
  const sRate = parsePrice(scenarioRate) || 0;
  let totalMarketValue = 0;
  let totalUnrealizedProfit = 0;

  openPositions.forEach(pos => {
    const price = parsePrice(currentPrices[pos.ticker]) || 0;
    if (price > 0 && sRate > 0) {
       const marketVal = pos.quantity * price * sRate;
       totalMarketValue += marketVal;

       // Quick Indexing Calc for accurate profit
       let cost = pos.totalCostTry;
       const buyPrevMonthKey = getPreviousMonthKey(pos.buyDate);
       const buyUfe = YI_UFE_DATA[buyPrevMonthKey] || 0;
       if (buyUfe > 0 && currentUfe > 0) {
         const inf = (currentUfe - buyUfe) / buyUfe;
         if (inf > 0.10) {
           cost = cost * (currentUfe / buyUfe);
         }
       }
       
       totalUnrealizedProfit += (marketVal - cost);
    }
  });

  // Calculate Tax Impact
  // Scenario: What if we sold everything today?
  // New Base = Current Taxable Income + Unrealized Profit
  const potentialTotalTaxableIncome = summary.totalTaxableIncomeTry + Math.max(0, totalUnrealizedProfit);
  const { tax: potentialTotalTax } = calculateTaxLiability(potentialTotalTaxableIncome);
  const estimatedUnrealizedTax = Math.max(0, potentialTotalTax - summary.calculatedTaxTry);

  // 3. Generate Roadmap Items
  const roadmapItems = [];

  // Roadmap: Bracket Management
  if (nextBracketLimit !== Infinity) {
    if (percentageUsed > 90) {
      roadmapItems.push({
        type: 'warning',
        title: 'Vergi Dilimi Sınırındasınız',
        desc: `Bir üst vergi dilimine (%${formatPercent(nextRate)}) geçmek üzeresiniz. Sadece ${formatCurrency(distanceToNextBracket)} alanınız kaldı. Yıl sonuna kadar acil olmayan kar realizasyonlarını erteleyerek %${((nextRate - currentRate)*100).toFixed(0)} ek vergi ödemekten kaçınabilirsiniz.`,
        icon: <AlertTriangle className="text-orange-600" />
      });
    } else {
      roadmapItems.push({
        type: 'success',
        title: 'Vergi Dilimi Alanı Mevcut',
        desc: `Mevcut dilimde (%${formatPercent(currentRate)}) kalmak şartıyla ${formatCurrency(distanceToNextBracket)} daha kar realize edebilirsiniz.`,
        icon: <CheckCircle2 className="text-green-600" />
      });
    }
  }

  // Roadmap: Loss Harvesting
  if (summary.calculatedTaxTry > 0) {
    roadmapItems.push({
      type: 'info',
      title: 'Zarar Mahsubu (Loss Harvesting)',
      desc: `Bu yıl oluşmuş ${formatCurrency(summary.totalTaxableIncomeTry)} matrahınız var. Portföyünüzde zararda olan pozisyonları satıp (realize edip) 31 gün sonra geri alarak, zararı "gerçekleştirebilir" ve vergiden düşebilirsiniz.`,
      icon: <TrendingDown className="text-blue-600" />
    });
  }

  // Roadmap: Indexing Timing
  if (almostIndexed.length > 0) {
    roadmapItems.push({
      type: 'tip',
      title: 'Zamanlama Fırsatı: Endeksleme',
      desc: `${almostIndexed.length} adet pozisyonunuz endeksleme sınırına (%10) çok yakın. Eğer piyasa koşulları uygunsa, satışı 1-2 ay erteleyerek enflasyon farkından yararlanabilir ve tahmini ${formatCurrency(totalPotentialSaving)} vergi avantajı sağlayabilirsiniz.`,
      icon: <Hourglass className="text-purple-600" />
    });
  }

  // Roadmap: Risk Warning (Always Included)
  roadmapItems.push({
      type: 'risk',
      title: 'Stratejik Risk Analizi',
      desc: 'Vergi avantajı için beklemek (özellikle endeksleme veya yeni yıl vergi dilimi için), "Piyasa Riski" taşır. Vergi oranından %3 kazanmak için beklerken, hisse fiyatı %5 düşerse toplamda zarar edebilirsiniz. Kararlarınızı alırken sadece vergiyi değil, hissenin gelecek beklentilerini de önceliklendirin.',
      icon: <ShieldCheck className="text-slate-500" />
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Target size={180} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Vergi Strateji Merkezi</h2>
          <p className="text-blue-100 opacity-90 max-w-2xl text-lg">
            Portföyünüz analiz edildi. Vergi yükünüzü minimize etmek için aşağıdaki stratejik yol haritasını izleyin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Analysis & Gauge */}
        <div className="lg:col-span-1 space-y-6">
           {/* Tax Bracket Gauge */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Info className="text-blue-600" size={20} />
              Mevcut Durum
            </h3>

            <div className="mb-6 text-center">
              <div className="text-4xl font-black text-slate-800 mb-1">{formatPercent(currentRate)}</div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Marjinal Vergi Oranı</div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Kullanılan Dilim</span>
                <span>Kalan Limit</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
                <div 
                  className={`h-full transition-all duration-1000 ${percentageUsed > 85 ? 'bg-orange-500' : 'bg-blue-500'}`} 
                  style={{ width: `${percentageUsed}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs mt-2 font-medium text-slate-700">
                <span>{formatCurrency(currentIncome)}</span>
                <span>{nextBracketLimit === Infinity ? 'Sınırsız' : formatCurrency(distanceToNextBracket)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed border border-slate-100">
               Mevcut geliriniz <strong>{formatCurrency(currentIncome)}</strong> seviyesinde. 
               {nextBracketLimit < Infinity ? (
                 <> <strong>{formatCurrency(nextBracketLimit)}</strong> sınırını aşarsanız, aşan kısım için vergi oranı <strong>%{formatPercent(nextRate)}</strong> olacak.</>
               ) : (
                 <> En üst vergi dilimindesiniz (%40).</>
               )}
            </div>
          </div>

          {/* Timing Opportunities Widget */}
          {almostIndexed.length > 0 && (
            <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-sm">
               <h3 className="text-purple-900 font-bold flex items-center gap-2 mb-3">
                 <Hourglass size={18} /> Bekleme Fırsatları
               </h3>
               <p className="text-xs text-purple-800 mb-3 leading-relaxed">
                 Aşağıdaki hisselerde enflasyon farkı <strong>%8-10</strong> arasında. Çok az daha yükselirse (veya bekleyerek Yİ-ÜFE artarsa) maliyetiniz endekslenecek.
               </p>
               <ul className="space-y-2">
                 {almostIndexed.map((item, idx) => (
                   <li key={idx} className="bg-white p-3 rounded border border-purple-100 flex justify-between items-center text-sm shadow-sm">
                     <div>
                       <span className="font-bold text-slate-700 block">{item?.ticker}</span>
                       <span className="text-[10px] text-slate-400 block">{item?.buyDate}</span>
                     </div>
                     <div className="text-right">
                       <span className="text-purple-600 font-mono font-bold block">{formatPercent(item?.inflationRate || 0)}</span>
                       <span className="text-[10px] text-green-600 block">~{formatCurrency(item?.potentialTaxSaving || 0)} Tasarruf</span>
                     </div>
                   </li>
                 ))}
               </ul>
            </div>
          )}

          {/* Portfolio Summary Mini */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4">
              <Target size={18} className="text-slate-400" /> Portföy Özeti
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500 flex items-center gap-2"><Briefcase size={14}/> Açık Pozisyon</span>
                <span className="font-medium text-slate-800">{openPositions.length} Adet</span>
              </div>
              
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500 flex items-center gap-2"><Calculator size={14}/> Maliyet Değeri</span>
                <span className="font-medium text-slate-800">{formatCurrency(openPositions.reduce((s,p) => s + p.totalCostTry, 0))}</span>
              </div>

              {sRate > 0 && totalMarketValue > 0 ? (
                <>
                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                     <span className="text-slate-500">Piyasa Değeri (TL)</span>
                     <span className="font-bold text-blue-600">{formatCurrency(totalMarketValue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm pt-1">
                     <span className="text-slate-500 font-medium">Olası Ek Vergi</span>
                     <span className={`font-bold ${estimatedUnrealizedTax > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                       {estimatedUnrealizedTax > 0 ? formatCurrency(estimatedUnrealizedTax) : '-'}
                     </span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic mt-1 bg-slate-50 p-1.5 rounded">
                    * Tüm pozisyonlar bugün satılırsa oluşacak tahmini ek vergi yükü.
                  </div>
                </>
              ) : (
                <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded mt-2">
                  Vergi tahmini için portföy kısmından senaryo verilerini (Kur ve Fiyat) güncelleyiniz.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Strategic Roadmap */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Target className="text-indigo-600" />
                Kişiselleştirilmiş Eylem Planı
              </h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-bold">
                {roadmapItems.length} Adım Öneriliyor
              </span>
           </div>

           <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-8 py-2">
             {roadmapItems.map((item, idx) => (
               <div key={idx} className="relative group animate-in slide-in-from-left-4 fade-in duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                 {/* Timeline Node */}
                 <div className={`absolute -left-[45px] top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-transform group-hover:scale-110 z-10 ${
                   item.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
                   item.type === 'success' ? 'bg-green-100 text-green-600' :
                   item.type === 'tip' ? 'bg-purple-100 text-purple-600' :
                   item.type === 'risk' ? 'bg-slate-100 text-slate-500' :
                   'bg-blue-100 text-blue-600'
                 }`}>
                   {item.icon}
                 </div>
                 
                 {/* Content Card */}
                 <div className={`p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                   item.type === 'risk' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
                 }`}>
                   <div className="flex items-start justify-between">
                     <h4 className={`text-lg font-bold mb-2 ${item.type === 'risk' ? 'text-slate-600' : 'text-slate-800'}`}>
                       {item.title}
                     </h4>
                     {item.type === 'warning' && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">DİKKAT</span>}
                     {item.type === 'tip' && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded">FIRSAT</span>}
                   </div>
                   
                   <p className="text-slate-600 leading-relaxed text-sm">{item.desc}</p>
                   
                   {/* Contextual Action Button based on type */}
                   {item.type === 'info' && (
                     <div className="mt-4 pt-3 border-t border-slate-100">
                       <p className="text-xs text-slate-500 font-mono bg-blue-50/50 inline-block px-3 py-2 rounded border border-blue-50">
                         <strong>Strateji:</strong> Zararda olan pozisyonu sat ➔ Zararı beyannamede kullan ➔ Pozisyonu korumak istiyorsan 31 gün bekle ➔ Geri al
                       </p>
                     </div>
                   )}
                 </div>
               </div>
             ))}

             {/* Generic Roadmap Item: End */}
             <div className="relative group">
               <div className="absolute -left-[45px] top-0 w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                 <CheckCircle2 size={20} />
               </div>
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-60">
                 <h4 className="text-lg font-bold text-slate-800 mb-2">Periyodik Kontrol</h4>
                 <p className="text-slate-600 text-sm">
                   Bu raporu her ay başında, Yİ-ÜFE verileri açıklandığında (ayın 3'ü) tekrar kontrol etmeniz önerilir.
                 </p>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};