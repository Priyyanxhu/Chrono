import { useEffect, useState } from 'react'
import api from '../utils/api'
import PersonCard from '../components/PersonCard'
import { Search, Filter, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Lost(){
  const [data,setData]=useState([])
  const [q,setQ]=useState('')
  const [gender,setGender]=useState('')
  const [loading,setLoading]=useState(true)
  const nav=useNavigate()
  const fetchData=async()=>{
    setLoading(true)
    const params=new URLSearchParams()
    if(q) params.set('search',q)
    if(gender) params.set('gender',gender)
    const r=await api.get(`/api/lost?${params.toString()}`)
    setData(r.data); setLoading(false)
  }
  useEffect(()=>{ fetchData() },[])
  const onSearch=(e)=>{
    e.preventDefault(); fetchData()
  }
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-extrabold tracking-tight">Lost Persons</h1>
          <p className="text-slate-600 mt-1">Missing person reports — AI age progression applied automatically for 2+ year cases.</p>
        </div>
        <button onClick={()=>nav('/report-lost')} className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm">+ Report Lost</button>
      </div>

      <form onSubmit={onSearch} className="mt-6 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, location, description..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"/>
        </div>
        <select value={gender} onChange={e=>setGender(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold">
          <option value="">All genders</option><option>Male</option><option>Female</option><option>Other</option>
        </select>
        <button className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm">Search</button>
      </form>

      {loading ? <div className="py-20 text-center text-slate-500">Loading...</div> : (
        <>
          <div className="mt-4 text-sm font-semibold text-slate-600">{data.length} report{data.length!==1?'s':''} found</div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {data.map(p=> (
              <PersonCard key={p.id} person={p} type="lost" onViewMatches={(person)=> nav(`/lost/${person.id}`)} />
            ))}
          </div>
          {data.length===0 && <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 mt-6"><p className="font-bold text-slate-700">No missing reports yet</p><p className="text-sm text-slate-500 mt-1">Be the first to create one.</p></div>}
        </>
      )}
    </div>
  )
}
