export default function StatCard({ label, value, sub, icon, accent }){
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 items-start">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
