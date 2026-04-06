import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, X, Loader2, HardHat, ChevronLeft, ChevronRight, Briefcase, Wallet } from 'lucide-react';
import { addEngineer, getEngineersBySite, updateEngineer, deleteEngineer, getPaginatedEngineers } from '../../appwrite/services/engineer.service.js';
import { createPayment } from "../../appwrite/services/payment.service.js";
import { updateEngineerCost } from "../../appwrite/services/finance.service.js";
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';

export default function EngineeringStaff() {
  const { selectedSite } = useSite();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Use 'salary' for consistency but keep 'monthlySalary' just in case
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    salary: 75000,
  });
  
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingPay, setProcessingPay] = useState(null);

  const today = new Date();
  const isEndOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate();

  useEffect(() => {
    fetchEngineers();
  }, [selectedSite, page]);

  const fetchEngineers = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
         // Global view for admin
         const offset = (page - 1) * limit;
         const res = await getPaginatedEngineers(limit, offset);
         setEngineers(res.documents || []);
         setTotal(res.total);
      } else {
         if (!selectedSite) {
           setEngineers([]);
           setLoading(false);
           return;
         }
         const res = await getEngineersBySite(selectedSite.$id);
         setEngineers(res.documents || []);
         setTotal(res.documents.length);
      }
    } catch (err) {
      console.error("Failed to fetch engineers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (eng) => {
    setEditingId(eng.$id);
    setFormData({
      name: eng.name,
      role: eng.role || "",
      salary: eng.salary || eng.monthlySalary || 75000,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete engineer ${name}?`)) return;
    
    try {
      await deleteEngineer(id);
      await fetchEngineers();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete engineer.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSite) {
      alert("Please select a site first.");
      return;
    }
    
    setSubmitting(true);
    try {
      const engineerData = {
        name: formData.name,
        role: formData.role || null,
        // Send both to avoid breaking other parts of the app
        monthlySalary: Number(formData.salary),
        siteId: selectedSite.$id,
        manager: user?.name || "Admin",
      };

      if (editingId) {
        await updateEngineer(editingId, engineerData);
      } else {
        await addEngineer(engineerData);
      }
      
      handleCloseModal();
      await fetchEngineers();
    } catch (err) {
      console.error("Error saving engineer:", err);
      alert("Failed to save engineer. Check permissions in Appwrite Console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (eng) => {
    const amount = Number(eng.monthlySalary || eng.salary || 0);

    if (amount === 0) return;
    if (!window.confirm(`Issue monthly salary of ₹${amount} to ${eng.name}?`)) return;

    setProcessingPay(eng.$id);
    try {
      // 1. Create Payment record
      await createPayment({
        siteId: selectedSite.$id,
        personId: eng.$id,
        amount: amount,
        type: 'engineer',
        manager: user?.name,
      });

      // 2. Update Site Finance (Deduct from budget automatically)
      await updateEngineerCost(selectedSite.$id, amount);

      // 3. Reset Deductions for new month
      await updateEngineer(eng.$id, { 
        deductedAmt: 0
      });

      alert(`Success! ₹${amount} salary processed and deducted from site budget.`);
      await fetchEngineers();
    } catch (err) {
      console.error("Payout failed:", err);
      alert("Failed to process engineer payout.");
    } finally {
      setProcessingPay(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: "", role: "", monthlySalary: 75000 });
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Engineering Hub</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">
             {isAdmin ? 'Global Engineering Staff' : 'Site Engineers Roster'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
             {isAdmin ? `Managing ${total} professional leads and staff across all sites.` : 'Professional lead management and salary disbursement tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
           {!isAdmin && selectedSite && (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-[#f2711c] hover:bg-[#d96215] text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <UserPlus size={16} /> Add Engineer Staff
              </button>
           )}
           <div className="flex flex-col items-end px-4 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Operational Context</span>
              <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                 {isAdmin ? 'System Administration' : (selectedSite ? (selectedSite.siteName || selectedSite.name) : 'No Site Selected')}
              </span>
           </div>
        </div>
      </header>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
               <HardHat size={18} className="text-[#f2711c]" />
               <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Professional Roster</h4>
            </div>
            <div className="flex items-center gap-4">
               {isEndOfMonth && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#f2711c] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">
                     <Wallet size={12} />
                     <span>MONTH-END SALARY WINDOW</span>
                  </div>
               )}
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Leads: {total}</span>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100">
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                <th className="px-6 py-4">Specialist Details</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Monthly Basic</th>
                <th className="px-6 py-4">Assigned Manager</th>
                <th className="px-6 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-none">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Accessing Professional Records...</p>
                    </div>
                  </td>
                </tr>
              ) : engineers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-400 text-xs font-medium">
                    No staff records found in the current organizational filter.
                  </td>
                </tr>
              ) : (
                engineers.map((eng) => (
                  <tr key={eng.$id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f2711c] font-bold text-xs group-hover:scale-105 transition-transform">
                          {eng.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{eng.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">UID: {eng.$id.substring(0, 10)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">
                         {eng.role || 'Design Engineer'}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-xs font-bold text-slate-800">₹{(eng.salary || eng.monthlySalary || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{eng.manager || 'Unassigned'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        {!isAdmin && (
                          <button
                            onClick={() => handlePay(eng)}
                            disabled={!isEndOfMonth || processingPay === eng.$id}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
                              isEndOfMonth 
                                ? 'bg-slate-900 text-white shadow-sm border-slate-800 hover:bg-black' 
                                : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                          >
                            {processingPay === eng.$id ? <Loader2 size={12} className="animate-spin" /> : (isEndOfMonth ? 'Issue Salary' : 'Locked')}
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(eng)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                          title="Modify Information"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(eng.$id, eng.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Purge Profile"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination */}
        {isAdmin && total > limit && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Page Metrics: {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} registered leads
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-orange-800 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center px-4 text-xs font-bold text-slate-700">
                {page}
              </div>
              <button 
                onClick={() => setPage(prev => prev + 1)}
                disabled={page * limit >= total}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-orange-800 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modern Center Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <Briefcase size={18} className="text-slate-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Refactor Profile' : 'Assign Engineer'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Assignment</p>
                   </div>
                </div>
                <button 
                  onClick={handleCloseModal} 
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Legal Professional Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] transition-all text-slate-800"
                  placeholder="e.g. Elena Rodriguez" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Functional Specialty</label>
                <input 
                  type="text" 
                  name="role" 
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] transition-all text-slate-800"
                  placeholder="e.g. Lead Structural Designer" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Net Monthly Compensation (₹)</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                   <input 
                     type="number" 
                     name="salary" 
                     value={formData.salary}
                     onChange={handleChange}
                     required 
                     min="0"
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] transition-all text-slate-800"
                   />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   type="button"
                   onClick={handleCloseModal}
                   className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                 >
                   Discard Changes
                 </button>
                 <button 
                   type="submit" 
                   disabled={submitting}
                   className="flex-1 bg-[#f2711c] text-white font-bold py-3 rounded-lg shadow-sm hover:bg-[#d96215] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                 >
                   {submitting ? (
                     <Loader2 className="animate-spin" size={14} />
                   ) : (
                     <>{editingId ? 'Modify Staff' : 'Submit Entry'}</>
                   )}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}