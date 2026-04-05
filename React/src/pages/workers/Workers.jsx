import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Users, X, Loader2, ChevronLeft, ChevronRight, Wallet, BadgeInfo, HardHat } from 'lucide-react';
import { addWorker, getWorkersBySite, updateWorker, deleteWorker, getPaginatedWorkers } from "../../../appwrite/services/worker.service.js";
import { createPayment } from "../../../appwrite/services/payment.service.js";
import { updateLaborCost } from "../../../appwrite/services/finance.service.js";
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";

const Workers = () => {
  const { selectedSite } = useSite();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    dailyWage: 700,
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingPay, setProcessingPay] = useState(null);

  const isWeekend = [0, 6].includes(new Date().getDay());

  useEffect(() => {
    fetchWorkers();
  }, [selectedSite, page]);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
         // Global view for admin
         const offset = (page - 1) * limit;
         const res = await getPaginatedWorkers(limit, offset);
         setWorkers(res.documents || []);
         setTotal(res.total);
      } else {
         if (!selectedSite) {
           setWorkers([]);
           setLoading(false);
           return;
         }
         const res = await getWorkersBySite(selectedSite.$id);
         setWorkers(res.documents || []);
         setTotal(res.documents.length);
      }
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (worker) => {
    setEditingId(worker.$id);
    setFormData({
      name: worker.name,
      role: worker.role || "",
      dailyWage: worker.dailyWage || 700,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete worker ${name}? Attendance data for this worker will also be unreachable.`)) return;
    
    try {
      await deleteWorker(id);
      await fetchWorkers();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete worker.");
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
      const workerData = {
        name: formData.name,
        role: formData.role,
        dailyWage: Number(formData.dailyWage),
        siteId: selectedSite.$id,
        manager: user?.name || "Admin",
      };

      if (editingId) {
        await updateWorker(editingId, workerData);
      } else {
        // Only set presentDays for new workers
        workerData.presentDays = "0";
        await addWorker(workerData);
      }
      
      handleCloseModal();
      await fetchWorkers();
    } catch (err) {
      console.error("Error saving worker:", err);
      alert("Failed to save worker. Check permissions in Appwrite Console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (worker) => {
    const pdays = parseInt(worker.presentDays || "0", 10);
    const amount = pdays * (worker.dailyWage || 0);

    if (amount === 0) return;
    if (!window.confirm(`Issue payout of ₹${amount} to ${worker.name}?`)) return;

    setProcessingPay(worker.$id);
    try {
      // 1. Create Payment record
      await createPayment({
        siteId: selectedSite.$id,
        personId: worker.$id,
        amount: amount,
        type: 'labour',
        manager: user?.name,
      });

      // 2. Update Site Finance (Deduct from budget automatically)
      await updateLaborCost(selectedSite.$id, amount);

      // 3. Reset Worker Days
      await updateWorker(worker.$id, { 
        presentDays: "0",
        //Assume deductions should also be cleared (restart the week)
        deductedAmt: 0
      });

      alert(`Success! ₹${amount} has been deducted from site budget and worker records reset.`);
      await fetchWorkers();
    } catch (err) {
      console.error("Payout failed:", err);
      alert("Failed to process payout.");
    } finally {
      setProcessingPay(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: "", role: "", dailyWage: 700 });
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Workforce Management</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">
             {isAdmin ? 'Global Laborers Directory' : 'Site Laborers Directory'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
             {isAdmin ? `Managing ${total} personnel across all organizational sites.` : 'Operational records and attendance tracking for your site.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
           {!isAdmin && selectedSite && (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-[#f2711c] hover:bg-[#d96215] text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <UserPlus size={16} /> Register Laborer
              </button>
           )}
           <div className="flex flex-col items-end px-4 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Current Context</span>
              <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                 {isAdmin ? 'Global Administration' : (selectedSite ? (selectedSite.siteName || selectedSite.name) : 'No Site Selected')}
              </span>
           </div>
        </div>
      </header>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
               <Users size={18} className="text-[#f2711c]" />
               <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Workforce Registry</h4>
            </div>
            <div className="flex items-center gap-4">
               {isWeekend && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                     <Wallet size={12} />
                     <span>PAYOUT WINDOW OPEN</span>
                  </div>
               )}
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {total} Entries</span>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100">
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                <th className="px-6 py-4">Personnel Details</th>
                <th className="px-6 py-4">Trade / Area</th>
                <th className="px-6 py-4">Attendance</th>
                <th className="px-6 py-4">Daily Rate</th>
                <th className="px-6 py-4">Assigned Manager</th>
                <th className="px-6 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-none">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest tracking-widest">Synchronizing Labor Records...</p>
                    </div>
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-400 text-xs font-medium">
                    No laborers detected for this environment. Initialize records to begin tracking.
                  </td>
                </tr>
              ) : (
                workers.map((person) => (
                  <tr key={person.$id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f2711c] font-bold text-xs group-hover:scale-105 transition-transform">
                          {person.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{person.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">UID: {person.$id.substring(0, 10)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">
                         {person.role || 'Unspecified'}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${Number(person.presentDays) > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <span className="text-xs font-bold text-slate-700">{person.presentDays || '0'} Days Present</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-xs font-bold text-slate-800">₹{person.dailyWage.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{person.manager || 'Unassigned'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        {!isAdmin && (
                          <button
                            onClick={() => handlePay(person)}
                            disabled={!isWeekend || parseInt(person.presentDays) === 0 || processingPay === person.$id}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
                              isWeekend && parseInt(person.presentDays) > 0 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white' 
                                : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                          >
                            {processingPay === person.$id ? <Loader2 size={12} className="animate-spin" /> : (isWeekend ? 'Cash Out' : 'Wait: Sun')}
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(person)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit Personal Info"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(person.$id, person.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Purge Record"
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

        {/* Improved Pagination Controls */}
        {isAdmin && total > limit && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} personnel
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
                Page {page}
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

      {/* Modern Centered Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <UserPlus size={18} className="text-slate-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Modify Laborer' : 'Register Laborer'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workforce Protocol</p>
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
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Legal Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] transition-all text-slate-800"
                  placeholder="e.g. Ramesh Kumar" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Designated Trade</label>
                <input 
                  type="text" 
                  name="role" 
                  value={formData.role}
                  onChange={handleChange}
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] transition-all text-slate-800"
                  placeholder="e.g. Mason Lead, Skilled Helper" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Standard Daily Rate (₹)</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-bold">₹</span>
                   <input 
                     type="number" 
                     name="dailyWage" 
                     value={formData.dailyWage}
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
                   Discard
                 </button>
                 <button 
                   type="submit" 
                   disabled={submitting}
                   className="flex-1 bg-[#f2711c] text-white font-bold py-3 rounded-lg shadow-sm hover:bg-[#d96215] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                 >
                   {submitting ? (
                     <Loader2 className="animate-spin" size={14} />
                   ) : (
                     <>{editingId ? 'Update Record' : 'Create Record'}</>
                   )}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;