import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Shield, Menu, X, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function Navbar(){
  const [open,setOpen]=useState(false)
  const loc=useLocation()
  const nav = useNavigate()
  const links = [
    { to:'/', label:'Home' },
    { to:'/lost', label:'Lost Persons' },
    { to:'/found', label:'Found Persons' },
    { to:'/matches', label:'AI Matches' },
  ]
  const isActive=(p)=> loc.pathname===p ? 'text-teal-600 bg-teal-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-teal-700 flex items-center justify-center text-white font-black tracking-widest text-sm">C</div>
          <span className="display font-extrabold text-xl tracking-tight">CHRONO</span>
          <span className="hidden sm:inline-flex ml-2 text-xs font-bold tracking-widest text-white bg-slate-900 px-2.5 py-1 rounded-full border border-slate-700">POLICE EDITION</span>
          <span className="hidden lg:inline-flex text-[10px] font-bold tracking-widest text-teal-700 bg-teal-50 px-2 py-1 rounded-full border border-teal-200">AI REUNITE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l=> (
            <Link key={l.to} to={l.to} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${isActive(l.to)}`}>{l.label}</Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button onClick={()=>nav('/report-lost')} className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-black transition">Report Lost</button>
          <button onClick={()=>nav('/report-found')} className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition flex items-center gap-1.5"><Sparkles size={16}/> Report Found</button>
        </div>

        <button className="md:hidden p-2 rounded-lg border border-slate-200" onClick={()=>setOpen(!open)}>{open?<X size={18}/>:<Menu size={18}/>}</button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-2">
          {links.map(l=> (
            <Link key={l.to} onClick={()=>setOpen(false)} to={l.to} className={`block px-3 py-2.5 rounded-xl font-semibold ${isActive(l.to)}`}>{l.label}</Link>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link onClick={()=>setOpen(false)} to="/report-lost" className="text-center px-4 py-3 rounded-xl bg-slate-900 text-white font-bold">Report Lost</Link>
            <Link onClick={()=>setOpen(false)} to="/report-found" className="text-center px-4 py-3 rounded-xl bg-teal-600 text-white font-bold">Report Found</Link>
          </div>
        </div>
      )}
    </header>
  )
}
