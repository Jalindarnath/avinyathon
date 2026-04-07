import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          {!isAdmin && selectedSite && (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Workspace</span>
              <span className="text-lg font-bold text-slate-800">{selectedSite.siteName || selectedSite.name || 'Unnamed Site'}</span>
            </div>
          )}
          {isAdmin && (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrative Control</span>
              <span className="text-lg font-bold text-slate-800">Global Overview</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <button 
              onClick={() => window.location.href = '/create-manager'}
              className="bg-[#f2711c] hover:bg-[#d96215] text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Create Manager
            </button>
          )}
          <div className="h-10 w-px bg-slate-200 mx-2" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{isAdmin ? 'System Admin' : 'Site Manager'}</p>
            </div>
            <button 
              onClick={() => navigate('/logout')}
              className="bg-white border border-slate-200 text-slate-800 hover:text-red-700 hover:bg-red-50 hover:border-red-100 text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2"
              title="Sign Out"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          {isAdmin ? 'Global Command Center' : 'Site Performance Summary'}
        </h2>
        <p className="text-slate-500 max-w-2xl text-sm font-medium">
          {isAdmin ? 
            'Real-time aggregation of all active construction sites, consolidated workforce metrics, and portfolio-wide financial analytics.' : 
            'Comprehensive overview of site operations, workforce attendance, and real-time budget utilization tracking.'
          }
        </p>
      </section>

      {/* Stats Cards Section */}
      {isAdmin ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Active Sites" 
              value={sites?.length || "0"} 
              subtitle="Managed Projects" 
              icon={Building2} 
              colorClass="bg-blue-50 text-blue-600" 
            />
             <StatCard 
              title="Total Workforce" 
              value={globalStats.totalWorkers + globalStats.totalEngineers} 
              subtitle={`${globalStats.totalWorkers} Workers | ${globalStats.totalEngineers} Eng.`} 
              icon={Users} 
              colorClass="bg-orange-50 text-orange-600" 
            />
            <StatCard 
              title="Global Budget" 
              value={`₹${globalStats.totalBudget.toLocaleString()}`} 
              subtitle="Consolidated Capital" 
              icon={PieChart} 
              colorClass="bg-indigo-50 text-indigo-600" 
            />
            <StatCard 
              title="Total Expenses" 
              value={`₹${globalStats.totalExpenses.toLocaleString()}`} 
              subtitle="Portfolio Utilization" 
              icon={Wallet} 
              colorClass="bg-emerald-50 text-emerald-600" 
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
            <button 
              onClick={() => setActiveTab('finance')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'finance' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Financial Control
            </button>
            <button 
              onClick={() => setActiveTab('workers')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'workers' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Laborers
            </button>
            <button 
              onClick={() => setActiveTab('engineers')}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'engineers' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Eng. Staff
            </button>
          </div>

          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Global Progress Card */}
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Expenditure Efficiency</h3>
                      <p className="text-xs text-slate-400 font-medium">Aggregate spending across all active project sites</p>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                    <div 
                      className="h-full bg-[#f2711c] transition-all duration-700"
                      style={{ width: `${Math.min(100, (globalStats.totalExpenses / globalStats.totalBudget) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex gap-8">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Spent</p>
                          <p className="text-lg font-bold text-slate-800">₹{globalStats.totalExpenses.toLocaleString()}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portfolio Balance</p>
                          <p className="text-lg font-bold text-emerald-600">₹{(globalStats.totalBudget - globalStats.totalExpenses).toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usage Rate</p>
                       <p className="text-lg font-bold text-slate-800">{globalStats.totalBudget > 0 ? Math.round((globalStats.totalExpenses / globalStats.totalBudget) * 100) : 0}%</p>
                    </div>
                </div>
              </div>

              {/* Site Budget Management Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Site-wise Capital Allocation</h3>
                  <p className="text-xs text-slate-400 font-medium">Adjust project budgets and monitor real-time resource utilization</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Site Identity</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Capital</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actual Utilization</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Capital Adjustment</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sites.map(site => {
                        const siteFinance = allFinance.find(f => f.siteId === site.$id);
                        const usage = siteFinance?.budget > 0 ? (siteFinance?.expenses / siteFinance?.budget) * 100 : 0;
                        return (
                          <tr key={site.$id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{site.siteName || site.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{site.siteId}</p>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800">₹{(siteFinance?.budget || 0).toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${usage > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${Math.min(100, usage)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">₹{(siteFinance?.expenses || 0).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                <input 
                                  type="number"
                                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] outline-none transition-all"
                                  value={siteBudgets[site.$id] || ''}
                                  onChange={(e) => setSiteBudgets({...siteBudgets, [site.$id]: e.target.value})}
                                  placeholder="Amount"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleUpdateSiteBudget(site.$id)}
                                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white p-2 rounded-lg transition-all"
                                  title="Add Funds"
                                >
                                  <Plus size={14} />
                                </button>
                                <button 
                                  onClick={() => handleSubtractSiteBudget(site.$id)}
                                  className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-all"
                                  title="Recall Funds"
                                >
                                  <Minus size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {sites.length === 0 && (
                    <div className="py-16 text-center">
                      <p className="text-slate-400 text-sm font-medium">No sites available to manage.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workers' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Global Labor Register</h3>
                    <p className="text-xs text-slate-400 font-medium">Centralized directory of all site workers ({wTotal} registered)</p>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Personnel Details</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Trade / Area</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Standard Daily Rate</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Operations</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {loadingPersonnel ? (
                       <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" size={32}/><p className="mt-2 text-xs font-bold text-slate-400">Syncing Personnel Data...</p></td></tr>
                     ) : globalWorkers.length === 0 ? (
                       <tr><td colSpan="4" className="py-20 text-center text-slate-400 text-sm font-medium">No labor records found in the system</td></tr>
                     ) : (
                       globalWorkers.map(w => (
                         <tr key={w.$id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{w.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">ID: {w.$id.substring(0,10)}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">{w.role}</span>
                           </td>
                           <td className="px-6 py-4 font-bold text-slate-800">₹{w.dailyWage.toLocaleString()}</td>
                           <td className="px-6 py-4">
                              <div className="flex gap-2">
                                 <button onClick={() => handleEditClick(w, 'worker')} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><Pencil size={14}/></button>
                                 <button onClick={() => handleDeleteItem(w.$id, 'worker', w.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                              </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
                 
                 {/* Clean Pagination */}
                 <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Page {wPage} of {Math.ceil(wTotal / limit) || 1}</p>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setWPage(p => Math.max(1, p-1))} 
                         disabled={wPage === 1} 
                         className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
                       >
                         <ChevronLeft size={16}/>
                       </button>
                       <button 
                         onClick={() => setWPage(p => p + 1)} 
                         disabled={wPage * limit >= wTotal} 
                         className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
                       >
                         <ChevronRight size={16}/>
                       </button>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'engineers' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Engineering Staff Roster</h3>
                    <p className="text-xs text-slate-400 font-medium">Management of all site engineers and technical leads ({eTotal} staff)</p>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Professional Identity</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Specialization</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly Compensation</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Operations</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {loadingPersonnel ? (
                       <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" size={32}/><p className="mt-2 text-xs font-bold text-slate-400">Loading Staff Records...</p></td></tr>
                     ) : globalEngineers.length === 0 ? (
                       <tr><td colSpan="4" className="py-20 text-center text-slate-400 text-sm font-medium">No engineering staff records found</td></tr>
                     ) : (
                       globalEngineers.map(e => (
                         <tr key={e.$id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{e.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">UID: {e.$id.substring(0,10)}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">{e.role}</span>
                           </td>
                           <td className="px-6 py-4 font-bold text-slate-800">₹{(e.salary || e.monthlySalary || 0).toLocaleString()}</td>
                           <td className="px-6 py-4">
                              <div className="flex gap-2">
                                 <button onClick={() => handleEditClick(e, 'engineer')} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><Pencil size={14}/></button>
                                 <button onClick={() => handleDeleteItem(e.$id, 'engineer', e.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                              </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
                 
                 {/* Pagination */}
                 <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Page {ePage} of {Math.ceil(eTotal / limit) || 1}</p>
                    <div className="flex gap-2">
                       <button onClick={() => setEPage(p => Math.max(1, p-1))} disabled={ePage === 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronLeft size={16}/></button>
                       <button onClick={() => setEPage(p => p + 1)} disabled={ePage * limit >= eTotal} className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronRight size={16}/></button>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Site Workforce" value={totalWorkers} subtitle="Active Personnel" icon={Users} colorClass="bg-orange-50 text-orange-600" />
            <StatCard title="Running Costs" value={`₹${calculatedExpenses.total.toLocaleString()}`} subtitle="Actual Outflow" icon={Wallet} colorClass="bg-emerald-50 text-emerald-600" />
            <StatCard title="Project Capital" value={finance ? `₹${finance.budget.toLocaleString()}` : "Pending Allocation"} badge={!finance ? "Attention" : ""} icon={IndianRupee} colorClass="bg-indigo-50 text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Allocation Panel */}
            <div className="lg:col-span-1 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              {!finance ? (
                <div className="h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2 text-[#f2711c]">
                    <Plus size={20} />
                    <h4 className="font-bold text-slate-800">Assign Site Budget</h4>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-6">Initialize the financial baseline for this project to start tracking expenditures.</p>
                  <form onSubmit={handleSetBudget} className="space-y-4">
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                       <input
                         type="number"
                         placeholder="e.g. 5,00,000"
                         value={budgetInput}
                         onChange={(e) => setBudgetInput(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f2711c] font-bold transition-all"
                       />
                    </div>
                    <button type="submit" className="w-full bg-[#f2711c] text-white font-bold py-3 rounded-lg shadow-sm hover:bg-[#d96215] transition-all">
                      Initialize Budget
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart size={20} className="text-[#f2711c]" />
                    <h4 className="font-bold text-slate-800">Budget Analytics</h4>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Capital</p>
                    <p className="text-2xl font-bold text-slate-800">₹{finance.budget.toLocaleString()}</p>
                  </div>
                  
                  <div className="mb-8">
                    <div className="flex justify-between items-center text-xs font-bold mb-2">
                       <span className="text-slate-400 uppercase tracking-widest">Utilization Rate</span>
                       <span className={((calculatedExpenses.total / finance.budget) * 100) > 85 ? 'text-red-500' : 'text-slate-800'}>
                         {Math.round((calculatedExpenses.total / finance.budget) * 100)}%
                       </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${((calculatedExpenses.total / finance.budget) * 100) > 85 ? 'bg-red-500' : 'bg-[#f2711c]'}`}
                        style={{ width: `${Math.min(100, Math.round((calculatedExpenses.total / finance.budget) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex justify-between items-center p-3.5 rounded-lg bg-orange-50/50 border border-orange-100/50">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Outflow</span>
                           <span className="text-sm text-slate-700 font-bold">Labor Wages</span>
                        </div>
                        <span className="font-bold text-slate-800">₹{calculatedExpenses.labour.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center p-3.5 rounded-lg bg-blue-50/50 border border-blue-100/50">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Outflow</span>
                           <span className="text-sm text-slate-700 font-bold">Eng. Salaries</span>
                        </div>
                        <span className="font-bold text-slate-800">₹{calculatedExpenses.engineer.toLocaleString()}</span>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Breakdown */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 bg-orange-50 text-orange-400 rounded-bl-xl">
                       <Users size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Labor Commitment</p>
                    <p className="text-3xl font-bold text-slate-800 mb-4">₹{calculatedExpenses.labour.toLocaleString()}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                       <span className="px-2 py-0.5 bg-slate-50 border rounded uppercase">Current Cycle</span>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 bg-blue-50 text-blue-400 rounded-bl-xl">
                       <HardHat size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Eng. Overhead</p>
                    <p className="text-3xl font-bold text-slate-800 mb-4">₹{calculatedExpenses.engineer.toLocaleString()}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                       <span className="px-2 py-0.5 bg-slate-50 border rounded uppercase">Monthly Allocation</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-800 p-8 rounded-xl shadow-lg relative overflow-hidden">
                 <div className="absolute -right-8 -bottom-8 opacity-10">
                    <Briefcase size={200} className="text-white" />
                 </div>
                 <div className="relative z-10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Portfolio-Wide Summary</p>
                    <div className="flex items-baseline gap-2 mb-4">
                       <span className="text-5xl font-bold text-white tracking-tight">₹{calculatedExpenses.total.toLocaleString()}</span>
                       <span className="text-slate-400 font-bold text-sm">TOTAL EXPENSE</span>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4">
                       <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Labor: {calculatedExpenses.total > 0 ? Math.round((calculatedExpenses.labour / calculatedExpenses.total) * 100) : 0}%</span>
                       </div>
                       <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Eng: {calculatedExpenses.total > 0 ? Math.round((calculatedExpenses.engineer / calculatedExpenses.total) * 100) : 0}%</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Refined Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={() => setShowEditModal(false)}></div>
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <Pencil size={18} className="text-slate-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800">Edit Records</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{itemType === 'worker' ? 'Labor Registry' : 'Engineering Roster'}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
             </div>
             
             <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Legal Full Name</label>
                  <input 
                    type="text" 
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Designation / Role</label>
                  <input 
                    type="text" 
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{itemType === 'worker' ? 'Daily Wage Rate (₹)' : 'Monthly Compensation (₹)'}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                    <input 
                      type="number" 
                      value={editFormData.pay}
                      onChange={(e) => setEditFormData({...editFormData, pay: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] transition-all" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                   <button 
                     type="button"
                     onClick={() => setShowEditModal(false)}
                     className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit" 
                     disabled={submitting}
                     className="flex-1 bg-[#f2711c] text-white font-bold py-3 rounded-lg shadow-sm hover:bg-[#d96215] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                   >
                     {submitting ? <Loader2 className="animate-spin" size={14}/> : 'Save Changes'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}