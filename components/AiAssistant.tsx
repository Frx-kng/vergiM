import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, X, Bot, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { TaxSummary, CapitalGainResult, Transaction, TransactionType } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { TAX_BRACKETS_2025, YI_UFE_DATA } from '../constants';

interface AiAssistantProps {
  summary: TaxSummary;
  capitalGains: CapitalGainResult[];
  transactions: Transaction[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ summary, capitalGains, transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Merhaba! Ben VergiM Asistanı. Vergi hesaplamalarınız, optimizasyon fırsatları veya "X hissesini satsam ne olur?" gibi senaryolar hakkında bana soru sorabilirsiniz.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- Helper: Calculate Open Positions (Inventory) ---
  const getInventoryContext = () => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const buyQueue: Record<string, Transaction[]> = {};

    for (const tx of sorted) {
      if (!buyQueue[tx.ticker]) buyQueue[tx.ticker] = [];
      
      if (tx.type === TransactionType.BUY) {
        // Store a copy to mutate quantity without affecting state
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
            currentQueue.shift(); // Remove exhausted lot
          }
        }
      }
    }

    // Format output
    let contextStr = "";
    let hasOpen = false;
    Object.keys(buyQueue).forEach(ticker => {
      const lots = buyQueue[ticker].filter(l => l.quantity > 0.000001); // Filter out dust
      if (lots.length > 0) {
        hasOpen = true;
        contextStr += `${ticker}:\n`;
        lots.forEach(lot => {
          contextStr += `  - Alış: ${lot.date}, Kalan Adet: ${lot.quantity.toFixed(2)}, Fiyat: $${lot.priceUsd}, Kur: ${lot.exchangeRate}\n`;
        });
      }
    });

    if (!hasOpen) return "Mevcut açık pozisyon (elde tutulan hisse) bulunmamaktadır.";
    return contextStr;
  };

  // --- Context Construction ---
  const getSystemContext = () => {
    // 1. Bracket Analysis
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
    const distToNext = nextBracketLimit - currentIncome;

    // 2. Portfolio Stats
    const realizedLosses = capitalGains.filter(c => c.realProfitTry < 0).reduce((acc, c) => acc + c.realProfitTry, 0);
    
    // 3. Inventory Context
    const inventoryContext = getInventoryContext();

    // 4. Data Limiting (To prevent Token Overflow)
    const recentGains = [...capitalGains]
      .sort((a,b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime())
      .slice(0, 15);

    const txDetails = recentGains.map(cg => 
      `- ${cg.ticker}: ${cg.buyDate} -> ${cg.sellDate}. Kar: ${formatCurrency(cg.realProfitTry)}. Endeksleme: ${cg.isIndexed ? 'VAR' : 'YOK'}.`
    ).join('\n');

    // 5. Reference Data Preparation
    const bracketsContext = TAX_BRACKETS_2025.map(b => 
      `- Limit: ${b.limit === Infinity ? 'Sınırsız' : formatCurrency(b.limit)}, Oran: %${b.rate * 100}`
    ).join('\n');

    return `
      Sen "VergiM" uygulamasının uzman yapay zeka asistanısın.

      === MEVCUT VERGİ DURUMU ===
      Toplam Matrah: ${formatCurrency(summary.totalTaxableIncomeTry)}
      Ödenecek Tahmini Vergi: ${formatCurrency(summary.finalTaxPaymentTry)}
      Mevcut Vergi Dilimi: %${(currentRate * 100).toFixed(0)}
      Sonraki Dilim Sınırı (${formatPercent(nextRate)}): ${formatCurrency(distToNext)} kaldı.

      === PORTFÖY GEÇMİŞİ (KAPALI İŞLEMLER) ===
      Toplam Realize Zarar (Mahsup Edilmiş): ${formatCurrency(Math.abs(realizedLosses))}
      Son İşlemler:
      ${txDetails}

      === MEVCUT PORTFÖY (AÇIK POZİSYONLAR / INVENTORY) ===
      (Kullanıcı "satarsam ne olur" dediğinde buradaki maliyetleri kullan)
      ${inventoryContext}

      === REFERANS VERİLER (HESAPLAMA İÇİN GEREKLİ) ===
      1. Yİ-ÜFE (Üretici Fiyat Endeksi) Tablosu (YYYY-MM):
      ${JSON.stringify(YI_UFE_DATA, null, 2)}
      
      2. Gelir Vergisi Dilimleri (2025):
      ${bracketsContext}

      === GÖREV: SENARYO VE OPTİMİZASYON ANALİZİ ===
      Kullanıcı sorularını yanıtlarken aşağıdaki kuralları uygula:

      1. **HESAPLAMA MANTIĞI (Senaryo Soruları İçin):**
         - Kullanıcı "X hissesini Y fiyattan satarsam" derse:
         - **FIFO Yöntemi**: "MEVCUT PORTFÖY" listesinden ilk alınan lotları seç.
         - **Endeksleme Kontrolü**: 
           * Alış Tarihinden bir önceki ayın Yİ-ÜFE değerini tablodan bul.
           * Satış Tarihinden (bugün) bir önceki ayın Yİ-ÜFE değerini tablodan bul (veya en son veriyi kullan).
           * Artış Oranı = (Satış Endeksi - Alış Endeksi) / Alış Endeksi.
           * EĞER Artış Oranı > 0.10 (%10) İSE Endeksleme yap: Yeni Maliyet = Alış Maliyeti * (Satış Endeksi / Alış Endeksi).
           * AKSİ HALDE: Yeni Maliyet = Alış Maliyeti (USD * Alış Kuru).
         - **Kar Hesabı**: (Satış Fiyatı * Satış Kuru * Adet) - Yeni Maliyet.
         - **Vergi Tahmini**: Kar pozitifse, mevcut vergi dilimi (%${(currentRate * 100).toFixed(0)}) ile çarp.

      2. **TAVSİYE KURALLARI:**
         - Asla "kesin yatırım tavsiyesi" verme. "Simülasyon" veya "Tahmin" dili kullan.
         - Eğer "Sonraki Dilim Sınırı"na çok az kaldıysa uyar.
         - Eğer endeksleme sınırına (%10) yakın bir enflasyon farkı varsa (örn %9.5), "Biraz daha beklerseniz endeksleme hakkı kazanabilirsiniz" gibi akıllı öneriler sun.

      Cevapların net, samimi ve Türkçe olsun.
    `;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    
    const newMessages = [...messages, { role: 'user' as const, text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Anahtarı bulunamadı.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const historyContents = newMessages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: historyContents,
        config: {
          systemInstruction: getSystemContext(),
          temperature: 0.3, // Lower temperature for more accurate math/logic
        }
      });

      const responseText = response.text;

      if (responseText) {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      } else {
        throw new Error("Boş yanıt alındı.");
      }
      
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMsg = "Bağlantı hatası oluştu. Lütfen daha sonra tekrar deneyin.";
      if (error.message?.includes('API Anahtarı')) {
        errorMsg = "API anahtarı yapılandırılmamış. Lütfen çevre değişkenlerini kontrol edin.";
      }
      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', text: 'Sohbet temizlendi. Size nasıl yardımcı olabilirim?' }]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center group"
        aria-label="Asistanı Aç"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">AI</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm sm:w-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden h-[600px] max-h-[80vh] animate-in slide-in-from-bottom-10 fade-in duration-300 font-sans">
          
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-full border border-blue-500/30 backdrop-blur-sm">
                <Bot size={20} className="text-blue-200" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">VergiM Asistan</h3>
                <p className="text-blue-200 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Gemini 2.5 Flash
                </p>
              </div>
            </div>
            <button 
              onClick={clearChat} 
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full" 
              title="Sohbeti Temizle"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3 shadow-sm">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500 font-medium">Asistan yazıyor...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-end gap-2 bg-slate-100 rounded-2xl px-4 py-3 border border-slate-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Örn: 100 adet AAPL hissemi $180'dan satarsam vergi ne olur?"
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none max-h-24"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '20px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center mt-2">
               <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                 <Sparkles size={10} /> Powered by Google Gemini
               </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};