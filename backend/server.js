import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateEmbedding, computeMatchScore, getMatchLevel } from "./utils/matching.js";
import { generateAgeProgressedImage, calculateYearsMissing } from "./utils/ageProgression.js";
import {
  initDb, db,
  getLostById, getFoundById, getAllLost, getAllFound,
  createLostPerson, createFoundPerson,
  addLostPhotos, addFoundPhotos,
  deleteLostPhoto, deleteFoundPhoto,
  setPrimaryLostPhoto, setPrimaryFoundPhoto,
  updateLostPhotoAgeProgress, updateLostPhotoAgeProgressBulk,
  deleteLostPerson, deleteFoundPerson,
  updateLostStatus, updateFoundStatus,
  getStats, getAllLostForMatching, getAllFoundForMatching
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure dirs
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Init DB (creates tables, migrates JSON, seeds demo)
initDb();

// Multer — support up to 8 photos, 8MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null,true);
    else cb(new Error("Only images allowed"), false);
  }
});
function collectFiles(req){
  if (req.files && Array.isArray(req.files) && req.files.length) return req.files;
  if (req.file) return [req.file];
  if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)){
    return Object.values(req.files).flat();
  }
  return [];
}
const uploadAny = upload.any();

function saveImageBuffer(buffer, originalName){
  const ext = path.extname(originalName) || ".jpg";
  const fname = `${Date.now()}-${uuidv4()}${ext}`;
  const fpath = path.join(UPLOAD_DIR, fname);
  fs.writeFileSync(fpath, buffer);
  return `/uploads/${fname}`;
}

// --- API ROUTES ---

app.get("/api/health", (req,res)=> res.json({ status:"ok", time:new Date().toISOString(), version:"2.0.0", db: "sqlite", dbPath: path.join(DATA_DIR, "chrono.db") }));

app.get("/api/stats", (req,res)=>{
  const s = getStats();
  // compute highMatches using matching engine
  const lostAll = getAllLostForMatching();
  const foundAll = getAllFoundForMatching();
  let highMatches = 0;
  for (const l of lostAll) for (const f of foundAll) {
    const sc = computeMatchScore(l,f);
    if (sc.score >= 70) highMatches++;
  }
  res.json({
    totalLost: s.totalLost,
    activeLost: s.activeLost,
    reunited: s.reunited,
    totalFound: s.totalFound,
    pendingFound: s.pendingFound,
    highMatches,
    ageProgressions: s.ageProgressions,
    totalLostPhotos: s.totalLostPhotos,
    totalFoundPhotos: s.totalFoundPhotos,
    totalPhotos: s.totalLostPhotos + s.totalFoundPhotos
  });
});

// Extra: DB info
app.get("/api/db/info", (req,res)=>{
  const s = getStats();
  res.json({
    path: path.join(DATA_DIR, "chrono.db"),
    tables: ["lost_persons","lost_photos","found_persons","found_photos"],
    stats: s
  });
});

// Gallery: list all photos paginated
app.get("/api/photos", (req,res)=>{
  const lostPhotos = db.prepare(`SELECT lp.id as photo_id, lp.url, lp.person_id, lp.is_primary, lp.sort_order, l.name as person_name, 'lost' as type FROM lost_photos lp JOIN lost_persons l ON lp.person_id=l.id ORDER BY lp.createdAt DESC LIMIT 100`).all();
  const foundPhotos = db.prepare(`SELECT fp.id as photo_id, fp.url, fp.person_id, fp.is_primary, fp.sort_order, f.name as person_name, 'found' as type FROM found_photos fp JOIN found_persons f ON fp.person_id=f.id ORDER BY fp.createdAt DESC LIMIT 100`).all();
  res.json({ lost: lostPhotos, found: foundPhotos, total: lostPhotos.length + foundPhotos.length });
});

app.get("/api/lost", (req,res)=>{
  const { search, status, gender } = req.query;
  let result = getAllLost();
  if (search){
    const q = search.toLowerCase();
    result = result.filter(p=> p.name.toLowerCase().includes(q) || p.lastSeenLocation.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
  }
  if (status) result = result.filter(p=> p.status===status);
  if (gender) result = result.filter(p=> p.gender.toLowerCase()===gender.toLowerCase());
  res.json(result);
});

app.get("/api/found", (req,res)=>{
  const { search, status } = req.query;
  let result = getAllFound();
  if (search){
    const q=search.toLowerCase();
    result=result.filter(p=> p.name.toLowerCase().includes(q) || p.foundLocation.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
  }
  if (status) result = result.filter(p=> p.status===status);
  res.json(result);
});

app.get("/api/lost/:id", (req,res)=>{
  const p = getLostById(req.params.id);
  if(!p) return res.status(404).json({ error:"Not found"});
  res.json(p);
});
app.get("/api/found/:id", (req,res)=>{
  const p = getFoundById(req.params.id);
  if(!p) return res.status(404).json({ error:"Not found"});
  res.json(p);
});

// Create lost report — MULTI-PHOTO — POLICE EDITION
app.post("/api/lost", uploadAny, async (req,res)=>{
  try{
    const { name, age, gender, lastSeenLocation, lastSeenDate, description, contactName, contactPhone, contactEmail, firNumber, policeStation, ioName } = req.body;
    if(!name || !age || !gender || !lastSeenLocation || !lastSeenDate) return res.status(400).json({ error:"Missing required fields"});
    const files = collectFiles(req);
    if(!files.length) return res.status(400).json({ error:"At least one photo is required (up to 8)"});
    if(files.length > 8) return res.status(400).json({ error:"Maximum 8 photos allowed"});

    const ageNum = parseInt(age);
    const yearsMissing = calculateYearsMissing(lastSeenDate);
    const photoList = [];
    let hasAgeProgressed = false;
    for (const file of files){
      const url = saveImageBuffer(file.buffer, file.originalname);
      const emb = generateEmbedding(file.buffer);
      let agedImage = null;
      let agedMeta = null;
      if (yearsMissing >= 2){
        try{
          const prog = await generateAgeProgressedImage(file.buffer, ageNum, Math.floor(yearsMissing), gender);
          agedImage = prog.imageBase64;
          agedMeta = prog;
          hasAgeProgressed = true;
        }catch(e){ console.error("progression failed", e)}
      }
      photoList.push({ url, embedding: emb, ageProgressedImage: agedImage, ageProgressionMeta: agedMeta });
    }

    const personData = {
      name, age: ageNum, gender, lastSeenLocation, lastSeenDate,
      yearsMissing, description: description||'', contactName: contactName||'', contactPhone: contactPhone||'', contactEmail: contactEmail||'',
      firNumber: firNumber||'', policeStation: policeStation||'', ioName: ioName||'',
      hasAgeProgressed
    };
    const created = createLostPerson(personData, photoList);
    res.status(201).json(created);
  }catch(e){
    console.error(e);
    res.status(500).json({ error:"Failed to create report", details:e.message});
  }
});

// Create found report — MULTI-PHOTO — POLICE EDITION
app.post("/api/found", uploadAny, async (req,res)=>{
  try{
    const { name, estimatedAge, gender, foundLocation, foundDate, description, reporterName, reporterPhone, firLinked, policeStation, rescuedBy } = req.body;
    if(!estimatedAge || !gender || !foundLocation || !foundDate) return res.status(400).json({ error:"Missing required fields"});
    const files = collectFiles(req);
    if(!files.length) return res.status(400).json({ error:"At least one photo is required (up to 8)"});
    if(files.length > 8) return res.status(400).json({ error:"Maximum 8 photos allowed"});

    const photoList = [];
    for (const file of files){
      const url = saveImageBuffer(file.buffer, file.originalname);
      const emb = generateEmbedding(file.buffer);
      photoList.push({ url, embedding: emb });
    }

    const personData = {
      name: name || `Unidentified ${gender} #F-${Math.floor(1000+Math.random()*9000)}`,
      estimatedAge: parseInt(estimatedAge), gender, foundLocation, foundDate,
      description: description||'', reporterName: reporterName||'', reporterPhone: reporterPhone||'',
      firLinked: firLinked||'', policeStation: policeStation||'', rescuedBy: rescuedBy||''
    };
    const created = createFoundPerson(personData, photoList);
    res.status(201).json(created);
  }catch(e){
    console.error(e);
    res.status(500).json({ error:"Failed to create report"});
  }
});

// Age progression on-demand for existing lost case — supports multi index or new upload
app.post("/api/age-progress/:id", uploadAny, async (req,res)=>{
  try{
    const lost = getLostById(req.params.id);
    if(!lost) return res.status(404).json({ error:"Lost person not found"});
    const files = collectFiles(req);
    const idx = req.body.photoIndex !== undefined ? parseInt(req.body.photoIndex) : (req.query.photoIndex !== undefined ? parseInt(req.query.photoIndex) : 0);
    let targetIdx = 0;
    if (files.length){
      const buffer = files[0].buffer;
      if (req.body.saveAsNew === 'true' || req.query.saveAsNew === 'true'){
        const url = saveImageBuffer(files[0].buffer, files[0].originalname);
        const emb = generateEmbedding(files[0].buffer);
        let agedImage=null, agedMeta=null;
        try{
          const prog = await generateAgeProgressedImage(buffer, lost.age, Math.floor(lost.yearsMissing)||4, lost.gender);
          agedImage=prog.imageBase64; agedMeta=prog;
        }catch(e){ console.error(e)}
        const updated = addLostPhotos(lost.id, [{ url, embedding: emb, ageProgressedImage: agedImage, ageProgressionMeta: agedMeta }]);
        return res.json({ ...agedMeta, photoIndex: updated.imageUrls.length-1, savedAsNew: true });
      } else {
        const years = lost.yearsMissing || calculateYearsMissing(lost.lastSeenDate);
        const prog = await generateAgeProgressedImage(buffer, lost.age, Math.floor(years) || 4, lost.gender);
        const saveIdx = Math.min(isNaN(idx)?0:idx, lost.imageUrls.length -1);
        updateLostPhotoAgeProgress(lost.id, saveIdx, prog.imageBase64, prog);
        return res.json({ ...prog, photoIndex: saveIdx });
      }
    } else {
      targetIdx = Math.min(Math.max(0, isNaN(idx)?0:idx), lost.imageUrls.length-1);
      const imgUrl = lost.imageUrls[targetIdx];
      if (!imgUrl) return res.status(400).json({ error:"No image at that index"});
      let buffer = null;
      if (imgUrl.startsWith("/uploads")){
        const fp = path.join(__dirname, imgUrl.replace("/uploads","uploads"));
        if (fs.existsSync(fp)) buffer = fs.readFileSync(fp);
      }
      if (!buffer){
        if (imgUrl.startsWith("http")) return res.status(400).json({ error:"Remote URL cannot be processed — please upload a new photo"});
        return res.status(400).json({ error:"No image available for progression"});
      }
      const years = lost.yearsMissing || calculateYearsMissing(lost.lastSeenDate);
      const prog = await generateAgeProgressedImage(buffer, lost.age, Math.floor(years) || 4, lost.gender);
      updateLostPhotoAgeProgress(lost.id, targetIdx, prog.imageBase64, prog);
      res.json({ ...prog, photoIndex: targetIdx });
    }
  }catch(e){
    console.error(e);
    res.status(500).json({ error:"Progression failed", details:e.message});
  }
});

// Age progression for ALL photos of a lost person
app.post("/api/age-progress-all/:id", async (req,res)=>{
  try{
    const lost = getLostById(req.params.id);
    if(!lost) return res.status(404).json({ error:"Lost not found"});
    const years = lost.yearsMissing || calculateYearsMissing(lost.lastSeenDate);
    const results=[];
    const updates=[];
    for (let i=0;i<lost.imageUrls.length;i++){
      const url = lost.imageUrls[i];
      if (!url.startsWith("/uploads")) { results.push(null); updates.push(null); continue; }
      const fp = path.join(__dirname, url.replace("/uploads","uploads"));
      if (!fs.existsSync(fp)) { results.push(null); updates.push(null); continue; }
      try{
        const buf = fs.readFileSync(fp);
        const prog = await generateAgeProgressedImage(buf, lost.age, Math.floor(years)||4, lost.gender);
        results.push(prog);
        updates.push({ imageBase64: prog.imageBase64, meta: prog });
      }catch(e){ results.push(null); updates.push(null); }
    }
    updateLostPhotoAgeProgressBulk(lost.id, updates);
    const refreshed = getLostById(lost.id);
    res.json({ count: results.filter(x=>x).length, results, lost: refreshed });
  }catch(e){ res.status(500).json({ error:e.message})}
});

// Direct age progression from uploaded image (for preview) — supports multiple photos
app.post("/api/age-progress", uploadAny, async (req,res)=>{
  try{
    const { currentAge, yearsMissing, gender } = req.body;
    const files = collectFiles(req);
    if(!files.length) return res.status(400).json({ error:"Photo required"});
    if (files.length > 1){
      const out=[];
      for (const f of files){
        const prog = await generateAgeProgressedImage(f.buffer, parseInt(currentAge)||10, parseInt(yearsMissing)||4, gender||"Male");
        out.push(prog);
      }
      return res.json({ multiple: true, count: out.length, results: out, first: out[0] });
    }
    const prog = await generateAgeProgressedImage(files[0].buffer, parseInt(currentAge)||10, parseInt(yearsMissing)||4, gender||"Male");
    res.json(prog);
  }catch(e){ res.status(500).json({ error:e.message})}
});

// Add photos to existing lost report
app.post("/api/lost/:id/photos", uploadAny, async (req,res)=>{
  try{
    const p = getLostById(req.params.id);
    if(!p) return res.status(404).json({ error:"Not found"});
    const files = collectFiles(req);
    if(!files.length) return res.status(400).json({ error:"No photos provided"});
    if(p.imageUrls.length + files.length > 8) return res.status(400).json({ error:`Maximum 8 photos. Currently ${p.imageUrls.length}, trying to add ${files.length}`});
    const yearsMissing = p.yearsMissing || calculateYearsMissing(p.lastSeenDate);
    const photoList=[];
    for (const file of files){
      const url = saveImageBuffer(file.buffer, file.originalname);
      const emb = generateEmbedding(file.buffer);
      let agedImage=null, agedMeta=null;
      if (yearsMissing >= 2){
        try{
          const prog = await generateAgeProgressedImage(file.buffer, p.age, Math.floor(yearsMissing), p.gender);
          agedImage=prog.imageBase64; agedMeta=prog;
        }catch(e){}
      }
      photoList.push({ url, embedding: emb, ageProgressedImage: agedImage, ageProgressionMeta: agedMeta });
    }
    const updated = addLostPhotos(req.params.id, photoList);
    res.json(updated);
  }catch(e){ console.error(e); res.status(500).json({ error:e.message})}
});

// Add photos to existing found report
app.post("/api/found/:id/photos", uploadAny, async (req,res)=>{
  try{
    const p = getFoundById(req.params.id);
    if(!p) return res.status(404).json({ error:"Not found"});
    const files = collectFiles(req);
    if(!files.length) return res.status(400).json({ error:"No photos provided"});
    if(p.imageUrls.length + files.length > 8) return res.status(400).json({ error:`Maximum 8 photos. Currently ${p.imageUrls.length}`});
    const photoList=[];
    for (const file of files){
      const url = saveImageBuffer(file.buffer, file.originalname);
      const emb = generateEmbedding(file.buffer);
      photoList.push({ url, embedding: emb });
    }
    const updated = addFoundPhotos(req.params.id, photoList);
    res.json(updated);
  }catch(e){ console.error(e); res.status(500).json({ error:e.message})}
});

// Delete specific photo from lost
app.delete("/api/lost/:id/photos/:idx", (req,res)=>{
  try{
    const updated = deleteLostPhoto(req.params.id, parseInt(req.params.idx));
    res.json(updated);
  }catch(e){ res.status(400).json({ error:e.message})}
});

// Delete specific photo from found
app.delete("/api/found/:id/photos/:idx", (req,res)=>{
  try{
    const updated = deleteFoundPhoto(req.params.id, parseInt(req.params.idx));
    res.json(updated);
  }catch(e){ res.status(400).json({ error:e.message})}
});

// Set primary photo (reorder)
app.patch("/api/lost/:id/photos/primary", (req,res)=>{
  try{
    const updated = setPrimaryLostPhoto(req.params.id, parseInt(req.body.index));
    res.json(updated);
  }catch(e){ res.status(400).json({ error:e.message})}
});
app.patch("/api/found/:id/photos/primary", (req,res)=>{
  try{
    const updated = setPrimaryFoundPhoto(req.params.id, parseInt(req.body.index));
    res.json(updated);
  }catch(e){ res.status(400).json({ error:e.message})}
});

// Matching: find matches for a lost person
app.get("/api/match/lost/:id", (req,res)=>{
  const lost = getLostById(req.params.id);
  if(!lost) return res.status(404).json({ error:"Lost not found"});
  const foundAll = getAllFound();
  const results = foundAll.map(found=>{
    const score = computeMatchScore(lost, found);
    const level = getMatchLevel(score.score);
    return { found, score: score.score, breakdown: score.breakdown, faceSim: score.faceSim, level };
  }).sort((a,b)=> b.score - a.score);
  res.json({ lost, matches: results });
});

// Matching: find matches for a found person
app.get("/api/match/found/:id", (req,res)=>{
  const found = getFoundById(req.params.id);
  if(!found) return res.status(404).json({ error:"Found not found"});
  const lostAll = getAllLost();
  const results = lostAll.map(lost=>{
    const score = computeMatchScore(lost, found);
    const level = getMatchLevel(score.score);
    return { lost, score: score.score, breakdown: score.breakdown, faceSim: score.faceSim, level };
  }).sort((a,b)=> b.score - a.score);
  res.json({ found, matches: results });
});

// Global auto matches (all pairs above threshold)
app.get("/api/matches", (req,res)=>{
  const threshold = parseFloat(req.query.threshold) || 50;
  const lostAll = getAllLostForMatching();
  const foundAll = getAllFoundForMatching();
  const pairs=[];
  for(const lost of lostAll){
    for(const found of foundAll){
      const s = computeMatchScore(lost, found);
      if(s.score >= threshold){
        pairs.push({
          lost: { id: lost.id, name: lost.name, age: lost.age, gender: lost.gender, yearsMissing: lost.yearsMissing, imageUrl: lost.imageUrl, imageUrls: lost.imageUrls, ageProgressedImage: lost.ageProgressedImage, ageProgressedImages: lost.ageProgressedImages, lastSeenLocation: lost.lastSeenLocation, photoCount: lost.imageUrls.length },
          found: { id: found.id, name: found.name, estimatedAge: found.estimatedAge, gender: found.gender, imageUrl: found.imageUrl, imageUrls: found.imageUrls, foundLocation: found.foundLocation, photoCount: found.imageUrls.length },
          score: s.score,
          breakdown: s.breakdown,
          level: getMatchLevel(s.score)
        });
      }
    }
  }
  pairs.sort((a,b)=> b.score - a.score);
  res.json(pairs);
});

// Update status (reunited)
app.patch("/api/lost/:id/status", (req,res)=>{
  const p = getLostById(req.params.id);
  if(!p) return res.status(404).json({ error:"Not found"});
  const updated = updateLostStatus(req.params.id, req.body.status || p.status);
  res.json(updated);
});
app.patch("/api/found/:id/status", (req,res)=>{
  const p = getFoundById(req.params.id);
  if(!p) return res.status(404).json({ error:"Not found"});
  const updated = updateFoundStatus(req.params.id, req.body.status || p.status);
  res.json(updated);
});

// Delete
app.delete("/api/lost/:id", (req,res)=>{
  const ok = deleteLostPerson(req.params.id);
  if(!ok) return res.status(404).json({ error:"Not found"});
  res.json({ ok:true });
});
app.delete("/api/found/:id", (req,res)=>{
  const ok = deleteFoundPerson(req.params.id);
  if(!ok) return res.status(404).json({ error:"Not found"});
  res.json({ ok:true });
});

// Serve frontend build if exists
const FRONTEND_DIST = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  app.get("/", (req,res)=> res.json({ name:"CHRONO API", message:"AI powered missing person identification", endpoints: ["/api/lost","/api/found","/api/matches","/api/stats"], db: "SQLite at data/CHRONO.db" }));
}

app.use((err, req,res,next)=>{
  console.error(err);
  res.status(500).json({ error: err.message || "Internal error"});
});

app.listen(PORT, ()=> {
  console.log(`CHRONO backend running on http://localhost:${PORT}`);
  console.log(`SQLite DB at ${path.join(DATA_DIR, "chrono.db")}`);
  if (fs.existsSync(FRONTEND_DIST)) console.log(`Serving frontend from ${FRONTEND_DIST}`);
});
