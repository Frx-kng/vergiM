import React from 'react';
import { TaxSummary, CapitalGainResult } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, TrendingUp, DollarSign, Wallet } from 'lucide-react';

interface DashboardProps {
  summary: TaxSummary;
  capitalGains: CapitalGainResult[];
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, capitalGains }) => {
  // Aggregate data for charts
  const chartData = capitalGains.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.ticker === curr.ticker);
    if (existing) {
      existing.profit += curr.realProfitTry;
    } else {
      acc.push({ ticker: curr.ticker, profit: curr.realProfitTry });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Vergi Simülasyon Özeti</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500">Alım/Satım Karı</h3>
            <div className="p-2 bg-green-100 rounded-full text-green-600"><TrendingUp size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalCapitalGainsProfitTry)}</p>
          <p className="text-xs text-slate-400 mt-1">Endeksleme sonrası net TL</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500">Temettü Geliri</h3>
            <div className="p-2 bg-purple-100 rounded-full text-purple-600"><DollarSign size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalDividendProfitTry)}</p>
          <p className="text-xs text-slate-400 mt-1">Stopaj öncesi brüt TL</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
           <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500 opacity-5 rounded-bl-full"></div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500">Matrah</h3>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Wallet size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalTaxableIncomeTry)}</p>
          <p className="text-xs text-slate-400 mt-1">Vergilendirilebilir toplam</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">Tahmini Ödeme</h3>
            <div className="p-2 bg-slate-700 rounded-full text-white"><ArrowUpRight size={18} /></div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary.finalTaxPaymentTry)}</p>
          <p className="text-xs text-slate-400 mt-1">Vergi Dilimi: {formatPercent(summary.taxBracketPercentage / 100)}</p>
        </div>
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Hisse Bazlı Kar/Zarar (TL)</h3>
          {/* Explicit width/height to avoid Recharts warning */}
          <div className="w-full h-64 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="ticker" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `₺${val/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="profit" name="Net Kar/Zarar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Optimizations */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Vergi İpuçları</h3>
          <ul className="space-y-4">
            <li className="flex gap-3 text-sm text-slate-600">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">1</span>
              <span>Temettü geliriniz {formatCurrency(18000)} altında ise beyanname vermenize gerek yoktur. (2025 Sınırı)</span>
            </li>
            <li className="flex gap-3 text-sm text-slate-600">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</span>
              <span>Enflasyon %10'u geçtiği için {capitalGains.filter(c => c.isIndexed).length} işlemde Yİ-ÜFE endekslemesi uygulandı ve maliyetiniz yukarı çekilerek verginiz düşürüldü.</span>
            </li>
            <li className="flex gap-3 text-sm text-slate-600">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">3</span>
              <span>Eğer yıl sonuna kadar zarar eden pozisyonlarınızı kapatırsanız, toplam karınızdan düşerek vergi matrahınızı azaltabilirsiniz.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};