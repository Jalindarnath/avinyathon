import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import { CalendarCheck, Users, HardHat, CheckCircle2, XCircle, Loader2,Clock, Globe, Briefcase, Activity ,LogOut} from 'lucide-react';
import { useSite } from "../../context/SiteContext";
import { useAuth } from "../../context/AuthContext";
import { getWorkersBySite, updateWorker } from "../../../appwrite/services/worker.service.js";
import { getEngineersBySite, updateEngineer } from "../../../appwrite/services/engineer.service.js";
import { addAttendance, updateAttendance, getAttendanceBySiteAndDate, getAttendanceBySite } from "../../../appwrite/services/attendance.service.js";

const Attendance = () => {
  const { selectedSite, sites } = useSite();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  const [personnel, setPersonnel] = useState([]);
  const [dbRecords, setDbRecords] = useState({}); // mapped by personId for finalized records
  const [localStatuses, setLocalStatuses] = useState({}); // local state before submit
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Admin Global Stats
  const [globalStats, setGlobalStats] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  
  // Calculate Local Day's UTC bounds for precise locking
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  useEffect(() => {
    fetchData();
  }, [selectedSite]);

  useEffect(() => {
    if (isAdmin && sites.length > 0) {
      fetchGlobalStats();
    }
  }, [isAdmin, sites]);

  const fetchGlobalStats = async () => {
    setLoadingGlobal(true);
    try {
      const stats = await Promise.all(sites.map(async (site) => {
        const res = await getAttendanceBySite(site.$id);
        const presentRecords = res.documents.filter(r => r.status === 'present').length;
        const totalRecords = res.documents.length;
        return {
          id: site.$id,
          name: site.siteName || site.name,
          percentage: totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : "0",
          total: totalRecords
        };
      }));
      setGlobalStats(stats);
    } catch (e) {
      console.error("Global stats error:", e);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchData = async () => {
    if (!selectedSite) {
      setPersonnel([]);
      setDbRecords({});
      setLocalStatuses({});
      setLoading(false);
      setIsLocked(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch today's context within local midnight bounds
      const attendanceRes = await getAttendanceBySiteAndDate(selectedSite.$id, startOfDay, endOfDay);
      const recordsMap = {};
      const hasRecords = attendanceRes.documents.length > 0;
      
      attendanceRes.documents.forEach(record => {
        recordsMap[record.personId] = record;
      });
      setDbRecords(recordsMap);
      setIsLocked(hasRecords);

      // 2. Fetch Workers and Engineers
      const [workersRes, engineersRes] = await Promise.all([
        getWorkersBySite(selectedSite.$id),
        getEngineersBySite(selectedSite.$id)
      ]);

      const workers = (workersRes.documents || []).map(w => ({ ...w, _type: 'labour' }));
      const engineers = (engineersRes.documents || []).map(e => ({ ...e, _type: 'engineer' }));
      
      let combined = [...engineers, ...workers];
      
      // Initialize local statuses for everyone to be "absent" by default to prevent missing blanks
      const initialLocal = {};
      combined.forEach(p => {
        initialLocal[p.$id] = "absent";
      });
      setLocalStatuses(initialLocal);
      
      setPersonnel(combined);
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (personId, newStatus) => {
    if (isLocked) return;
    setLocalStatuses(prev => ({
      ...prev,
      [personId]: newStatus
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedSite || !user || isLocked) return;
    
    setSubmitting(true);
    
    // Fresh check before processing to ensure no one else submitted in the meantime
    try {
      const checkRes = await getAttendanceBySiteAndDate(selectedSite.$id, startOfDay, endOfDay);
      if (checkRes.documents.length > 0) {
        const recordsMap = {};
        checkRes.documents.forEach(record => {
          recordsMap[record.personId] = record;
        });
        setDbRecords(recordsMap);
        setIsLocked(true);
        setSubmitting(false);
        alert("Action Aborted: Attendance has already been finalized for today.");
        return;
      }
    } catch (err) {
      console.error("Verification failed:", err);
    }

    if (!window.confirm("Submit today's attendance? You cannot edit records once submitted.")) {
      setSubmitting(false);
      return;
    }

    try {
      // Batch create all records and update present days
      const promises = personnel.map(async (person) => {
        const markedStatus = localStatuses[person.$id] || "absent";
        
        const attendancePromise = addAttendance({
          type: person._type,
          status: markedStatus,
          manager: user?.name || "Admin",
          date: new Date().toISOString(),
          siteId: selectedSite.$id,
          personId: person.$id
        });

        if (markedStatus === "present") {
          const newPresentDays = String(parseInt(person.presentDays || "0", 10) + 1);
          if (person._type === "labour") {
            await updateWorker(person.$id, { presentDays: newPresentDays });
          } else if (person._type === "engineer") {
            await updateEngineer(person.$id, { presentDays: newPresentDays });
          }
        }
        return attendancePromise;
      });

      await Promise.all(promises);
      
      alert("Attendance saved successfully!");
      fetchData(); // Refreshes and locks the view
    } catch (error) {
      console.error("Error saving batch attendance:", error);
      alert("Failed to save attendance. Check permissions in Appwrite Console.");
    } finally {
      setSubmitting(false);
    }
  };

  const StatusButton = ({ personId, status, currentStatus, icon: Icon, activeColorClass, defaultColorClass }) => {
    const isActive = currentStatus === status;
    
    return (
      <button 
        disabled={isLocked || submitting}
        onClick={() => handleStatusChange(personId, status)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border capitalize ${
          isActive 
            ? activeColorClass 
            : `${defaultColorClass} opacity-70 ${!isLocked && 'hover:opacity-100'}`
        } ${isLocked || submitting ? 'cursor-not-allowed grayscale-[0.5]' : ''}`}
      >
        <Icon size={14} /> {status}
      </button>
    );
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Attendance Protocol</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Site Attendance Ledger</h2>
          <p className="text-slate-500 text-sm font-medium">Record daily presence for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        </div>

        <div className="flex items-center gap-4">
           {!isLocked && personnel.length > 0 && !isAdmin && (
              <button 
                onClick={handleSubmitAttendance}
                disabled={submitting}
                className="bg-[#f2711c] hover:bg-[#d96215] text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> {submitting ? 'Finalizing...' : 'Submit Today\'s Record'}
              </button>
           )}
           {isLocked && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg border border-emerald-100 text-xs font-bold uppercase tracking-widest">
                 <CheckCircle2 size={14} /> Records Sealed
              </div>
           )}
           <div className="flex items-center gap-4 border-l border-slate-200 pl-4 ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{isAdmin ? 'System Admin' : 'Site Manager'}</p>
              </div>

           </div>
        </div>
      </header>

      {/* Admin Portfolio Insights */}
      {isAdmin && globalStats.length > 0 && (
        <div className="mb-10 space-y-6">
           <div className="flex items-center gap-3">
              <Activity size={18} className="text-[#f2711c]" />
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Global Attendance Metrics</h4>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {globalStats.map(stat => (
                <div key={stat.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{stat.name}</p>
                   <div className="flex items-baseline gap-1">
                      <h5 className="text-3xl font-bold text-slate-800">{stat.percentage}%</h5>
                   </div>
                   
                   <div className="mt-4">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                         <div 
                           className="bg-[#f2711c] h-full rounded-full transition-all duration-700" 
                           style={{ width: `${stat.percentage}%` }}
                         />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.total} RECORDS MARKED</span>
                      </div>
                   </div>
                   <Globe size={60} className="text-slate-50 absolute -right-2 -bottom-2 rotate-12 opacity-50 transition-transform group-hover:rotate-45" />
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Ledger Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
               <Briefcase size={18} className="text-[#f2711c]" />
               <h4 className="font-bold text-slate-800">Workforce Presence Log</h4>
            </div>
            {!isLocked && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 <Clock size={12} /> Live Input Mode
              </div>
            )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100 italic-none">
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                <th className="px-6 py-4">Personnel Identity</th>
                <th className="px-6 py-4">Functional Type</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Current Disposition</th>
                <th className="px-6 py-4 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-none">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Syncing Personnel Data...</p>
                    </div>
                  </td>
                </tr>
              ) : personnel.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-400 text-xs font-medium italic-none">
                    No workforce personnel detected for the current site filter.
                  </td>
                </tr>
              ) : (
                personnel.map((person) => {
                  const currentStatus = isLocked 
                      ? dbRecords[person.$id]?.status || "unmarked" 
                      : localStatuses[person.$id] || "absent";
                  
                  return (
                    <tr key={person.$id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border ${
                            person._type === 'engineer' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-orange-50 border-orange-100 text-[#f2711c]'
                          }`}>
                            {person.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{person.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">UID: {person.$id.substring(0, 10)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5 w-max uppercase border ${
                          person._type === 'engineer' ? 'bg-slate-800 text-white border-slate-700' : 'bg-orange-50 text-[#f2711c] border-orange-100'
                        }`}>
                          {person._type === 'engineer' ? <HardHat size={12}/> : <Users size={12}/>}
                          {person._type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">
                           {person.role || 'General Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${
                          currentStatus === 'present' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                          currentStatus === 'absent' ? 'text-rose-700 bg-rose-50 border-rose-100' : 
                          'text-slate-400 bg-slate-50 border-slate-100'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <StatusButton 
                            personId={person.$id} 
                            status="present" 
                            currentStatus={currentStatus} 
                            icon={CheckCircle2} 
                            activeColorClass="bg-emerald-50 border-emerald-200 text-emerald-700" 
                            defaultColorClass="bg-white border-slate-200 text-slate-400"
                          />
                          <StatusButton 
                            personId={person.$id} 
                            status="absent" 
                            currentStatus={currentStatus} 
                            icon={XCircle} 
                            activeColorClass="bg-rose-50 border-rose-200 text-rose-700" 
                            defaultColorClass="bg-white border-slate-200 text-slate-400"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
