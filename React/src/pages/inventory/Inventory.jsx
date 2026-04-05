import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  BoxSelect,
  Layers,
  Loader2,
  LogOut,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";
import {
  addInventory,
  getInventoryBySite,
} from "../../../appwrite/services/inventory.service";
import {
  updateMaterialExpense,
  deductMaterialExpense,
} from "../../../appwrite/services/finance.service";

// ─── Constants ────────────────────────────────────────────────────────────────
const MATERIAL_OPTIONS = [
  { value: "brick", label: "Brick", emoji: "🧱" },
  { value: "sand_valu", label: "Sand (Vaalu)", emoji: "🏖️" },
  { value: "gravel_gitti", label: "Gravel (Gitti)", emoji: "🪨" },
  { value: "tmt_steel", label: "TMT Steel", emoji: "🔩" },
  { value: "bamboo_balli", label: "Bamboo (Balli)", emoji: "🎋" },
  { value: "cement", label: "Cement", emoji: "🏗️" },
  { value: "binding_wire", label: "Binding Wire", emoji: "🪢" },
];

const UNIT_OPTIONS = [
  { value: "bags", label: "Bags" },
  { value: "cubic_feet", label: "Cubic Feet" },
  { value: "tonnes", label: "Tonnes" },
  { value: "pieces", label: "Pieces" },
  { value: "brass", label: "Brass" },
  { value: "kgs", label: "Kgs" }
];

const MATERIAL_COLORS = {
  brick: { bg: "bg-red-50", border: "border-red-100", text: "text-red-700", dot: "bg-red-500" },
  sand_valu: { bg: "bg-yellow-50", border: "border-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  gravel_gitti: { bg: "bg-stone-50", border: "border-stone-100", text: "text-stone-700", dot: "bg-stone-500" },
  tmt_steel: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  bamboo_balli: { bg: "bg-green-50", border: "border-green-100", text: "text-green-700", dot: "bg-green-500" },
  cement: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-500" },
  binding_wire: { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const getMaterialInfo = (value) =>
  MATERIAL_OPTIONS.find((m) => m.value === value) || { label: value, emoji: "📦" };

const getUnitLabel = (value) =>
  UNIT_OPTIONS.find((u) => u.value === value)?.label || value;

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
const Inventory = () => {
  const { selectedSite } = useSite();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Form state
  const [form, setForm] = useState({
    item: "",
    quantity: "",
    unit: "",
    price: "",
    supplier: "",
    type: "incoming", // incoming or outgoing
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Data
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch inventory on site change ──────────────────────────────────────────
  useEffect(() => {
    fetchInventory();
  }, [selectedSite]);

  const fetchInventory = async () => {
    if (!selectedSite) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getInventoryBySite(selectedSite.$id);
      // Sort by most recent
      const docs = (res.documents || []).sort(
        (a, b) => new Date(b.$createdAt) - new Date(a.$createdAt)
      );
      setEntries(docs);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Aggregate totals per material ───────────────────────────────────────────
  const materialTotals = MATERIAL_OPTIONS.map((mat) => {
    const relevant = entries.filter((e) => e.item === mat.value);
    const total = relevant.reduce((sum, e) => {
      const q = parseInt(e.quantity) || 0;
      return e.type === "outgoing" ? sum - q : sum + q;
    }, 0);
    // Derive a dominant unit (last entry's unit)
    const unit = relevant.length > 0 ? relevant[0].unit : null;
    return { ...mat, total, unit, count: relevant.length };
  });

  // ── Handle form change ──────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
    setSuccessMsg("");
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!selectedSite) {
      setFormError("Please select a site first.");
      return;
    }
    if (!form.item || !form.quantity || !form.unit) {
      setFormError("Material, Quantity, and Unit are required.");
      return;
    }
    if (isNaN(form.quantity) || parseInt(form.quantity) <= 0) {
      setFormError("Quantity must be a positive integer.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        siteId: selectedSite.$id,
        item: form.item,
        quantity: parseInt(form.quantity),
        type: form.type,
        unit: form.unit,
        price: form.price ? parseInt(form.price) : null,
        supplier: form.supplier.trim() || null,
        manager: user?.name || user?.user?.name || "Manager",
        last_updated: new Date().toISOString(),
      };
      await addInventory(payload);
      
      // Update SiteFinance expenses if price is provided
      if (payload.price) {
        if (payload.type === "outgoing") {
          await deductMaterialExpense(selectedSite.$id, payload.price);
        } else {
          await updateMaterialExpense(selectedSite.$id, payload.price);
        }
      }

      setSuccessMsg(`✓ ${getMaterialInfo(form.item).label} ${form.type === 'outgoing' ? 'return' : 'entry'} recorded successfully!`);
      setForm({ item: "", quantity: "", unit: "", price: "", supplier: "", type: "incoming" });
      await fetchInventory();
    } catch (err) {
      console.error("Inventory add failed:", err);
      setFormError("Failed to save entry: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">

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
                <span className="text-lg font-bold text-slate-800">Inventory Overview</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="h-10 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{isAdmin ? 'System Admin' : 'Site Manager'}</p>
              </div>
              <button 
                onClick={async () => { await logout(); window.location.href = '/login'; }}
                className="bg-white border border-slate-200 text-slate-800 hover:text-red-700 hover:bg-red-50 hover:border-red-100 text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2"
                title="Sign Out"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* ── Hero Section ────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Logistics & Supply</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Material Inventory Control
          </h2>
          <p className="text-slate-500 max-w-2xl text-sm font-medium">
            Monitor real-time stock levels, record material transfers, and track procurement costs across your construction projects.
          </p>
        </section>

        {!selectedSite ? (
          <div className="text-center py-28 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-300 font-bold uppercase tracking-widest text-sm">
            Select a project from the sidebar to manage site inventory
          </div>
        ) : (
          <>
            {/* ── Material Summary Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
              {materialTotals.map((mat) => {
                const colors = MATERIAL_COLORS[mat.value];
                return (
                  <div
                    key={mat.value}
                    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden transition-all hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                        <span className="text-xl">{mat.emoji}</span>
                      </div>
                      {mat.total > 0 && (
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      )}
                    </div>
                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{mat.label}</p>
                    <h3 className="text-xl font-bold text-slate-800 mt-0.5">{mat.total > 0 ? mat.total.toLocaleString() : "0"}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                      {mat.unit ? getUnitLabel(mat.unit) : "Units"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ── Main Content Grid  ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
              {/* ── Entry Form ──────────────────────────────────────────────── */}
              {!isAdmin && (
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className={`p-1.5 rounded-lg ${form.type === "outgoing" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>
                      {form.type === "outgoing" ? <TrendingUp size={16} className="rotate-180" /> : <Plus size={16} />}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                      {form.type === "outgoing" ? "Material Outflow" : "Material Inflow"}
                    </h3>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Type Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                      <button
                        type="button"
                        onClick={() => handleChange("type", "incoming")}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          form.type === "incoming" ? "bg-white text-orange-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Delivery (IN)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("type", "outgoing")}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          form.type === "outgoing" ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Transfer (OUT)
                      </button>
                    </div>

                    {/* Material */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                        Resource Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.item}
                        onChange={(e) => handleChange("item", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                      >
                        <option value="">Select Material...</option>
                        {MATERIAL_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.emoji} {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity & Unit — side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                          Metric Qty <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="0.00"
                          value={form.quantity}
                          onChange={(e) => handleChange("quantity", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                          Standard Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.unit}
                          onChange={(e) => handleChange("unit", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800"
                        >
                          <option value="">Unit...</option>
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Price & Supplier */}
                    <div className="grid grid-cols-1 gap-5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                          Financial Value (₹) <span className="text-slate-300 font-medium normal-case">Optional</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Procurement Cost"
                            value={form.price}
                            onChange={(e) => handleChange("price", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                          Supplier / Source <span className="text-slate-300 font-medium normal-case">Optional</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Vendor Name"
                          value={form.supplier}
                          onChange={(e) => handleChange("supplier", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] text-slate-800 transition-all"
                        />
                      </div>
                    </div>

                    {/* Feedback */}
                    {formError && (
                      <div className="text-[10px] font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                        <span>⚠️ {formError}</span>
                      </div>
                    )}
                    {successMsg && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                        <span>✅ {successMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#f2711c] text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-100 hover:bg-[#d96215] transition-all uppercase tracking-widest text-[10px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {form.type === "outgoing" ? <TrendingUp size={16} className="rotate-180" /> : <BoxSelect size={16} />}
                          {form.type === "outgoing" ? "Confirm Disbursement" : "Authorize Entry"}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Recent Entries Table ──────────────────────────────────────── */}
              <div className={`${isAdmin ? 'lg:col-span-5' : 'lg:col-span-3'} bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <ClipboardList size={18} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Transaction Ledger
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Records</span>
                </div>

                {loading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Retrieving ledger data...</p>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="text-4xl mb-3 opacity-20">📦</div>
                    <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                      No transactions found for this site
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        <tr>
                          <th className="px-6 py-4">Resource Identity</th>
                          <th className="px-6 py-4 text-right">Volume</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Vendor</th>
                          <th className="px-6 py-4 text-right">Valuation</th>
                          <th className="px-6 py-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {entries.map((entry) => {
                          const mat = getMaterialInfo(entry.item);
                          const colors = MATERIAL_COLORS[entry.item] || {
                            bg: "bg-slate-50",
                            text: "text-slate-600",
                          };
                          return (
                            <tr
                              key={entry.$id}
                              className="hover:bg-slate-50/50 transition-colors group"
                            >
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${colors.bg} ${colors.text} shadow-sm group-hover:scale-105 transition-transform`}>
                                    {mat.emoji}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{mat.label}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {entry.$id.substring(0, 8)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right font-bold text-slate-700 text-sm">
                                <div className="flex flex-col">
                                  <span className={entry.type === "outgoing" ? "text-red-600" : "text-emerald-600"}>
                                    {entry.type === "outgoing" ? "-" : "+"}
                                    {parseInt(entry.quantity).toLocaleString()}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">{getUnitLabel(entry.unit)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-tight border ${
                                  entry.type === "outgoing" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                }`}>
                                  {entry.type === "outgoing" ? "Disbursed" : "Inbound"}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase max-w-[120px] truncate">
                                {entry.supplier || (
                                  <span className="text-slate-300 font-normal">Internal Transfer</span>
                                )}
                              </td>
                              <td className="px-6 py-5 text-sm font-bold text-slate-800 text-right">
                                {entry.price
                                  ? `₹${parseInt(entry.price).toLocaleString()}`
                                  : <span className="text-slate-300 font-normal">N/A</span>}
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700">{formatDate(entry.$createdAt)}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">Recorded by {entry.manager?.split(' ')[0]}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Inventory;
