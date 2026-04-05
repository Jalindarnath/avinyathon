import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  BoxSelect,
  Layers,
  Loader2,
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
  const { user } = useAuth();
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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-2xl">
                <Package className="text-orange-800" size={24} />
              </div>
              Inventory
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Track incoming materials and monitor stock levels for your site.
            </p>
          </div>
          {selectedSite && (
            <span className="text-orange-700 bg-orange-50 border border-orange-100 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider">
              {selectedSite.siteName || selectedSite.name}
            </span>
          )}
        </div>

        {!selectedSite ? (
          <div className="text-center py-28 text-slate-300 font-black uppercase tracking-widest text-sm">
            Select a site from the sidebar to manage inventory
          </div>
        ) : (
          <>
            {/* ── Material Summary Cards ─────────────────────────────────────── */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                <TrendingUp size={12} /> Current Material Stock
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {materialTotals.map((mat) => {
                  const colors = MATERIAL_COLORS[mat.value];
                  return (
                    <div
                      key={mat.value}
                      className={`${colors.bg} border ${colors.border} rounded-2xl p-4 flex flex-col gap-2 transition-all hover:shadow-md`}
                    >
                      <div className="text-2xl">{mat.emoji}</div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>
                          {mat.label}
                        </p>
                        <p className="text-2xl font-black text-slate-900 leading-tight mt-1">
                          {mat.total > 0 ? mat.total.toLocaleString() : "—"}
                        </p>
                        {mat.unit && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            {getUnitLabel(mat.unit)}
                          </p>
                        )}
                      </div>
                      <div className={`w-full h-1 rounded-full mt-auto ${mat.total > 0 ? colors.dot : "bg-slate-200"}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Main Content Grid  ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
              {/* ── Entry Form ──────────────────────────────────────────────── */}
              {!isAdmin && (
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <h3 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Plus size={20} className={form.type === "outgoing" ? "text-red-700" : "text-orange-700"} />
                  {form.type === "outgoing" ? "Send Material Back" : "Record Incoming Material"}
                </h3>
                <p className="text-xs font-medium text-slate-400 mb-8">
                  {form.type === "outgoing" ? "Log materials leaving the site" : "Log materials entering the site"}
                </p>

                {/* Type Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                  <button
                    type="button"
                    onClick={() => handleChange("type", "incoming")}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      form.type === "incoming" ? "bg-white text-orange-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Delivery (In)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("type", "outgoing")}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      form.type === "outgoing" ? "bg-white text-red-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Send Back (Out)
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Material */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                      Material <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.item}
                      onChange={(e) => handleChange("item", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800"
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 500"
                        value={form.quantity}
                        onChange={(e) => handleChange("quantity", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.unit}
                        onChange={(e) => handleChange("unit", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800"
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

                  {/* Price */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                      Price (₹) <span className="text-slate-300 font-medium normal-case">Optional</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 12000"
                      value={form.price}
                      onChange={(e) => handleChange("price", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                      Supplier <span className="text-slate-300 font-medium normal-case">Optional</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shri Ram Traders"
                      value={form.supplier}
                      onChange={(e) => handleChange("supplier", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800"
                    />
                  </div>

                  {/* Manager (read-only display) */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                      Recorded By
                    </label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed">
                      {user?.name || user?.user?.name || "Manager"}
                    </div>
                  </div>

                  {/* Feedback */}
                  {formError && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 px-4 py-3 rounded-2xl border border-red-100">
                      ⚠️ {formError}
                    </p>
                  )}
                  {successMsg && (
                    <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100">
                      {successMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-900/10 hover:bg-orange-950 transition-all uppercase tracking-widest text-xs active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {form.type === "outgoing" ? <TrendingUp size={14} className="rotate-180" /> : <BoxSelect size={14} />}
                        {form.type === "outgoing" ? "Confirm Return" : "Record Entry"}
                      </>
                    )}
                  </button>
                </form>
                </div>
              )}

              {/* ── Recent Entries Table ──────────────────────────────────────── */}
              <div className={`${isAdmin ? 'lg:col-span-5' : 'lg:col-span-3'} bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden`}>
                <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                  <ClipboardList size={18} className="text-slate-400" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      Recent Transactions
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      Latest material movements at site
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">
                    Loading entries...
                  </div>
                ) : entries.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="text-slate-300 font-black uppercase tracking-widest text-xs">
                      No entries recorded yet
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                        <tr>
                          <th className="px-6 py-4">Material</th>
                          <th className="px-6 py-4 text-right">Qty</th>
                          <th className="px-6 py-4">Unit</th>
                          <th className="px-6 py-4">Supplier</th>
                          <th className="px-6 py-4 text-right">Price (₹)</th>
                          <th className="px-6 py-4">Date</th>
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
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-black px-2.5 py-1 rounded-xl ${colors.bg} ${colors.text}`}
                                  >
                                    {mat.emoji} {mat.label}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                                <span className={entry.type === "outgoing" ? "text-red-600" : ""}>
                                  {entry.type === "outgoing" ? "-" : "+"}
                                  {parseInt(entry.quantity).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                                {getUnitLabel(entry.unit)}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-600 max-w-[120px] truncate">
                                {entry.supplier || (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-700 text-right">
                                {entry.price
                                  ? `₹${parseInt(entry.price).toLocaleString()}`
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-6 py-4 text-[10px] font-bold text-slate-400">
                                {formatDate(entry.$createdAt)}
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
