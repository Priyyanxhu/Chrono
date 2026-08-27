import { MapPin, Calendar, Clock, Sparkles, Eye, Images } from 'lucide-react'
import { getImageUrl } from '../utils/api'
import { Link } from 'react-router-dom'

export default function PersonCard({ person, type='lost', onViewMatches }){
  const isLost = type==='lost'
  const years = person.yearsMissing ?? 0
  const showProgression = isLost && years >= 2
  const imageUrls = person.imageUrls && person.imageUrls.length ? person.imageUrls : (person.imageUrl ? [person.imageUrl] : [])
  const primary = imageUrls[0]
  const count = imageUrls.length
  const agedCount = person.ageProgressedImages ? person.ageProgressedImages.filter(Boolean).length : (person.hasAgeProgressed ? 1 : 0)

  return (
    <div className="bg-white rounded-[20px] border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col">
      <div className="relative h-[260px] bg-slate-100 overflow-hidden">
        <img src={getImageUrl(isLost ? (person.ageProgressedImage || primary) : primary)} alt={person.name} className="w-full h-full object-cover" />
        {/* stacked photo hint */}
        {count>1 && (
          <>
            <div className="absolute inset-0 rounded-none pointer-events-none" style={{boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.05)'}}/>
            <div className="absolute top-2 right-2 w-[86%] h-[14px] bg-white/70 backdrop-blur rounded-t-xl border border-white/60 translate-y-1 translate-x-1"/>
            <div className="absolute top-2 right-2 w-[88%] h-[14px] bg-white/90 backdrop-blur rounded-t-xl border border-white/80 translate-x-0.5"/>
          </>
        )}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[70%]">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur ${isLost ? 'bg-amber-500 text-white border-amber-600' : 'bg-teal-600 text-white border-teal-700'}`}>
            {isLost ? 'MISSING' : 'FOUND'}
          </span>
          {showProgression && person.hasAgeProgressed && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white flex items-center gap-1">
              <Sparkles size={12}/> AI AGED{agedCount>1 ? ` ×${agedCount}` : ` • ${Math.floor(years)}y`}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur text-white text-xs font-bold flex items-center gap-1 border border-white/20">
            <Images size={12}/> {count} {count===1?'photo':'photos'}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-xl border border-slate-200">
            <div className="text-sm font-extrabold leading-none text-slate-900">{person.name}</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {isLost ? `${person.age} yrs • ${person.gender}` : `${person.estimatedAge} yrs (est) • ${person.gender}`}
            </div>
          </div>
          {years > 0 && isLost && (
            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-center">
              <div className="text-[11px] font-bold tracking-widest opacity-70">MISSING</div>
              <div className="text-sm font-black leading-none">{years.toFixed(1)}y</div>
            </div>
          )}
        </div>
        {/* thumbnail strip for multi */}
        {count>1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2 pt-6 flex gap-1.5 justify-center">
            {imageUrls.slice(0,5).map((u,i)=>(
              <div key={i} className={`w-8 h-8 rounded-md overflow-hidden border-2 ${i===0?'border-white':'border-white/60'} shrink-0`}>
                <img src={getImageUrl(u)} alt={`thumb ${i}`} className="w-full h-full object-cover"/>
              </div>
            ))}
            {count>5 && <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-black border-2 border-white">+{count-5}</div>}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0"/>
            <span className="font-medium leading-tight">{isLost ? person.lastSeenLocation : person.foundLocation}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar size={16} className="text-slate-400"/>
            <span className="font-medium">{isLost ? new Date(person.lastSeenDate).toLocaleDateString() : new Date(person.foundDate).toLocaleDateString()}</span>
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock size={14}/>{new Date(person.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{person.description}</p>
        {count>1 && <div className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full self-start">Best of {count} photos used for matching</div>}

        <div className="flex gap-2 mt-auto pt-3">
          <Link to={isLost ? `/lost/${person.id}` : `/found/${person.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            <Eye size={16}/> View {count>1?`Gallery (${count})`:'Details'}
          </Link>
          {onViewMatches && (
            <button onClick={()=>onViewMatches(person)} className="px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-sm font-bold hover:bg-teal-100 transition">
              Matches
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
