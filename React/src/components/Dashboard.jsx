import { Building2, Users, Wallet, CreditCard, LogOut, BarChart3, Plus, IndianRupee, PieChart, Briefcase, Settings2, Save, Minus, Pencil, Trash2, X, Loader2, ChevronLeft, ChevronRight, HardHat } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import StatCard from './StatCard';
import { useSite } from '../context/SiteContext';
import { getWorkersBySite, getAllWorkers } from "../../appwrite/services/worker.service.js";
import { getEngineersBySite, getAllEngineers } from "../../appwrite/services/engineer.service.js";
import { getFinanceBySite, createFinance, getAllFinance, allocateBudget, addAdditionalBudget } from "../../appwrite/services/finance.service.js";
import { updateSite } from "../../appwrite/services/site.service.js";
import { getInventoryBySite } from "../../appwrite/services/inventory.service.js";
import { addWorker, updateWorker, deleteWorker, getPaginatedWorkers } from "../../appwrite/services/worker.service.js";
import { addEngineer, updateEngineer, deleteEngineer, getPaginatedEngineers } from "../../appwrite/services/engineer.service.js";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { selectedSite, sites } = useSite();

  const [finance, setFinance] = useState(null);
  const [allFinance, setAllFinance] = useState([]);
  const [calculatedExpenses, setCalculatedExpenses] = useState({ labour: 0, engineer: 0, material: 0, total: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [totalWorkers, setTotalWorkers] = useState(0);
  const [globalStats, setGlobalStats] = useState({ 
    totalBudget: 0, 
    totalExpenses: 0,
    totalWorkers: 0,
    totalEngineers: 0
  });

  const [siteBudgets, setSiteBudgets] = useState({}); // { [siteId]: additionalAmount }

  // Admin Global Personnel
  const [activeTab, setActiveTab] = useState('finance'); // 'finance', 'workers', 'engineers'
  const [globalWorkers, setGlobalWorkers] = useState([]);
  const [globalEngineers, setGlobalEngineers] = useState([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [wPage, setWPage] = useState(1);
  const [ePage, setEPage] = useState(1);
  const [wTotal, setWTotal] = useState(0);
  const [eTotal, setETotal] = useState(0);
  const limit = 10;

  // Edit Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemType, setItemType] = useState(null); // 'worker' or 'engineer'
  const [editFormData, setEditFormData] = useState({ name: '', role: '', pay: 0 });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (selectedSite && !isAdmin) {
      fetchDashboardData();
    }
    if (isAdmin) {
      fetchGlobalStats();
      if (activeTab === 'workers') fetchGlobalWorkers(wPage);
      if (activeTab === 'engineers') fetchGlobalEngineers(ePage);
    }
  }, [selectedSite, user, activeTab, wPage, ePage]);

  const fetchGlobalStats = async () => {
    setLoadingStats(true);
    try {
      const [finRes, allWorkers, allEng] = await Promise.all([
        getAllFinance(),
        getAllWorkers(),
        getAllEngineers()
      ]);

      setAllFinance(finRes);
      
      const budgetsMap = {};
      // For the input, we start empty as it's an "additional" amount
      finRes.forEach(f => {
        budgetsMap[f.siteId] = ''; 
      });
      setSiteBudgets(budgetsMap);

      const totals = finRes.reduce((acc, f) => {
        return {
          totalBudget: acc.totalBudget + (f.budget || 0),
          totalExpenses: acc.totalExpenses + (f.expenses || 0)
        };
      }, { totalBudget: 0, totalExpenses: 0 });

      setGlobalStats({
        ...totals,
        totalWorkers: allWorkers.total || allWorkers.documents.length,
        totalEngineers: allEng.total || allEng.documents.length
      });
    } catch (e) {
      console.error("Global stats error:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUpdateSiteBudget = async (siteId) => {
    const amount = Number(siteBudgets[siteId]);
    if (isNaN(amount) || amount <= 0) return alert("Enter a valid additional budget amount");

    try {
      await addAdditionalBudget(siteId, amount);
      alert(`₹${amount.toLocaleString()} added to project budget!`);
      setSiteBudgets(prev => ({ ...prev, [siteId]: '' }));
      fetchGlobalStats();
    } catch (e) {
      console.error("Budget update error:", e);
      alert("Failed to update budget");
    }
  };

  const handleSubtractSiteBudget = async (siteId) => {
    const amount = Number(siteBudgets[siteId]);
    if (isNaN(amount) || amount <= 0) return alert("Enter a valid amount to subtract");

    try {
      await addAdditionalBudget(siteId, -amount); // Use the same function with negative value
      alert(`₹${amount.toLocaleString()} removed from project budget!`);
      setSiteBudgets(prev => ({ ...prev, [siteId]: '' }));
      fetchGlobalStats();
    } catch (e) {
      console.error("Budget subtract error:", e);
      alert("Failed to subtract budget");
    }
  };

  const fetchGlobalWorkers = async (page) => {
    setLoadingPersonnel(true);
    try {
      const offset = (page - 1) * limit;
      const res = await getPaginatedWorkers(limit, offset);
      setGlobalWorkers(res.documents || []);
      setWTotal(res.total);
    } catch (e) {
      console.error("Fetch workers error:", e);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  const fetchGlobalEngineers = async (page) => {
    setLoadingPersonnel(true);
    try {
      const offset = (page - 1) * limit;
      const res = await getPaginatedEngineers(limit, offset);
      setGlobalEngineers(res.documents || []);
      setETotal(res.total);
    } catch (e) {
      console.error("Fetch engineers error:", e);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  const handleEditClick = (item, type) => {
    setItemType(type);
    setEditItem(item);
    setEditFormData({
      name: item.name,
      role: item.role || '',
      pay: type === 'worker' ? (item.dailyWage || 0) : (item.salary || item.monthlySalary || 0)
    });
    setShowEditModal(true);
  };

  const handleDeleteItem = async (id, type, name) => {
    if (!window.confirm(`Are you sure you want to delete ${type} ${name}?`)) return;
    try {
      if (type === 'worker') {
        await deleteWorker(id);
        fetchGlobalWorkers(wPage);
      } else {
        await deleteEngineer(id);
        fetchGlobalEngineers(ePage);
      }
      alert(`${name} deleted successfully`);
    } catch (e) {
      console.error("Delete error:", e);
      alert("Delete failed");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (itemType === 'worker') {
        await updateWorker(editItem.$id, {
          name: editFormData.name,
          role: editFormData.role,
          dailyWage: Number(editFormData.pay)
        });
        fetchGlobalWorkers(wPage);
      } else {
        await updateEngineer(editItem.$id, {
          name: editFormData.name,
          role: editFormData.role,
          salary: Number(editFormData.pay)
        });
        fetchGlobalEngineers(ePage);
      }
      setShowEditModal(false);
      alert("Record updated successfully");
    } catch (e) {
      console.error("Update error:", e);
      alert("Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [finRes, workersRes, engineersRes, inventoryRes] = await Promise.all([
         getFinanceBySite(selectedSite.$id),
         getWorkersBySite(selectedSite.$id),
         getEngineersBySite(selectedSite.$id),
         getInventoryBySite(selectedSite.$id)
      ]);

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
          engineercost: calculatedExpenses.engineer,
          materialCost: calculatedExpenses.material,
          remainingBudget: budgetValue - calculatedExpenses.total
       });
       setFinance(newFin);
       setBudgetInput('');
    } catch(e) {
       console.error("Budget Allocation Error:", e);
       alert("Failed to allocate budget: " + e.message);
    }
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          {!isAdmin && selectedSite && (
            <div className="flex items-center gap-2 text-sm font-bold text-orange-800 bg-orange-50 px-4 py-2.5 rounded-2xl border border-orange-100 shadow-sm">
              <span className="text-orange-400 uppercase text-[10px] tracking-widest mr-2">Active Site:</span>
              <span className="truncate">{selectedSite.siteName || selectedSite.name || 'Unnamed Site'}</span>
            </div>
          )}
          {isAdmin && (
             <div className="flex items-center gap-2 text-sm font-bold text-slate-800 bg-slate-100 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <BarChart3 size={16} className="text-slate-400" />
                <span className="uppercase text-[10px] tracking-widest text-slate-400">Environment:</span>
                <span>Global Production</span>
             </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-l pl-6 border-gray-200">
            {isAdmin && (
              <button 
                onClick={() => window.location.href = '/create-manager'}
                className="bg-orange-800 text-white hover:bg-orange-700 text-xs font-bold py-2 px-4 rounded-lg shadow-sm mr-2 transition-colors flex items-center gap-1"
              >
                <Users size={14} /> New Manager
              </button>
            )}
            <div className="text-right">
              <p className="text-sm font-bold">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-400 uppercase font-medium">{isAdmin ? 'Project Admin' : 'Site Manager'}</p>
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
        <h2 className="text-5xl font-black text-slate-900 mb-3 tracking-tight">
          {isAdmin ? 'Global Command Center' : 'Executive Summary'}
        </h2>
        <p className="text-slate-500 max-w-xl leading-relaxed font-medium">
          {isAdmin ? 
            'Real-time aggregation of all construction sites, workforce metrics, and consolidated financials.' : 
            'Real-time overview of your site performance and budget tracking.'
          }
        </p>
      </section>

      {/* Stats Section */}
      {isAdmin ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Projects" 
              value={sites?.length || "0"} 
              subtitle="Active Sites" 
              icon={Building2} 
              colorClass="bg-blue-50" 
            />
             <StatCard 
              title="Global Workforce" 
              value={globalStats.totalWorkers + globalStats.totalEngineers} 
              subtitle={`${globalStats.totalWorkers} Workers | ${globalStats.totalEngineers} Eng.`} 
              icon={Users} 
              colorClass="bg-orange-50" 
            />
            <StatCard 
              title="Consolidated Budget" 
              value={`₹${globalStats.totalBudget.toLocaleString()}`} 
              subtitle="Total Allocation" 
              icon={PieChart} 
              colorClass="bg-indigo-50" 
            />
            <StatCard 
              title="Total Expenses" 
              value={`₹${globalStats.totalExpenses.toLocaleString()}`} 
              subtitle="Global Utilization" 
              icon={Wallet} 
              colorClass="bg-emerald-50" 
            />
          </div>

          {/* Admin Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('finance')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Finance
            </button>
            <button 
              onClick={() => setActiveTab('workers')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'workers' ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Workers
            </button>
            <button 
              onClick={() => setActiveTab('engineers')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'engineers' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Engineers
            </button>
          </div>

          {activeTab === 'finance' && (
            <>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Portfolio Performance</h3>
                      <p className="text-xs text-slate-400 font-medium">Global utilization vs budget across all {sites?.length} sites</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{globalStats.totalBudget > 0 ? Math.round((globalStats.totalExpenses / globalStats.totalBudget) * 100) : 0}%</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Efficiency</p>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 mb-2">
                    <div 
                      className="h-4 rounded-full bg-indigo-600 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (globalStats.totalExpenses / globalStats.totalBudget) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">
                    <span>Spent: ₹{globalStats.totalExpenses.toLocaleString()}</span>
                    <span>Remaining: ₹{(globalStats.totalBudget - globalStats.totalExpenses).toLocaleString()}</span>
                </div>
              </div>

              {/* Site Budget Allocation Box */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Settings2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Site Budget Control</h3>
                    <p className="text-xs text-slate-400 font-medium">Manage financial allocations for each project site</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Site Name</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Budget</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Expenses</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Top-up Amount</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sites.map(site => {
                        const siteFinance = allFinance.find(f => f.siteId === site.$id);
                        return (
                          <tr key={site.$id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-bold text-slate-700">{site.siteName || site.name}</td>
                            <td className="py-4 font-black text-slate-900">₹{(siteFinance?.budget || 0).toLocaleString()}</td>
                            <td className="py-4">
                              <span className="text-xs font-bold text-slate-500">₹{(siteFinance?.expenses || 0).toLocaleString()}</span>
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1">
                                <div 
                                  className="bg-orange-500 h-1.5 rounded-full" 
                                  style={{ width: `${Math.min(100, (siteFinance?.expenses / siteFinance?.budget) * 100 || 0)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="relative max-w-[150px]">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input 
                                  type="number"
                                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={siteBudgets[site.$id] || ''}
                                  onChange={(e) => setSiteBudgets({...siteBudgets, [site.$id]: e.target.value})}
                                  placeholder="Add amount"
                                />
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleUpdateSiteBudget(site.$id)}
                                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                >
                                  <Plus size={14} /> Add
                                </button>
                                <button 
                                  onClick={() => handleSubtractSiteBudget(site.$id)}
                                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                >
                                  <Minus size={14} /> Subtract
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {sites.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-slate-400 font-medium">No sites available to manage.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'workers' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <Users size={20} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">Global Laborers Directory</h3>
                    <p className="text-xs text-slate-400 font-medium">Manage all workers across your sites ({wTotal} total)</p>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-slate-100">
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Worker</th>
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Trade</th>
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Wage</th>
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {loadingPersonnel ? (
                       <tr><td colSpan="4" className="py-12 text-center text-orange-800 font-black animate-pulse">Syncing...</td></tr>
                     ) : globalWorkers.length === 0 ? (
                       <tr><td colSpan="4" className="py-12 text-center text-slate-400">No workers found</td></tr>
                     ) : (
                       globalWorkers.map(w => (
                         <tr key={w.$id} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="py-4">
                              <p className="font-bold text-slate-900">{w.name}</p>
                              <p className="text-[10px] text-slate-400">{w.$id.substring(0,8)}</p>
                           </td>
                           <td className="py-4"><span className="text-xs font-bold text-slate-500 uppercase px-2 py-1 bg-slate-50 border rounded-lg">{w.role}</span></td>
                           <td className="py-4 font-black">₹{w.dailyWage}</td>
                           <td className="py-4">
                              <div className="flex gap-2">
                                 <button onClick={() => handleEditClick(w, 'worker')} className="p-2 text-slate-400 hover:text-orange-800 hover:bg-orange-50 rounded-xl transition-all"><Pencil size={16}/></button>
                                 <button onClick={() => handleDeleteItem(w.$id, 'worker', w.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                              </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
                 {/* Pagination */}
                 <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-bold">Page {wPage} of {Math.ceil(wTotal / limit)}</p>
                    <div className="flex gap-2">
                       <button onClick={() => setWPage(p => Math.max(1, p-1))} disabled={wPage === 1} className="p-2 rounded-xl border disabled:opacity-30"><ChevronLeft size={16}/></button>
                       <button onClick={() => setWPage(p => p + 1)} disabled={wPage * limit >= wTotal} className="p-2 rounded-xl border disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'engineers' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <HardHat size={20} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">Global Engineering Staff</h3>
                    <p className="text-xs text-slate-400 font-medium">Manage all professional leads ({eTotal} total)</p>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-slate-100">
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Engineer</th>
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Specialty</th>
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Salary</th>
                       <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {loadingPersonnel ? (
                       <tr><td colSpan="4" className="py-12 text-center text-blue-800 font-black animate-pulse">Syncing...</td></tr>
                     ) : globalEngineers.length === 0 ? (
                       <tr><td colSpan="4" className="py-12 text-center text-slate-400">No staff found</td></tr>
                     ) : (
                       globalEngineers.map(e => (
                         <tr key={e.$id} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="py-4">
                              <p className="font-bold text-slate-900">{e.name}</p>
                              <p className="text-[10px] text-slate-400">{e.$id.substring(0,8)}</p>
                           </td>
                           <td className="py-4"><span className="text-xs font-bold text-slate-500 uppercase px-2 py-1 bg-slate-50 border rounded-lg">{e.role}</span></td>
                           <td className="py-4 font-black">₹{(e.salary || e.monthlySalary || 0).toLocaleString()}</td>
                           <td className="py-4">
                              <div className="flex gap-2">
                                 <button onClick={() => handleEditClick(e, 'engineer')} className="p-2 text-slate-400 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={16}/></button>
                                 <button onClick={() => handleDeleteItem(e.$id, 'engineer', e.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                              </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
                 {/* Pagination */}
                 <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-bold">Page {ePage} of {Math.ceil(eTotal / limit)}</p>
                    <div className="flex gap-2">
                       <button onClick={() => setEPage(p => Math.max(1, p-1))} disabled={ePage === 1} className="p-2 rounded-xl border disabled:opacity-30"><ChevronLeft size={16}/></button>
                       <button onClick={() => setEPage(p => p + 1)} disabled={ePage * limit >= eTotal} className="p-2 rounded-xl border disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard title="Total Personnel" value={totalWorkers} subtitle="Active Today" icon={Users} colorClass="bg-orange-50" />
            <StatCard title="Calculated Expenses" value={`₹${calculatedExpenses.total.toLocaleString()}`} subtitle="Actual utilization" icon={Wallet} colorClass="bg-emerald-50" />
            <StatCard title="Site Budget" value={finance ? `₹${finance.budget.toLocaleString()}` : "Not Set"} badge={!finance ? "Action Required" : ""} icon={IndianRupee} colorClass="bg-indigo-50" />
          </div>

          {/* Bottom Section: Expense Breakdown & Budget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Budget / Allocate Panel */}
            <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              {!finance ? (
                <div className="h-full flex flex-col justify-center">
                  <h4 className="font-black text-slate-900 text-lg mb-2">Allocate Site Budget</h4>
                  <form onSubmit={handleSetBudget} className="space-y-4">
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                    />
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all">
                      Set Budget
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <h4 className="font-black text-slate-900 text-lg mb-1">Budget Overview</h4>
                  <p className="text-xs text-slate-400 font-medium mb-5">Allocated: ₹{finance.budget.toLocaleString()}</p>
                  <div className="mb-6">
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${(calculatedExpenses.total / finance.budget) > 0.8 ? 'bg-red-500' : 'bg-orange-600'}`}
                        style={{ width: `${Math.min(100, Math.round((calculatedExpenses.total / finance.budget) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center p-3 rounded-2xl bg-orange-50/40 border border-orange-100">
                        <span className="text-sm text-slate-700 font-bold">Labour Wages</span>
                        <span className="font-black">₹{calculatedExpenses.labour.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-50/40 border border-blue-100">
                        <span className="text-sm text-slate-700 font-bold">Engineer Salaries</span>
                        <span className="font-black">₹{calculatedExpenses.engineer.toLocaleString()}</span>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Expense Summary Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-7 rounded-3xl border border-orange-200">
                <p className="text-[10px] font-black uppercase text-orange-500 mb-2">Labour Cost</p>
                <p className="text-4xl font-black text-orange-900 tracking-tight mb-3">₹{calculatedExpenses.labour.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-7 rounded-3xl border border-blue-200">
                <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Engineer Cost</p>
                <p className="text-4xl font-black text-blue-900 tracking-tight mb-3">₹{calculatedExpenses.engineer.toLocaleString()}</p>
              </div>
              <div className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 p-7 rounded-3xl text-white">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Expense</p>
                <p className="text-5xl font-black tracking-tighter mb-3">₹{calculatedExpenses.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}
    {/* Shared Edit Modal */}
    {showEditModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-100">
           <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900">Update {itemType === 'worker' ? 'Worker' : 'Engineer'}</h3>
              <button onClick={() => setShowEditModal(false)}><X size={20} className="text-slate-400" /></button>
           </div>
           <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Trade / Role</label>
                <input 
                  type="text" 
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{itemType === 'worker' ? 'Daily Wage' : 'Monthly Salary'} (₹)</label>
                <input 
                  type="number" 
                  value={editFormData.pay}
                  onChange={(e) => setEditFormData({...editFormData, pay: e.target.value})}
                  className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {submitting ? <Loader2 className="animate-spin" size={16}/> : 'Commit Changes'}
              </button>
           </form>
        </div>
      </div>
    )}
  </div>
);
}
