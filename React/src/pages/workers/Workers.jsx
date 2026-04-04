import { useState, useEffect } from "react";
import { UserPlus, Pencil, Trash2, Users, X, Loader2 } from 'lucide-react';
import { addWorker, getWorkersBySite, updateWorker, deleteWorker } from "../../../appwrite/services/worker.service.js";
import { createPayment } from "../../../appwrite/services/payment.service.js";
import { updateLaborCost } from "../../../appwrite/services/finance.service.js";
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";

const Workers = () => {
  const { selectedSite } = useSite();
  const { user } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
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
  }, [selectedSite]);

  const fetchWorkers = async () => {
    if (!selectedSite) {
      setWorkers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getWorkersBySite(selectedSite.$id);
      setWorkers(res.documents || []);
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
        // Do we reset deductions too? User said set payment and days to zero.
        // Assuming deductions should also be cleared (restart the week)
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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
        {/* Header & Site Selector */}
        <div className="p-8">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-2xl">
                   <Users className="text-orange-800" size={24} />
                </div>
                Laborers Directory
              </h3>
              <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-tighter">Maintain records for your site workforce.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                {selectedSite ? (selectedSite.siteName || selectedSite.name || 'Unnamed Site') : 'No Site Selected'}
              </div>
              {selectedSite && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="bg-orange-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black shadow-xl shadow-orange-900/10 hover:bg-orange-950 transition-all active:scale-95"
                >
                  <UserPlus size={18} /> Register Laborer
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-50">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-5">Personnel</th>
                  <th className="px-6 py-5">Role/Trade</th>
                  <th className="px-6 py-5">Attendance</th>
                  <th className="px-6 py-5">Daily (₹)</th>
                  <th className="px-6 py-5">Manager</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-black animate-pulse">Synchronizing Site Records...</td></tr>
                ) : workers.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-black uppercase tracking-widest">No Laborers found for this site.</td></tr>
                ) : (
                  workers.map((person) => (
                    <tr key={person.$id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-800 font-black text-xs shadow-sm">
                            {person.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{person.name}</p>
                            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{person.$id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-xs font-black text-slate-500 uppercase px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                           {person.role}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-orange-800">
                        {person.presentDays || '0'} Days
                      </td>
                      <td className="px-6 py-5 text-sm text-emerald-700 font-black">₹{person.dailyWage}</td>
                      <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{person.manager || 'Unassigned'}</td>
                      <td className="px-6 py-5 text-right flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePay(person)}
                          disabled={!isWeekend || parseInt(person.presentDays) === 0 || processingPay === person.$id}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            isWeekend && parseInt(person.presentDays) > 0 
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-700' 
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {processingPay === person.$id ? '...' : (isWeekend ? 'Cash Out' : 'Weekend Only')}
                        </button>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEdit(person)}
                            className="p-2 text-slate-400 hover:text-orange-800 hover:bg-orange-50 rounded-xl transition-all"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(person.$id, person.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Container */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center p-8 border-b border-slate-50">
              <h3 className="text-2xl font-black text-slate-900">{editingId ? 'Modify Laborer' : 'Add New Laborer'}</h3>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Worker Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-slate-900"
                  placeholder="e.g. Ramesh Kumar" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Trade / Role</label>
                <input 
                  type="text" 
                  name="role" 
                  value={formData.role}
                  onChange={handleChange}
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-slate-900"
                  placeholder="e.g. Mason, Helper, Painter" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Daily Wage (₹)</label>
                <input 
                  type="number" 
                  name="dailyWage" 
                  value={formData.dailyWage}
                  onChange={handleChange}
                  required 
                  min="0"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-slate-900"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-orange-800 text-white font-black py-5 px-6 rounded-2xl shadow-xl shadow-orange-900/10 hover:bg-orange-950 disabled:opacity-70 transition-all uppercase tracking-widest text-xs active:scale-95 flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving Records...
                    </>
                  ) : (
                    <>{editingId ? 'Commit Changes' : 'Register Laborer'}</>
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