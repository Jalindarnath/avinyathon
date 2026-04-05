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
  Check
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
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-2xl">
                <FileText className="text-indigo-800" size={24} />
              </div>
              Site Invoices
            </h3>
            <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-tighter">
              Manage procurement records and payment statuses.
            </p>
          </div>
          {!isAdmin && (
            <button 
              onClick={() => showForm ? resetForm() : setShowForm(true)}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black transition-all shadow-xl active:scale-95 ${
                showForm ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white shadow-indigo-900/10 hover:bg-indigo-700'
              }`}
            >
              {showForm ? 'Cancel' : <><Plus size={18} /> New Invoice</>}
            </button>
          )}
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-900/5 mb-10 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-50/30">
               <h4 className="text-lg font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                 {editingId ? <Pencil size={18} /> : <Plus size={18} />} 
                 {editingId ? 'Edit Invoice' : 'Log Purchase Invoice'}
               </h4>
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{editingId ? 'Updating record' : 'New procurement'}</span>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Invoice Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="date" 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vendor / Supplier Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      name="vendorName"
                      placeholder="e.g. Agarwal Steels Pvt Ltd"
                      value={formData.vendorName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Quantity</label>
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
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Unit</label>
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none"
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
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">GST Number</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      name="gstNumber"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tax Amount (₹)</label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number" 
                        name="taxAmount"
                        placeholder="0.00"
                        step="0.01"
                        value={formData.taxAmount}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Status</label>
                    <select 
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Invoice Document (PDF/IMG)</label>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`cursor-pointer group flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all ${
                      selectedFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className={selectedFile ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'} size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-center">
                       {selectedFile ? selectedFile.name : (editingId ? 'Replace Existing Attachment' : 'Upload Real Invoice')}
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

              <div className="md:col-span-2 pt-4 border-t border-slate-50">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin text-white" size={18} />
                      {editingId ? 'Updating Transaction...' : 'Recording Transaction...'}
                    </>
                  ) : (
                    <>{editingId ? 'Apply Changes' : 'Log Invoice & Update Site History'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Procurement History</h4>
            <span className="text-xs font-bold text-slate-400">{invoices.length} Invoices Found</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Vendor</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Procurement</th>
                  <th className="px-6 py-5">Tax (₹)</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!selectedSite && !isAdmin ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-black uppercase tracking-widest">Select a Site to View Records</td></tr>
                ) : loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-black animate-pulse uppercase tracking-widest">Accessing Encrypted Records...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-black uppercase tracking-widest">No Invoices on File</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.$id} className="group hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-5">
                         <div className="font-bold text-slate-900 text-sm">
                           {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                         </div>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">By: {inv.manager} {isAdmin && !selectedSite && <span className="text-indigo-700">(@ {inv.siteId?.substring(0,8)})</span>}</div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="font-black text-slate-900 uppercase text-xs truncate max-w-[150px]">{inv.vendorName}</div>
                      </td>
                      <td className="px-6 py-5">
                         {(() => {
                           const status = STATUS_OPTIONS.find(s => s.value === (inv.status || 'pending'));
                           const Icon = status.icon;
                           return (
                             <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                               <Icon size={12} /> {status.label}
                             </span>
                           );
                         })()}
                      </td>
                      <td className="px-6 py-5">
                         <div className="font-bold text-slate-800 text-sm">{inv.quantity} <span className="text-[10px] font-black uppercase text-slate-400">{inv.unit}</span></div>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900 tracking-tighter">₹{inv.taxAmount?.toLocaleString() || '0'}</td>
                      <td className="px-6 py-5 text-right flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => handleEdit(inv)}
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm"
                         >
                           <Pencil size={16} />
                         </button>
                         <button 
                           onClick={() => handleDelete(inv.$id, inv.vendorName)}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm"
                         >
                           <Trash2 size={16} />
                         </button>
                         {inv.fileId && (
                           <a 
                             href={getFilePreview(inv.fileId)} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="p-2 text-indigo-400 hover:text-indigo-800 hover:bg-white rounded-xl transition-all shadow-sm"
                           >
                             <Eye size={16} />
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
