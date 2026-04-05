import { useState, useEffect } from "react";
import { CreditCard, IndianRupee, Users, HardHat, CheckCircle, MinusCircle, History } from "lucide-react";
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
        const salary = e.salary || 0;
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

      // Fetch history if admin or someone wants to see it
      if (isAdmin) {
         const histRes = await getAllPayments();
         setPaymentHistory(histRes.documents || []);
      } else if (selectedSite) {
         const histRes = await getPaymentsBySite(selectedSite.$id);
         setPaymentHistory(histRes.documents || []);
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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
        <div className="p-8">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-2xl">
                  <IndianRupee className="text-orange-800" size={24} />
                </div>
                Payroll & Finance
              </h3>
              <p className="text-slate-500 text-sm mt-2 font-medium">
                Manage payouts and deductions for your site workforce.
              </p>
            </div>
            <div className="flex items-center gap-4">
               {isEndOfMonth ? (
                 <span className="text-emerald-700 bg-emerald-50 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-emerald-100">
                    ✓ Salaries Unlocked
                 </span>
               ) : (
                 <span className="text-slate-400 bg-slate-50 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border border-slate-100">
                    🔒 Salaries Locked
                 </span>
               )}
            </div>
          </div>

                <div className="flex gap-2 mb-8 bg-slate-50 p-1.5 rounded-2xl w-fit border border-slate-100">
            {!isAdmin && (
              <>
                <button 
                  onClick={() => setActiveTab('payouts')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payouts' ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Issue Payouts
                </button>
                <button 
                  onClick={() => setActiveTab('deductions')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'deductions' ? 'bg-white text-red-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Deductions
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="flex items-center gap-2 font-black uppercase"><History size={14}/> {isAdmin ? 'Global History' : 'Site History'}</div>
            </button>
          </div>

          {!selectedSite && !isAdmin ? (
             <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest">Select a site to manage payroll</div>
          ) : loading ? (
             <div className="text-center py-20 text-slate-300 font-black animate-pulse">Loading Workforce Data...</div>
          ) : (
             <div className="space-y-12">
                {activeTab === 'payouts' ? (
                  <>
                    {/* Labour Section */}
                    <div>
                       <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
                         <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div> Laborers Wages
                       </h4>
                       <div className="overflow-x-auto rounded-3xl border border-slate-100">
                         <table className="w-full text-left">
                           <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                             <tr>
                               <th className="px-6 py-5">Personnel</th>
                               <th className="px-6 py-5 text-center">Attendance</th>
                               <th className="px-6 py-5 text-right">Gross Pay</th>
                               <th className="px-6 py-5 text-right text-red-600">Deductions</th>
                               <th className="px-6 py-5 text-right">Net Payable</th>
                               <th className="px-6 py-5 text-right">Action</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {personnel.filter(p => p._type === 'labour').length === 0 ? (
                                 <tr><td colSpan="6" className="text-center py-10 text-slate-300 text-xs font-bold uppercase">No laborers found for this site.</td></tr>
                              ) : personnel.filter(p => p._type === 'labour').map(person => {
                                 const canPay = isWeekend && person.presentDays > 0;
                                 return (
                                   <tr key={person.$id} className="hover:bg-slate-50/50 transition-colors group">
                                     <td className="px-6 py-5">
                                        <div className="font-bold text-slate-900">{person.name}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                          {person.role} {isAdmin && !selectedSite && <span className="text-orange-800 ml-1">(@ {person.siteId?.substring(0,8)})</span>}
                                        </div>
                                     </td>
                                     <td className="px-6 py-5 text-center">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${person.presentDays >= 7 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-orange-700 bg-orange-50 border border-orange-100'}`}>
                                          {person.presentDays} Days
                                       </span>
                                     </td>
                                     <td className="px-6 py-5 text-sm font-bold text-slate-600 text-right">₹{person.grossPay.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-sm font-bold text-red-500 text-right">-₹{person.deductions.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-sm font-black text-slate-900 text-right">₹{person.payableAmount.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-right">
                                        <button
                                          onClick={() => handlePay(person)}
                                          disabled={!canPay || processing === person.$id}
                                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            canPay ? 'bg-orange-800 text-white shadow-xl shadow-orange-900/10 hover:bg-orange-950 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                          }`}
                                        >
                                          {processing === person.$id ? '...' : (canPay ? 'Issue' : 'Weekend Only')}
                                        </button>
                                     </td>
                                   </tr>
                                 )
                              })}
                           </tbody>
                         </table>
                       </div>
                    </div>

                    {/* Engineer Section */}
                    <div>
                       <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div> Engineers Salary
                       </h4>
                       <div className="overflow-x-auto rounded-3xl border border-slate-100">
                         <table className="w-full text-left">
                           <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                             <tr>
                               <th className="px-6 py-5">Personnel</th>
                               <th className="px-6 py-5 text-right">Monthly Sal.</th>
                               <th className="px-6 py-5 text-right text-red-600">Deductions</th>
                               <th className="px-6 py-5 text-right">Net Payable</th>
                               <th className="px-6 py-5 text-right">Action</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {personnel.filter(p => p._type === 'engineer').length === 0 ? (
                                 <tr><td colSpan="5" className="text-center py-10 text-slate-300 text-xs font-bold uppercase">No engineers found.</td></tr>
                              ) : personnel.filter(p => p._type === 'engineer').map(person => {
                                 const canPay = isEndOfMonth;
                                 return (
                                   <tr key={person.$id} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-6 py-5">
                                        <div className="font-bold text-slate-900">{person.name}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                          {person.specialization || person.role || 'General'} {isAdmin && !selectedSite && <span className="text-orange-800 ml-1">(@ {person.siteId?.substring(0,8)})</span>}
                                        </div>
                                     </td>
                                     <td className="px-6 py-5 text-sm font-bold text-slate-600 text-right">₹{person.salary.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-sm font-bold text-red-500 text-right">-₹{person.deductions.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-sm font-black text-slate-900 text-right">₹{person.payableAmount.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-right">
                                        <button
                                          onClick={() => handlePay(person)}
                                          disabled={!canPay || processing === person.$id}
                                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            canPay ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 hover:bg-black active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                          }`}
                                        >
                                          {processing === person.$id ? '...' : (canPay ? 'Issue' : 'Month End')}
                                        </button>
                                     </td>
                                   </tr>
                                 )
                              })}
                           </tbody>
                         </table>
                       </div>
                    </div>
                  </>
                 ) : activeTab === 'deductions' ? (
                   // ... (Rest of deduction UI is kept, I need to wrap it better)
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                     {/* ... (Existing deduction form UI content starts here) */}
                     <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                        <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                           <MinusCircle className="text-red-600" /> New Deduction
                        </h4>
                        <form onSubmit={handleDeduct} className="space-y-6">
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Workforce Personnel</label>
                              <select 
                                 value={deductionTarget}
                                 onChange={(e) => setDeductionTarget(e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                 <option value="">Select Personnel...</option>
                                 <optgroup label="Engineers">
                                    {personnel.filter(p => p._type === 'engineer').map(p => (
                                       <option key={p.$id} value={p.$id}>{p.name} (Engineer)</option>
                                    ))}
                                 </optgroup>
                                 <optgroup label="Laborers">
                                    {personnel.filter(p => p._type === 'labour').map(p => (
                                       <option key={p.$id} value={p.$id}>{p.name} (Labor)</option>
                                    ))}
                                 </optgroup>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Deduction Amount (₹)</label>
                              <input 
                                 type="number"
                                 placeholder="e.g. 500"
                                 value={deductionAmount}
                                 onChange={(e) => setDeductionAmount(e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Reason / Description</label>
                              <textarea 
                                 placeholder="e.g. Advance given, Equipment damage, etc."
                                 value={deductionReason}
                                 onChange={(e) => setDeductionReason(e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                              ></textarea>
                           </div>
                           <button 
                              type="submit"
                              disabled={processing === "deduction"}
                              className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-900/10 hover:bg-red-700 transition-all uppercase tracking-widest text-xs active:scale-95"
                           >
                              {processing === "deduction" ? "Recording..." : "Record Deduction"}
                           </button>
                        </form>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                              <History size={14} /> Deduction Policy
                           </h4>
                           <p className="text-sm font-medium text-slate-600 leading-relaxed">
                              Deductions recorded here will be automatically **subtracted** from the site's total expenses in SiteFinance. This helps in tracking advances or fines while maintaining an accurate budget overview.
                           </p>
                           <div className="mt-8 grid grid-cols-2 gap-4">
                              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                 <p className="text-[10px] font-black text-orange-600 uppercase mb-1">Labour Advances</p>
                                 <p className="text-xs font-bold text-slate-700">Tracks partial pre-payments</p>
                              </div>
                              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                                 <p className="text-[10px] font-black text-red-600 uppercase mb-1">Fines/Losses</p>
                                 <p className="text-xs font-bold text-slate-700">Accounts for penalties</p>
                              </div>
                           </div>
                        </div>
                     </div>
                   </div>
                ) : (
                   <div className="animate-in fade-in duration-500">
                      <div className="overflow-x-auto rounded-3xl border border-slate-100">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                               <tr>
                                  <th className="px-6 py-5">Payout To</th>
                                  <th className="px-6 py-5">Project Site</th>
                                  <th className="px-6 py-5">Type</th>
                                  <th className="px-6 py-5 text-right">Amount (₹)</th>
                                  <th className="px-6 py-5 text-right">Authorized By</th>
                                  <th className="px-6 py-5 text-right">Timestamp</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {paymentHistory.length === 0 ? (
                                  <tr><td colSpan="6" className="text-center py-10 text-slate-300 font-bold uppercase tracking-widest">No payout history available.</td></tr>
                               ) : paymentHistory.map(pay => (
                                  <tr key={pay.$id} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-6 py-5">
                                        <p className="font-bold text-slate-900">{pay.personName || pay.personId.substring(0,8)}</p>
                                        <p className="text-[10px] text-slate-400 font-black">{pay.$id}</p>
                                     </td>
                                     <td className="px-6 py-5">
                                        <span className="text-[10px] font-black uppercase text-indigo-700 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">{pay.siteId?.substring(0,8)}</span>
                                     </td>
                                     <td className="px-6 py-5">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${pay.type === 'labour' ? 'text-orange-700 bg-orange-50 border border-orange-100' : 'text-slate-800 bg-slate-100 border border-slate-200'}`}>
                                           {pay.type}
                                        </span>
                                     </td>
                                     <td className="px-6 py-5 text-sm font-black text-slate-900 text-right">₹{pay.amount?.toLocaleString()}</td>
                                     <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{pay.manager || 'Admin'}</td>
                                     <td className="px-6 py-5 text-[10px] font-bold text-slate-400 text-right">{new Date(pay.$createdAt).toLocaleString()}</td>
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
