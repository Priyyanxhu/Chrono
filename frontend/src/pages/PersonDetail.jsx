import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api, { getImageUrl } from '../utils/api'
import { ArrowLeft, MapPin, Calendar, Phone, Mail, Sparkles, Search, Trash2, Clock, Images, Star, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PersonDetail({ type }){
  const { id } = useParams()
  const [person,setPerson]=useState(null)
  const [matches,setMatches]=useState([])
  const [loading,setLoading]=useState(true)
  const [activeTab,setActiveTab]=useState('overview')
  const [progLoading,setProgLoading]=useState(false)
  const [uploading,setUploading]=useState(false)
  const [activeIdx,setActiveIdx]=useState(0)
  const fileRef=useRef(null)
  const nav=useNavigate()
  const isLost = type==='lost'

  const fetchAll = async()=>{
    setLoading(true)
    try{
      const p = await api.get(`/api/${isLost?'lost':'found'}/${id}`)
      setPerson(p.data)
      const m = await api.get(`/api/match/${isLost?'lost':'found'}/${id}`)
      setMatches(m.data.matches)
    }catch(e){ console.error(e)}
    setLoading(false)
  }
  useEffect(()=>{ fetchAll() },[id, type])
  useEffect(()=>{ setActiveIdx(0) },[person?.id])

  const handleDelete=async()=>{
    if(!confirm('Delete this report?')) return
    await api.delete(`/api/${isLost?'lost':'found'}/${id}`)
    nav(isLost?'/lost':'/found')
  }
  const handleAgeProgress=async(idx = activeIdx)=>{
    setProgLoading(true)
    try{
      await api.post(`/api/age-progress/${id}`, null, { params:{ photoIndex: idx } })
      await fetchAll()
    }catch(e){ alert(e.response?.data?.error || 'Failed')}
    setProgLoading(false)
  }
  const handleAgeAll=async()=>{
    setProgLoading(true)
    try{
      await api.post(`/api/age-progress-all/${id}`)
      await fetchAll()
    }catch(e){ alert(e.response?.data?.error || 'Failed')}
    setProgLoading(false)
  }
  const handleAddPhotos=async(e)=>{
    const files=Array.from(e.target.files||[])
    if(!files.length) return
    if(person.imageUrls.length + files.length >8) { alert('Max 8 photos'); return }
    setUploading(true)
    try{
      const fd=new FormData()
      files.forEach(f=> fd.append('photos', f))
      await api.post(`/api/${isLost?'lost':'found'}/${id}/photos`, fd, {headers:{'Content-Type':'multipart/form-data'}})
      await fetchAll()
    }catch(err){ alert(err.response?.data?.error || 'Upload failed') }
    setUploading(false)
    if(fileRef.current) fileRef.current.value=''
  }
  const handleDeletePhoto=async(idx)=>{
    if(person.imageUrls.length===1) { alert('Cannot delete last photo'); return }
    if(!confirm(`Delete photo #${idx+1}?`)) return
    try{
      await api.delete(`/api/${isLost?'lost':'found'}/${id}/photos/${idx}`)
      await fetchAll()
      setActiveIdx(0)
    }catch(e){ alert(e.response?.data?.error || 'Failed')}
  }
  const handleSetPrimary=async(idx)=>{
    try{
      await api.patch(`/api/${isLost?'lost':'found'}/${id}/photos/primary`, { index: idx })
      await fetchAll()
      setActiveIdx(0)
    }catch(e){ alert(e.response?.data?.error || 'Failed')}
  }

  if(loading) return <div className="py-20 text-center text-slate-500">Loading...</div>
  if(!person) return <div className="py-20 text-center">Not found <Link to="/" className="text-teal-600 font-bold">Go home</Link></div>

  const topMatches = matches.slice(0,5)
  const currentAgeDisplay = isLost ? (person.age + Math.floor(person.yearsMissing || 0)) : person.estimatedAge
  const imageUrls = person.imageUrls && person.imageUrls.length ? person.imageUrls : (person.imageUrl ? [person.imageUrl] : [])
  const agedImages = person.ageProgressedImages || []
  const activeUrl = imageUrls[activeIdx] || imageUrls[0]
  const activeAged = agedImages[activeIdx]

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        <Link to={isLost?'/lost':'/found'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/> Back to {isLost?'Lost':'Found'}</Link>
        <button onClick={handleDelete} className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-full border border-red-200 bg-red-50"><Trash2 size={14}/> Delete report</button>
      </div>

      <div className="mt-4 grid lg:grid-cols-[420px_1fr] gap-6">
        {/* Left card gallery */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden h-fit">
          <div className="relative h-[420px] bg-slate-100 overflow-hidden group">
            <img src={getImageUrl(activeUrl)} alt={person.name} className="w-full h-full object-cover"/>
            <div className="absolute top-3 left-3 flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${isLost?'bg-amber-500 text-white':'bg-teal-600 text-white'}`}>{isLost?'MISSING':'FOUND'}</span>
              {isLost && person.hasAgeProgressed && <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white flex items-center gap-1"><Sparkles size={12}/> AI AGED{agedImages.filter(Boolean).length>1?` ×${agedImages.filter(Boolean).length}`:''}</span>}
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/85 text-white text-xs font-bold flex items-center gap-1 border border-white/20">
              <Images size={12}/> {imageUrls.length} {imageUrls.length===1?'photo':'photos'}
            </div>
            {imageUrls.length>1 && (
              <>
                <button onClick={()=> setActiveIdx(i=> (i-1+imageUrls.length)%imageUrls.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-white shadow opacity-0 group-hover:opacity-100 transition">
                  <ChevronLeft size={16}/>
                </button>
                <button onClick={()=> setActiveIdx(i=> (i+1)%imageUrls.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-white shadow opacity-0 group-hover:opacity-100 transition">
                  <ChevronRight size={16}/>
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-slate-900/60 backdrop-blur px-2 py-1 rounded-full">
                  {imageUrls.map((_,i)=>(
                    <button key={i} onClick={()=>setActiveIdx(i)} className={`w-2 h-2 rounded-full transition ${i===activeIdx?'bg-white w-5':'bg-white/60'}`}/>
                  ))}
                </div>
              </>
            )}
            {activeIdx===0 && <span className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-teal-600 text-white text-[10px] font-black flex items-center gap-1"><Star size={10}/> PRIMARY</span>}
          </div>

          {/* thumbnails */}
          <div className="p-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {imageUrls.map((u,i)=>(
                <button key={i} onClick={()=>setActiveIdx(i)} className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 ${i===activeIdx?'border-teal-500 ring-2 ring-teal-200':'border-slate-200'}`}>
                  <img src={getImageUrl(u)} alt={`thumb ${i}`} className="w-full h-full object-cover"/>
                  {i===0 && <span className="absolute bottom-0 left-0 right-0 bg-teal-600 text-white text-[9px] font-black text-center py-0.5">PRIMARY</span>}
                </button>
              ))}
              {imageUrls.length<8 && (
                <label className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer">
                  <Plus size={16} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-600">Add</span>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos}/>
                </label>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button onClick={()=>handleSetPrimary(activeIdx)} disabled={activeIdx===0} className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"><Star size={12}/> Set as primary</button>
              <button onClick={()=>handleDeletePhoto(activeIdx)} disabled={imageUrls.length===1} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold hover:bg-red-50 hover:text-red-600 disabled:opacity-40 flex items-center gap-1"><Trash2 size={12}/> Delete photo</button>
              <label className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold cursor-pointer flex items-center gap-1 hover:bg-teal-100">
                <Plus size={12}/> Add photos <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos}/>
              </label>
              {uploading && <span className="text-xs font-semibold text-slate-500 py-1">Uploading...</span>}
            </div>
          </div>

          <div className="px-5 pb-5">
            <h1 className="display text-2xl font-extrabold leading-tight">{person.name}</h1>
            <div className="text-sm font-semibold text-slate-600 mt-1">{isLost ? `${person.age} yrs at missing • now ~${currentAgeDisplay} • ${person.gender}` : `${person.estimatedAge} yrs (est) • ${person.gender}`}</div>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex gap-2"><MapPin size={16} className="text-slate-400 mt-0.5 shrink-0"/><span className="font-medium">{isLost ? person.lastSeenLocation : person.foundLocation}</span></div>
              <div className="flex gap-2"><Calendar size={16} className="text-slate-400 shrink-0"/><span className="font-medium">{isLost ? new Date(person.lastSeenDate).toLocaleDateString() : new Date(person.foundDate).toLocaleDateString()}</span>
                {isLost && <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{person.yearsMissing?.toFixed(1)} yrs missing</span>}
              </div>
              <div className="flex gap-2"><Clock size={16} className="text-slate-400 shrink-0"/><span className="font-medium">Reported {new Date(person.createdAt).toLocaleString()}</span></div>
            </div>

            {isLost && (person.firNumber || person.policeStation || person.ioName) && (
              <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl border border-slate-800">
                <div className="text-xs font-black tracking-widest text-teal-300">POLICE CASE • FIR LINKED</div>
                {person.firNumber && <div className="text-sm font-bold mt-1">FIR No. {person.firNumber}</div>}
                {person.policeStation && <div className="text-sm text-slate-300">Thana: {person.policeStation}</div>}
                {person.ioName && <div className="text-sm text-slate-300">IO: {person.ioName}</div>}
              </div>
            )}
            {!isLost && (person.firLinked || person.policeStation || person.rescuedBy) && (
              <div className="mt-3 p-3 bg-teal-900 text-white rounded-xl border border-teal-800">
                <div className="text-xs font-black tracking-widest text-teal-200">POLICE INTAKE • FIR LINKAGE</div>
                {person.firLinked && <div className="text-sm font-bold mt-1">Linked FIR: {person.firLinked}</div>}
                {person.policeStation && <div className="text-sm text-teal-100">Thana: {person.policeStation}</div>}
                {person.rescuedBy && <div className="text-sm text-teal-100">Rescued By: {person.rescuedBy}</div>}
              </div>
            )}

            {isLost && (person.contactPhone || person.contactEmail) && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-black tracking-widest text-slate-500">CONTACT FAMILY</div>
                {person.contactName && <div className="text-sm font-bold mt-1">{person.contactName}</div>}
                {person.contactPhone && <a href={`tel:${person.contactPhone}`} className="flex items-center gap-2 text-sm font-semibold text-teal-700 mt-1"><Phone size={14}/>{person.contactPhone}</a>}
                {person.contactEmail && <a href={`mailto:${person.contactEmail}`} className="flex items-center gap-2 text-sm font-semibold text-teal-700 mt-1"><Mail size={14}/>{person.contactEmail}</a>}
              </div>
            )}
            {!isLost && (person.reporterPhone || person.reporterName) && (
              <div className="mt-4 p-3 bg-teal-50 rounded-xl border border-teal-200">
                <div className="text-xs font-black tracking-widest text-teal-700">REPORTED BY</div>
                {person.reporterName && <div className="text-sm font-bold mt-1">{person.reporterName}</div>}
                {person.reporterPhone && <a href={`tel:${person.reporterPhone}`} className="flex items-center gap-2 text-sm font-semibold text-teal-700 mt-1"><Phone size={14}/>{person.reporterPhone}</a>}
              </div>
            )}

            {isLost && (
              <div className="mt-4 grid grid-cols-1 gap-2">
                <button onClick={()=>handleAgeProgress(activeIdx)} disabled={progLoading} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  <Sparkles size={16}/> {progLoading ? 'Generating...' : `Age-progress photo #${activeIdx+1}`}
                </button>
                {imageUrls.length>1 && (
                  <button onClick={handleAgeAll} disabled={progLoading} className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    <Sparkles size={16} className="text-teal-600"/> {progLoading ? 'Generating all...' : `Age-progress ALL ${imageUrls.length} photos`}
                  </button>
                )}
              </div>
            )}

            {activeAged && isLost && (
              <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <div className="text-xs font-black tracking-widest text-teal-700">AI AGED — Photo #{activeIdx+1}</div>
                <img src={activeAged} alt="aged active" className="w-full h-44 object-cover rounded-xl mt-2 border-2 border-teal-300"/>
                <div className="text-xs text-teal-800 mt-1 font-semibold">Projected age ~{person.ageProgressionMetas?.[activeIdx]?.targetAge || person.age + Math.floor(person.yearsMissing)} • {person.ageProgressionMetas?.[activeIdx]?.confidence || '?'}% confidence</div>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setActiveTab('overview')} className={`px-4 py-2 rounded-full text-sm font-bold border ${activeTab==='overview'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200'}`}>Overview</button>
            <button onClick={()=>setActiveTab('gallery')} className={`px-4 py-2 rounded-full text-sm font-bold border inline-flex items-center gap-1.5 ${activeTab==='gallery'?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-700 border-slate-200'}`}><Images size={14}/> Gallery ({imageUrls.length})</button>
            <button onClick={()=>setActiveTab('matches')} className={`px-4 py-2 rounded-full text-sm font-bold border inline-flex items-center gap-1.5 ${activeTab==='matches'?'bg-teal-600 text-white border-teal-600':'bg-white text-slate-700 border-slate-200'}`}><Search size={14}/> AI Matches ({matches.length})</button>
            {isLost && person.hasAgeProgressed && <button onClick={()=>setActiveTab('aging')} className={`px-4 py-2 rounded-full text-sm font-bold border inline-flex items-center gap-1.5 ${activeTab==='aging'?'bg-teal-700 text-white border-teal-700':'bg-white text-slate-700 border-slate-200'}`}><Sparkles size={14}/> Aging</button>}
          </div>

          {activeTab==='overview' && (
            <>
              <div className="bg-white rounded-[24px] border border-slate-200 p-6">
                <h3 className="font-extrabold text-sm tracking-wide">DESCRIPTION</h3>
                <p className="text-sm text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">{person.description || 'No description provided.'}</p>
                <div className="mt-4 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl inline-flex items-center gap-1.5">
                  <Images size={14}/> {imageUrls.length} photo{imageUrls.length!==1?'s':''} — matching uses best similarity across all photos
                </div>
              </div>

              {isLost && person.hasAgeProgressed && (
                <div className="bg-white rounded-[24px] border border-teal-200 p-6">
                  <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-2"><Sparkles size={16} className="text-teal-600"/> AI AGE PROGRESSION — All Photos</h3>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {imageUrls.map((url,i)=>(
                      <div key={i} className="border rounded-xl overflow-hidden bg-slate-50">
                        <div className="grid grid-cols-2 gap-0">
                          <div className="p-2">
                            <div className="text-[10px] font-black tracking-widest text-slate-500">THEN #{i+1} • Age {person.age}</div>
                            <img src={getImageUrl(url)} alt={`then ${i}`} className="w-full h-32 object-cover rounded-lg mt-1 border"/>
                          </div>
                          <div className="p-2">
                            <div className="text-[10px] font-black tracking-widest text-teal-600">NOW #{i+1} • {agedImages[i] ? 'Aged' : 'Pending'}</div>
                            {agedImages[i] ? <img src={agedImages[i]} alt={`now ${i}`} className="w-full h-32 object-cover rounded-lg mt-1 border-2 border-teal-300"/> : <div className="w-full h-32 rounded-lg mt-1 border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 bg-white">No aged image<br/><button onClick={()=>handleAgeProgress(i)} className="underline text-teal-600 font-bold">Generate</button></div>}
                          </div>
                        </div>
                        {i===activeIdx && <div className="text-xs text-center py-1 bg-teal-600 text-white font-bold">Currently viewing • Photo {i+1}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-slate-900 to-teal-900 rounded-[24px] p-6 text-white">
                <h3 className="font-extrabold">Need to verify a match?</h3>
                <p className="text-sm text-slate-300 mt-1">Top matches are scored by best facial similarity across {imageUrls.length} photo{imageUrls.length!==1?'s':''} + age, gender & location. Contact only after visual verification.</p>
                <button onClick={()=>setActiveTab('matches')} className="mt-4 px-5 py-2.5 rounded-full bg-white text-slate-900 font-bold text-sm">View {matches.length} AI Matches →</button>
              </div>
            </>
          )}

          {activeTab==='gallery' && (
            <div className="bg-white rounded-[24px] border border-slate-200 p-6">
              <h3 className="font-extrabold text-sm flex items-center gap-2"><Images size={16}/> Photo Gallery • {imageUrls.length} / 8</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {imageUrls.map((u,i)=>(
                  <div key={i} className={`relative rounded-xl overflow-hidden border-2 ${i===activeIdx?'border-teal-500 ring-2 ring-teal-200':'border-slate-200'}`}>
                    <img src={getImageUrl(u)} alt={`gallery ${i}`} className="w-full h-40 object-cover"/>
                    <div className="absolute top-2 left-2 flex gap-1">
                      {i===0 ? <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black flex items-center gap-0.5"><Star size={10}/> PRIMARY</span> : <span className="px-1.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">#{i+1}</span>}
                    </div>
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center gap-1 opacity-0 hover:opacity-100">
                      <button onClick={()=>setActiveIdx(i)} className="px-2 py-1 rounded-full bg-white text-slate-900 text-xs font-bold">View</button>
                      {i!==0 && <button onClick={()=>handleSetPrimary(i)} className="px-2 py-1 rounded-full bg-teal-600 text-white text-xs font-bold">Primary</button>}
                    </div>
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button onClick={()=>handleSetPrimary(i)} disabled={i===0} className="w-7 h-7 rounded-full bg-white/90 border flex items-center justify-center disabled:opacity-40 hover:text-teal-600"><Star size={12}/></button>
                      <button onClick={()=>handleDeletePhoto(i)} disabled={imageUrls.length===1} className="w-7 h-7 rounded-full bg-white/90 border flex items-center justify-center hover:text-red-600 disabled:opacity-40"><X size={12}/></button>
                    </div>
                  </div>
                ))}
                {imageUrls.length<8 && (
                  <label className="h-40 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer">
                    <Plus size={20} className="text-slate-400"/><span className="text-xs font-bold text-slate-600 mt-1">Add photos</span><span className="text-[10px] text-slate-500">Up to 8</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos}/>
                  </label>
                )}
              </div>
              <div className="mt-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                Click a photo to view • Star to set as primary (shown on cards) • AI creates a separate embedding per photo and picks the highest similarity during matching.
              </div>
            </div>
          )}

          {activeTab==='matches' && (
            <div className="space-y-3">
              {topMatches.length===0 && <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-12 text-center text-slate-500">No matches yet</div>}
              {topMatches.map((m,idx)=>{
                const other = isLost ? m.found : m.lost
                const score = m.score
                const color = score>=85? 'border-emerald-300 bg-emerald-50' : score>=70?'border-teal-300 bg-teal-50' : score>=50?'border-amber-300 bg-amber-50':'border-slate-200 bg-white'
                const otherUrls = other.imageUrls || (other.imageUrl ? [other.imageUrl] : [])
                const otherImg = isLost ? (other.imageUrls?.[0] || other.imageUrl) : (other.ageProgressedImages?.find(Boolean) || other.imageUrls?.[0] || other.imageUrl)
                const otherCount = otherUrls.length
                return (
                  <div key={idx} className={`bg-white rounded-[20px] border-2 ${color} overflow-hidden`}>
                    <div className="p-4 flex gap-4">
                      <div className="relative shrink-0">
                        <img src={getImageUrl(otherImg)} alt={other.name} className="w-28 h-28 rounded-2xl object-cover border bg-slate-100"/>
                        {otherCount>1 && <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center gap-0.5 border border-white"><Images size={10}/> {otherCount}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${score>=85?'bg-emerald-600 text-white': score>=70?'bg-teal-600 text-white':'bg-amber-500 text-white'}`}>{score}% • {m.level.label}</span>
                          <span className="text-xs font-semibold text-slate-600">{m.level.action}</span>
                        </div>
                        <div className="font-extrabold mt-2 leading-tight flex items-center gap-2">{other.name} {otherCount>1 && <span className="text-[11px] font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">{otherCount} photos → best match used</span>}</div>
                        <div className="text-xs font-semibold text-slate-600">{isLost ? `${other.estimatedAge} yrs (est) • ${other.gender}` : `${other.age} yrs at missing • now ~${other.age + Math.floor(other.yearsMissing)} • ${other.gender}`} • {isLost ? other.foundLocation : other.lastSeenLocation}</div>
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {[
                            {k:'Face', v:m.breakdown.face},
                            {k:'Age', v:m.breakdown.age},
                            {k:'Gender', v:m.breakdown.gender},
                            {k:'Location', v:m.breakdown.location},
                          ].map(b=>(
                            <div key={b.k} className="bg-slate-50 rounded-xl px-2 py-2 text-center border">
                              <div className="text-[10px] font-black tracking-widest text-slate-500">{b.k.toUpperCase()}</div>
                              <div className="text-sm font-black text-slate-900">{Math.round(b.v)}%</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Link to={isLost ? `/found/${other.id}` : `/lost/${other.id}`} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">View Full Report ({otherCount} photos)</Link>
                          {isLost ? <a href={`tel:${person.contactPhone}`} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">Contact Family</a> : <a href={`tel:${other.contactPhone}`} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">Contact Family</a>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {matches.length>5 && <div className="text-center"><Link to="/matches" className="inline-flex px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold">See all {matches.length} matches →</Link></div>}
            </div>
          )}

          {activeTab==='aging' && isLost && person.hasAgeProgressed && (
            <div className="bg-white rounded-[24px] border border-slate-200 p-6">
              <h3 className="display text-xl font-extrabold">How aging was estimated — per photo</h3>
              <p className="text-sm text-slate-600 mt-2">Each photo gets its own progression (different lighting/angle → slightly different GAN output). Matching uses both original and aged embeddings? Currently we boost score when any progression exists.</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border">
                  <div className="text-xs font-black tracking-widest text-slate-500">INPUT</div>
                  <div className="text-sm font-bold mt-1">Age {person.age} • {person.gender} • {imageUrls.length} photos • Missing {person.yearsMissing?.toFixed(1)}y</div>
                  <div className="text-xs text-slate-600 mt-1">Oldest photo {new Date(person.lastSeenDate).toLocaleDateString()}</div>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                  <div className="text-xs font-black tracking-widest text-teal-700">OUTPUT</div>
                  <div className="text-sm font-bold mt-1">{agedImages.filter(Boolean).length} aged images • Projected age {person.ageProgressionMetas?.find(Boolean)?.targetAge || '?'} • Confidence {person.ageProgressionMetas?.find(Boolean)?.confidence || '?'}%</div>
                  <div className="text-xs text-teal-800 mt-1">{person.ageProgressionMetas?.find(Boolean)?.method || 'GAN-based'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
