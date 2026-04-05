// src/components/StatCard.jsx
import PropTypes from 'prop-types';

export default function StatCard({ title, value, subtitle, trend, icon: Icon, colorClass, badge }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        {/* Consistent icon container with dynamic colors */}
        <div className={`p-2.5 rounded-lg ${colorClass || 'bg-slate-50 text-slate-600'}`}>
          <Icon size={20} />
        </div>
        {badge && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            badge === 'Attention' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      <div className="mt-3 flex items-center gap-2">
        {trend && <span className="text-emerald-500 text-[10px] font-bold">{trend}</span>}
        <span className="text-slate-400 text-[10px] font-medium tracking-tight uppercase">{subtitle}</span>
      </div>
    </div>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  trend: PropTypes.string,
  icon: PropTypes.elementType.isRequired,
  colorClass: PropTypes.string,
  badge: PropTypes.string,
};