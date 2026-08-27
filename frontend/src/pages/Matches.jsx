import { useEffect, useState } from 'react'
import api, { getImageUrl } from '../utils/api'
import { Sparkles, ArrowRight, MapPin, Images } from 'lucide-react'
import { Link } from 'react-router-dom'

function ScoreBar({ label, value }){
  const pct = Math.round(value)
  const color = pct >=75 ? 'bg-emerald-500' : pct>=50 ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <div>
      <div className="flex justify-between text-[11px] font-black tracking-widest text-slate-500"><span>{label}</span><span className="text-slate-700">{pct}%</span></div>
      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{width:`${pct}%`}}/></div>
    </div>
  )
}

export default function Matches(){
  const [pairs,setPairs]=useState([])
  const [threshold,setThreshold]=useState(50)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const fetchMatches=async()=>{
      setLoading(true)
      const r=await api.get(`/api/matches?threshold=${threshold}`)
      setPairs(r.data); setLoading(false)
    }
    fetchMatches()
  },[threshold])
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h1 className="display text-3xl font-extrabold tracking-tight flex items-center gap-2"><Sparkles className="text-teal-600"/> AI Matches</h1>
          <p className="text-slate-600 mt-1 max-w-2xl">Auto-ranked facial + contextual matches. Multi-photo reports: each lost photo vs each found photo → <b>best face score wins</b> (e.g. 3×2=6 comparisons). 128-D embeddings + age-adjusted scoring.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
          <span className="text-sm font-bold text-slate-700">Min confidence</span>
          <select value={threshold} onChange={e=>setThreshold(Number(e.target.value))} className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-bold bg-white">
            <option value={50}>50% Possible</option>
            <option value={70}>70% High</option>
            <option value={85}>85% Very High</option>
          </select>
        </div>
      </div>

      {loading ? <div className="py-20 text-center text-slate-500">Scanning {pairs.length} pairs across multiple photos...</div> : (
        <>
          <div className="mt-4 text-sm font-semibold text-slate-600">{pairs.length} potential pair{pairs.length!==1?'s':''} above {threshold}% • multi-photo best-of logic</div>
          <div className="mt-4 grid gap-4">
            {pairs.map((pair,idx)=>(
              <div key={idx} className="bg-white rounded-[20px] border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest ${pair.score>=85?'bg-emerald-600 text-white': pair.score>=70?'bg-teal-600 text-white':'bg-amber-500 text-white'}`}>{pair.level.label.toUpperCase()} • {pair.score}%</span>
                    <span className="text-xs font-semibold text-slate-600">{pair.level.action}</span>
                    {pair.lost.photoCount>1 || pair.found.photoCount>1 ? <span className="px-2 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold flex items-center gap-1"><Images size={12}/>{pair.lost.photoCount}×{pair.found.photoCount} photos → best face</span> : null}
                  </div>
                  <span className="text-xs font-bold text-slate-500">Pair #{idx+1}</span>
                </div>
                <div className="grid md:grid-cols-[1fr_auto_1fr_320px] gap-0">
                  {/* Lost */}
                  <div className="p-4 flex gap-4">
                    <div className="relative shrink-0">
                      <img src={getImageUrl(pair.lost.ageProgressedImage || pair.lost.imageUrl)} alt={pair.lost.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-200"/>
                      {pair.lost.photoCount>1 && <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center border-2 border-white"><Images size={10}/> {pair.lost.photoCount}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black tracking-widest text-amber-600">MISSING • {pair.lost.photoCount} photo{pair.lost.photoCount!==1?'s':''}</div>
                      <div className="font-extrabold text-slate-900 leading-tight">{pair.lost.name}</div>
                      <div className="text-xs font-semibold text-slate-600">{pair.lost.age} yrs at missing • now ~{pair.lost.age + Math.floor(pair.lost.yearsMissing)} • {pair.lost.gender}</div>
                      <div className="text-xs text-slate-500 mt-1 flex gap-1 items-start"><MapPin size={12} className="mt-0.5 shrink-0"/>{pair.lost.lastSeenLocation}</div>
                      {pair.lost.imageUrls?.length>1 && (
                        <div className="flex gap-1 mt-1.5">
                          {pair.lost.imageUrls.slice(0,4).map((u,i)=>(
                            <img key={i} src={getImageUrl(u)} alt={`lost thumb ${i}`} className="w-6 h-6 rounded-md object-cover border border-white shadow-sm"/>
                          ))}
                          {pair.lost.photoCount>4 && <span className="w-6 h-6 rounded-md bg-slate-100 border flex items-center justify-center text-[9px] font-black">+{pair.lost.photoCount-4}</span>}
                        </div>
                      )}
                      <Link to={`/lost/${pair.lost.id}`} className="inline-flex mt-2 text-xs font-bold text-amber-700 hover:underline">View lost gallery →</Link>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center px-2">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center"><ArrowRight size={18}/></div>
                  </div>
                  {/* Found */}
                  <div className="p-4 flex gap-4 bg-teal-50/40 md:bg-white border-t md:border-t-0 md:border-l border-slate-100">
                    <div className="relative shrink-0">
                      <img src={getImageUrl(pair.found.imageUrl)} alt={pair.found.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-teal-200"/>
                      {pair.found.photoCount>1 && <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-teal-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white"><Images size={10}/> {pair.found.photoCount}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black tracking-widest text-teal-600">FOUND • {pair.found.photoCount} photo{pair.found.photoCount!==1?'s':''}</div>
                      <div className="font-extrabold text-slate-900 leading-tight">{pair.found.name}</div>
                      <div className="text-xs font-semibold text-slate-600">{pair.found.estimatedAge} yrs (est) • {pair.found.gender}</div>
                      <div className="text-xs text-slate-500 mt-1 flex gap-1 items-start"><MapPin size={12} className="mt-0.5 shrink-0"/>{pair.found.foundLocation}</div>
                      {pair.found.imageUrls?.length>1 && (
                        <div className="flex gap-1 mt-1.5">
                          {pair.found.imageUrls.slice(0,4).map((u,i)=>(
                            <img key={i} src={getImageUrl(u)} alt={`found thumb ${i}`} className="w-6 h-6 rounded-md object-cover border border-white shadow-sm"/>
                          ))}
                          {pair.found.photoCount>4 && <span className="w-6 h-6 rounded-md bg-slate-100 border flex items-center justify-center text-[9px] font-black">+{pair.found.photoCount-4}</span>}
                        </div>
                      )}
                      <Link to={`/found/${pair.found.id}`} className="inline-flex mt-2 text-xs font-bold text-teal-700 hover:underline">View found gallery →</Link>
                    </div>
                  </div>
                  {/* Breakdown */}
                  <div className="p-4 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
                    <div className="text-xs font-black tracking-widest text-slate-500">MATCH BREAKDOWN • BEST OF {pair.lost.photoCount}×{pair.found.photoCount}</div>
                    <div className="mt-3 space-y-3">
                      <ScoreBar label="FACE SIMILARITY (BEST)" value={pair.breakdown.face}/>
                      <ScoreBar label="AGE PROXIMITY" value={pair.breakdown.age}/>
                      <ScoreBar label="GENDER" value={pair.breakdown.gender}/>
                      <ScoreBar label="LOCATION" value={pair.breakdown.location}/>
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-slate-500">Face = max cosine across all {pair.lost.photoCount*pair.found.photoCount} embedding pairs</div>
                    <div className="mt-4 flex gap-2">
                      <Link to={`/lost/${pair.lost.id}`} className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Compare</Link>
                      <a href={`tel:${pair.lost.contactPhone || ''}`} className="flex-1 text-center px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">Contact</a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {pairs.length===0 && (
              <div className="py-16 text-center bg-white rounded-[20px] border border-dashed border-slate-300">
                <p className="font-bold text-slate-700">No matches above {threshold}% yet</p>
                <p className="text-sm text-slate-500 mt-1">Try lowering threshold or add more photos — each additional photo improves recall.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
