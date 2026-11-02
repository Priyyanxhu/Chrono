import { useState } from 'react'
import { Upload, Sparkles, AlertCircle, CheckCircle2, ArrowLeft, X, Star, Image as ImageIcon, Plus, ShieldCheck } from 'lucide-react'
import api, { getImageUrl } from '../utils/api'
import { Link } from 'react-router-dom'

export default function ReportLost(){
  const [photos,setPhotos]=useState([]) // array of File
  const [previews,setPreviews]=useState([]) // array of object URLs
  const [ageProg,setAgeProg]=useState(null) // single or multiple
  const [loadingProg,setLoadingProg]=useState(false)
  const [submitting,setSubmitting]=useState(false)
  const [done,setDone]=useState(null)
  const [error,setError]=useState('')
  const [form,setForm]=useState({
    name:'', age:'', gender:'Male', lastSeenLocation:'', lastSeenDate:'', description:'', contactName:'', contactPhone:'', contactEmail:'', firNumber:'', policeStation:'', ioName:''
  })

  const onFiles = e=>{
    const files = Array.from(e.target.files || [])
    if(!files.length) return
    const combined = [...photos, ...files]
    if(combined.length > 8) {
      setError('Maximum 8 photos allowed')
      return
    }
    // validate each file is image
    const valid = files.filter(f=> f.type.startsWith('image/'))
    if(valid.length !== files.length) setError('Only image files allowed')
    const newPreviews = valid.map(f=> URL.createObjectURL(f))
    setPhotos(prev=> [...prev, ...valid])
    setPreviews(prev=> [...prev, ...newPreviews])
    setAgeProg(null)
    setError('')
    // reset input
    e.target.value = ''
  }

  const removePhoto = (idx)=>{
    setPhotos(prev=> prev.filter((_,i)=> i!==idx))
    setPreviews(prev=>{
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_,i)=> i!==idx)
    })
    setAgeProg(null)
  }
  const setPrimary = (idx)=>{
    if(idx===0) return
    setPhotos(prev=> {
      const copy=[...prev]
      const [item]=copy.splice(idx,1)
      copy.unshift(item)
      return copy
    })
    setPreviews(prev=>{
      const copy=[...prev]
      const [item]=copy.splice(idx,1)
      copy.unshift(item)
      return copy
    })
  }

  const handlePreviewAge = async()=>{
    if(!photos.length) return setError('Please select at least one photo first')
    const years = form.lastSeenDate ? Math.floor((Date.now()-new Date(form.lastSeenDate).getTime())/(1000*60*60*24*365.25)) : 4
    if(years <2) {
      setError('Age progression is most useful for 2+ years missing. Still generating preview...')
    } else setError('')
    setLoadingProg(true)
    try{
      const fd=new FormData()
      // send up to 3 for preview to avoid heavy load, but send all if <=3
      const toPreview = photos.slice(0,3)
      toPreview.forEach(f=> fd.append('photos', f))
      // also send single as fallback
      if(toPreview.length===1) fd.set('photos', toPreview[0])
      fd.append('currentAge', form.age || '10')
      fd.append('yearsMissing', String(Math.max(2, years)))
      fd.append('gender', form.gender)
      const r=await api.post('/api/age-progress', fd, { headers:{'Content-Type':'multipart/form-data'}})
      // r.data may be {multiple:true, results: [...]} or single prog
      if(r.data.multiple){
        setAgeProg({ multiple:true, results: r.data.results })
      } else {
        setAgeProg(r.data)
      }
    }catch(e){ setError(e.response?.data?.error || 'Preview failed') }
    setLoadingProg(false)
  }

  const handleSubmit = async(e)=>{
    e.preventDefault()
    if(!photos.length) return setError('At least one photo is required (up to 8)')
    if(photos.length>8) return setError('Maximum 8 photos')
    setSubmitting(true); setError('')
    try{
      const fd=new FormData()
      Object.entries(form).forEach(([k,v])=> fd.append(k,v))
      photos.forEach(f=> fd.append('photos', f))
      const r=await api.post('/api/lost', fd, { headers:{'Content-Type':'multipart/form-data'}})
      setDone(r.data)
    }catch(e){ setError(e.response?.data?.error || e.message) }
    setSubmitting(false)
  }

  if(done){
    const gallery = done.imageUrls || (done.imageUrl ? [done.imageUrl] : [])
    const aged = done.ageProgressedImages?.filter(Boolean) || (done.ageProgressedImage ? [done.ageProgressedImage] : [])
    return (
      <div className="max-w-[760px] mx-auto px-4 py-10">
        <div className="bg-white rounded-[24px] border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle2 size={32}/></div>
          <h2 className="display text-2xl font-extrabold mt-4">Report submitted! • {gallery.length} photo{gallery.length!==1?'s':''}</h2>
          <p className="text-slate-600 mt-2">We generated {aged.length || 0} AI age-progressed {aged.length===1?'image':'images'} and are already matching against all found persons using <b>{gallery.length} embeddings</b> (best match across all photos).</p>
          {gallery.length>0 && (
            <div className="mt-6 text-left">
              <div className="text-xs font-black tracking-widest text-slate-500">UPLOADED PHOTOS</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {gallery.map((u,i)=>(
                  <img key={i} src={getImageUrl(u)} alt={`uploaded ${i}`} className={`w-full h-28 object-cover rounded-xl border ${i===0?'ring-2 ring-teal-500':''}`}/>
                ))}
              </div>
              {aged.length>0 && (
                <>
                  <div className="text-xs font-black tracking-widest text-teal-600 mt-4 flex items-center gap-1"><Sparkles size={12}/> AI AGED PROJECTIONS • {done.ageProgressionMeta?.targetAge || '?'} yrs</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {aged.map((img,i)=>(
                      <img key={i} src={img} alt={`aged ${i}`} className="w-full h-28 object-cover rounded-xl border-2 border-teal-200"/>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <Link to={`/lost/${done.id}`} className="px-6 py-3 rounded-full bg-slate-900 text-white font-bold">View Report</Link>
            <Link to="/matches" className="px-6 py-3 rounded-full bg-teal-600 text-white font-bold">See Matches</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/> Back to home</Link>
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20}/>
        <p className="text-sm text-amber-900 leading-relaxed"><b>Multi-photo tip:</b> Upload up to 8 clear photos — different angles, lighting, and ages increase AI accuracy. The first photo is the <b>primary</b>; matching uses the best similarity across all photos.</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-slate-200 p-6 sm:p-7 space-y-5">
          <div>
            <div className="inline-flex px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold tracking-widest">POLICE • FIR LINKED</div>
            <h1 className="display text-2xl font-extrabold mt-2">Register Missing Case — ORION</h1>
            <p className="text-sm text-slate-600 mt-1">For IOs / Control Room — FIR-linked, multi-photo (1-8), auto AI aging for 4+ year cases.</p>
          </div>

          {/* Photo multi */}
          <div>
            <label className="text-sm font-bold text-slate-700 flex items-center justify-between">Photos * <span className="text-xs font-semibold text-slate-500">{photos.length}/8</span></label>

            {previews.length>0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {previews.map((src,i)=>(
                  <div key={i} className={`relative group rounded-xl overflow-hidden border-2 ${i===0?'border-teal-500':'border-slate-200'} bg-slate-100 h-[110px]`}>
                    <img src={src} alt={`preview ${i}`} className="w-full h-full object-cover"/>
                    <div className="absolute top-1 left-1 flex gap-1">
                      {i===0 ? <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black flex items-center gap-0.5"><Star size={10}/> PRIMARY</span> : <span className="px-1.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">#{i+1}</span>}
                    </div>
                    <button type="button" onClick={()=>removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-red-50 text-slate-600 hover:text-red-600">
                      <X size={12}/>
                    </button>
                    <button type="button" onClick={()=>setPrimary(i)} disabled={i===0} className="absolute bottom-1 left-1 right-1 text-[10px] font-bold bg-slate-900/80 text-white py-1 rounded-md opacity-0 group-hover:opacity-100 transition disabled:opacity-0">
                      Set as primary
                    </button>
                  </div>
                ))}
                {photos.length<8 && (
                  <label className="h-[110px] rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer">
                    <Plus size={20} className="text-slate-400"/>
                    <span className="text-xs font-semibold text-slate-600 mt-1">Add more</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
                  </label>
                )}
              </div>
            )}

            {previews.length===0 && (
              <label className="mt-2 flex h-[160px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer">
                <Upload size={24} className="text-slate-400"/>
                <span className="text-sm font-bold text-slate-700 mt-2">Click to upload photos</span>
                <span className="text-xs text-slate-500">Up to 8 • JPG/PNG • 8MB each • multiple at once</span>
                <span className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center gap-1"><ImageIcon size={12}/> Drag & drop supported (select multiple)</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
              </label>
            )}

            {previews.length>0 && previews.length<8 && (
              <div className="mt-2 flex gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-50">
                  <Plus size={14}/> Add more photos
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles}/>
                </label>
                <span className="text-xs text-slate-500 py-1.5">You can select multiple at once</span>
              </div>
            )}

            {previews.length>0 && (
              <button type="button" onClick={handlePreviewAge} disabled={loadingProg} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60">
                <Sparkles size={16}/> {loadingProg ? 'Generating preview...' : `Preview AI Age Progression (${Math.min(photos.length,3)} photo${Math.min(photos.length,3)!==1?'s':''})`}
              </button>
            )}
            <p className="text-xs text-slate-500 mt-2">Primary photo is used for display; all photos are used for matching. Age progression generated for each photo if missing ≥2 years.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700">Full Name *</label>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-slate-700">Age when lost *</label>
                <input required type="number" min="0" max="100" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} placeholder="8" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
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
              <label className="text-sm font-bold text-slate-700">Last Seen Location *</label>
              <input required value={form.lastSeenLocation} onChange={e=>setForm({...form,lastSeenLocation:e.target.value})} placeholder="Last seen location" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Last Seen Date *</label>
              <input required type="date" value={form.lastSeenDate} onChange={e=>setForm({...form,lastSeenDate:e.target.value})} className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              {form.lastSeenDate && (
                <div className="text-xs font-semibold text-teal-700 mt-1">
                  Missing ~{Math.floor((Date.now()-new Date(form.lastSeenDate).getTime())/(1000*60*60*24*365.25))} years {Math.floor((Date.now()-new Date(form.lastSeenDate).getTime())/(1000*60*60*24*365.25)) >=2 ? '• AI aging will be applied to all photos' : ''}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">Distinct features / Clothing *</label>
            <textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What were they wearing? Any marks, scars, accessories?" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
            <div className="text-xs font-black tracking-widest text-teal-300 flex items-center gap-1.5"><ShieldCheck size={12}/> POLICE CASE DETAILS</div>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-bold text-slate-300">FIR Number</label>
                <input value={form.firNumber} onChange={e=>setForm({...form,firNumber:e.target.value})} placeholder="e.g., 123/2024" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Police Station / Thana</label>
                <input value={form.policeStation} onChange={e=>setForm({...form,policeStation:e.target.value})} placeholder="Police Station / Thana" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">IO Name</label>
                <input value={form.ioName} onChange={e=>setForm({...form,ioName:e.target.value})} placeholder="Investigating officer" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">FIR-linked — ORION will prioritize matches within same Thana & IO jurisdiction.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700">Your Name (Family/Complainant)</label>
              <input value={form.contactName} onChange={e=>setForm({...form,contactName:e.target.value})} placeholder="Contact name" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Phone</label>
              <input value={form.contactPhone} onChange={e=>setForm({...form,contactPhone:e.target.value})} placeholder="+91 9xxxx xxxxx" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Email</label>
              <input type="email" value={form.contactEmail} onChange={e=>setForm({...form,contactEmail:e.target.value})} placeholder="you@email.com" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}

          <button disabled={submitting} className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-extrabold text-sm tracking-wide hover:bg-black disabled:opacity-60 transition">
            {submitting ? `Uploading ${photos.length} photos & Running AI...` : `Submit ${photos.length || ''} Photo${photos.length!==1?'s':''} & Run AI Matching`}
          </button>
          <p className="text-xs text-center text-slate-500">By submitting, you confirm this is a genuine case and you have rights to share these photos.</p>
        </form>

        {/* Side preview */}
        <div className="space-y-4">
          {ageProg ? (
            <div className="bg-white rounded-[24px] border border-teal-200 p-5">
              <div className="flex items-center gap-2 text-teal-700 font-black text-xs tracking-widest"><Sparkles size={14}/> AI AGE PROGRESSION PREVIEW {ageProg.multiple ? `• ${ageProg.results.length} PHOTOS` : ''}</div>
              {ageProg.multiple ? (
                <div className="space-y-3 mt-3">
                  {ageProg.results.map((prog,i)=>(
                    <div key={i} className="grid grid-cols-2 gap-3 p-2 bg-teal-50 rounded-xl border border-teal-200">
                      <div>
                        <div className="text-xs font-bold text-slate-500">THEN • {form.age || '?'} yrs — Photo {i+1}</div>
                        {previews[i] && <img src={previews[i]} alt={`then ${i}`} className="w-full h-28 object-cover rounded-lg mt-1 border"/>}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-teal-700">NOW • {prog.targetAge} yrs</div>
                        <img src={prog.imageBase64} alt={`aged ${i}`} className="w-full h-28 object-cover rounded-lg mt-1 border-2 border-teal-300 shadow"/>
                      </div>
                    </div>
                  ))}
                  <div className="bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5 text-xs text-teal-800">
                    Confidence: {ageProg.results[0].confidence}% • {ageProg.results[0].method} — generated for each photo
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500">THEN • {form.age || '?'} yrs</div>
                      {previews[0] && <img src={previews[0]} alt="then" className="w-full h-44 object-cover rounded-xl mt-1 border"/>}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-teal-700">NOW • {ageProg.targetAge} yrs (est)</div>
                      <img src={ageProg.imageBase64} alt="aged" className="w-full h-44 object-cover rounded-xl mt-1 border-2 border-teal-300 shadow"/>
                    </div>
                  </div>
                  <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5">
                    <div className="text-xs font-bold text-teal-800">Confidence: {ageProg.confidence}% • {ageProg.method}</div>
                    <ul className="text-xs text-teal-900/80 mt-1 list-disc pl-4 space-y-0.5">
                      {ageProg.description.map((d,i)=><li key={i}>{d}</li>)}
                    </ul>
                    <div className="text-[11px] text-slate-500 mt-2 italic">{ageProg.disclaimer}</div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-[24px] p-6 text-white">
              <h3 className="display font-extrabold text-lg flex items-center gap-2"><Sparkles size={18}/> Why multiple photos help</h3>
              <p className="text-sm text-teal-50 leading-relaxed mt-2">
                One photo can be blurry, angled, or old. ORION creates a <b>separate 128-D embedding for each photo</b> and uses the <b>best face similarity</b> across all pairs — more reliable than a single photo.
              </p>
              <div className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
                <div className="text-xs font-black tracking-widest opacity-80">HOW IT WORKS</div>
                <div className="text-sm font-bold mt-1">3 lost photos × 2 found photos = 6 comparisons → max wins</div>
                <div className="text-xs text-teal-100 mt-1">Each comparison scored; highest face score used for final ranking</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white text-slate-900 rounded-xl py-2 font-bold">Up to 8<br/><span className="text-teal-600">per report</span></div>
                <div className="bg-white text-slate-900 rounded-xl py-2 font-bold">Auto<br/><span className="text-teal-600">aging / photo</span></div>
                <div className="bg-white text-slate-900 rounded-xl py-2 font-bold">Best<br/><span className="text-teal-600">match wins</span></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[24px] border border-slate-200 p-5">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5"><ImageIcon size={16}/> Tips for multiple photos</h4>
            <ul className="text-sm text-slate-600 mt-2 space-y-1.5 list-disc pl-4">
              <li>Include front, ¾, and side if possible</li>
              <li>Different dates/outfits help — AI learns invariance</li>
              <li>Good lighting, no heavy filters/sunglasses</li>
              <li>First photo = primary (card display) — tap star to change</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
