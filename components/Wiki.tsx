import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp, HelpCircle, FileText, TrendingUp, DollarSign, Calendar, Calculator, Info, GraduationCap, Calculator as CalculatorIcon, ArrowRight, ExternalLink, MousePointerClick, ListChecks, AlertTriangle, CheckCircle2, Table2, Receipt, PieChart } from 'lucide-react';
import { DIVIDEND_EXEMPTION_LIMIT_2025, TAX_BRACKETS_2025 } from '../constants';
import { formatCurrency, formatPercent } from '../utils';

interface WikiProps {
  initialTab?: 'faq' | 'guide' | 'declaration_guide';
  onNavigate?: (tab: string) => void;
}

interface FaqItem {
  question: string;
  answer: React.ReactNode;
  category: 'general' | 'dividend' | 'trading' | 'declaration';
}

export const Wiki: React.FC<WikiProps> = ({ initialTab = 'guide', onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'guide' | 'declaration_guide'>(initialTab);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Sync state if prop changes (for deep linking)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const faqs: FaqItem[] = [
    {
      category: 'general',
      question: "Hangi kur dikkate alınır?",
      answer: "İşlemlerin yapıldığı (hem alış hem satış) tarihteki TCMB Döviz Alış Kuru esas alınır. Efektif kur değil, normal 'Döviz Alış' kuru kullanılır. Uygulamamızda bu kurlar otomatik çekilmektedir."
    },
    {
      category: 'trading',
      question: "Yİ-ÜFE Endekslemesi nedir ve ne zaman uygulanır?",
      answer: (
        <div className="space-y-2">
          <p>Enflasyon düzeltmesi olarak da bilinir. Vergi kanununa göre, hisseyi sattığınız tarih ile aldığınız tarih arasındaki Yİ-ÜFE (Üretici Fiyat Endeksi) artış farkı <strong>%10'un üzerindeyse</strong>, alış maliyetiniz bu oranda artırılır.</p>
          <p className="bg-blue-50 p-2 rounded text-blue-800 text-xs">
            <strong>Örnek:</strong> 100 TL'ye aldığınız hisseyi sattığınızda enflasyon %50 artmışsa, maliyetiniz 150 TL olarak kabul edilir ve karınız buna göre düşer. Bu sayede enflasyon kaynaklı sanal kardan vergi ödemezsiniz.
          </p>
        </div>
      )
    },
    {
      category: 'dividend',
      question: "Temettü gelirlerinde istisna sınırı nedir?",
      answer: (
        <div>
          <p>2025 yılı gelirleri için istisna sınırı <strong>{formatCurrency(DIVIDEND_EXEMPTION_LIMIT_2025)}</strong>'dir. (Brüt temettü tutarı esas alınır).</p>
          <ul className="list-disc list-inside mt-2 text-slate-600">
            <li>Toplam brüt temettü geliriniz bu tutarın <strong>altındaysa</strong> beyan etmezsiniz, vergi çıkmaz.</li>
            <li>Bu tutarı <strong>1 TL bile aşarsa</strong>, tamamını beyan etmek zorundasınız.</li>
          </ul>
        </div>
      )
    },
    {
      category: 'declaration',
      question: "ABD'de kesilen vergi (Stopaj) Türkiye'de düşülür mü?",
      answer: "Evet. ABD ile Türkiye arasındaki Çifte Vergilendirmeyi Önleme Anlaşması gereği, ABD'de temettülerden kesilen stopaj (genelde %15 veya %30), Türkiye'de hesaplanan gelir vergisinden mahsup edilebilir (düşülebilir). Ancak Alım-Satım kazançlarında ABD vergi kesmediği için bir mahsup söz konusu değildir."
    },
    {
      category: 'trading',
      question: "FIFO Yöntemi nedir?",
      answer: "FIFO (First In First Out), 'İlk Giren İlk Çıkar' anlamına gelir. Aynı hisseyi farklı tarihlerde parça parça aldıysanız ve bir kısmını satıyorsanız, vergi hesabında portföyünüze giren en eski tarihli hisselerin satıldığı varsayılır."
    },
    {
      category: 'declaration',
      question: "Beyanname ne zaman verilir?",
      answer: "Bir takvim yılında elde edilen kazançlar, takip eden yılın Mart ayında (1-31 Mart arası) beyan edilir. Vergi ödemesi ise Mart ve Temmuz aylarında iki eşit taksitte yapılır."
    },
    {
      category: 'general',
      question: "Zarar mahsubu yapılabilir mi?",
      answer: "Evet. Aynı takvim yılı içerisinde ettiğiniz zararları, ettiğiniz karlardan düşebilirsiniz. Örneğin A hissesinden 10.000 TL kar, B hissesinden 4.000 TL zarar ettiyseniz, vergi matrahınız 6.000 TL olur. Ancak geçmiş yılların zararları veya yurt içi borsa zararları mahsup edilemez."
    },
    {
      category: 'trading',
      question: "Dolar bazında zarar ettim ama vergi çıkar mı?",
      answer: (
        <div className="space-y-2">
          <p className="text-red-600 font-bold">Evet, çıkabilir!</p>
          <p>Vergi hesaplaması tamamen TL üzerinden yapılır. Dolar bazında zarar etseniz bile, eğer kur çok yükseldiyse TL bazında karda görünebilirsiniz. Bu duruma "Kur Farkı Kazancı" denir ve vergilendirilir. Endeksleme (enflasyon düzeltmesi) bu durumu hafifletmek için vardır.</p>
        </div>
      )
    }
  ];

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(f => f.category === activeCategory);

  const categories = [
    { id: 'all', label: 'Tümü', icon: <BookOpen size={16} /> },
    { id: 'general', label: 'Genel', icon: <HelpCircle size={16} /> },
    { id: 'trading', label: 'Alım-Satım', icon: <TrendingUp size={16} /> },
    { id: 'dividend', label: 'Temettü', icon: <DollarSign size={16} /> },
    { id: 'declaration', label: 'Beyanname', icon: <Calendar size={16} /> },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <FileText className="text-blue-400" />
          Vergi Rehberi & SSS
        </h2>
        <p className="text-slate-300 opacity-90 max-w-2xl">
          ABD borsalarındaki vergi süreçleri, hesaplama mantığı ve sık sorulan sorular.
        </p>

        {/* Top Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button 
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${activeTab === 'guide' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}
          >
            <GraduationCap size={18} /> Rehber & Terimler
          </button>
          <button 
            onClick={() => setActiveTab('declaration_guide')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${activeTab === 'declaration_guide' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}
          >
            <MousePointerClick size={18} /> Beyanname Adımları
          </button>
          <button 
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${activeTab === 'faq' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}
          >
            <HelpCircle size={18} /> Sık Sorulan Sorular
          </button>
        </div>
      </div>

      {/* --- CONTENT: GUIDE --- */}
      {activeTab === 'guide' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Terminology Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 border-b pb-3 border-slate-100">
              <BookOpen size={20} className="text-blue-600" />
              Temel Terimler Sözlüğü
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <span className="font-bold text-blue-800 block mb-1">FIFO (First In First Out)</span>
                <p className="text-sm text-slate-600 leading-relaxed">"İlk Giren İlk Çıkar" prensibidir. Hissenizi parça parça sattığınızda, vergi hesabında portföyünüze en eski tarihte giren hisselerin satıldığı varsayılır.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <span className="font-bold text-blue-800 block mb-1">Yİ-ÜFE Endekslemesi</span>
                <p className="text-sm text-slate-600 leading-relaxed">Enflasyon düzeltmesidir. Eğer hisseyi aldığınız ay ile sattığınız ay arasındaki ÜFE artışı %10'dan fazlaysa, alış maliyetiniz bu oranda artırılarak karınız (dolayısıyla verginiz) düşürülür.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <span className="font-bold text-blue-800 block mb-1">Stopaj (Withholding Tax)</span>
                <p className="text-sm text-slate-600 leading-relaxed">Kaynakta kesilen vergidir. ABD borsalarında temettü ödemelerinde genellikle %15 veya %30 oranında peşin vergi kesilir. Bu tutarı Türkiye'deki vergiden düşebilirsiniz.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <span className="font-bold text-blue-800 block mb-1">Matrah</span>
                <p className="text-sm text-slate-600 leading-relaxed">Verginin üzerinden hesaplandığı net tutardır. (Satış Geliri - Endekslenmiş Maliyet - Giderler - İstisnalar) formülü ile bulunur.</p>
              </div>
            </div>
          </div>

          {/* Tax Brackets Table (New Section) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Table2 size={20} className="text-blue-600" />
              2025 Gelir Vergisi Tarifesi (Ücret Dışı)
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Borsa kazançları (Değer Artış Kazancı) ve temettüler (Menkul Sermaye İradı) aşağıdaki "Ücret Dışı" gelir vergisi tarifesine göre vergilendirilir. Artan oranlı bir sistemdir; geliriniz arttıkça üst dilime giren kısmın vergisi artar.
            </p>
            
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Gelir Dilimi (Matrah)</th>
                    <th className="px-6 py-3 border-b border-slate-200">Vergi Oranı</th>
                    <th className="px-6 py-3 border-b border-slate-200">Hesaplama Mantığı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {TAX_BRACKETS_2025.map((bracket, i) => {
                    const prevLimit = i === 0 ? 0 : TAX_BRACKETS_2025[i - 1].limit;
                    const prevTax = bracket.baseTax;
                    
                    let rangeLabel = "";
                    if (bracket.limit === Infinity) {
                      rangeLabel = `${formatCurrency(prevLimit)} üzeri`;
                    } else {
                      // Explicit 0 - Limit range logic
                      const startAmount = i === 0 ? 0 : prevLimit + 1;
                      rangeLabel = `${formatCurrency(startAmount)} - ${formatCurrency(bracket.limit)}`;
                    }

                    return (
                      <tr key={i} className="bg-white hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">{rangeLabel}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            bracket.rate === 0.15 ? 'bg-green-100 text-green-700' :
                            bracket.rate === 0.20 ? 'bg-blue-100 text-blue-700' :
                            bracket.rate === 0.27 ? 'bg-yellow-100 text-yellow-700' :
                            bracket.rate === 0.35 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            %{bracket.rate * 100}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-xs">
                          {i === 0 ? (
                             "Matrahın %15'i"
                          ) : (
                             <>
                               <strong>{formatCurrency(prevLimit)}</strong> için <strong>{formatCurrency(prevTax)}</strong>, fazlası için <strong>%{bracket.rate * 100}</strong>
                             </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
               <Info size={14} className="flex-shrink-0 mt-0.5" />
               <p>Bu tarife, maaş dışındaki gelirler (kira, borsa, temettü vb.) için geçerlidir. Maaş gelirleri için farklı bir tarife uygulanır.</p>
            </div>
          </div>

          {/* Logic Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Calculator size={20} className="text-blue-600" />
              Vergi Hesaplama Mantığı (Adım Adım)
            </h3>
            
            <div className="relative border-l-2 border-blue-100 ml-4 space-y-10 pl-8 py-2">
              {/* Step 1 */}
              <div className="relative">
                <span className="absolute -left-[43px] top-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold ring-4 ring-white shadow-sm">1</span>
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-50">
                  <h4 className="font-bold text-slate-800 text-base">İşlem Eşleştirmesi (FIFO)</h4>
                  <p className="text-sm text-slate-600 mt-1">Satılan hisseler, portföydeki en eski tarihli alışlarla eşleştirilir. Her bir lot için ayrı hesap yapılır.</p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="relative">
                <span className="absolute -left-[43px] top-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold ring-4 ring-white shadow-sm">2</span>
                 <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-50">
                  <h4 className="font-bold text-slate-800 text-base">TL Karşılıkların Bulunması</h4>
                  <p className="text-sm text-slate-600 mt-1">Hem alış hem satış tutarları, işlem günündeki <strong>TCMB Döviz Alış Kuru</strong> ile TL'ye çevrilir. (USD kar/zararı değil, TL kar/zararı esastır)</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                 <span className="absolute -left-[43px] top-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold ring-4 ring-white shadow-sm">3</span>
                 <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-50">
                   <h4 className="font-bold text-slate-800 text-base">Enflasyon Kontrolü & Endeksleme</h4>
                   <p className="text-sm text-slate-600 mt-1">
                     <code>(Satış Ayı Yİ-ÜFE - Alış Ayı Yİ-ÜFE) / Alış Ayı Yİ-ÜFE</code> oranı > <strong>%10</strong> ise;
                     <br/>
                     Maliyet bedeli bu oranda artırılır. Bu işlem karı düşürür ve enflasyon kaynaklı sanal vergi ödemenizi engeller.
                   </p>
                 </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                 <span className="absolute -left-[43px] top-0 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold ring-4 ring-white shadow-sm">4</span>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <h4 className="font-bold text-slate-800 text-base">Vergi Hesabı</h4>
                   <p className="text-sm text-slate-600 mt-1">
                     Oluşan toplam TL karı (Matrah) üzerinden, yukarıdaki gelir vergisi dilimlerine göre (%15 - %40) vergi hesaplanır.
                   </p>
                 </div>
              </div>
            </div>
          </div>

          {/* Example Scenario Card - LIGHT THEME UPDATE */}
          <div className="bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-8">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalculatorIcon size={20} className="text-blue-600" />
                Örnek Hesaplama Senaryosu
              </h3>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold border border-blue-200">Gerçek Hayat Örneği</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Inputs */}
              <div className="space-y-4">
                {/* 1. Hisse İşlemi */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                  <span className="absolute top-2 right-2 text-slate-300"><TrendingUp size={20} /></span>
                  <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 text-sm flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs">1</span>
                    Hisse Alım-Satım Verileri
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-500 text-xs mb-1">Alış (AAPL - 100 Adet)</span>
                      <span className="block text-slate-800 font-mono font-medium">15 Mart 2024 @ $150</span>
                      <span className="block text-slate-500 text-xs mt-0.5">Kur: 31.50 TL</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-xs mb-1">Satış (AAPL - 100 Adet)</span>
                      <span className="block text-slate-800 font-mono font-medium">20 Kasım 2024 @ $180</span>
                      <span className="block text-slate-500 text-xs mt-0.5">Kur: 34.80 TL</span>
                    </div>
                  </div>
                </div>
                
                {/* 2. Temettü Geliri (NEW) */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 relative">
                   <span className="absolute top-2 right-2 text-purple-200"><DollarSign size={20} /></span>
                   <h4 className="font-bold text-purple-800 mb-3 border-b border-purple-200 pb-2 text-sm flex items-center gap-2">
                    <span className="bg-purple-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs">2</span>
                    Temettü Geliri (Aynı Yıl)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-purple-700 text-xs mb-1">Brüt Tutar & Tarih</span>
                      <span className="block text-slate-800 font-mono font-medium">$600 (Haziran 2024)</span>
                      <span className="block text-slate-500 text-xs mt-0.5">Kur: 32.00 TL</span>
                    </div>
                    <div>
                      <span className="block text-purple-700 text-xs mb-1">ABD Kesintisi (Stopaj)</span>
                      <span className="block text-red-600 font-mono font-medium">-$90 (%15)</span>
                      <span className="block text-slate-500 text-xs mt-0.5">TL Karşılığı: 2,880 TL</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs bg-white p-2 rounded border border-purple-100 text-slate-600">
                    <strong>19,200 TL</strong> > <strong>18,000 TL</strong> (İstisna) olduğu için tamamı beyan edilir.
                  </div>
                </div>

                {/* 3. Ham TL Değerler */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 text-sm">3. Ham TL Karşılıklar</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Alış Maliyeti (100 x 150 x 31.50)</span>
                      <span className="font-mono text-slate-800">472,500 TL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Satış Geliri (100 x 180 x 34.80)</span>
                      <span className="font-mono text-green-600 font-bold">626,400 TL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Calculation */}
              <div className="space-y-4">
                {/* 4. Endeksleme */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2 text-sm">4. Enflasyon Düzeltmesi (Endeksleme)</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                       <span>Şubat '24 ÜFE: 2,850.45</span>
                       <span>Ekim '24 ÜFE: 3,150.20</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-200 font-mono text-xs text-slate-700">
                      Artış Oranı = (3,150.20 - 2,850.45) / 2,850.45 = <span className="text-blue-600 font-bold">%10.52</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> %10 üzeri olduğu için maliyet artırılır:
                    </p>
                    <div className="bg-blue-50/50 p-2 rounded border border-blue-100 font-mono text-xs text-slate-800 mt-1">
                      472,500 x (3,150.20 / 2,850.45) = <strong>522,189 TL</strong>
                    </div>
                    <div className="flex justify-between items-center border-t border-blue-200 pt-2 mt-2 text-slate-800">
                      <span>Yeni (Endekslenmiş) Maliyet:</span>
                      <span className="font-bold">522,189 TL</span>
                    </div>
                  </div>
                </div>

                {/* 5. Matrah ve Vergi */}
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 shadow-sm">
                  <h4 className="font-bold text-emerald-800 mb-3 border-b border-emerald-200 pb-2 text-sm flex items-center gap-2">
                    <Receipt size={16} /> 5. Sonuç & Vergi Hesabı
                  </h4>
                  <div className="text-sm space-y-1">
                    {/* Trading Profit */}
                    <div className="flex justify-between text-slate-600">
                      <span>Hisse Karı (626k - 522k)</span>
                      <span className="font-mono">104,211 TL</span>
                    </div>
                    {/* Dividend Profit */}
                    <div className="flex justify-between text-slate-600">
                      <span>Temettü Geliri</span>
                      <span className="font-mono">+19,200 TL</span>
                    </div>
                    
                    <div className="flex justify-between font-bold border-t border-emerald-200 pt-2 mt-2 text-slate-800 text-base">
                      <span>Toplam Matrah</span>
                      <span className="text-emerald-700">123,411 TL</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-emerald-200 text-xs space-y-1">
                      <span className="block text-emerald-900 font-semibold mb-1">Vergi Tarifesi Hesabı:</span>
                      <div className="flex justify-between text-slate-600">
                        <span>İlk 70.000 TL (%15)</span>
                        <span>10,500 TL</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kalan 53,411 TL (%20)</span>
                        <span>10,682 TL</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 border-t border-emerald-200 pt-1 mt-1">
                        <span>Hesaplanan Toplam Vergi</span>
                        <span>21,182 TL</span>
                      </div>
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>(-) ABD'de Ödenen Stopaj</span>
                        <span>-2,880 TL</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center font-bold text-lg mt-3 bg-white p-3 rounded border border-emerald-200 text-emerald-800 shadow-sm">
                      <span>NET ÖDENECEK:</span>
                      <span>~18,302 TL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTENT: DECLARATION GUIDE (NEW) --- */}
      {activeTab === 'declaration_guide' && (
        <div className="space-y-8 animate-in fade-in duration-300">
           
           {/* Intro Card */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex flex-col md:flex-row gap-6 items-start">
               <div className="bg-orange-100 p-4 rounded-full text-orange-600 flex-shrink-0">
                 <MousePointerClick size={32} />
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Hazır Beyan Sistemi Kullanım Kılavuzu</h3>
                 <p className="text-slate-600 leading-relaxed mb-4">
                   Yurt dışı borsa kazançları, Gelir İdaresi Başkanlığı'nın (GİB) <strong>Hazır Beyan Sistemi</strong> üzerinden "Yıllık Gelir Vergisi Beyannamesi" ile beyan edilir. 
                   Sistem, internet üzerinden kolayca vergi beyanı yapmanıza olanak tanır.
                 </p>
                 
                 <div className="flex flex-wrap gap-3">
                   <a 
                     href="https://hazirbeyan.gib.gov.tr" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                   >
                     Sisteme Giriş Yap <ExternalLink size={16} />
                   </a>
                   
                   {onNavigate && (
                     <button
                       onClick={() => onNavigate('declaration')}
                       className="inline-flex items-center gap-2 bg-white text-orange-700 border border-orange-200 hover:bg-orange-50 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                     >
                       <FileText size={16} /> Taslağımı Oluştur
                     </button>
                   )}
                 </div>
               </div>
             </div>
           </div>

           {/* Step by Step Timeline */}
           <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             {/* Left: Steps */}
             <div className="md:col-span-8 space-y-6">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200">
                  <ListChecks className="text-blue-600" />
                  Adım Adım Beyanname Doldurma
                </h4>

                <div className="relative border-l-2 border-slate-200 ml-3 pl-8 py-2 space-y-8">
                  {/* Step 1 */}
                  <div className="relative">
                    <span className="absolute -left-[41px] top-0 w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                    <h5 className="font-bold text-slate-800">Sisteme Giriş & Yıl Seçimi</h5>
                    <p className="text-sm text-slate-600 mt-1">
                      <a href="https://hazirbeyan.gib.gov.tr" target="_blank" className="text-blue-600 underline">hazirbeyan.gib.gov.tr</a> adresine E-Devlet şifrenizle giriş yapın. 
                      Menüden <strong>"Beyanname Doldur"</strong> seçeneğine tıklayın ve ilgili vergi yılını (örn: 2025) seçin.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <span className="absolute -left-[41px] top-0 w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <h5 className="font-bold text-slate-800">Gelir Türü Seçimi (Çok Önemli!)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                      Açılan ekranda beyan edeceğiniz gelir türlerini işaretlemeniz istenir.
                    </p>
                    <ul className="mt-2 space-y-2 text-sm">
                      <li className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                        <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Hisse Alım-Satım Karları İçin: <strong>"Diğer Kazanç ve İratlar"</strong> kutucuğunu işaretleyin.</span>
                      </li>
                      <li className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                        <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Temettü Gelirleri İçin: <strong>"Menkul Sermaye İradı (MSİ)"</strong> kutucuğunu işaretleyin.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <span className="absolute -left-[41px] top-0 w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <h5 className="font-bold text-slate-800">Veri Girişi (Diğer Kazanç ve İratlar)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                      Hisse kazançlarınız için "Safi Kazanç" kısmına, bu uygulamadaki <strong>"Vergi Raporu"</strong> ekranında hesaplanan toplam <strong>Matrah</strong> tutarını yazın.
                      <br/><br/>
                      <em>Not: "İstisna" kısmını genellikle boş bırakın (yurt dışı hisselerde özel bir istisna yoktur).</em>
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <span className="absolute -left-[41px] top-0 w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">4</span>
                    <h5 className="font-bold text-slate-800">Veri Girişi (Menkul Sermaye İradı)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                      Temettüleriniz istisna sınırını aşıyorsa, "Yurt Dışı Temettü" satırını seçin. "Gayrisafi Tutar" kısmına brüt temettü toplamını yazın.
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className="relative">
                    <span className="absolute -left-[41px] top-0 w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">5</span>
                    <h5 className="font-bold text-slate-800">Yabancı Vergi Mahsubu (Stopaj İndirimi)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                      "Vergi Hesaplama" sekmesine geçin. <strong>"Mahsup Edilecek Vergiler"</strong> bölümünde "Yabancı Ülkelerde Ödenen Vergiler" satırına, ABD'de kesilen temettü stopaj tutarını (TL karşılığı) yazın.
                      <br/>
                      <span className="text-xs text-orange-600 bg-orange-50 px-1 rounded mt-1 inline-block">Dikkat: Bu indirimi yapabilmek için kanıtlayıcı belge sunmanız gerekebilir.</span>
                    </p>
                  </div>
                </div>
             </div>

             {/* Right: Warnings & Links */}
             <div className="md:col-span-4 space-y-6">
               
               <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                 <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                   <AlertTriangle size={18} />
                   Kritik Uyarılar
                 </h4>
                 <ul className="space-y-3 text-sm text-red-700">
                   <li className="flex gap-2 items-start">
                     <span className="font-bold text-lg leading-none">•</span>
                     <span>"Değer Artış Kazancı" ile "Menkul Sermaye İradı"nı karıştırmayın. Yanlış beyan cezai işlem doğurabilir.</span>
                   </li>
                   <li className="flex gap-2 items-start">
                     <span className="font-bold text-lg leading-none">•</span>
                     <span>Yabancı vergi mahsubu yapacaksanız, aracı kurumdan aldığınız imzalı/kaşeli ekstreleri saklayın. Vergi dairesi "Apostil" şerhi isteyebilir (Uygulamada bazen kurum yazısı yeterli olabiliyor).</span>
                   </li>
                   <li className="flex gap-2 items-start">
                     <span className="font-bold text-lg leading-none">•</span>
                     <span>Beyanname onaylamadan önce "Taslak" oluşturup bu uygulamadaki sonuçlarla karşılaştırın.</span>
                   </li>
                 </ul>
               </div>

               <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                 <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                   <ExternalLink size={18} />
                   Faydalı Bağlantılar
                 </h4>
                 <div className="space-y-2">
                    <a href="https://hazirbeyan.gib.gov.tr" target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-white p-3 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      <ArrowRight size={14} /> GİB Hazır Beyan Sistemi
                    </a>
                    <a href="https://www.gib.gov.tr/yardim-ve-kaynaklar/rehberler" target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-white p-3 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      <ArrowRight size={14} /> GİB Vergi Rehberleri (PDF)
                    </a>
                    <a href="https://ivd.gib.gov.tr" target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-white p-3 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      <ArrowRight size={14} /> İnteraktif Vergi Dairesi
                    </a>
                 </div>
               </div>

             </div>
           </div>
        </div>
      )}

      {/* --- CONTENT: FAQ --- */}
      {activeTab === 'faq' && (
        <div className="animate-in fade-in duration-300">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-4">
            {filteredFaqs.map((item, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                  openIndex === idx ? 'border-blue-300 shadow-md ring-1 ring-blue-100' : 'border-slate-200 shadow-sm hover:border-blue-200'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-full ${
                      item.category === 'trading' ? 'bg-green-100 text-green-600' :
                      item.category === 'dividend' ? 'bg-purple-100 text-purple-600' :
                      item.category === 'declaration' ? 'bg-orange-100 text-orange-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.category === 'trading' ? <TrendingUp size={16} /> :
                       item.category === 'dividend' ? <DollarSign size={16} /> :
                       item.category === 'declaration' ? <Calendar size={16} /> :
                       <HelpCircle size={16} />}
                    </span>
                    <span className="font-semibold text-slate-800 text-lg">{item.question}</span>
                  </div>
                  {openIndex === idx ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </button>
                
                {openIndex === idx && (
                  <div className="px-5 pb-5 pl-16">
                    <div className="text-slate-600 leading-relaxed border-l-2 border-slate-100 pl-4">
                      {item.answer}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center mt-8">
        <p className="text-blue-800 text-sm">
          Bu rehberdeki bilgiler <strong>193 Sayılı Gelir Vergisi Kanunu</strong> ve ilgili tebliğler esas alınarak hazırlanmıştır. 
          Mevzuat değişiklikleri için Resmi Gazete takip edilmelidir.
        </p>
      </div>
    </div>
  );
};