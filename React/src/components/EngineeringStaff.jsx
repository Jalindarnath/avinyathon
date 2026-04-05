import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { addEngineer, getEngineersBySite, updateEngineer, deleteEngineer } from '../../appwrite/services/engineer.service.js';
import { createPayment } from "../../appwrite/services/payment.service.js";
import { updateEngineerCost } from "../../appwrite/services/finance.service.js";
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';

export default function EngineeringStaff() {
  const { selectedSite } = useSite();
  const { user } = useAuth();
  
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
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
  }, [selectedSite]);

  const fetchEngineers = async () => {
    if (!selectedSite) {
      setEngineers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getEngineersBySite(selectedSite.$id);
      setEngineers(res.documents || []);
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
      monthlySalary: eng.monthlySalary || eng.monthlySalary || 75000,
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
        monthlySalary: Number(formData.monthlySalary),
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
    const amount = Number(eng.monthlySalary || 0);

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
    setFormData({ name: "", role: "", salary: 75000 });
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-3xl font-black text-slate-900">Engineering Staff</h3>
              <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-tighter">Professional leads and contractors.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                {selectedSite ? (selectedSite.siteName || selectedSite.name || 'Unnamed Site') : 'No Site Selected'}
              </div>
              {selectedSite && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="bg-orange-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black hover:bg-orange-950 transition-all shadow-xl shadow-orange-900/10 active:scale-95"
                >
                  <UserPlus size={18} /> Add Engineer
                </button>
              )}
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-5">Engineer</th>
                <th className="px-6 py-5">Role</th>
                <th className="px-6 py-5">Monthly Salary</th>
                <th className="px-6 py-5">Manager</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-black animate-pulse">Loading personnel data...</td></tr>
              ) : engineers.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-black uppercase tracking-widest">No staff recorded for this site.</td></tr>
              ) : (
                engineers.map((eng) => (
                  <tr key={eng.$id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-800 font-black text-xs shadow-sm">
                        {eng.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{eng.name}</p>
                        <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{eng.$id.substring(0, 8)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                      {eng.role || 'Professional'}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-900 font-black">₹{(eng.salary || eng.monthlySalary || 0).toLocaleString()}</td>
                    <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{eng.manager || 'Unassigned'}</td>
                    <td className="px-6 py-5 text-right flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePay(eng)}
                        disabled={!isEndOfMonth || processingPay === eng.$id}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                          isEndOfMonth 
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-black' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        {processingPay === eng.$id ? '...' : (isEndOfMonth ? 'Pay Salary' : 'Month End')}
                      </button>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(eng)}
                          className="p-2 text-slate-400 hover:text-orange-800 hover:bg-orange-50 rounded-xl transition-all"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(eng.$id, eng.name)}
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

      {/* Reusable Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center p-8 border-b border-slate-50">
              <h3 className="text-2xl font-black text-slate-900">{editingId ? 'Update Engineer' : 'New Engineer'}</h3>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Professional Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                  placeholder="e.g. Elena Rodriguez" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Job Title / Specialty</label>
                <input 
                  type="text" 
                  name="role" 
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                  placeholder="e.g. Project Lead, QA Specialist" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Monthly Salary (₹)</label>
                <input 
                  type="number" 
                  name="salary" 
                  value={formData.salary}
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
                    <>{editingId ? 'Update Engineer' : 'Register Engineer'}</>
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