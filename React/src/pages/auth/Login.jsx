import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Building2, ShieldCheck, HardHat, Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const Login = () => {
  const [activeTab, setActiveTab] = useState("manager");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPending(true);

    try {
      const success = await login(email, password, activeTab);
      if (success) {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex w-[400px] flex-shrink-0 flex-col justify-between p-12 bg-gradient-to-br from-orange-950 via-orange-900 to-orange-800 text-white relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-8">
            <Building2 size={28} className="text-orange-200" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Samarth Developers</h1>
          <div className="h-1 w-12 bg-orange-500 rounded-full mb-6"></div>
          <p className="text-orange-100/70 leading-relaxed text-lg max-w-xs">
            The next generation of site management. Efficient, secure, and intuitive.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="font-bold text-orange-200 text-sm uppercase tracking-wider mb-2">Manager Access</h3>
            <p className="text-xs text-orange-100/60 leading-relaxed">
              Handle day-to-day operations, site updates, and team coordination.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="font-bold text-orange-200 text-sm uppercase tracking-wider mb-2">Admin Control</h3>
            <p className="text-xs text-orange-100/60 leading-relaxed">
              Full system oversight, financial management, and high-level decisions.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            © 2026 SAMARTH DEVELOPERS GROUP
          </p>
        </div>
      </div>

      {/* ── Right Auth Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        
        <div className="w-full max-w-md">
          {/* header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Choose your portal to continue</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => { setActiveTab("manager"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "manager"
                  ? "bg-white text-orange-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <HardHat size={18} className={activeTab === "manager" ? "text-orange-600" : ""} />
              Manager
            </button>
            <button
              onClick={() => { setActiveTab("admin"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "admin"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShieldCheck size={18} className={activeTab === "admin" ? "text-indigo-600" : ""} />
              Admin
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="mt-0.5">⚠️</div>
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-orange-950/10 transition-all transform active:scale-[0.98] ${
                activeTab === "manager"
                  ? "bg-orange-800 hover:bg-orange-900"
                  : "bg-indigo-700 hover:bg-indigo-800"
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {pending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {activeTab === "manager" ? (
             <p className="mt-8 text-center text-slate-500 text-sm">
                Don't have a manager account?{" "}
                <Link to="/signup" className="text-orange-800 font-bold hover:underline underline-offset-4">
                  Create one now
                </Link>
              </p>
          ) : (
            <div className="mt-8 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-3">
              <ShieldCheck size={16} className="text-indigo-600" />
              <p className="text-[11px] text-indigo-700 font-medium">
                Admin credentials are fixed for system security. Contact IT if you need access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;