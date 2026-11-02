/**
 * CHRONO Matching Engine
 * Simulates AI face matching with multi-factor scoring
 * In production: replace with InsightFace / FaceNet embeddings + cosine similarity
 */

// Generate a pseudo embedding from file buffer (perceptual hash simulation)
export function generateEmbedding(buffer) {
  // Simple hash based on buffer stats - deterministic for same image
  let hash = 0;
  const len = Math.min(buffer.length, 4096);
  for (let i = 0; i < len; i += 4) {
    hash = ((hash << 5) - hash + buffer[i]) | 0;
  }
  // Generate 128-dim pseudo embedding
  const embedding = [];
  let seed = Math.abs(hash) || 12345;
  for (let i = 0; i < 128; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    embedding.push((seed / 233280) * 2 - 1);
  }
  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return embedding.map(v => v / norm);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // already normalized => cosine = dot
}

export function maxCosineSimilarity(embeddingsA, embeddingsB) {
  // embeddings can be single vector or array of vectors
  const listA = Array.isArray(embeddingsA[0]) ? embeddingsA : [embeddingsA];
  const listB = Array.isArray(embeddingsB[0]) ? embeddingsB : [embeddingsB];
  let best = -1;
  let bestPair = null;
  for (const a of listA) {
    for (const b of listB) {
      const s = cosineSimilarity(a, b);
      if (s > best) {
        best = s;
        bestPair = { a, b };
      }
    }
  }
  return { best, bestPair };
}

function getEmbeddings(person) {
  if (person.embeddings && Array.isArray(person.embeddings) && person.embeddings.length > 0) return person.embeddings;
  if (person.embedding) return [person.embedding];
  return [];
}

// Estimate age-progressed embedding drift
// Older time difference = more drift
export function ageAdjustedSimilarity(lostEmbedding, foundEmbedding, yearsMissing) {
  let base = cosineSimilarity(lostEmbedding, foundEmbedding);
  // Simulate that direct similarity drops with years, but age progression compensates
  // Without progression: penalty 0.03 per year
  // With progression: penalty 0.01 per year
  return {
    raw: base,
    // age-compensated score will be computed in match logic
    base
  };
}

export function computeMatchScore(lost, found) {
  // Factors: face (60%), age/gender (20%), location (10%), time (10%)
  // Support multi-photo: take best face similarity across all embeddings
  const embeddingsLost = getEmbeddings(lost);
  const embeddingsFound = getEmbeddings(found);
  let faceSim = -1;
  let usedPair = null;
  if (embeddingsLost.length && embeddingsFound.length) {
    const r = maxCosineSimilarity(embeddingsLost, embeddingsFound);
    faceSim = r.best;
    usedPair = r.bestPair;
  } else if (lost.embedding && found.embedding) {
    faceSim = cosineSimilarity(lost.embedding, found.embedding);
  } else {
    faceSim = 0;
  }
  // Map from [-1,1] to [0,1]
  const faceScore = (faceSim + 1) / 2;

  // Age proximity
  const lostCurrentAge = lost.age + (lost.yearsMissing || 0);
  const ageDiff = Math.abs(lostCurrentAge - found.estimatedAge);
  let ageScore = 1;
  if (ageDiff > 15) ageScore = 0.2;
  else if (ageDiff > 10) ageScore = 0.5;
  else if (ageDiff > 5) ageScore = 0.75;
  else if (ageDiff > 2) ageScore = 0.9;

  // Gender match
  const genderScore = lost.gender.toLowerCase() === found.gender.toLowerCase() ? 1 : 0.15;

  // Location (simple string proximity)
  let locationScore = 0.5;
  if (lost.lastSeenLocation && found.foundLocation) {
    const a = lost.lastSeenLocation.toLowerCase();
    const b = found.foundLocation.toLowerCase();
    if (a === b) locationScore = 1;
    else if (a.split(',')[0].trim() === b.split(',')[0].trim()) locationScore = 0.85;
    else if (a.includes(b.split(',')[0].trim()) || b.includes(a.split(',')[0].trim())) locationScore = 0.7;
  }

  // Time penalty - very old lost cases harder without progression
  let timePenalty = 0;
  if (lost.yearsMissing > 5) timePenalty = 0.05;
  if (lost.yearsMissing > 10) timePenalty = 0.1;

  // If age progression was used, boost face score slightly
  const progressionBoost = lost.hasAgeProgressed ? 0.08 : 0;

  const finalScore =
    faceScore * 0.6 +
    ((ageScore * 0.6 + genderScore * 0.4) * 0.2) +
    locationScore * 0.1 +
    0.1 * (1 - timePenalty) +
    progressionBoost;

  // Add deterministic jitter based on IDs to avoid identical scores
  const jitterSeed = (lost.id.charCodeAt(0) + found.id.charCodeAt(0)) % 100 / 1000;

  let clamped = Math.min(0.98, Math.max(0.05, finalScore + jitterSeed - 0.005));

  // Strong penalty if gender mismatch and age diff huge
  if (genderScore < 0.5 && ageDiff > 12) clamped *= 0.65;
  // If faceScore very low, cap
  if (faceScore < 0.55) clamped = Math.min(clamped, 0.68);

  return {
    score: Number((clamped * 100).toFixed(1)),
    breakdown: {
      face: Number((faceScore * 100).toFixed(1)),
      age: Number((ageScore * 100).toFixed(1)),
      gender: genderScore === 1 ? 100 : 15,
      location: Number((locationScore * 100).toFixed(1))
    },
    faceSim: Number(faceSim.toFixed(3))
  };
}

export function getMatchLevel(score) {
  if (score >= 85) return { label: "Very High Match", color: "emerald", action: "Immediate verification recommended" };
  if (score >= 70) return { label: "High Match", color: "teal", action: "Strong candidate - verify details" };
  if (score >= 50) return { label: "Possible Match", color: "amber", action: "Review and compare" };
  return { label: "Low Match", color: "slate", action: "Unlikely" };
}
