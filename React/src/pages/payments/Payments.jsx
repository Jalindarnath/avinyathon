import { useState, useEffect } from "react";
import { CreditCard, IndianRupee, Users, HardHat, CheckCircle, MinusCircle, History, Wallet, WalletCards, ArrowDownRight, BadgeInfo, Loader2,LogOut } from "lucide-react";
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";
import { getWorkersBySite, updateWorker } from "../../../appwrite/services/worker.service.js";
import { getEngineersBySite, updateEngineer } from "../../../appwrite/services/engineer.service.js";
import { createPayment, getAllPayments, getPaymentsBySite } from "../../../appwrite/services/payment.service.js";
import { updateLaborCost, updateEngineerCost, deductLaborCost, deductEngineerCost } from "../../../appwrite/services/finance.service.js";
import { getAllWorkers } from "../../../appwrite/services/worker.service.js";
import { getAllEngineers } from "../../../appwrite/services/engineer.service.js";

const Payments = () => {
  const { selectedSite } = useSite();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'history' : 'payouts');
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  
  // Deduction states
  const [deductionTarget, setDeductionTarget] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  
  // History states
  const [paymentHistory, setPaymentHistory] = useState([]);

  const today = new Date();
  const isEndOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate();
  const isWeekend = [0, 6].includes(today.getDay());

  useEffect(() => {
    fetchData();
  }, [selectedSite]);

  const fetchData = async () => {
    if (!selectedSite && !isAdmin) {
      setPersonnel([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [workersRes, engineersRes] = await Promise.all([
        (isAdmin && !selectedSite) ? getAllWorkers() : getWorkersBySite(selectedSite?.$id),
        (isAdmin && !selectedSite) ? getAllEngineers() : getEngineersBySite(selectedSite?.$id)
      ]);

      const workers = (workersRes.documents || []).map(w => {
        const pdays = parseInt(w.presentDays || "0", 10);
        const gross = pdays * (w.dailyWage || 0);
        const deductions = w.deductedAmt || 0;
        return {
          ...w,
          _type: 'labour',
          presentDays: pdays,
          grossPay: gross,
          deductions: deductions,
          payableAmount: gross - deductions
        };
      });
      workers.sort((a, b) => b.presentDays - a.presentDays);

      const engineers = (engineersRes.documents || []).map(e => {
        const salary = e.monthlySalary || e.salary || 0;
        const deductions = e.deductedAmt || 0;
        return {
          ...e,
          _type: 'engineer',
          salary: salary,
          deductions: deductions,
          payableAmount: salary - deductions
        };
      });

      setPersonnel([...engineers, ...workers]);

      // Fetch history based on role and context
      if (isAdmin && !selectedSite) {
         const histRes = await getAllPayments();
         setPaymentHistory(histRes.documents || []);
      } else if (selectedSite) {
         const histRes = await getPaymentsBySite(selectedSite.$id);
         setPaymentHistory(histRes.documents || []);
      } else {
         setPaymentHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch payment data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (person) => {
    if (!window.confirm(`Issue payout of ₹${person.payableAmount} to ${person.name}?`)) return;
    setProcessing(person.$id);
    const siteIdToUse = person.siteId || selectedSite.$id;
    try {
      const paymentData = {
        siteId: siteIdToUse,
        personId: person.$id,
        personName: person.name,
        amount: person.payableAmount,
        type: person._type,
        manager: user?.name || "Manager",
      };
      
      await createPayment(paymentData);
      
      // Update SiteFinance
      if (person._type === 'labour') {
        await updateLaborCost(siteIdToUse, person.payableAmount);
        // Reset worker stats for the new week
        await updateWorker(person.$id, { 
          presentDays: "0", 
          deductedAmt: 0 
        });
      } else {
        await updateEngineerCost(siteIdToUse, person.payableAmount);
        // Reset deductions for the new month
        await updateEngineer(person.$id, { 
          deductedAmt: 0 
        });
      }

      alert(`Payment of ₹${person.payableAmount} successful. Personnel records have been reset for the next cycle.`);
      fetchData();
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment processing failed: " + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeduct = async (e) => {
    e.preventDefault();
    if (!deductionTarget || !deductionAmount || isNaN(deductionAmount)) {
      alert("Please enter valid deduction details.");
      return;
    }

    const person = personnel.find(p => p.$id === deductionTarget);
    if (!person) return;

    if (!window.confirm(`Deduct ₹${deductionAmount} from ${person.name}? This will update their records.`)) return;

    setProcessing("deduction");
    const siteIdToUse = person.siteId || selectedSite.$id;
    try {
       const amount = Number(deductionAmount);
       const newDeductionTotal = (person.deductedAmt || 0) + amount;
       
       if (person._type === 'labour') {
          await updateWorker(person.$id, { deductedAmt: newDeductionTotal });
          await deductLaborCost(siteIdToUse, amount);
       } else {
          await updateEngineer(person.$id, { deductedAmt: newDeductionTotal });
          await deductEngineerCost(siteIdToUse, amount);
       }

       alert(`Deduction of ₹${amount} successful. Worker record and SiteFinance updated.`);
       setDeductionAmount("");
       setDeductionReason("");
       setDeductionTarget("");
       fetchData();
    } catch (err) {
       console.error("Deduction failed:", err);
       alert("Deduction failed: " + err.message);
    } finally {
       setProcessing(null);
    }
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Financial Ledger</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Payroll & Finance</h2>
          <p className="text-slate-500 text-sm font-medium">Manage workforce disbursements and organizational expenses.</p>
        </div>

        <div className="flex items-center gap-4">
           {isEndOfMonth ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg border border-emerald-100 text-[10px] font-bold uppercase tracking-widest">
                 <CheckCircle size={14} /> Salaries Unlocked
              </div>
           ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-4 py-2.5 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                 <BadgeInfo size={14} /> Salaries Locked
              </div>
           )}
           <div className="flex items-center gap-4 border-l border-slate-200 pl-4 ml-2">
              <div className="text-right hidden sm:block">
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

      {/* Main Container Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="px-6 pt-6 border-b border-slate-100 bg-white">
           <div className="flex gap-2 p-1.5 bg-slate-50 rounded-lg w-fit border border-slate-100 mb-6">
              {!isAdmin && (
                <>
                  <button 
                    onClick={() => setActiveTab('payouts')}
                    className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'payouts' ? 'bg-white text-[#f2711c] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Quick Payouts
                  </button>
                  <button 
                    onClick={() => setActiveTab('deductions')}
                    className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'deductions' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Deductions
                  </button>
                </>
              )}
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className="flex items-center gap-1.5"><History size={12}/> History</div>
              </button>
           </div>
        </div>

        <div className="p-0">
          {!selectedSite && !isAdmin ? (
             <div className="text-center py-24 text-slate-300 font-bold uppercase tracking-widest">Select an infrastructure site to access payroll features</div>
          ) : loading ? (
             <div className="text-center py-24 flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Accessing Financial Vault...</p>
             </div>
          ) : (
             <div className="">
                {activeTab === 'payouts' ? (
                  <div className="space-y-8 p-6">
                    {/* Labour Ledger */}
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                       <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                          <Users size={16} className="text-[#f2711c]" />
                          <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Skilled Laborer Weekly Wages</h4>
                       </div>
                       <table className="w-full text-left">
                         <thead className="bg-white border-b border-slate-100">
                           <tr className="text-[9px] uppercase tracking-widest text-slate-400 font-bold italic-none">
                             <th className="px-6 py-4">Personnel</th>
                             <th className="px-6 py-4 text-center">Context</th>
                             <th className="px-6 py-4 text-right">Gross (₹)</th>
                             <th className="px-6 py-4 text-right text-rose-600">Deducted</th>
                             <th className="px-6 py-4 text-right">Net Payable</th>
                             <th className="px-6 py-4 text-right">Operation</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 italic-none">
                            {personnel.filter(p => p._type === 'labour').length === 0 ? (
                               <tr><td colSpan="6" className="text-center py-10 text-slate-300 text-[10px] font-bold uppercase italic-none">No labourez entries detected.</td></tr>
                            ) : personnel.filter(p => p._type === 'labour').map(person => {
                               const canPay = isWeekend && person.presentDays > 0;
                               return (
                                 <tr key={person.$id} className="hover:bg-slate-50/80 transition-colors group">
                                   <td className="px-6 py-4">
                                      <p className="font-bold text-slate-800 text-sm">{person.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {person.role || 'Personnel'}
                                      </p>
                                   </td>
                                   <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase border ${person.presentDays >= 7 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                                         {person.presentDays} Days
                                      </span>
                                   </td>
                                   <td className="px-6 py-4 text-sm font-bold text-slate-600 text-right">₹{person.grossPay.toLocaleString()}</td>
                                   <td className="px-6 py-4 text-sm font-bold text-rose-500 text-right">-₹{person.deductions.toLocaleString()}</td>
                                   <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">₹{person.payableAmount.toLocaleString()}</td>
                                   <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={() => handlePay(person)}
                                        disabled={!canPay || processing === person.$id}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                          canPay ? 'bg-[#f2711c] text-white shadow-sm hover:bg-[#d96215]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                        }`}
                                      >
                                        {processing === person.$id ? <Loader2 className="animate-spin" size={10} /> : (canPay ? 'Issue Check' : 'Weekend Only')}
                                      </button>
                                   </td>
                                 </tr>
                               )
                            })}
                         </tbody>
                       </table>
                    </div>

                    {/* Engineer Ledger */}
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                       <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                          <HardHat size={16} className="text-slate-800" />
                          <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Professional Engineering Salaries</h4>
                       </div>
                       <table className="w-full text-left">
                         <thead className="bg-white border-b border-slate-100">
                           <tr className="text-[9px] uppercase tracking-widest text-slate-400 font-bold italic-none">
                             <th className="px-6 py-4">Specialist Identity</th>
                             <th className="px-6 py-4 text-right">Monthly (₹)</th>
                             <th className="px-6 py-4 text-right text-rose-600">Adjustments</th>
                             <th className="px-6 py-4 text-right">Final Disbursement</th>
                             <th className="px-6 py-4 text-right">Operation</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 italic-none">
                            {personnel.filter(p => p._type === 'engineer').length === 0 ? (
                               <tr><td colSpan="5" className="text-center py-10 text-slate-300 text-[10px] font-bold uppercase italic-none">No professional leads entries.</td></tr>
                            ) : personnel.filter(p => p._type === 'engineer').map(person => {
                               const canPay = isEndOfMonth;
                               return (
                                 <tr key={person.$id} className="hover:bg-slate-50/80 transition-colors">
                                   <td className="px-6 py-4">
                                      <p className="font-bold text-slate-800 text-sm">{person.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {person.role || 'Engineer'}
                                      </p>
                                   </td>
                                   <td className="px-6 py-4 text-sm font-bold text-slate-600 text-right">₹{(person.salary || 0).toLocaleString()}</td>
                                   <td className="px-6 py-4 text-sm font-bold text-rose-500 text-right">-₹{(person.deductions || 0).toLocaleString()}</td>
                                   <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">₹{(person.payableAmount || 0).toLocaleString()}</td>
                                   <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={() => handlePay(person)}
                                        disabled={!canPay || processing === person.$id}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                          canPay ? 'bg-slate-900 text-white shadow-sm hover:bg-black' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                        }`}
                                      >
                                        {processing === person.$id ? <Loader2 className="animate-spin" size={10} /> : (canPay ? 'Disburse' : 'Locked')}
                                      </button>
                                   </td>
                                 </tr>
                               )
                            })}
                         </tbody>
                       </table>
                    </div>
                  </div>
                 ) : activeTab === 'deductions' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 items-start">
                      <div className="bg-white p-7 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                               <MinusCircle size={18} className="text-rose-600" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 tracking-tight italic-none">Register Adjustment</h4>
                         </div>
                         
                         <form onSubmit={handleDeduct} className="space-y-5">
                            <div>
                               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Workforce Personnel</label>
                               <select 
                                  value={deductionTarget}
                                  onChange={(e) => setDeductionTarget(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all appearance-none cursor-pointer"
                               >
                                  <option value="">Choose Personnel...</option>
                                  <optgroup label="Professional Staff">
                                     {personnel.filter(p => p._type === 'engineer').map(p => (
                                        <option key={p.$id} value={p.$id}>{p.name} (Engineer)</option>
                                     ))}
                                  </optgroup>
                                  <optgroup label="Operational Crew">
                                     {personnel.filter(p => p._type === 'labour').map(p => (
                                        <option key={p.$id} value={p.$id}>{p.name} (Laborer)</option>
                                     ))}
                                  </optgroup>
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Adjustment Amount (₹)</label>
                               <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                  <input 
                                     type="number"
                                     placeholder="0.00"
                                     value={deductionAmount}
                                     onChange={(e) => setDeductionAmount(e.target.value)}
                                     className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all shadow-inner"
                                  />
                               </div>
                            </div>
                            <div>
                               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Audit Note / Comment</label>
                               <textarea 
                                  placeholder="Document reason for adjustment..."
                                  value={deductionReason}
                                  onChange={(e) => setDeductionReason(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all min-h-[100px] shadow-inner"
                               ></textarea>
                            </div>
                            <button 
                               type="submit"
                               disabled={processing === "deduction"}
                               className="w-full bg-rose-600 text-white font-bold py-3.5 rounded-lg shadow-sm hover:bg-rose-700 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                            >
                               {processing === "deduction" ? <Loader2 size={14} className="animate-spin" /> : 'Apply Deduction'}
                            </button>
                         </form>
                      </div>

                      <div className="space-y-6">
                         <div className="bg-white p-7 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                               <BadgeInfo size={14} /> Adjustment Policy
                            </h4>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">
                               All recorded deductions are automatically synchronized with the organization&apos;s site finances. Payout amounts are recalculated in real-time.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                  <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold text-orange-600 uppercase">
                                     <ArrowDownRight size={10} /> Advances
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-700">Pre-payment tracking</p>
                               </div>
                               <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                                  <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold text-rose-600 uppercase">
                                     <ArrowDownRight size={10} /> Discrepancies
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-700">Penalties/Adjustments</p>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                 ) : (
                    <div className="p-6">
                       <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                             <History size={16} className="text-blue-600" />
                             <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">
                                {isAdmin && !selectedSite ? 'Global Disbursement Log' : 'Site Disbursement Log'}
                             </h4>
                          </div>
                          <table className="w-full text-left">
                             <thead className="bg-white border-b border-slate-100 italic-none">
                                <tr className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                                   <th className="px-6 py-4">Transaction Party</th>
                                   <th className="px-6 py-4">Infrastructure</th>
                                   <th className="px-6 py-4">Context</th>
                                   <th className="px-6 py-4 text-right">Net Amount</th>
                                   <th className="px-6 py-4 text-right">Agent</th>
                                   <th className="px-6 py-4 text-right">Execution Time</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 italic-none">
                                {paymentHistory.length === 0 ? (
                                   <tr><td colSpan="6" className="text-center py-12 text-slate-300 font-bold uppercase text-[10px] italic-none">No disbursement logs available in the current context.</td></tr>
                                ) : paymentHistory.map(pay => (
                                   <tr key={pay.$id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                         <p className="font-bold text-slate-800 text-sm">{pay.personName || 'Named Person'}</p>
                                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic-none">REF: {pay.$id.substring(0,12)}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                         <span className="text-[9px] font-bold uppercase text-slate-500 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">ID: {pay.siteId?.substring(0,8)}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                         <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${pay.type === 'labour' ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-slate-600 bg-slate-50 border-slate-100'}`}>
                                            {pay.type}
                                         </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">₹{pay.amount?.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">{pay.manager || 'System'}</td>
                                      <td className="px-6 py-4 text-right">
                                         <p className="text-[10px] font-bold text-slate-400">{new Date(pay.$createdAt).toLocaleDateString()}</p>
                                         <p className="text-[9px] font-medium text-slate-300">{new Date(pay.$createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;
