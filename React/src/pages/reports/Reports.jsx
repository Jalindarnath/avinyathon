import { useState, useEffect } from "react";
import {
  BarChart3,
  Wallet,
  Users,
  HardHat,
  CalendarCheck,
  Package,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ShieldCheck,
  PieChart,
} from "lucide-react";
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";
import { getFinanceBySite } from "../../../appwrite/services/finance.service";
import { getWorkersBySite } from "../../../appwrite/services/worker.service";
import { getEngineersBySite } from "../../../appwrite/services/engineer.service";
import { getAttendanceBySite } from "../../../appwrite/services/attendance.service";
import { getInventoryBySite } from "../../../appwrite/services/inventory.service";
import { getInvoicesBySite } from "../../../appwrite/services/invoice.services";

//material low value constant
const LOW_STOCK_THRESHOLDS = {
    brick: 2000,          // Approx. 1 small trolley load
    sand_valu: 100,       // 100 Cubic Feet (1 Brass)
    gravel_gitti: 100,    // 100 Cubic Feet (1 Brass)
    cement: 25,           // 25 Bags (Enough for minor masonry/plaster)
    tmt_steel: 500,       // 500 kg (Half a tonne)
    bamboo_balli: 50,     // 50 pieces (Safety for local repairs)
    binding_wire: 5       // 5 kg (1 small coil)
};
// ─── Constants ─────────────────────────────────────────────────────────────────
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
  { value: "kgs", label: "Kgs" },
];

// Average threshold across all materials — used for severity grading
const thresholdValues = Object.values(LOW_STOCK_THRESHOLDS);
const AVG_THRESHOLD = Math.round(thresholdValues.reduce((s, v) => s + v, 0) / thresholdValues.length);

/**
 * Returns a severity level & message for a material based on
 * how its current stock compares to its LOW_STOCK_THRESHOLD.
 *
 * Levels (compared to the material's own threshold):
 *   - critical  : qty = 0  OR  qty < 25% of threshold
 *   - low       : qty < 50% of threshold
 *   - moderate  : qty < threshold  (but >= 50%)
 *   - ok        : qty >= threshold
 */
const getStockStatus = (materialKey, currentQty) => {
  const threshold = LOW_STOCK_THRESHOLDS[materialKey] ?? AVG_THRESHOLD;
  if (currentQty === 0) {
    return { severity: "critical", message: `Out of stock — need ${threshold}+ immediately`, threshold };
  }
  const pct = currentQty / threshold;
  if (pct < 0.25) {
    return { severity: "critical", message: `Critical — only ${Math.round(pct * 100)}% of required ${threshold}`, threshold };
  }
  if (pct < 0.5) {
    return { severity: "low", message: `Low stock — at ${Math.round(pct * 100)}% of min. ${threshold}`, threshold };
  }
  if (pct < 1) {
    return { severity: "moderate", message: `Below recommended ${threshold} — restock soon`, threshold };
  }
  return { severity: "ok", message: `Sufficient stock (min. ${threshold})`, threshold };
};

const getUnitLabel = (value) =>
  UNIT_OPTIONS.find((u) => u.value === value)?.label || value;

// ─── Mini-component: Animated counter-style number ─────────────────────────────
const AnimatedValue = ({ children, className = "" }) => (
  <span className={`inline-block transition-all duration-700 ease-out ${className}`}>
    {children}
  </span>
);

// ─── Mini-component: Section header ────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, iconBg = "bg-slate-100", iconColor = "text-slate-600" }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`p-2.5 rounded-2xl ${iconBg}`}>
      <Icon className={iconColor} size={20} />
    </div>
    <div>
      <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const { selectedSite } = useSite();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [finance, setFinance] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (selectedSite) {
      fetchAllData();
    } else {
      resetAll();
    }
  }, [selectedSite]);

  const resetAll = () => {
    setFinance(null);
    setWorkers([]);
    setEngineers([]);
    setAttendance([]);
    setInventory([]);
    setInvoices([]);
    setLoading(false);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [finRes, workersRes, engineersRes, attendanceRes, inventoryRes, invoicesRes] =
        await Promise.all([
          getFinanceBySite(selectedSite.$id),
          getWorkersBySite(selectedSite.$id),
          getEngineersBySite(selectedSite.$id),
          getAttendanceBySite(selectedSite.$id),
          getInventoryBySite(selectedSite.$id),
          getInvoicesBySite(selectedSite.$id),
        ]);

      setFinance(finRes || null);
      setWorkers(workersRes?.documents || []);
      setEngineers(engineersRes?.documents || []);
      setAttendance(attendanceRes?.documents || []);
      setInventory(inventoryRes?.documents || []);
      setInvoices(invoicesRes?.documents || []);
    } catch (err) {
      console.error("Report data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Computed values ─────────────────────────────────────────────────────────

  // Budget & Finance
  const totalBudget = finance?.budget || 0;
  const totalExpenses = finance?.expenses || 0;
  const remainingBudget = finance?.remainingBudget || 0;
  const labourCost = finance?.labourcost || 0;
  const engineerCost = finance?.engineerCost || 0;
  const materialCost = finance?.materialCost || 0;
  const budgetUtilPct = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  // Workers & Engineers
  const workerCount = workers.length;
  const engineerCount = engineers.length;
  const totalPersonnel = workerCount + engineerCount;

  // Attendance — compute average attendance rate for engineers
  // Attendance — compute average attendance rate for engineers
  const engineerAttendanceRecords = attendance.filter(
    (a) => a.type === "engineer" && a.status === "present"
  );
  const totalEngineerAttendanceDays = attendance.filter(
    (a) => a.type === "engineer"
  ).length;
  const avgEngineerAttendancePct =
    totalEngineerAttendanceDays > 0
      ? Math.round((engineerAttendanceRecords.length / totalEngineerAttendanceDays) * 100)
      : 0;

  // Worker attendance
  const labourAttendancePresent = attendance.filter(
    (a) => a.type === "labour" && a.status === "present"
  ).length;
  const totalLabourAttendanceDays = attendance.filter(
    (a) => a.type === "labour"
  ).length;
  const avgLabourAttendancePct =
    totalLabourAttendanceDays > 0
      ? Math.round((labourAttendancePresent / totalLabourAttendanceDays) * 100)
      : 0;

  // Overall attendance
  const totalPresent = attendance.filter((a) => a.status === "present").length;
  const totalAttendanceRecords = attendance.length;
  const avgOverallAttendancePct =
    totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;

  // Personnel specific stats for breakdown
  const personnelWithStats = [...engineers, ...workers].map(p => {
    const typeKey = engineers.find(e => e.$id === p.$id) ? 'engineer' : 'labour';
    const pDays = attendance.filter(a => a.personId === p.$id && a.status === 'present').length;
    const tDays = attendance.filter(a => a.personId === p.$id).length;
    return {
      ...p,
      typeKey,
      presentCount: pDays,
      totalCount: tDays,
      attendanceRate: tDays > 0 ? Math.round((pDays / tDays) * 100) : 0
    };
  });

  // Inventory — material totals & low-stock alerts (using LOW_STOCK_THRESHOLDS)
  const materialSummary = MATERIAL_OPTIONS.map((mat) => {
    const relevant = inventory.filter((e) => e.item === mat.value);
    const total = relevant.reduce((sum, e) => {
      const q = parseInt(e.quantity) || 0;
      return e.type === "outgoing" ? sum - q : sum + q;
    }, 0);
    const unit = relevant.length > 0 ? relevant[0].unit : null;
    const status = getStockStatus(mat.value, total);
    return {
      ...mat,
      total,
      unit,
      threshold: status.threshold,
      severity: status.severity,        // "critical" | "low" | "moderate" | "ok"
      statusMessage: status.message,
      isLow: status.severity !== "ok",   // anything below threshold
      isEmpty: total === 0,
    };
  });

  const lowStockMaterials = materialSummary.filter((m) => m.severity === "critical" || m.severity === "low");
  const moderateStockMaterials = materialSummary.filter((m) => m.severity === "moderate");
  const outOfStockMaterials = materialSummary.filter((m) => m.isEmpty);

  // Invoices
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const successInvoices = invoices.filter((i) => i.status === "success");
  const totalInvoiceAmount = invoices.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
  const pendingInvoiceAmount = pendingInvoices.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
  const successInvoiceAmount = successInvoices.reduce((sum, i) => sum + (i.taxAmount || 0), 0);

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!selectedSite) {
    return (
      <div className="flex-1 ml-64 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto text-slate-200 mb-4" size={64} />
          <p className="text-slate-300 font-black uppercase tracking-widest text-sm">
            Select a site to generate report
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 ml-64 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto text-orange-500 mb-4 animate-spin" size={48} />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">
            Generating site report...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ═══════════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl shadow-sm">
                <BarChart3 className="text-violet-700" size={24} />
              </div>
              Site Report
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-medium max-w-lg">
              Comprehensive overview of finances, workforce, materials, and invoices for the active site.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-violet-700 bg-violet-50 border border-violet-100 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm">
              {selectedSite.siteName || selectedSite.name}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Generated {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TOP KPI CARDS
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Budget */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <IndianRupee className="text-emerald-700" size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Budget</span>
            </div>
            <AnimatedValue className="text-2xl font-black text-slate-900 tracking-tight block">
              {totalBudget > 0 ? `₹${totalBudget.toLocaleString()}` : "Not Set"}
            </AnimatedValue>
            {totalBudget > 0 && (
              <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                <ShieldCheck size={10} /> Budget allocated
              </p>
            )}
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                <Wallet className="text-orange-700" size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expenses</span>
            </div>
            <AnimatedValue className="text-2xl font-black text-slate-900 tracking-tight block">
              ₹{totalExpenses.toLocaleString()}
            </AnimatedValue>
            {totalBudget > 0 && (
              <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${budgetUtilPct > 80 ? "text-red-500" : "text-slate-400"}`}>
                {budgetUtilPct > 80 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {budgetUtilPct}% of budget used
              </p>
            )}
          </div>

          {/* Total Personnel */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="text-blue-700" size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Personnel</span>
            </div>
            <AnimatedValue className="text-2xl font-black text-slate-900 tracking-tight block">
              {totalPersonnel}
            </AnimatedValue>
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              {workerCount} Workers · {engineerCount} Engineers
            </p>
          </div>

          {/* Average Attendance */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <CalendarCheck className="text-violet-700" size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg Attendance</span>
            </div>
            <AnimatedValue className="text-2xl font-black text-slate-900 tracking-tight block">
              {avgOverallAttendancePct}%
            </AnimatedValue>
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              {totalPresent} / {totalAttendanceRecords} records present
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            FINANCE BREAKDOWN
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Budget Utilization Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <SectionHeader
              icon={PieChart}
              title="Budget Utilisation"
              subtitle="Allocation & remaining"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-700"
            />

            {totalBudget > 0 ? (
              <div className="space-y-6">
                {/* Circular-style progress */}
                <div className="flex items-center gap-6">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={budgetUtilPct > 80 ? "#ef4444" : budgetUtilPct > 50 ? "#f59e0b" : "#10b981"}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${budgetUtilPct * 3.14} ${314 - budgetUtilPct * 3.14}`}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-slate-900">{budgetUtilPct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">Allocated</span>
                      <span className="font-black text-slate-900">₹{totalBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">Spent</span>
                      <span className="font-black text-orange-700">₹{totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">Remaining</span>
                      <span className={`font-black ${remainingBudget < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        ₹{remainingBudget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Budget health indicator */}
                <div className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  budgetUtilPct > 80
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : budgetUtilPct > 50
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                }`}>
                  {budgetUtilPct > 80 ? (
                    <><AlertTriangle size={14} /> Critical — Over 80% utilised</>
                  ) : budgetUtilPct > 50 ? (
                    <><TrendingUp size={14} /> Moderate — Over 50% utilised</>
                  ) : (
                    <><CheckCircle size={14} /> Healthy — Budget in safe range</>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto text-amber-400 mb-3" size={32} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No budget allocated yet</p>
                <p className="text-[10px] font-bold text-slate-300 mt-1">Set a budget from the Dashboard page</p>
              </div>
            )}
          </div>

          {/* Expense Breakdown */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <SectionHeader
              icon={Wallet}
              title="Expense Breakdown"
              subtitle="Labour · Engineering · Materials"
              iconBg="bg-orange-50"
              iconColor="text-orange-700"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/60 rounded-2xl p-5 border border-orange-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Labour</p>
                <p className="text-xl font-black text-orange-900 tracking-tight">₹{labourCost.toLocaleString()}</p>
                {totalExpenses > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 bg-orange-200/50 rounded-full h-1.5">
                      <div className="bg-orange-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.round((labourCost / totalExpenses) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-orange-500">{Math.round((labourCost / totalExpenses) * 100)}%</span>
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-2xl p-5 border border-blue-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Engineers</p>
                <p className="text-xl font-black text-blue-900 tracking-tight">₹{engineerCost.toLocaleString()}</p>
                {totalExpenses > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 bg-blue-200/50 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.round((engineerCost / totalExpenses) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-blue-500">{Math.round((engineerCost / totalExpenses) * 100)}%</span>
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-2xl p-5 border border-indigo-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Materials</p>
                <p className="text-xl font-black text-indigo-900 tracking-tight">₹{materialCost.toLocaleString()}</p>
                {totalExpenses > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 bg-indigo-200/50 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.round((materialCost / totalExpenses) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-500">{Math.round((materialCost / totalExpenses) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total bar */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Recorded Expenses</p>
                <p className="text-2xl font-black tracking-tighter">₹{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <ArrowUpRight className="text-slate-500 ml-auto" size={20} />
                <p className="text-[10px] font-bold text-slate-500 mt-1">From finance records</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            WORKFORCE & ATTENDANCE
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Workforce */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <SectionHeader
              icon={Users}
              title="Workforce Overview"
              subtitle="Labour & Engineers breakdown"
              iconBg="bg-blue-50"
              iconColor="text-blue-700"
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-5 text-center">
                <Users className="mx-auto text-orange-600 mb-2" size={24} />
                <p className="text-3xl font-black text-orange-900">{workerCount}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-1">Labour</p>
              </div>
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 text-center">
                <HardHat className="mx-auto text-blue-600 mb-2" size={24} />
                <p className="text-3xl font-black text-blue-900">{engineerCount}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Engineers</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">Total on site</span>
                <span className="text-lg font-black text-slate-900">{totalPersonnel}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                {totalPersonnel > 0 && (
                  <div className="h-full flex">
                    <div
                      className="bg-orange-500 h-full transition-all duration-700"
                      style={{ width: `${Math.round((workerCount / totalPersonnel) * 100)}%` }}
                    />
                    <div
                      className="bg-blue-500 h-full transition-all duration-700"
                      style={{ width: `${Math.round((engineerCount / totalPersonnel) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600">
                  <div className="w-2 h-2 rounded-full bg-orange-500" /> Labour {totalPersonnel > 0 ? `${Math.round((workerCount / totalPersonnel) * 100)}%` : "0%"}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> Engineers {totalPersonnel > 0 ? `${Math.round((engineerCount / totalPersonnel) * 100)}%` : "0%"}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <SectionHeader
              icon={CalendarCheck}
              title="Attendance Analytics"
              subtitle="Workers & Engineers presence rate"
              iconBg="bg-violet-50"
              iconColor="text-violet-700"
            />

            <div className="space-y-5">
              {/* Overall */}
              <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-violet-700 uppercase tracking-widest">Overall Attendance</span>
                  <span className="text-2xl font-black text-violet-900">{avgOverallAttendancePct}%</span>
                </div>
                <div className="w-full bg-violet-200/50 rounded-full h-2">
                  <div
                    className="bg-violet-600 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${avgOverallAttendancePct}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-violet-400 mt-1.5">{totalPresent} present out of {totalAttendanceRecords} total records</p>
              </div>

              {/* Worker attendance */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/40 border border-orange-100">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <Users className="text-orange-700" size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Labour Attendance</span>
                    <span className="text-sm font-black text-orange-700">{avgLabourAttendancePct}%</span>
                  </div>
                  <div className="w-full bg-orange-200/40 rounded-full h-1.5">
                    <div className="bg-orange-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${avgLabourAttendancePct}%` }} />
                  </div>
                </div>
              </div>

              {/* Engineer attendance */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/40 border border-blue-100">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <HardHat className="text-blue-700" size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Engineer Attendance</span>
                    <span className="text-sm font-black text-blue-700">{avgEngineerAttendancePct}%</span>
                  </div>
                  <div className="w-full bg-blue-200/40 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${avgEngineerAttendancePct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            DETAILED PERSONNEL ATTENDANCE
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <SectionHeader
            icon={Users}
            title="Personnel Attendance Breakdown"
            subtitle="Total present days and attendance rate per person"
            iconBg="bg-slate-100"
            iconColor="text-slate-700"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-5">Personnel Name</th>
                  <th className="px-6 py-5">Type</th>
                  <th className="px-6 py-5">Role/Skill</th>
                  <th className="px-6 py-5 text-center">Present Days</th>
                  <th className="px-6 py-5 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {personnelWithStats.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-black uppercase tracking-widest">No Personnel Found</td></tr>
                ) : (
                  personnelWithStats.map((person) => (
                    <tr key={person.$id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-5">
                         <div className="font-bold text-slate-900 text-sm">{person.name}</div>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: {person.$id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-5">
                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                           person.typeKey === 'engineer' ? 'text-zinc-600 bg-zinc-50 border-zinc-100' : 'text-orange-600 bg-orange-50 border-orange-100'
                         }`}>
                           {person.typeKey === 'engineer' ? <HardHat size={12}/> : <Users size={12}/>}
                           {person.typeKey}
                         </span>
                      </td>
                      <td className="px-6 py-5">
                         <div className="font-black text-slate-600 uppercase text-xs">{person.role || person.skill || 'General'}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                         <div className="font-bold text-slate-800 text-sm">
                           {person.presentCount} <span className="text-[10px] font-black uppercase text-slate-400">Days</span>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className="flex flex-col items-end gap-1">
                           <span className={`text-sm font-black transition-colors ${
                              person.attendanceRate > 80 ? 'text-emerald-600' : person.attendanceRate > 50 ? 'text-amber-500' : 'text-red-500'
                           }`}>
                             {person.attendanceRate}%
                           </span>
                           <div className="w-20 bg-slate-100 rounded-full h-1">
                             <div className={`h-1 rounded-full ${
                               person.attendanceRate > 80 ? 'bg-emerald-500' : person.attendanceRate > 50 ? 'bg-amber-400' : 'bg-red-500'
                             }`} style={{ width: `${person.attendanceRate}%` }} />
                           </div>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            MATERIAL INVENTORY
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <SectionHeader
            icon={Package}
            title="Material Inventory"
            subtitle={`${lowStockMaterials.length} critical/low · ${moderateStockMaterials.length} moderate · Avg. threshold: ${AVG_THRESHOLD}`}
            iconBg="bg-amber-50"
            iconColor="text-amber-700"
          />

          {/* Critical / Low stock alerts */}
          {lowStockMaterials.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-red-500" size={16} />
                <span className="text-xs font-black uppercase tracking-widest text-red-600">
                  {lowStockMaterials.some((m) => m.severity === "critical")
                    ? "🚨 Critical Stock Alert — Immediate Restock Required"
                    : "⚠️ Low Stock Alert — Plan Restock Soon"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockMaterials.map((mat) => (
                  <span
                    key={mat.value}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-xs font-black ${
                      mat.severity === "critical"
                        ? "border-2 border-red-300 text-red-800"
                        : "border border-red-200 text-red-700"
                    }`}
                  >
                    <span>{mat.emoji}</span>
                    {mat.label}
                    <span className="text-[10px] font-bold text-red-400 ml-1">
                      ({mat.total} {mat.unit ? getUnitLabel(mat.unit) : ""} — Min. {mat.threshold})
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-[10px] font-bold text-red-400 mt-3">
                📊 Average minimum threshold across all materials: {AVG_THRESHOLD} units. Materials below their individual thresholds need restocking.
              </p>
            </div>
          )}

          {/* Moderate stock warnings */}
          {moderateStockMaterials.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="text-amber-500" size={16} />
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                  Moderate — Below Recommended Level
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {moderateStockMaterials.map((mat) => (
                  <span
                    key={mat.value}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-black text-amber-700"
                  >
                    <span>{mat.emoji}</span>
                    {mat.label}
                    <span className="text-[10px] font-bold text-amber-400 ml-1">
                      ({mat.total} / {mat.threshold} {mat.unit ? getUnitLabel(mat.unit) : ""})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Material grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {materialSummary.map((mat) => {
              const stockPct = mat.threshold > 0 ? Math.min(100, Math.round((mat.total / mat.threshold) * 100)) : 0;
              const severityStyles = {
                critical: "bg-red-50/80 border-red-200",
                low: "bg-red-50/60 border-red-200",
                moderate: "bg-amber-50/60 border-amber-200",
                ok: "bg-emerald-50/40 border-emerald-100",
              };
              const barColors = {
                critical: "bg-red-600",
                low: "bg-red-500",
                moderate: "bg-amber-500",
                ok: "bg-emerald-500",
              };
              return (
                <div
                  key={mat.value}
                  className={`rounded-2xl p-4 flex flex-col gap-2 transition-all hover:shadow-md border ${
                    mat.isEmpty ? "bg-slate-50 border-slate-200" : severityStyles[mat.severity]
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{mat.emoji}</span>
                    {mat.severity === "critical" && <AlertTriangle className="text-red-500 animate-pulse" size={14} />}
                    {mat.severity === "low" && <AlertTriangle className="text-red-400" size={14} />}
                    {mat.severity === "moderate" && <TrendingDown className="text-amber-500" size={14} />}
                    {mat.severity === "ok" && mat.total > 0 && <CheckCircle className="text-emerald-500" size={14} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{mat.label}</p>
                    <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">
                      {mat.total > 0 ? mat.total.toLocaleString() : "—"}
                    </p>
                    {mat.unit && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{getUnitLabel(mat.unit)}</p>
                    )}
                  </div>
                  {/* Stock level bar */}
                  <div className="mt-auto">
                    <div className="w-full h-1.5 rounded-full bg-slate-200">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${
                          mat.isEmpty ? "bg-slate-300" : barColors[mat.severity]
                        }`}
                        style={{ width: `${mat.total > 0 ? Math.min(stockPct, 100) : 0}%` }}
                      />
                    </div>
                    <p className={`text-[9px] font-bold mt-1 ${
                      mat.severity === "critical" ? "text-red-500" :
                      mat.severity === "low" ? "text-red-400" :
                      mat.severity === "moderate" ? "text-amber-500" :
                      mat.isEmpty ? "text-slate-400" : "text-emerald-500"
                    }`}>
                      {mat.statusMessage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            INVOICES SUMMARY
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <SectionHeader
            icon={FileText}
            title="Invoice Summary"
            subtitle={`${totalInvoices} total invoices on record`}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-700"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="text-indigo-600" size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">All Invoices</span>
              </div>
              <p className="text-3xl font-black text-indigo-900 tracking-tight">{totalInvoices}</p>
              <p className="text-xs font-bold text-indigo-600 mt-1">₹{totalInvoiceAmount.toLocaleString()} total value</p>
            </div>

            {/* Pending */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl p-6 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="text-amber-600" size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pending</span>
              </div>
              <p className="text-3xl font-black text-amber-900 tracking-tight">{pendingInvoices.length}</p>
              <p className="text-xs font-bold text-amber-600 mt-1">₹{pendingInvoiceAmount.toLocaleString()} awaiting</p>
              {pendingInvoices.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-amber-700">
                  <AlertTriangle size={12} /> Action needed
                </div>
              )}
            </div>

            {/* Success */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-emerald-600" size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completed</span>
              </div>
              <p className="text-3xl font-black text-emerald-900 tracking-tight">{successInvoices.length}</p>
              <p className="text-xs font-bold text-emerald-600 mt-1">₹{successInvoiceAmount.toLocaleString()} settled</p>
            </div>
          </div>

          {/* Invoice status bar */}
          {totalInvoices > 0 && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Invoice Status Distribution</span>
                <span>{totalInvoices} total</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-700"
                  style={{ width: `${Math.round((successInvoices.length / totalInvoices) * 100)}%` }}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-700"
                  style={{ width: `${Math.round((pendingInvoices.length / totalInvoices) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Completed {Math.round((successInvoices.length / totalInvoices) * 100)}%
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
                  <div className="w-2 h-2 rounded-full bg-amber-400" /> Pending {Math.round((pendingInvoices.length / totalInvoices) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Recent pending invoices list */}
          {pendingInvoices.length > 0 && (
            <div className="mt-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <Clock size={12} /> Pending Invoices
              </h4>
              <div className="space-y-2">
                {pendingInvoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.$id}
                    className="flex items-center justify-between px-4 py-3 bg-amber-50/40 border border-amber-100 rounded-xl hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="text-amber-500" size={14} />
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">{inv.vendorName}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-amber-700">₹{(inv.taxAmount || 0).toLocaleString()}</span>
                  </div>
                ))}
                {pendingInvoices.length > 5 && (
                  <p className="text-[10px] font-bold text-slate-400 text-center mt-2">
                    +{pendingInvoices.length - 5} more pending invoices
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="text-center py-6">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Report generated for {selectedSite.siteName || selectedSite.name} · Samarth Developers
          </p>
        </div>
      </div>
    </div>
  );
}
