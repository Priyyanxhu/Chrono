import { useState } from 'react'
import { Upload, CheckCircle2, ArrowLeft, X, Star, Image as ImageIcon, Plus, ShieldCheck } from 'lucide-react'
import api, { getImageUrl } from '../utils/api'
import { Link } from 'react-router-dom'

export default function ReportFound(){
  const [photos,setPhotos]=useState([])
  const [previews,setPreviews]=useState([])
  const [submitting,setSubmitting]=useState(false)
  const [done,setDone]=useState(null)
  const [error,setError]=useState('')
  const [form,setForm]=useState({
    name:'', estimatedAge:'', gender:'Male', foundLocation:'', foundDate:'', description:'', reporterName:'', reporterPhone:'', firLinked:'', policeStation:'', rescuedBy:''
  })
  const onFiles=e=>{
    const files=Array.from(e.target.files||[])
    if(!files.length) return
    if(photos.length + files.length >8) { setError('Maximum 8 photos allowed'); return }
    const valid=files.filter(f=> f.type.startsWith('image/'))
    setPhotos(prev=> [...prev, ...valid])
    setPreviews(prev=> [...prev, ...valid.map(f=> URL.createObjectURL(f))])
    setError('')
    e.target.value=''
  }
  const removePhoto=(idx)=>{
    setPhotos(prev=> prev.filter((_,i)=> i!==idx))
    setPreviews(prev=>{
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_,i)=> i!==idx)
    })
  }
  const setPrimary=(idx)=>{
    if(idx===0) return
    setPhotos(prev=>{
      const copy=[...prev]; const [it]=copy.splice(idx,1); copy.unshift(it); return copy
    })
    setPreviews(prev=>{
      const copy=[...prev]; const [it]=copy.splice(idx,1); copy.unshift(it); return copy
    })
  }
  const handleSubmit=async(e)=>{
    e.preventDefault()
    if(!photos.length) return setError('At least one photo is required (up to 8)')
    setSubmitting(true); setError('')
    try{
      const fd=new FormData()
      Object.entries(form).forEach(([k,v])=>fd.append(k,v))
      photos.forEach(f=> fd.append('photos', f))
      const r=await api.post('/api/found', fd, {headers:{'Content-Type':'multipart/form-data'}})
      setDone(r.data)
    }catch(e){ setError(e.response?.data?.error || e.message) }
    setSubmitting(false)
  }
  if(done){
    const gallery = done.imageUrls || [done.imageUrl]
    return (
      <div className="max-w-[760px] mx-auto px-4 py-10">
        <div className="bg-white rounded-[24px] border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto"><CheckCircle2 size={32}/></div>
          <h2 className="display text-2xl font-extrabold mt-4">Found report submitted! • {gallery.length} photo{gallery.length!==1?'s':''}</h2>
          <p className="text-slate-600 mt-2">We are scanning all missing-person records using {gallery.length} embeddings — best match wins.</p>
          <div className="grid grid-cols-3 gap-2 mt-6 max-w-[420px] mx-auto">
            {gallery.map((u,i)=>(
              <img key={i} src={getImageUrl(u)} alt={`found ${i}`} className={`w-full h-28 object-cover rounded-xl border ${i===0?'ring-2 ring-teal-500':''}`}/>
            ))}
          </div>
          <div className="flex gap-3 justify-center mt-6">
            <Link to={`/found/${done.id}`} className="px-6 py-3 rounded-full bg-teal-600 text-white font-bold">View Report</Link>
            <Link to="/matches" className="px-6 py-3 rounded-full bg-slate-900 text-white font-bold">Check Matches</Link>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="max-w-[760px] mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/> Back to home</Link>
      <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-slate-200 p-6 sm:p-7 space-y-5 mt-4">
        <div>
          <div className="inline-flex px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold tracking-widest text-teal-700">POLICE INTAKE • RESCUE / TRACE</div>
          <h1 className="display text-2xl font-extrabold mt-2">Found Person Intake — CHRONO</h1>
          <p className="text-sm text-slate-600 mt-1">For Police / Hospital / NGO — 1-8 photos, FIR linkage if available. CHRONO scans all FIR missing cases instantly.</p>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 flex items-center justify-between">Photos * <span className="text-xs font-semibold text-slate-500">{photos.length}/8</span></label>
          {previews.length>0 ? (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {previews.map((src,i)=>(
                <div key={i} className={`relative h-[110px] rounded-xl overflow-hidden border-2 ${i===0?'border-teal-500':'border-slate-200'} bg-slate-100`}>
                  <img src={src} alt={`preview ${i}`} className="w-full h-full object-cover"/>
                  {i===0 ? <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black flex items-center gap-0.5"><Star size={10}/> PRIMARY</span> : <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">#{i+1}</span>}
                  <button type="button" onClick={()=>removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border flex items-center justify-center hover:text-red-600"><X size={12}/></button>
                  <button type="button" onClick={()=>setPrimary(i)} disabled={i===0} className="absolute bottom-1 left-1 right-1 text-[10px] font-bold bg-slate-900/80 text-white py-1 rounded-md opacity-0 hover:opacity-100 group-hover:opacity-100 transition disabled:opacity-0">Set primary</button>
                </div>
              ))}
              {photos.length<8 && (
                <label className="h-[110px] rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer">
                  <Plus size={20} className="text-slate-400"/><span className="text-xs font-semibold text-slate-600 mt-1">Add more</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
                </label>
              )}
            </div>
          ) : (
            <label className="mt-2 flex h-[160px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 items-center justify-center cursor-pointer flex-col">
              <Upload size={22} className="text-slate-400"/><span className="text-sm font-semibold text-slate-700 mt-2">Click to upload photos (up to 8)</span><span className="text-xs text-slate-500">Select multiple at once • JPG/PNG • 8MB each</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
            </label>
          )}
          {previews.length>0 && previews.length<8 && (
            <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-50">
              <Plus size={14}/> Add more photos <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
            </label>
          )}
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><ImageIcon size={12}/> First photo is primary (card display). All photos are matched — best score wins.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700">Name (if known)</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Leave blank if unknown" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-slate-700">Estimated Age *</label>
              <input required type="number" value={form.estimatedAge} onChange={e=>setForm({...form,estimatedAge:e.target.value})} placeholder="14" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Gender *</label>
              <select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700">Found Location *</label>
            <input required value={form.foundLocation} onChange={e=>setForm({...form,foundLocation:e.target.value})} placeholder="Nizamuddin Station, Delhi" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Found Date *</label>
            <input required type="date" value={form.foundDate} onChange={e=>setForm({...form,foundDate:e.target.value})} className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700">Circumstances / Description</label>
          <textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Where exactly found, clothing, language spoken, any documents..." className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <div className="text-xs font-black tracking-widest text-teal-700 flex items-center gap-1.5"><ShieldCheck size={12}/> POLICE INTAKE DETAILS</div>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <div><label className="text-xs font-bold text-slate-700">FIR Linked (if any)</label><input value={form.firLinked} onChange={e=>setForm({...form,firLinked:e.target.value})} placeholder="123/2024" className="mt-1 w-full px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
            <div><label className="text-xs font-bold text-slate-700">Police Station</label><input value={form.policeStation} onChange={e=>setForm({...form,policeStation:e.target.value})} placeholder="Nizamuddin PS" className="mt-1 w-full px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
            <div><label className="text-xs font-bold text-slate-700">Rescued By</label><input value={form.rescuedBy} onChange={e=>setForm({...form,rescuedBy:e.target.value})} placeholder="SI Amit, NGO, Hospital" className="mt-1 w-full px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-bold text-slate-700">Reporting Officer / Your Name</label><input value={form.reporterName} onChange={e=>setForm({...form,reporterName:e.target.value})} placeholder="SI Amit Kumar / NGO" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
          <div><label className="text-sm font-bold text-slate-700">Phone</label><input value={form.reporterPhone} onChange={e=>setForm({...form,reporterPhone:e.target.value})} placeholder="+91 9xxxx xxxxx" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}
        <button disabled={submitting} className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-extrabold text-sm tracking-wide hover:bg-teal-700 disabled:opacity-60">
          {submitting ? `Uploading ${photos.length} photos...` : `Submit ${photos.length || ''} Photo${photos.length!==1?'s':''}`}
        </button>
      </form>
    </div>
  )
}
