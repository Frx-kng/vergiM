import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Portfolio } from './components/Portfolio';
import { TaxReport } from './components/TaxReport';
import { Optimization } from './components/Optimization';
import { DeclarationHelper } from './components/DeclarationHelper';
import { Wiki } from './components/Wiki';
import { AiAssistant } from './components/AiAssistant';
import { Transaction, Dividend, TransactionType } from './types';
import { calculateCapitalGains, calculateTax } from './utils';

// Initial Demo Data
const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', ticker: 'AAPL', type: TransactionType.BUY, date: '2024-03-15', quantity: 100, priceUsd: 150, exchangeRate: 31.50, commissionUsd: 0 },
  { id: '2', ticker: 'AAPL', type: TransactionType.SELL, date: '2024-11-20', quantity: 100, priceUsd: 180, exchangeRate: 34.80, commissionUsd: 0 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Specific state to control which tab opens inside the Wiki
  const [wikiInitialTab, setWikiInitialTab] = useState<'faq' | 'guide' | 'declaration_guide'>('guide');
  
  // --- STATE: Transactions & Dividends ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('vergim_transactions');
    return saved ? JSON.parse(saved) : DEMO_TRANSACTIONS;
  });
  const [dividends, setDividends] = useState<Dividend[]>(() => {
    const saved = localStorage.getItem('vergim_dividends');
    return saved ? JSON.parse(saved) : [];
  });

  // --- STATE: Scenario Data (Persisted) ---
  const [scenarioRate, setScenarioRate] = useState<string>(() => {
    return localStorage.getItem('vergim_scenarioRate') || '';
  });
  
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('vergim_currentPrices');
    return saved ? JSON.parse(saved) : {};
  });

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => {
    localStorage.setItem('vergim_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('vergim_dividends', JSON.stringify(dividends));
  }, [dividends]);

  useEffect(() => {
    localStorage.setItem('vergim_scenarioRate', scenarioRate);
  }, [scenarioRate]);

  useEffect(() => {
    localStorage.setItem('vergim_currentPrices', JSON.stringify(currentPrices));
  }, [currentPrices]);

  // --- CALCULATIONS ---
  const capitalGainsResults = useMemo(() => calculateCapitalGains(transactions), [transactions]);
  const taxSummary = useMemo(() => calculateTax(capitalGainsResults, dividends), [capitalGainsResults, dividends]);

  // Navigation Helper
  const handleWikiNavigation = (subTab: 'faq' | 'guide' | 'declaration_guide') => {
    setWikiInitialTab(subTab);
    setActiveTab('wiki');
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <Dashboard summary={taxSummary} capitalGains={capitalGainsResults} />
      )}
      {activeTab === 'portfolio' && (
        <Portfolio 
          transactions={transactions} 
          setTransactions={setTransactions} 
          dividends={dividends}
          setDividends={setDividends}
          summary={taxSummary}
          // Pass persisted scenario state down
          scenarioRate={scenarioRate}
          setScenarioRate={setScenarioRate}
          currentPrices={currentPrices}
          setCurrentPrices={setCurrentPrices}
        />
      )}
      {activeTab === 'optimization' && (
        <Optimization 
          summary={taxSummary} 
          capitalGains={capitalGainsResults} 
          transactions={transactions}
          currentPrices={currentPrices}
          scenarioRate={scenarioRate}
        />
      )}
      {activeTab === 'report' && (
        <TaxReport 
          summary={taxSummary} 
          capitalGains={capitalGainsResults} 
          dividends={dividends} 
        />
      )}
      {activeTab === 'declaration' && (
        <DeclarationHelper 
          summary={taxSummary} 
          onNavigateToGuide={() => handleWikiNavigation('declaration_guide')}
        />
      )}
      {activeTab === 'wiki' && (
        <Wiki 
          initialTab={wikiInitialTab}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}
      
      {/* AI Assistant Available Globally */}
      <AiAssistant 
        summary={taxSummary} 
        capitalGains={capitalGainsResults} 
        transactions={transactions}
      />
    </Layout>
  );
};

export default App;