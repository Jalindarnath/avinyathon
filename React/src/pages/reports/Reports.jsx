import { useNavigate } from 'react-router-dom';
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
  Building2,
  LogOut
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
    sand_valu: 10,       // 10 ton (1 Brass)
    gravel_gitti: 10,    // 10 Cubic Feet (1 Brass)
    cement: 25,           // 25 Bags (Enough for minor masonry/plaster)
    tmt_steel: 10,       // 500 kg (Half a tonne)
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
  const totalBudget = finance?.budget || 0;
  const totalExpenses = finance?.expenses || 0;
  const remainingBudget = finance?.remainingBudget || 0;
  const labourCost = finance?.labourcost || 0;
  const engineerCost = finance?.engineercost || 0;
  const materialCost = finance?.materialCost || 0;
  const budgetUtilPct = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  const workerCount = workers.length;
  const engineerCount = engineers.length;
  const totalPersonnel = workerCount + engineerCount;

  const engineerAttendanceRecords = attendance.filter((a) => a.type === "engineer" && a.status === "present");
  const totalEngineerAttendanceDays = attendance.filter((a) => a.type === "engineer").length;
  const avgEngineerAttendancePct = totalEngineerAttendanceDays > 0 ? Math.round((engineerAttendanceRecords.length / totalEngineerAttendanceDays) * 100) : 0;

  const labourAttendancePresent = attendance.filter((a) => a.type === "labour" && a.status === "present").length;
  const totalLabourAttendanceDays = attendance.filter((a) => a.type === "labour").length;
  const avgLabourAttendancePct = totalLabourAttendanceDays > 0 ? Math.round((labourAttendancePresent / totalLabourAttendanceDays) * 100) : 0;

  const totalPresent = attendance.filter((a) => a.status === "present").length;
  const totalAttendanceRecords = attendance.length;
  const avgOverallAttendancePct = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0;

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

  const materialSummary = MATERIAL_OPTIONS.map((mat) => {
    const relevant = inventory.filter((e) => e.item === mat.value);
    const total = relevant.reduce((sum, e) => {
      const q = parseInt(e.quantity) || 0;
      return e.type === "outgoing" ? sum - q : sum + q;
    }, 0);
    const unit = relevant.length > 0 ? relevant[0].unit : null;
    const status = getStockStatus(mat.value, total);
    return { ...mat, total, unit, threshold: status.threshold, severity: status.severity, statusMessage: status.message, isLow: status.severity !== "ok", isEmpty: total === 0 };
  });

  const lowStockMaterials = materialSummary.filter((m) => m.severity === "critical" || m.severity === "low");
  const moderateStockMaterials = materialSummary.filter((m) => m.severity === "moderate");

  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const successInvoices = invoices.filter((i) => i.status === "success");
  const totalInvoiceAmount = invoices.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
  const pendingInvoiceAmount = pendingInvoices.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
  const successInvoiceAmount = successInvoices.reduce((sum, i) => sum + (i.taxAmount || 0), 0);

  if (!selectedSite) {
    return (
      <div className="flex-1 ml-64 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto text-slate-200 mb-4" size={64} />
          <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Select a site to generate report</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 ml-64 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto text-orange-500 mb-4 animate-spin" size={48} />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Generating site report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Analytics</span>
            <span className="text-lg font-bold text-slate-800">{selectedSite.siteName || selectedSite.name || 'Unnamed Site'}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{user?.role === 'admin' ? 'System Admin' : 'Site Manager'}</p>
              </div>

            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Business Intelligence</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Operational Site Report</h2>
          <p className="text-slate-500 max-w-2xl text-sm font-medium">Generating real-time insights across financial health, workforce efficiency, and inventory compliance.</p>
        </section>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><IndianRupee size={20} /></div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Site Allocation</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">₹{totalBudget.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1 uppercase tracking-tight"><ShieldCheck size={10} /> Active Budget</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600"><Wallet size={20} /></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#f2711c]" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Gross Expenditures</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">₹{totalExpenses.toLocaleString()}</h3>
            <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 uppercase tracking-tight ${budgetUtilPct > 80 ? "text-red-600" : "text-slate-600"}`}>
              {budgetUtilPct}% Utilization
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Users size={20} /></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Human Resources</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">{totalPersonnel}</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tight">{workerCount} Labour · {engineerCount} Staff</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-violet-50 text-violet-600"><CalendarCheck size={20} /></div>
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Attendance Metric</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">{avgOverallAttendancePct}%</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tight">{totalPresent} Active Presence</p>
          </div>
        </div>

        {/* Finance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <SectionHeader icon={PieChart} title="Budget Utilisation" subtitle="Cashflow status" iconBg="bg-emerald-50" iconColor="text-emerald-700" />
            {totalBudget > 0 ? (
              <div className="space-y-8">
                <div className="flex items-center gap-8">
                  <div className="relative w-32 h-32 shrink-0">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke={budgetUtilPct > 80 ? "#ef4444" : budgetUtilPct > 50 ? "#f2711c" : "#10b981"} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${budgetUtilPct * 3.14} ${314 - budgetUtilPct * 3.14}`} className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-800 leading-none">{budgetUtilPct}%</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Used</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span><span className="text-sm font-bold text-slate-800 tracking-tight">₹{totalBudget.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spent</span><span className="text-sm font-bold text-orange-700 tracking-tight">₹{totalExpenses.toLocaleString()}</span></div>
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net</span><span className={`text-sm font-bold tracking-tight ${remainingBudget < 0 ? "text-red-600" : "text-emerald-600"}`}>₹{remainingBudget.toLocaleString()}</span></div>
                  </div>
                </div>
                <div className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${budgetUtilPct > 80 ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                  {budgetUtilPct > 80 ? <><AlertTriangle size={14} /> High Burn Rate</> : <><CheckCircle size={14} /> Stable Expenditure</>}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertTriangle className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Budget Data</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <SectionHeader icon={Wallet} title="Distribution Strategy" subtitle="Cost analysis" iconBg="bg-orange-50" iconColor="text-orange-700" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="space-y-2">
                <div className="flex justify-between items-end"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Labour</p><p className="text-sm font-bold text-slate-800">₹{labourCost.toLocaleString()}</p></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-[#f2711c] h-full" style={{ width: `${totalExpenses > 0 ? (labourCost / totalExpenses) * 100 : 0}%` }} /></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Engineers</p><p className="text-sm font-bold text-slate-800">₹{engineerCost.toLocaleString()}</p></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: `${totalExpenses > 0 ? (engineerCost / totalExpenses) * 100 : 0}%` }} /></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Materials</p><p className="text-sm font-bold text-slate-800">₹{materialCost.toLocaleString()}</p></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-emerald-500 h-full" style={{ width: `${totalExpenses > 0 ? (materialCost / totalExpenses) * 100 : 0}%` }} /></div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-6 text-white flex items-center justify-between shadow-lg">
              <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cumulative Operation Cost</p><p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p></div>
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center"><ArrowUpRight size={20} /></div>
            </div>
          </div>
        </div>

        {/* Workforce & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <SectionHeader icon={Users} title="Employment Structure" subtitle="Workforce stratification" iconBg="bg-blue-50" iconColor="text-blue-700" />
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2"><Users className="text-orange-600" size={16} /><p className="text-[10px] font-bold uppercase text-slate-500">Labour</p></div>
                <p className="text-3xl font-bold text-slate-800">{workerCount}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2"><HardHat className="text-blue-600" size={16} /><p className="text-[10px] font-bold uppercase text-slate-500">Engineers</p></div>
                <p className="text-3xl font-bold text-slate-800">{engineerCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <SectionHeader icon={CalendarCheck} title="Attendance Analytics" subtitle="Presence efficiency" iconBg="bg-violet-50" iconColor="text-violet-700" />
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4"><p className="text-[10px] font-bold uppercase text-slate-500">Corporate Presence</p><span className="text-lg font-bold text-violet-700">{avgOverallAttendancePct}%</span></div>
                <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-violet-600 h-1.5 rounded-full" style={{ width: `${avgOverallAttendancePct}%` }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex justify-between mb-2"><p className="text-[10px] font-bold text-orange-600">Labour</p><span className="text-sm font-bold">{avgLabourAttendancePct}%</span></div>
                  <div className="w-full bg-slate-50 h-1"><div className="bg-orange-500 h-1" style={{ width: `${avgLabourAttendancePct}%` }} /></div>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex justify-between mb-2"><p className="text-[10px] font-bold text-blue-600">Staff</p><span className="text-sm font-bold">{avgEngineerAttendancePct}%</span></div>
                  <div className="w-full bg-slate-50 h-1"><div className="bg-blue-600 h-1" style={{ width: `${avgEngineerAttendancePct}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personnel Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-3"><Users size={18} className="text-slate-400" /><h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Personnel Performance Ledger</h3></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                <tr><th className="px-8 py-5">Qualified Professional</th><th className="px-6 py-5">Classification</th><th className="px-6 py-5 text-center">Presence</th><th className="px-8 py-5 text-right">Engagement</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {personnelWithStats.length === 0 ? (
                  <tr><td colSpan="4" className="px-8 py-16 text-center text-slate-300 font-bold uppercase text-[10px]">No Verified Personnel Found</td></tr>
                ) : (
                  personnelWithStats.map((person) => (
                    <tr key={person.$id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5"><div className="font-bold text-slate-800 text-sm">{person.name}</div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">UID: {person.$id.substring(0, 8)}</div></td>
                      <td className="px-6 py-5">
                         <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${person.typeKey === 'engineer' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                           {person.typeKey}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-center"><div className="font-bold text-slate-700 text-sm">{person.presentCount} Days</div></td>
                      <td className="px-8 py-5 text-right"><span className={`text-xs font-bold ${person.attendanceRate > 80 ? 'text-emerald-600' : person.attendanceRate > 50 ? 'text-orange-500' : 'text-red-500'}`}>{person.attendanceRate}%</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Analysis */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <SectionHeader icon={Package} title="Material Inventory Analysis" subtitle={`${lowStockMaterials.length} alerts · Threshold index: ${AVG_THRESHOLD}`} iconBg="bg-amber-50" iconColor="text-amber-700" />
          {lowStockMaterials.length > 0 && (
            <div className="mb-8 border border-red-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-red-50 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><AlertTriangle className="text-red-500" size={16} /><span className="text-[10px] font-bold uppercase text-red-700">Critical Logistics Alert</span></div>
              </div>
              <div className="p-6 bg-white flex flex-wrap gap-3">
                {lowStockMaterials.map((mat) => (
                  <div key={mat.value} className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 ${mat.severity === "critical" ? "border-red-200" : "border-amber-100"}`}>
                    <span className="text-sm">{mat.emoji}</span>
                    <div className="flex flex-col"><span className={`text-[10px] font-bold uppercase ${mat.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>{mat.label}</span><span className="text-[9px] font-bold text-slate-400">Stock: {mat.total}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
            {materialSummary.map((mat) => (
              <div key={mat.value} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center hover:bg-white hover:shadow-md transition-all">
                <div className="p-2 rounded-lg bg-white shadow-sm mb-3"><span className="text-lg">{mat.emoji}</span></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{mat.label}</p>
                <p className={`text-lg font-bold ${mat.isLow ? 'text-red-600' : 'text-slate-800'}`}>{mat.total}</p>
                <div className="mt-3 w-full h-1 rounded-full bg-slate-200 overflow-hidden">
                   <div className={`h-full ${mat.severity === 'critical' ? 'bg-red-500' : mat.severity === 'low' ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((mat.total / mat.threshold) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <SectionHeader icon={FileText} title="Procurement Validation" subtitle="Invoice compliance" iconBg="bg-orange-50" iconColor="text-orange-700" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-6">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-3">Gross Records</p>
              <p className="text-3xl font-bold text-slate-800">{totalInvoices}</p>
              <p className="text-xs font-bold text-slate-500 mt-2">₹{totalInvoiceAmount.toLocaleString()}</p>
            </div>
            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-6">
              <p className="text-[10px] font-bold uppercase text-orange-700 mb-3">Awaiting Settlement</p>
              <p className="text-3xl font-bold text-orange-900">{pendingInvoices.length}</p>
              <p className="text-xs font-bold text-orange-800 mt-2">₹{pendingInvoiceAmount.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6">
              <p className="text-[10px] font-bold uppercase text-emerald-700 mb-3">Settled</p>
              <p className="text-3xl font-bold text-emerald-900">{successInvoices.length}</p>
              <p className="text-xs font-bold text-emerald-800 mt-2">₹{successInvoiceAmount.toLocaleString()}</p>
            </div>
          </div>

          {pendingInvoices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><TrendingDown size={14} className="text-orange-500" /><h4 className="text-[10px] font-bold uppercase text-slate-400">Critical Pending Payments</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingInvoices.slice(0, 4).map((inv) => (
                  <div key={inv.$id} className="flex items-center justify-between px-5 py-4 bg-white border border-slate-100 shadow-sm rounded-xl hover:border-orange-200 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Building2 size={14} /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-900 uppercase">{inv.vendorName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-800">₹{(inv.taxAmount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Report generated for {selectedSite.siteName || selectedSite.name} · Samarth Developers</p>
        </div>
      </div>
    </div>
  );
}
