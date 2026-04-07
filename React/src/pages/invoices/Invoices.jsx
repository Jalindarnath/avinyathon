import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Plus, 
  Loader2, 
  Calendar, 
  User, 
  Building2, 
  Hash, 
  Scale, 
  Percent, 
  CheckCircle,
  Eye,
  FileDown,
  Pencil,
  Trash2,
  X,
  Clock,
  Check,
  LogOut
} from "lucide-react";
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";
import { 
  addInvoice, 
  getInvoicesBySite, 
  uploadInvoiceFile, 
  getFilePreview,
  updateInvoice,
  deleteInvoice,
  getAllInvoices
} from "../../../appwrite/services/invoice.services";

const UNIT_OPTIONS = [
  { value: "bags", label: "Bags" },
  { value: "cubic_feet", label: "Cubic Feet" },
  { value: "tonnes", label: "Tonnes" },
  { value: "pieces", label: "Pieces" },
  { value: "brass", label: "Brass" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-orange-600 bg-orange-50 border-orange-100" },
  { value: "success", label: "Success", icon: Check, color: "text-emerald-600 bg-emerald-50 border-emerald-100" }
];

export default function Invoices() {
  const { selectedSite } = useSite();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // File upload states
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendorName: "",
    gstNumber: "",
    quantity: "",
    unit: "bags",
    taxAmount: "",
    status: "pending",
  });

  useEffect(() => {
    fetchInvoices();
  }, [selectedSite]);

  const fetchInvoices = async () => {
    if (!selectedSite && !isAdmin) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = isAdmin && !selectedSite ? await getAllInvoices() : await getInvoicesBySite(selectedSite.$id);
      const sorted = (res.documents || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setInvoices(sorted);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEdit = (inv) => {
    setEditingId(inv.$id);
    setFormData({
      date: new Date(inv.date).toISOString().split('T')[0],
      vendorName: inv.vendorName,
      gstNumber: inv.gstNumber,
      quantity: inv.quantity.toString(),
      unit: inv.unit,
      taxAmount: inv.taxAmount?.toString() || "",
      status: inv.status || "pending",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, vendor) => {
    if (!window.confirm(`Delete invoice from ${vendor}? This cannot be undone.`)) return;
    try {
      await deleteInvoice(id);
      await fetchInvoices();
    } catch (err) {
      alert("Failed to delete invoice.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSite) return;

    setSubmitting(true);
    try {
      let fileId = editingId ? (invoices.find(i => i.$id === editingId)?.fileId) : null;
      
      if (selectedFile) {
        const fileRes = await uploadInvoiceFile(selectedFile);
        fileId = fileRes.$id;
      }

      const invoiceData = {
        date: new Date(formData.date).toISOString(),
        manager: user?.name || "Unassigned",
        siteId: selectedSite.$id,
        vendorName: formData.vendorName,
        gstNumber: formData.gstNumber,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        taxAmount: parseFloat(formData.taxAmount) || 0,
        status: formData.status,
        fileId: fileId 
      };

      if (editingId) {
        await updateInvoice(editingId, invoiceData);
      } else {
        await addInvoice(invoiceData);
      }
      
      resetForm();
      await fetchInvoices();
      alert(`Invoice ${editingId ? 'updated' : 'recorded'} successfully!`);
      
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to save invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      vendorName: "",
      gstNumber: "",
      quantity: "",
      unit: "bags",
      taxAmount: "",
      status: "pending",
    });
    setSelectedFile(null);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* ── Header ──────────────────────────────────────────────────────────── */}
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
                <span className="text-lg font-bold text-slate-800">Global Invoice Records</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
             {!isAdmin && (
              <button 
                onClick={() => showForm ? resetForm() : setShowForm(true)}
                className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                  showForm ? 'bg-slate-200 text-slate-600' : 'bg-[#f2711c] text-white hover:bg-[#d96215]'
                }`}
              >
                {showForm ? 'Cancel Operation' : <><Plus size={14} /> Log Purchase Invoice</>}
              </button>
            )}
            <div className="h-10 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{isAdmin ? 'System Admin' : 'Site Manager'}</p>
              </div>

            </div>
          </div>
        </header>

        {/* ── Hero Section ────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Finance & Compliance</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Procurement & Invoices
          </h2>
          <p className="text-slate-500 max-w-2xl text-sm font-medium">
            Register vendor invoices, track GST compliance, and manage payment statuses for all site-related material purchases.
          </p>
        </section>

        {/* ── Form Section ────────────────────────────────────────────────────── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-10 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${editingId ? "bg-amber-50 text-amber-600" : "bg-orange-50 text-orange-600"}`}>
                   {editingId ? <Pencil size={16} /> : <Plus size={16} />} 
                 </div>
                 <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                   {editingId ? 'Modify Existing Invoice' : 'New Procurement Record'}
                 </h4>
               </div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingId ? 'Transaction Edit' : 'Digital Log'}</span>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Transaction Date <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="date" 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Vendor Designation <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      name="vendorName"
                      placeholder="e.g. Agarwal Steels Pvt Ltd"
                      value={formData.vendorName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Metric Qty <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number" 
                        name="quantity"
                        placeholder="0.00"
                        step="0.01"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Standard Unit <span className="text-red-500">*</span></label>
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800 appearance-none"
                    >
                      {UNIT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">GST Identification <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      name="gstNumber"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Financial Valuation (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input 
                        type="number" 
                        name="taxAmount"
                        placeholder="0.00"
                        step="0.01"
                        value={formData.taxAmount}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Verification Status</label>
                    <select 
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800 appearance-none"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Invoice Evidence (PDF/Image)</label>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`cursor-pointer group flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all ${
                      selectedFile ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-400 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className={selectedFile ? 'text-[#f2711c]' : 'text-slate-400 group-hover:text-orange-500'} size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-center text-slate-500">
                       {selectedFile ? selectedFile.name : (editingId ? 'Update Attached Document' : 'Click to Upload Digital Copy')}
                    </span>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      onChange={handleFileChange}
                      className="hidden" 
                      accept="image/*,application/pdf"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-10 bg-[#f2711c] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-100 hover:bg-[#d96215] transition-all uppercase tracking-widest text-[10px] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin text-white" size={16} />
                      {editingId ? 'Updating Record...' : 'Authorized Log...'}
                    </>
                  ) : (
                    <>{editingId ? 'Confirm Updates' : 'Authorize Transaction'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Records Table ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                Procurement Ledger
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{invoices.length} Verified Records Found</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                <tr>
                  <th className="px-8 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Vendor Entity</th>
                  <th className="px-6 py-4">Compliance</th>
                  <th className="px-6 py-4 text-right">Volume</th>
                  <th className="px-6 py-4 text-right">Valuation</th>
                  <th className="px-8 py-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!selectedSite && !isAdmin ? (
                  <tr><td colSpan="6" className="px-8 py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Select a Workspace to Access Records</td></tr>
                ) : loading ? (
                  <tr><td colSpan="6" className="px-8 py-16 text-center flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Decrypting ledger data...</p>
                  </td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan="6" className="px-8 py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No Procurement Logs Found</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.$id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                         <div className="font-bold text-slate-800 text-sm">
                           {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Auth By: {inv.manager} {isAdmin && !selectedSite && <span className="text-orange-700">(@ {inv.siteId?.substring(0,8)})</span>}</div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="font-bold text-slate-800 uppercase text-xs truncate max-w-[180px]">{inv.vendorName}</div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">GSTIN: {inv.gstNumber}</div>
                      </td>
                      <td className="px-6 py-5">
                         {(() => {
                           const status = STATUS_OPTIONS.find(s => s.value === (inv.status || 'pending'));
                           const Icon = status.icon;
                           return (
                             <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tight border ${status.color}`}>
                               <Icon size={10} /> {status.label}
                             </span>
                           );
                         })()}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-slate-700 text-sm">
                         {inv.quantity} <span className="text-[9px] font-bold uppercase text-slate-400">{inv.unit}</span>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-800 text-right tracking-tight">₹{inv.taxAmount?.toLocaleString() || '0.00'}</td>
                      <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                         <button 
                           onClick={() => handleEdit(inv)}
                           className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-lg transition-all shadow-sm"
                           title="Edit Record"
                         >
                           <Pencil size={15} />
                         </button>
                         <button 
                           onClick={() => handleDelete(inv.$id, inv.vendorName)}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm"
                           title="Delete Record"
                         >
                           <Trash2 size={15} />
                         </button>
                         {inv.fileId && (
                           <a 
                             href={getFilePreview(inv.fileId)} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="p-2 text-slate-400 hover:text-[#f2711c] hover:bg-white rounded-lg transition-all shadow-sm"
                             title="View Document"
                           >
                             <Eye size={15} />
                           </a>
                         )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
