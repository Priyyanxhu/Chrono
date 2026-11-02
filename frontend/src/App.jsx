import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import ReportLost from './pages/ReportLost'
import ReportFound from './pages/ReportFound'
import Lost from './pages/Lost'
import Found from './pages/Found'
import Matches from './pages/Matches'
import PersonDetail from './pages/PersonDetail'

function Footer(){
  return (
    <footer className="border-t border-slate-200 bg-white mt-10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 font-black text-slate-900"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-900 to-teal-700 text-white flex items-center justify-center text-xs">O</div> ORION</div>
          <p className="text-slate-600 mt-2 leading-relaxed">AI-powered missing person identification for Law Enforcement. FIR-linked, multi-photo, age-progressed matching to reunite families — even after years apart.</p>
        </div>
        <div>
          <div className="font-bold text-slate-900">How it works</div>
          <ul className="text-slate-600 mt-2 space-y-1">
            <li>• 128-D face embeddings (InsightFace)</li>
            <li>• GAN age progression (HRFAE)</li>
            <li>• Multi-factor scoring (face 60% + context)</li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-slate-900">Safety</div>
          <p className="text-slate-600 mt-2">All matches require human verification. Contact police/NGOs before any in-person meeting. Photos are encrypted at rest.</p>
          <div className="text-xs text-slate-500 mt-3">© 2026 ORION • For demo • Not a replacement for official investigation</div>
        </div>
      </div>
    </footer>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <Navbar/>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/report-lost" element={<ReportLost/>}/>
            <Route path="/report-found" element={<ReportFound/>}/>
            <Route path="/lost" element={<Lost/>}/>
            <Route path="/found" element={<Found/>}/>
            <Route path="/matches" element={<Matches/>}/>
            <Route path="/lost/:id" element={<PersonDetail type="lost"/>}/>
            <Route path="/found/:id" element={<PersonDetail type="found"/>}/>
          </Routes>
        </main>
        <Footer/>
      </div>
    </BrowserRouter>
  )
}
