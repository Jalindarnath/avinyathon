import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [role, setRole] = useState('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Pass the selected role (Admin/Manager) to the login context
      // Note: role is 'Admin' or 'Manager' from state, converting to lowercase for consistency
      await login(email, password, role.toLowerCase());
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-['Inter'] text-[#1b1c1c] bg-[#fbf9f8] overflow-hidden">
      {/* Injecting Fonts and Custom Grid via Style Tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
        
        .blueprint-grid {
          background-image: radial-gradient(circle, #ffffff10 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .text-shadow-premium {
          text-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `}</style>

      <main className="flex min-h-screen">
        {/* Left Side: Brand Anchor (Desktop Only) */}
        <section className="hidden lg:flex lg:w-3/5 relative items-center justify-center overflow-hidden bg-[#1c1917]">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Construction site" 
              className="w-full h-full object-cover opacity-60"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUKsZu3CsHEsnjkfUnEosFMc2cGmjpyWgvYCXyvycN0RnpNFoMk8gzRI3w1AUB3gc_hEcws9ddSzmj5wRKryt1_cg0pPf9jHOYVqlql7-7lPUu2G02PDm4CMXoXh7bz_3fjwdGIBGdNfF3ZAAvMSgwSK_oTFUGL--lcfUKWcJF6-zWD07eayEIJiToJyt8cR4PhoeYCyLLa4gT_nI_aXQVNCZtrlzviONmxCSPm7-OQdCwFOxSE5Kf1hvI_y4poRY1JB2OZWF5UJI" 
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0a09] via-[#1c1917]/60 to-transparent"></div>
            <div className="absolute inset-0 blueprint-grid opacity-20"></div>
          </div>

          <div className="relative z-10 px-16 w-full">
            <div className="flex flex-col gap-4">
              <div className="h-1 w-24 bg-[#f2711c] mb-4"></div>
              <h1 className="font-['Manrope'] font-extrabold text-7xl md:text-8xl text-white tracking-tighter leading-tight text-shadow-premium">
                Samarth<br/>Developers
              </h1>
              <p className="font-['Manrope'] text-2xl text-[#eae8e7] tracking-wide opacity-90 font-light max-w-lg">
                Constructing precision. Managing progress. Building legacies with architectural integrity.
              </p>
            </div>
          </div>

          <div className="absolute bottom-8 left-16 flex items-center gap-2 text-white/40 text-xs tracking-widest uppercase">
            <span className="material-symbols-outlined text-base">architecture</span>
            <span>System v4.0.2 // Precision Engineering</span>
          </div>
        </section>

        {/* Right Side: Login Canvas */}
        <section className="w-full lg:w-2/5 flex flex-col items-center justify-center p-6 sm:p-12 bg-[#fbf9f8]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12 text-center">
            <h2 className="font-['Manrope'] font-black text-3xl text-[#1c1917] tracking-tighter">Samarth Developers</h2>
            <div className="h-1 w-12 bg-[#9e4300] mx-auto mt-2"></div>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-xl shadow-sm border border-[#f0eded]">
            <header className="mb-10">
              <h3 className="font-['Manrope'] text-3xl font-bold text-[#1b1c1c] tracking-tight mb-2">Welcome Back</h3>
              <p className="text-[#584237] text-sm">Access your project management dashboard.</p>
            </header>

            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Role Toggle */}
              <div className="bg-[#f6f3f2] p-1 rounded-lg flex items-center mb-8">
                <button 
                  type="button"
                  onClick={() => setRole('Admin')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${role === 'Admin' ? 'bg-white text-[#9e4300] shadow-sm' : 'text-[#584237]'}`}
                >
                  Admin
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('Manager')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${role === 'Manager' ? 'bg-white text-[#9e4300] shadow-sm' : 'text-[#584237]'}`}
                >
                  Manager
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg font-medium border border-red-100">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[#584237] uppercase tracking-widest">Email Address</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    placeholder="name@samarth.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#f6f3f2] border-none focus:ring-0 rounded-lg py-3.5 px-4 text-[#1b1c1c] placeholder:text-[#dfc0b2] transition-colors"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#9e4300] transition-all duration-300 group-focus-within:w-full"></div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-[#584237] uppercase tracking-widest">Password</label>
                  <a href="#" className="text-xs font-semibold text-[#9e4300] hover:underline">Forgot Password?</a>
                </div>
                <div className="relative group">
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#f6f3f2] border-none focus:ring-0 rounded-lg py-3.5 px-4 text-[#1b1c1c] placeholder:text-[#dfc0b2] transition-colors"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#9e4300] transition-all duration-300 group-focus-within:w-full"></div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-b from-[#f2711c] to-[#9e4300] text-white font-['Manrope'] font-bold py-4 px-6 rounded-lg shadow-lg shadow-[#9e4300]/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Logging in...' : 'Login to Dashboard'}
                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </button>
            </form>
          </div>

          {/* Testing Credentials Box */}
          <div className="w-full max-w-md mt-6 bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
            <h4 className="text-red-600 font-bold text-sm mb-2 uppercase tracking-wide">Testing purpose only</h4>
            <div className="space-y-2 text-sm text-red-800">
              <p><strong>Admin ID:</strong> admin@samarthdev.com <br /> <strong>Password:</strong> admin@#$</p>
              <p><strong>Manager ID:</strong> mgsumit@dev.com <br /> <strong>Password:</strong> managersumit123</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 flex gap-6 text-[10px] text-[#8c7265] uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-[#9e4300]">Privacy Protocol</a>
            <a href="#" className="hover:text-[#9e4300]">Terms of Site</a>
            <span>© 2024 Samarth Dev.</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;