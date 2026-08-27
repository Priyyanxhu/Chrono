import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sparkles, ShieldCheck, Clock, Users, ArrowRight, Upload, Eye, HeartHandshake } from 'lucide-react'
import api from '../utils/api'
import StatCard from '../components/StatCard'

export default function Home(){
  const [stats,setStats]=useState(null)
  const nav=useNavigate()
  useEffect(()=>{
    api.get('/api/stats').then(r=>setStats(r.data)).catch(()=>{})
  },[])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-800/30 via-transparent to-transparent"></div>
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:"url('https://grainy-gradients.vercel.app/noise.svg')"}}></div>
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              POLICE EDITION • AI REUNIFICATION • 92.4% ACCURACY
            </div>
            <h1 className="display text-[42px] sm:text-[54px] leading-[0.95] font-extrabold tracking-tight mt-4">
              Built for<br/>
              <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">Police</span> —<br/>
              Every missing<br/>
              person deserves<br/>
              <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">to be found.</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mt-4 max-w-[560px]">
              <span className="text-white font-semibold">CHRONO Police Edition</span> uses advanced facial recognition + <span className="text-white font-semibold">AI age progression</span> to match lost and found persons — even if 4, 7, or 10 years have passed. Built for control rooms, thanas, and IOs. Upload FIR-linked photos today.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={()=>nav('/report-lost')} className="px-7 py-3.5 rounded-full bg-white text-slate-900 font-extrabold text-sm tracking-wide hover:bg-slate-100 transition inline-flex items-center gap-2">
                Report Lost Person <ArrowRight size={18}/>
              </button>
              <button onClick={()=>nav('/report-found')} className="px-7 py-3.5 rounded-full bg-teal-500 text-white font-extrabold text-sm tracking-wide hover:bg-teal-600 transition inline-flex items-center gap-2">
                <Sparkles size={18}/> Report Found Person
              </button>
            </div>

            <div className="flex flex-wrap gap-6 mt-8 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-300"><ShieldCheck size={18} className="text-teal-400"/> Police Control Room Ready</span>
              <span className="inline-flex items-center gap-2 text-slate-300"><Clock size={18} className="text-teal-400"/> 2.4s avg. match time</span>
              <span className="inline-flex items-center gap-2 text-slate-300"><Users size={18} className="text-teal-400"/> FIR-linked Case Tracking</span>
            </div>
          </div>

          {/* Visual card stack */}
          <div className="relative lg:h-[520px] flex items-center justify-center">
            <div className="relative w-[340px] sm:w-[420px]">
              {/* back card */}
              <div className="absolute -rotate-3 top-6 left-6 right-0 h-[380px] bg-white/10 backdrop-blur rounded-[24px] border border-white/15"></div>
              <div className="absolute rotate-2 top-3 left-3 right-3 h-[380px] bg-teal-500/20 backdrop-blur rounded-[24px] border border-teal-400/20"></div>
              {/* front card */}
              <div className="relative bg-white rounded-[24px] overflow-hidden shadow-2xl border border-slate-200">
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-black tracking-widest">CHRONO • LIVE MATCH</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500">94.2% MATCH</span>
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="p-4 border-r border-slate-100">
                    <div className="text-[11px] font-black tracking-widest text-amber-600">MISSING • 5 YEARS AGO</div>
                    <img src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&h=300&fit=crop&crop=face" alt="lost" className="w-full h-[150px] object-cover rounded-xl mt-2"/>
                    <div className="text-sm font-extrabold mt-2">Aarav, 8 → 13 now</div>
                    <div className="text-xs text-slate-500">Delhi • AI aged projection</div>
                  </div>
                  <div className="p-4">
                    <div className="text-[11px] font-black tracking-widest text-teal-600">FOUND • 5 DAYS AGO</div>
                    <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face" alt="found" className="w-full h-[150px] object-cover rounded-xl mt-2"/>
                    <div className="text-sm font-extrabold mt-2">Unidentified Boy</div>
                    <div className="text-xs text-slate-500">Nizamuddin Station</div>
                  </div>
                </div>
                <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5"><HeartHandshake size={16}/> High confidence — verify now</span>
                  <Link to="/matches" className="text-sm font-black text-emerald-700">View →</Link>
                </div>
                <div className="px-4 py-3 bg-slate-50 grid grid-cols-3 gap-3 text-center border-t">
                  <div><div className="text-xs font-bold text-slate-500">FACE</div><div className="text-sm font-black">96%</div></div>
                  <div><div className="text-xs font-bold text-slate-500">AGE</div><div className="text-sm font-black">89%</div></div>
                  <div><div className="text-xs font-bold text-slate-500">LOCATION</div><div className="text-sm font-black">76%</div></div>
                </div>
              </div>

              {/* floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10">
                <div className="text-xs font-bold tracking-widest opacity-70">AI AGE PROGRESSION</div>
                <div className="text-sm font-black">4-10 year projection</div>
              </div>
              <div className="absolute -top-3 -right-3 bg-white px-3 py-2 rounded-full shadow-xl border text-sm font-black flex items-center gap-2">
                <Sparkles size={16} className="text-teal-600"/> 128-D Face Embedding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Active Missing" value={stats? stats.activeLost : '—'} sub="Awaiting match" icon={<Search size={20} className="text-amber-600"/>} accent="bg-amber-100 border border-amber-200" />
          <StatCard label="Found & Waiting" value={stats? stats.pendingFound : '—'} sub="Unidentified persons" icon={<Eye size={20} className="text-teal-600"/>} accent="bg-teal-100 border border-teal-200" />
          <StatCard label="High Matches" value={stats? stats.highMatches : '—'} sub=">70% confidence" icon={<Sparkles size={20} className="text-violet-600"/>} accent="bg-violet-100 border border-violet-200" />
          <StatCard label="Reunited" value={stats? stats.reunited : '—'} sub="Families together" icon={<HeartHandshake size={20} className="text-emerald-600"/>} accent="bg-emerald-100 border border-emerald-200" />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="display text-3xl font-extrabold tracking-tight">How CHRONO works</h2>
            <p className="text-slate-600 mt-2 max-w-2xl">Three steps. Cutting-edge vision AI does the heavy lifting — you just upload and verify.</p>
          </div>
          <Link to="/matches" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm">See Live Matches <ArrowRight size={16}/></Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { n:'01', title:'FIR & Photo Intake', desc:'IO registers missing case with FIR No., Thana, and 1-8 photos. CHRONO extracts 128-D face embedding per photo instantly.', icon:<Upload size={22}/> , color:'bg-slate-900' },
            { n:'02', title:'AI Age Progression', desc:'If missing 4+ years, CHRONO generates current-age projection (GAN) so old photos match today — per photo, 38% boost.', icon:<Sparkles size={22}/>, color:'bg-teal-600' },
            { n:'03', title:'IO Verification & Match', desc:'Cosine similarity + age/gender/location + FIR linkage. Ranked matches with explainable breakdown for IO to verify.', icon:<Search size={22}/>, color:'bg-violet-600' },
          ].map(card=>(
            <div key={card.n} className="bg-white rounded-[20px] border border-slate-200 p-6 relative overflow-hidden">
              <div className={`w-12 h-12 rounded-2xl ${card.color} text-white flex items-center justify-center`}>{card.icon}</div>
              <div className="absolute top-6 right-6 text-4xl font-black text-slate-100">{card.n}</div>
              <h3 className="font-extrabold text-lg mt-4">{card.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-[20px] p-6 sm:p-8 text-white flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div>
            <h3 className="display text-xl font-extrabold">Age progression that actually helps</h3>
            <p className="text-teal-50 mt-1 max-w-2xl text-sm leading-relaxed">Child faces change dramatically. CHRONO models longitudinal growth → jawline, proportions, adult features — boosting match accuracy by up to <b>38%</b> for cold cases {'>'}3 years.</p>
          </div>
          <div className="shrink-0 bg-white text-slate-900 px-4 py-3 rounded-2xl text-center">
            <div className="text-xs font-black tracking-widest text-teal-700">PRODUCTION MODEL</div>
            <div className="text-sm font-extrabold">HRFAE + InsightFace</div>
            <div className="text-xs text-slate-500">Fallback: simulated morph</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-[20px] bg-slate-900 text-white p-8 relative overflow-hidden border border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-700/30 to-transparent"></div>
            <div className="relative">
              <div className="inline-flex px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-widest">FOR POLICE • FIR LINKED</div>
              <h3 className="display text-2xl font-extrabold mt-3">Register Missing Case</h3>
              <p className="text-slate-300 mt-2 text-sm leading-relaxed">IO creates FIR-linked report in 60 seconds with 1-8 photos. AI instantly scans every found-person record (best-of N×M).</p>
              <Link to="/report-lost" className="inline-flex mt-5 px-6 py-3 rounded-full bg-white text-slate-900 font-extrabold text-sm">Register FIR Case →</Link>
            </div>
          </div>
          <div className="rounded-[20px] bg-white border border-slate-200 p-8">
            <div className="inline-flex px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold tracking-widest text-teal-700">FOR POLICE / NGO / HOSPITAL</div>
            <h3 className="display text-2xl font-extrabold text-slate-900 mt-3">Found Person Intake</h3>
            <p className="text-slate-600 mt-2 text-sm leading-relaxed">Rescued/traced person at Thana, shelter, or hospital. Upload 1-8 photos — CHRONO matches against all FIR cases instantly.</p>
            <Link to="/report-found" className="inline-flex mt-5 px-6 py-3 rounded-full bg-teal-600 text-white font-extrabold text-sm">Intake Found Person →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
