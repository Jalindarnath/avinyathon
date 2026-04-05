import { Building2, Users, Wallet, CreditCard, LogOut, BarChart3, Plus, IndianRupee } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import StatCard from './StatCard';
import { useSite } from '../context/SiteContext';
import { getWorkersBySite } from "../../appwrite/services/worker.service.js";
import { getEngineersBySite } from "../../appwrite/services/engineer.service.js";
import { getFinanceBySite, createFinance } from "../../appwrite/services/finance.service.js";
import { getInventoryBySite } from "../../appwrite/services/inventory.service.js";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { selectedSite, sites } = useSite();

  const [finance, setFinance] = useState(null);
  const [calculatedExpenses, setCalculatedExpenses] = useState({ labour: 0, engineer: 0, material: 0, total: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [totalWorkers, setTotalWorkers] = useState(0);

  useEffect(() => {
    if (selectedSite) {
      fetchDashboardData();
    }
  }, [selectedSite]);

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [finRes, workersRes, engineersRes, inventoryRes] = await Promise.all([
         getFinanceBySite(selectedSite.$id),
         getWorkersBySite(selectedSite.$id),
         getEngineersBySite(selectedSite.$id),
         getInventoryBySite(selectedSite.$id)
      ]);

      // finRes can be the object directly since getFinanceBySite does `res.documents[0]`
      setFinance(finRes || null);
      
      const workers = workersRes?.documents || [];
      const engineers = engineersRes?.documents || [];
      setTotalWorkers(workers.length + engineers.length);

      const labourCost = workers.reduce((acc, w) => {
         const pdays = parseInt(w.presentDays || "0", 10);
         return acc + (pdays * (w.dailyWage || 0));
      }, 0);
      const engineerCost = engineers.reduce((acc, e) => acc + (e.salary || 0), 0);
      const materialCost = (inventoryRes?.documents || []).reduce((acc, item) => acc + (item.price || 0), 0);
      
      setCalculatedExpenses({
         labour: labourCost,
         engineer: engineerCost,
         material: materialCost,
         total: labourCost + engineerCost + materialCost
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!budgetInput || isNaN(budgetInput)) return;
    
    try {
       const budgetValue = Number(budgetInput);
       const newFin = await createFinance({
          budget: budgetValue,
          siteId: selectedSite.$id,
          currency: 'INR',
          manager: user?.name,
          expenses: calculatedExpenses.total,
          labourcost: calculatedExpenses.labour,
          engineerCost: calculatedExpenses.engineer,
          materialCost: calculatedExpenses.material,
          remainingBudget: budgetValue - calculatedExpenses.total
       });
       setFinance(newFin);
       setBudgetInput('');
    } catch(e) {
       console.error("Budget Allocation Error:", e);
       if (e.message?.includes("budget")) {
          alert("Error: Budget value is too high for the current database settings. Please increase the 'Max' limit in Appwrite for the 'budget' attribute.");
       } else {
          alert("Failed to allocate budget: " + e.message);
       }
    }
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-orange-800 bg-orange-50 px-4 py-2.5 rounded-2xl border border-orange-100 shadow-sm">
            <span className="text-orange-400 uppercase text-[10px] tracking-widest mr-2">Active Site:</span>
            <span className="truncate">{selectedSite ? (selectedSite.siteName || selectedSite.name || 'Unnamed Site') : 'No Site Selected'}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-l pl-6 border-gray-200">
            {user?.role === 'admin' && (
              <button 
                onClick={() => window.location.href = '/create-manager'}
                className="bg-orange-800 text-white hover:bg-orange-700 text-xs font-bold py-2 px-4 rounded-lg shadow-sm mr-2 transition-colors flex items-center gap-1"
              >
                <Users size={14} /> New Manager
              </button>
            )}
            <div className="text-right">
              <p className="text-sm font-bold">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-400 uppercase font-medium">{user?.role === 'admin' ? 'Project Admin' : 'Site Manager'}</p>
            </div>
            <button 
              onClick={logout}
              className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-white shadow-sm bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mb-10">
        <h2 className="text-5xl font-black text-slate-900 mb-3 tracking-tight">Executive Summary</h2>
        <p className="text-slate-500 max-w-xl leading-relaxed font-medium">
          Real-time overview of your construction sites, financial health, and workforce allocation for the current quarter.
        </p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {user?.role === 'admin' && (
          <StatCard title="Total Sites" value={sites?.length || "0"} subtitle="active this month" icon={Building2} colorClass="bg-blue-50" />
        )}
        <StatCard title="Total Personnel" value={totalWorkers} subtitle="Active Now" icon={Users} colorClass="bg-orange-50" />
        <StatCard title="Calculated Expenses" value={`₹${calculatedExpenses.total.toLocaleString()}`} subtitle="Based on present days & salary" icon={Wallet} colorClass="bg-emerald-50" />
        <StatCard title="Total Budget allocated" value={finance ? `₹${finance.budget.toLocaleString()}` : "Not Set"} badge={!finance ? "Action Required" : ""} icon={IndianRupee} colorClass="bg-indigo-50" />
      </div>

      {/* Bottom Section: Expense Breakdown & Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Budget / Allocate Panel */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          {!finance ? (
            <div className="h-full flex flex-col justify-center">
              <h4 className="font-black text-slate-900 text-lg mb-2">Allocate Site Budget</h4>
              <p className="text-xs text-slate-500 font-medium mb-6">No budget has been assigned to this site. Set one to start tracking finances.</p>
              <form onSubmit={handleSetBudget} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Budget (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 font-bold"
                  />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all text-sm">
                  Set Budget
                </button>
              </form>
            </div>
          ) : (
            <div>
              <h4 className="font-black text-slate-900 text-lg mb-1 flex items-center justify-between">
                Budget Overview
              </h4>
              <p className="text-xs text-slate-400 font-medium mb-5">Allocated: ₹{finance.budget.toLocaleString()}</p>
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>Spent: ₹{calculatedExpenses.total.toLocaleString()}</span>
                  <span className="text-emerald-600">Remaining: ₹{Math.max(0, finance.budget - calculatedExpenses.total).toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${(calculatedExpenses.total / finance.budget) > 0.8 ? 'bg-red-500' : 'bg-orange-600'}`}
                    style={{ width: `${Math.min(100, Math.round((calculatedExpenses.total / finance.budget) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 text-right">{Math.min(100, Math.round((calculatedExpenses.total / finance.budget) * 100))}% utilised</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-orange-50/40 border border-orange-100">
                  <span className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-800"></div> Labour Wages
                  </span>
                  <span className="font-black text-slate-900">₹{calculatedExpenses.labour.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-50/40 border border-blue-100">
                  <span className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Engineer Salaries
                  </span>
                  <span className="font-black text-slate-900">₹{calculatedExpenses.engineer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                  <span className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Material Cost
                  </span>
                  <span className="font-black text-slate-900">₹{calculatedExpenses.material.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div> Total Expenses
                  </span>
                  <span className="font-black text-slate-900">₹{calculatedExpenses.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expense Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-7 rounded-3xl border border-orange-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Labour Cost</p>
            <p className="text-4xl font-black text-orange-900 tracking-tight mb-3">₹{calculatedExpenses.labour.toLocaleString()}</p>
            <p className="text-xs text-orange-700 font-medium">Calculated from workers' daily wages × present days this month</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-7 rounded-3xl border border-blue-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Engineer Cost</p>
            <p className="text-4xl font-black text-blue-900 tracking-tight mb-3">₹{calculatedExpenses.engineer.toLocaleString()}</p>
            <p className="text-xs text-blue-700 font-medium">Sum of all engineers' monthly salaries on this site</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-7 rounded-3xl border border-indigo-200">
             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Material Cost</p>
             <p className="text-4xl font-black text-indigo-900 tracking-tight mb-3">₹{calculatedExpenses.material.toLocaleString()}</p>
             <p className="text-xs text-indigo-700 font-medium">Cumulative cost of all recorded inventory materials</p>
          </div>
          <div className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 p-7 rounded-3xl text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Expense (Labour + Engineers + Materials)</p>
            <p className="text-5xl font-black tracking-tighter mb-3">₹{calculatedExpenses.total.toLocaleString()}</p>
            {finance && (
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${(calculatedExpenses.total / finance.budget) > 0.8 ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {(calculatedExpenses.total / finance.budget) > 0.8 ? '⚠ Budget Alert: Over 80%' : '✓ Budget in Healthy Range'}
                </span>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}