import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'orion.db')
export const db = new DatabaseSync(DB_PATH)

// Enable foreign keys and WAL
try { db.exec('PRAGMA foreign_keys = ON'); } catch {}
try { db.exec('PRAGMA journal_mode = WAL'); } catch {}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lost_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      lastSeenLocation TEXT NOT NULL,
      lastSeenDate TEXT NOT NULL,
      yearsMissing REAL NOT NULL,
      description TEXT,
      contactName TEXT,
      contactPhone TEXT,
      contactEmail TEXT,
      hasAgeProgressed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'missing',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lost_photos (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      url TEXT NOT NULL,
      embedding TEXT NOT NULL,
      ageProgressedImage TEXT,
      ageProgressionMeta TEXT,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES lost_persons(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lost_photos_person ON lost_photos(person_id);

    CREATE TABLE IF NOT EXISTS found_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      estimatedAge INTEGER NOT NULL,
      gender TEXT NOT NULL,
      foundLocation TEXT NOT NULL,
      foundDate TEXT NOT NULL,
      description TEXT,
      reporterName TEXT,
      reporterPhone TEXT,
      status TEXT DEFAULT 'unidentified',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS found_photos (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      url TEXT NOT NULL,
      embedding TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES found_persons(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_found_photos_person ON found_photos(person_id);
  `)
  // Police use: add FIR / station columns if missing
  try { db.exec(`ALTER TABLE lost_persons ADD COLUMN firNumber TEXT`); } catch {}
  try { db.exec(`ALTER TABLE lost_persons ADD COLUMN policeStation TEXT`); } catch {}
  try { db.exec(`ALTER TABLE lost_persons ADD COLUMN ioName TEXT`); } catch {}
  try { db.exec(`ALTER TABLE found_persons ADD COLUMN firLinked TEXT`); } catch {}
  try { db.exec(`ALTER TABLE found_persons ADD COLUMN policeStation TEXT`); } catch {}
  try { db.exec(`ALTER TABLE found_persons ADD COLUMN rescuedBy TEXT`); } catch {}

  // Migration from JSON if DB empty
  const lostCount = db.prepare('SELECT COUNT(*) as c FROM lost_persons').get().c
  const foundCount = db.prepare('SELECT COUNT(*) as c FROM found_persons').get().c
  if (lostCount === 0 && foundCount === 0) {
    const LOST_JSON = path.join(DATA_DIR, 'lost.json')
    const FOUND_JSON = path.join(DATA_DIR, 'found.json')
    let migrated = false
    if (fs.existsSync(LOST_JSON)) {
      try {
        const lost = JSON.parse(fs.readFileSync(LOST_JSON, 'utf-8'))
        if (Array.isArray(lost) && lost.length) {
          for (const p of lost) insertLostFromLegacy(p)
          console.log(`Migrated ${lost.length} lost persons from JSON to SQLite`)
          migrated = true
        }
      } catch (e) { console.error('lost.json migration failed', e) }
    }
    if (fs.existsSync(FOUND_JSON)) {
      try {
        const found = JSON.parse(fs.readFileSync(FOUND_JSON, 'utf-8'))
        if (Array.isArray(found) && found.length) {
          for (const p of found) insertFoundFromLegacy(p)
          console.log(`Migrated ${found.length} found persons from JSON to SQLite`)
          migrated = true
        }
      } catch (e) { console.error('found.json migration failed', e) }
    }
  }
}

function insertLostFromLegacy(p) {
  // p may have imageUrls/embeddings or single imageUrl/embedding
  const id = p.id || uuidv4()
  const imageUrls = p.imageUrls && p.imageUrls.length ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : [])
  const embeddings = p.embeddings && p.embeddings.length ? p.embeddings : (p.embedding ? [p.embedding] : [])
  const agedImages = p.ageProgressedImages && p.ageProgressedImages.length ? p.ageProgressedImages : (p.ageProgressedImage ? [p.ageProgressedImage] : [])
  const agedMetas = p.ageProgressionMetas && p.ageProgressionMetas.length ? p.ageProgressionMetas : (p.ageProgressionMeta ? [p.ageProgressionMeta] : [])
  // normalize metas to array length same as photos
  while (agedImages.length < imageUrls.length) agedImages.push(null)
  while (agedMetas.length < imageUrls.length) agedMetas.push(null)

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO lost_persons
    (id, name, age, gender, lastSeenLocation, lastSeenDate, yearsMissing, description, contactName, contactPhone, contactEmail, firNumber, policeStation, ioName, hasAgeProgressed, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id, p.name, p.age, p.gender, p.lastSeenLocation, p.lastSeenDate,
    p.yearsMissing || 0, p.description || '', p.contactName || '', p.contactPhone || '', p.contactEmail || '',
    p.firNumber || '', p.policeStation || '', p.ioName || '',
    p.hasAgeProgressed ? 1 : 0, p.status || 'missing', p.createdAt || new Date().toISOString()
  )

  const photoStmt = db.prepare(`
    INSERT INTO lost_photos (id, person_id, url, embedding, ageProgressedImage, ageProgressionMeta, is_primary, sort_order, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]
    const emb = embeddings[i] || embeddings[0]
    if (!url || !emb) continue
    const pid = uuidv4()
    const metaJson = agedMetas[i] ? JSON.stringify(agedMetas[i]) : null
    const aged = agedImages[i] || null
    photoStmt.run(pid, id, url, JSON.stringify(emb), aged, metaJson, i === 0 ? 1 : 0, i, new Date().toISOString())
  }
}

function insertFoundFromLegacy(p) {
  const id = p.id || uuidv4()
  const imageUrls = p.imageUrls && p.imageUrls.length ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : [])
  const embeddings = p.embeddings && p.embeddings.length ? p.embeddings : (p.embedding ? [p.embedding] : [])

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO found_persons
    (id, name, estimatedAge, gender, foundLocation, foundDate, description, reporterName, reporterPhone, firLinked, policeStation, rescuedBy, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id, p.name || `Unidentified ${p.gender}`, p.estimatedAge, p.gender, p.foundLocation, p.foundDate,
    p.description || '', p.reporterName || '', p.reporterPhone || '', p.firLinked || '', p.policeStation || '', p.rescuedBy || '', p.status || 'unidentified', p.createdAt || new Date().toISOString()
  )
  const photoStmt = db.prepare(`
    INSERT INTO found_photos (id, person_id, url, embedding, is_primary, sort_order, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]
    const emb = embeddings[i] || embeddings[0]
    if (!url || !emb) continue
    photoStmt.run(uuidv4(), id, url, JSON.stringify(emb), i === 0 ? 1 : 0, i, new Date().toISOString())
  }
}


// Helpers to assemble persons with photos
function rowToLost(row) { return { ...row, hasAgeProgressed: !!row.hasAgeProgressed, yearsMissing: Number(row.yearsMissing), age: Number(row.age) } }
function rowToFound(row) { return { ...row, estimatedAge: Number(row.estimatedAge) } }

export function getLostById(id) {
  const person = db.prepare('SELECT * FROM lost_persons WHERE id = ?').get(id)
  if (!person) return null
  const photos = db.prepare('SELECT * FROM lost_photos WHERE person_id = ? ORDER BY sort_order ASC, is_primary DESC, createdAt ASC').all(id)
  return assembleLost(person, photos)
}

export function getFoundById(id) {
  const person = db.prepare('SELECT * FROM found_persons WHERE id = ?').get(id)
  if (!person) return null
  const photos = db.prepare('SELECT * FROM found_photos WHERE person_id = ? ORDER BY sort_order ASC, is_primary DESC, createdAt ASC').all(id)
  return assembleFound(person, photos)
}

export function getAllLost() {
  const persons = db.prepare('SELECT * FROM lost_persons ORDER BY datetime(createdAt) DESC').all()
  return persons.map(p => {
    const photos = db.prepare('SELECT * FROM lost_photos WHERE person_id = ? ORDER BY sort_order ASC').all(p.id)
    return assembleLost(p, photos)
  })
}

export function getAllFound() {
  const persons = db.prepare('SELECT * FROM found_persons ORDER BY datetime(createdAt) DESC').all()
  return persons.map(p => {
    const photos = db.prepare('SELECT * FROM found_photos WHERE person_id = ? ORDER BY sort_order ASC').all(p.id)
    return assembleFound(p, photos)
  })
}

function assembleLost(row, photos) {
  const p = rowToLost(row)
  const imageUrls = photos.map(ph => ph.url)
  const embeddings = photos.map(ph => JSON.parse(ph.embedding))
  const ageProgressedImages = photos.map(ph => ph.ageProgressedImage || null)
  const ageProgressionMetas = photos.map(ph => ph.ageProgressionMeta ? JSON.parse(ph.ageProgressionMeta) : null)
  const primaryIdx = photos.findIndex(ph => ph.is_primary) >=0 ? photos.findIndex(ph => ph.is_primary) : 0
  const hasAgeProgressed = photos.some(ph => ph.ageProgressedImage)
  // ensure primary is first in arrays for compat
  // reorder arrays so primary is index 0 to keep old logic simple? But we store is_primary separately.
  // For API compat, ensure imageUrls[0] is primary
  if (primaryIdx !== 0 && photos.length > 1) {
    // reorder arrays to put primary first
    const reorder = (arr) => {
      const copy=[...arr]
      const [item]=copy.splice(primaryIdx,1)
      copy.unshift(item)
      return copy
    }
    // but we already have is_primary flag; for API we return reordered so that imageUrl is primary
    // Let's reorder for response
    const reorderedPhotos=[...photos]
    const [prim]=reorderedPhotos.splice(primaryIdx,1)
    reorderedPhotos.unshift(prim)
    return assembleLost(row, reorderedPhotos) // recursion once
  }
  return {
    ...p,
    hasAgeProgressed: hasAgeProgressed ? true : !!p.hasAgeProgressed,
    imageUrl: imageUrls[0] || null,
    imageUrls,
    embedding: embeddings[0] || null,
    embeddings,
    ageProgressedImage: photos.find(ph=>ph.ageProgressedImage)?.ageProgressedImage || null,
    ageProgressedImages,
    ageProgressionMeta: photos.find(ph=>ph.ageProgressionMeta)?.ageProgressionMeta ? JSON.parse(photos.find(ph=>ph.ageProgressionMeta).ageProgressionMeta) : null,
    ageProgressionMetas,
    photoCount: photos.length,
    photos: photos.map(ph=> ({
      id: ph.id,
      url: ph.url,
      embedding: JSON.parse(ph.embedding),
      ageProgressedImage: ph.ageProgressedImage,
      ageProgressionMeta: ph.ageProgressionMeta ? JSON.parse(ph.ageProgressionMeta) : null,
      is_primary: !!ph.is_primary,
      sort_order: ph.sort_order
    }))
  }
}

function assembleFound(row, photos) {
  const p = rowToFound(row)
  const imageUrls = photos.map(ph => ph.url)
  const embeddings = photos.map(ph => JSON.parse(ph.embedding))
  const primaryIdx = photos.findIndex(ph => ph.is_primary) >=0 ? photos.findIndex(ph => ph.is_primary) : 0
  if (primaryIdx !== 0 && photos.length > 1) {
    const reordered=[...photos]
    const [prim]=reordered.splice(primaryIdx,1)
    reordered.unshift(prim)
    return assembleFound(row, reordered)
  }
  return {
    ...p,
    imageUrl: imageUrls[0] || null,
    imageUrls,
    embedding: embeddings[0] || null,
    embeddings,
    photoCount: photos.length,
    photos: photos.map(ph=> ({
      id: ph.id,
      url: ph.url,
      embedding: JSON.parse(ph.embedding),
      is_primary: !!ph.is_primary,
      sort_order: ph.sort_order
    }))
  }
}

export function createLostPerson(data, photoList) {
  // photoList: [{url, embedding, ageProgressedImage, ageProgressionMeta}]
  const id = uuidv4()
  const createdAt = new Date().toISOString()
  db.prepare(`
    INSERT INTO lost_persons (id, name, age, gender, lastSeenLocation, lastSeenDate, yearsMissing, description, contactName, contactPhone, contactEmail, firNumber, policeStation, ioName, hasAgeProgressed, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.age, data.gender, data.lastSeenLocation, data.lastSeenDate, data.yearsMissing, data.description||'', data.contactName||'', data.contactPhone||'', data.contactEmail||'', data.firNumber||'', data.policeStation||'', data.ioName||'', data.hasAgeProgressed?1:0, 'missing', createdAt)
  const stmt = db.prepare(`INSERT INTO lost_photos (id, person_id, url, embedding, ageProgressedImage, ageProgressionMeta, is_primary, sort_order, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  photoList.forEach((ph,i)=>{
    stmt.run(uuidv4(), id, ph.url, JSON.stringify(ph.embedding), ph.ageProgressedImage||null, ph.ageProgressionMeta? JSON.stringify(ph.ageProgressionMeta):null, i===0?1:0, i, new Date().toISOString())
  })
  return getLostById(id)
}

export function createFoundPerson(data, photoList) {
  const id = uuidv4()
  const createdAt = new Date().toISOString()
  db.prepare(`
    INSERT INTO found_persons (id, name, estimatedAge, gender, foundLocation, foundDate, description, reporterName, reporterPhone, firLinked, policeStation, rescuedBy, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.estimatedAge, data.gender, data.foundLocation, data.foundDate, data.description||'', data.reporterName||'', data.reporterPhone||'', data.firLinked||'', data.policeStation||'', data.rescuedBy||'', 'unidentified', createdAt)
  const stmt = db.prepare(`INSERT INTO found_photos (id, person_id, url, embedding, is_primary, sort_order, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  photoList.forEach((ph,i)=>{
    stmt.run(uuidv4(), id, ph.url, JSON.stringify(ph.embedding), i===0?1:0, i, new Date().toISOString())
  })
  return getFoundById(id)
}

export function addLostPhotos(personId, photoList){
  const person = db.prepare('SELECT * FROM lost_persons WHERE id=?').get(personId)
  if(!person) return null
  const existing = db.prepare('SELECT COUNT(*) as c FROM lost_photos WHERE person_id=?').get(personId).c
  const stmt = db.prepare(`INSERT INTO lost_photos (id, person_id, url, embedding, ageProgressedImage, ageProgressionMeta, is_primary, sort_order, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  photoList.forEach((ph,i)=>{
    stmt.run(uuidv4(), personId, ph.url, JSON.stringify(ph.embedding), ph.ageProgressedImage||null, ph.ageProgressionMeta?JSON.stringify(ph.ageProgressionMeta):null, 0, existing+i, new Date().toISOString())
  })
  // update hasAgeProgressed flag if any aged
  if(photoList.some(p=>p.ageProgressedImage)){
    db.prepare(`UPDATE lost_persons SET hasAgeProgressed=1 WHERE id=?`).run(personId)
  }
  return getLostById(personId)
}

export function addFoundPhotos(personId, photoList){
  const person = db.prepare('SELECT * FROM found_persons WHERE id=?').get(personId)
  if(!person) return null
  const existing = db.prepare('SELECT COUNT(*) as c FROM found_photos WHERE person_id=?').get(personId).c
  const stmt = db.prepare(`INSERT INTO found_photos (id, person_id, url, embedding, is_primary, sort_order, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  photoList.forEach((ph,i)=>{
    stmt.run(uuidv4(), personId, ph.url, JSON.stringify(ph.embedding), 0, existing+i, new Date().toISOString())
  })
  return getFoundById(personId)
}

export function deleteLostPhoto(personId, idx){
  const photos = db.prepare('SELECT * FROM lost_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  if(idx<0 || idx>=photos.length) throw new Error('Invalid index')
  if(photos.length===1) throw new Error('Cannot delete last photo')
  const toDelete = photos[idx]
  db.prepare('DELETE FROM lost_photos WHERE id=?').run(toDelete.id)
  // re-normalize sort_order
  const remaining = db.prepare('SELECT * FROM lost_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  remaining.forEach((ph,i)=>{
    db.prepare('UPDATE lost_photos SET sort_order=?, is_primary=? WHERE id=?').run(i, i===0?1:0, ph.id)
  })
  // update hasAgeProgressed
  const hasAged = remaining.some(ph=> ph.ageProgressedImage)
  db.prepare('UPDATE lost_persons SET hasAgeProgressed=? WHERE id=?').run(hasAged?1:0, personId)
  return getLostById(personId)
}

export function deleteFoundPhoto(personId, idx){
  const photos = db.prepare('SELECT * FROM found_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  if(idx<0 || idx>=photos.length) throw new Error('Invalid index')
  if(photos.length===1) throw new Error('Cannot delete last photo')
  const toDelete = photos[idx]
  db.prepare('DELETE FROM found_photos WHERE id=?').run(toDelete.id)
  const remaining = db.prepare('SELECT * FROM found_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  remaining.forEach((ph,i)=>{
    db.prepare('UPDATE found_photos SET sort_order=?, is_primary=? WHERE id=?').run(i, i===0?1:0, ph.id)
  })
  return getFoundById(personId)
}

export function setPrimaryLostPhoto(personId, idx){
  const photos = db.prepare('SELECT * FROM lost_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  if(idx<0 || idx>=photos.length) throw new Error('Invalid index')
  // swap sort_order: make idx become 0, others shift
  // simplest: reorder array and rewrite sort_order
  const reordered=[...photos]
  const [picked]=reordered.splice(idx,1)
  reordered.unshift(picked)
  reordered.forEach((ph,i)=>{
    db.prepare('UPDATE lost_photos SET sort_order=?, is_primary=? WHERE id=?').run(i, i===0?1:0, ph.id)
  })
  return getLostById(personId)
}

export function setPrimaryFoundPhoto(personId, idx){
  const photos = db.prepare('SELECT * FROM found_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  if(idx<0 || idx>=photos.length) throw new Error('Invalid index')
  const reordered=[...photos]
  const [picked]=reordered.splice(idx,1)
  reordered.unshift(picked)
  reordered.forEach((ph,i)=>{
    db.prepare('UPDATE found_photos SET sort_order=?, is_primary=? WHERE id=?').run(i, i===0?1:0, ph.id)
  })
  return getFoundById(personId)
}

export function updateLostPhotoAgeProgress(personId, idx, imageBase64, meta){
  const photos = db.prepare('SELECT * FROM lost_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  if(idx<0 || idx>=photos.length) throw new Error('Invalid index')
  const ph = photos[idx]
  db.prepare('UPDATE lost_photos SET ageProgressedImage=?, ageProgressionMeta=? WHERE id=?').run(imageBase64, meta? JSON.stringify(meta):null, ph.id)
  db.prepare('UPDATE lost_persons SET hasAgeProgressed=1 WHERE id=?').run(personId)
  return getLostById(personId)
}

export function updateLostPhotoAgeProgressBulk(personId, results){
  // results: array of {imageBase64, meta} or null per index
  const photos = db.prepare('SELECT * FROM lost_photos WHERE person_id=? ORDER BY sort_order ASC').all(personId)
  let any=false
  results.forEach((r,i)=>{
    if(!r) return
    const ph=photos[i]
    if(!ph) return
    db.prepare('UPDATE lost_photos SET ageProgressedImage=?, ageProgressionMeta=? WHERE id=?').run(r.imageBase64, r.meta? JSON.stringify(r.meta):null, ph.id)
    any=true
  })
  if(any) db.prepare('UPDATE lost_persons SET hasAgeProgressed=1 WHERE id=?').run(personId)
  return getLostById(personId)
}

export function deleteLostPerson(id){
  const res = db.prepare('DELETE FROM lost_persons WHERE id=?').run(id)
  return res.changes>0
}
export function deleteFoundPerson(id){
  const res = db.prepare('DELETE FROM found_persons WHERE id=?').run(id)
  return res.changes>0
}

export function updateLostStatus(id, status){
  db.prepare('UPDATE lost_persons SET status=? WHERE id=?').run(status, id)
  return getLostById(id)
}
export function updateFoundStatus(id, status){
  db.prepare('UPDATE found_persons SET status=? WHERE id=?').run(status, id)
  return getFoundById(id)
}

export function getStats(){
  const totalLost = db.prepare('SELECT COUNT(*) as c FROM lost_persons').get().c
  const activeLost = db.prepare("SELECT COUNT(*) as c FROM lost_persons WHERE status='missing'").get().c
  const reunited = db.prepare("SELECT COUNT(*) as c FROM lost_persons WHERE status='reunited'").get().c
  const totalFound = db.prepare('SELECT COUNT(*) as c FROM found_persons').get().c
  const pendingFound = db.prepare("SELECT COUNT(*) as c FROM found_persons WHERE status='unidentified'").get().c
  const ageProgressions = db.prepare('SELECT COUNT(*) as c FROM lost_persons WHERE hasAgeProgressed=1').get().c
  const totalLostPhotos = db.prepare('SELECT COUNT(*) as c FROM lost_photos').get().c
  const totalFoundPhotos = db.prepare('SELECT COUNT(*) as c FROM found_photos').get().c
  return { totalLost, activeLost, reunited, totalFound, pendingFound, ageProgressions, totalLostPhotos, totalFoundPhotos }
}

// For matching, need all persons with embeddings
export function getAllLostForMatching(){
  return getAllLost()
}
export function getAllFoundForMatching(){
  return getAllFound()
}
