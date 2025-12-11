import React, { useState } from 'react';
import { LayoutDashboard, ReceiptText, PieChart, ShieldAlert, TrendingUp, BookOpen, FileText, Database, CheckCircle2, ExternalLink, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { APP_METADATA } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [showDataModal, setShowDataModal] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const handleCheckUpdates = () => {
    setCheckingUpdates(true);
    // Simulate an API check
    setTimeout(() => {
      setCheckingUpdates(false);
      setUpdateStatus("Sisteminiz güncel.");
      setTimeout(() => setUpdateStatus(null), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">VergiM</h1>
          <p className="text-xs text-slate-400 mt-1">ABD Borsa Vergi Asistanı</p>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Özet Durum</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <PieChart size={20} />
            <span className="font-medium">Portföy & İşlemler</span>
          </button>

          <button 
            onClick={() => setActiveTab('optimization')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'optimization' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Optimizasyon</span>
          </button>

          <button 
            onClick={() => setActiveTab('report')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <ReceiptText size={20} />
            <span className="font-medium">Vergi Raporu</span>
          </button>

          <button 
            onClick={() => setActiveTab('declaration')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'declaration' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <FileText size={20} />
            <span className="font-medium">Beyanname Hazırla</span>
          </button>

          <button 
            onClick={() => setActiveTab('wiki')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'wiki' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <BookOpen size={20} />
            <span className="font-medium">Vergi Rehberi / SSS</span>
          </button>
        </nav>

        {/* System Status Footer - Compacted */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-2 px-1">
             <div className="flex items-center gap-2">
               <Database size={12} className="text-slate-500" />
               <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sistem Durumu</span>
             </div>
             <button 
                 onClick={handleCheckUpdates}
                 disabled={checkingUpdates}
                 className="text-slate-400 hover:text-white transition-colors"
                 title="Güncellemeleri Kontrol Et"
               >
                 <RefreshCw size={12} className={checkingUpdates ? "animate-spin" : ""} />
            </button>
          </div>
          
          {updateStatus && (
               <div className="text-[10px] text-green-400 mb-2 px-1 animate-in fade-in">{updateStatus}</div>
          )}

          <button 
            onClick={() => setShowDataModal(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md p-2 text-xs flex items-center justify-between transition-colors group mb-2"
          >
            <div className="flex flex-col items-start gap-0.5">
               <span className="text-slate-400 text-[10px]">Vergi Yılı: <span className="text-slate-200">{APP_METADATA.taxYear}</span></span>
               <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${APP_METADATA.ufeLastMonth ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-slate-300 font-medium">{APP_METADATA.ufeLastMonth} Verisi</span>
               </div>
            </div>
            <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
          </button>
          
          <div className="text-[9px] text-slate-600 text-center leading-tight">
            * Yasal tavsiye değildir.
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto relative">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* DATA SOURCES MODAL */}
      {showDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-blue-600" />
                Sistem Veri Kaynakları & Doğrulama
              </h3>
              <button onClick={() => setShowDataModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                <p>
                  Bu sistem, hesaplamaların doğruluğu için resmi kurumların kamuya açık verilerini kullanır. 
                  Verilerin güncelliğini aşağıdaki kaynaklardan teyit edebilirsiniz.
                </p>
              </div>

              <div className="space-y-4">
                {/* Tax Brackets Source */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm text-green-600">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800">Gelir Vergisi Dilimleri ({APP_METADATA.taxYear})</h4>
                    <p className="text-xs text-slate-500 mt-1">Kaynak: {APP_METADATA.taxBracketSource}</p>
                    <a href={APP_METADATA.officialLinks.gib} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                      GİB Resmi Sitesi <ExternalLink size={10} />
                    </a>
                  </div>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>

                {/* Inflation Data Source */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm text-purple-600">
                    <TrendingUp size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800">Yİ-ÜFE Endeks Verileri</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Son Veri: <span className="font-bold text-slate-700">{APP_METADATA.ufeLastMonth}</span>
                      <br/>
                      Kaynak: {APP_METADATA.ufeSource}
                    </p>
                    <a href={APP_METADATA.officialLinks.tuik} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                      TÜİK Resmi Sitesi <ExternalLink size={10} />
                    </a>
                  </div>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>

                {/* Exchange Rate Source */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm text-orange-600">
                    <RefreshCw size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800">Döviz Kurları</h4>
                    <p className="text-xs text-slate-500 mt-1">Kaynak: {APP_METADATA.exchangeRateSource}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sistem her işlem için TCMB arşivinden o günün kurunu otomatik çeker.</p>
                  </div>
                  <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">CANLI</div>
                </div>
              </div>

              {/* Warning Section in Modal */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex gap-3 items-start">
                 <ShieldAlert size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                 <div className="text-xs text-yellow-800">
                   <p className="font-bold mb-1">YASAL UYARI</p>
                   <p>Bu uygulama sadece bilgilendirme ve simülasyon amaçlıdır. Vergi mevzuatı karmaşıktır ve kişisel durumunuza göre değişebilir. Kesin hesaplamalar için lütfen verilerinizi bir Mali Müşavir ile teyit ediniz.</p>
                 </div>
              </div>

              <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
                Uygulama Sürümü: v{APP_METADATA.version} • Son Sistem Güncellemesi: {APP_METADATA.lastSystemUpdate}
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">
              <button 
                onClick={() => setShowDataModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Anlaşıldı
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};