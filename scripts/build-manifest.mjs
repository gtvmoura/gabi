// Gera public/data/manifest.json a partir do manifesto bruto exportado do Blender.
// Uso: node scripts/build-manifest.mjs <pasta-raw> <TA2.csv>
import fs from 'node:fs';
import path from 'node:path';

const [rawDir, ta2Path] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(path.join(rawDir, 'manifest.raw.json'), 'utf8'));
const texts = JSON.parse(fs.readFileSync(path.join(rawDir, 'texts.en.json'), 'utf8'));

// --- Terminologia (TA2) — nomes em latim e português como base, revisados depois pelo conteúdo
const ta = new Map();
for (const line of fs.readFileSync(ta2Path, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
  const c = line.replace(/^"|"$/g, '').split(';');
  if (c.length > 5 && c[1]) ta.set(c[1].trim().toLowerCase(), { la: c[2].trim(), pt: c[5].trim() });
}
const taOf = (n) => ta.get(n.trim().toLowerCase()) || ta.get(n.replace(/[()[\]]/g, '').trim().toLowerCase());

const SKIP = new Set(['Ciliary body-curve', '?x', '????????']);
const yup = ([x, y, z]) => [+x.toFixed(4), +z.toFixed(4), +(-y).toFixed(4)];

function category(i) {
  const m = i.mats, m0 = m[0] || '', chain = i.chain.join('|');
  switch (i.sys) {
    case 'skeleton':
      if (m.length && m.every((x) => x === 'Cartilage')) return 'cartilage';
      if (m0.startsWith('Teeth')) return 'tooth';
      return 'bone';
    case 'muscles':
      if (['Linea alba', 'Inguinal ligament', 'Iliotibial tract', 'Plantar aponeurosis', 'Palmar aponeurosis'].includes(i.name)) return 'tendon';
      if (m0 === 'Bursa') return 'bursa';
      if (m0 === 'Fascia') return 'fascia';
      if (m0 === 'Articular capsule') return 'sheath';
      if (m0 === 'Ligament' && m.length === 1) return 'fascia';
      if (m.every((x) => x === 'Tendon')) return 'tendon';
      if (/Bursa|bursae/.test(chain)) return 'bursa';
      return 'muscle';
    case 'joints':
      if (m0 === 'Articular capsule') return 'capsule';
      if (m0 === 'Cartilage') return 'disc';
      if (m0 === 'Fat') return 'fat';
      return 'ligament';
    case 'nervous':
      if (i.chain.includes('Peripheral nervous system') || i.otype === 'CURVE') return 'nerve';
      if (i.chain.includes('Sense organs')) return 'sense';
      return 'cns';
    case 'vessels':
      if (/Heart$|^Heart\|/.test(chain) || i.chain.includes('Heart')) return 'heart';
      if (m0.includes('Vein') || i.chain.includes('Venous system')) return 'vein';
      return 'artery';
    case 'viscera': return 'organ';
    case 'lymph': return 'lymph';
    case 'regions': return 'skin';
    case 'insertions': return i.kind === 'o' ? 'origin' : 'insertion';
  }
}

const items = raw.items.filter((i) => !SKIP.has(i.name));
const groups = raw.groups;
const structs = [];           // estruturas únicas (sistema + nome)
const sIndex = new Map();
const meshes = {};            // id da malha -> registro
const idToStruct = {};
for (const i of items) {
  if (i.sys === 'insertions') continue;
  const sk = i.sys + '|' + i.name;
  let si = sIndex.get(sk);
  if (si === undefined) {
    si = structs.length; sIndex.set(sk, si);
    const t = taOf(i.name);
    structs.push({ k: i.name, s: i.sys, c: category(i), g: i.parent && groups[i.parent] ? i.parent : (i.chain.find((n) => groups[n]) ?? null), pt: t?.pt || undefined, la: t?.la || undefined, m: {} });
    if (i.parent && !groups[i.parent]) structs[si].on = i.parent; // subestrutura de outra malha (ex.: seios dos ossos)
  }
  structs[si].m[i.side || 'c'] = i.id;
  idToStruct[i.id] = si;
  const c = yup(i.c), mn = yup(i.bmin), mx = yup(i.bmax);
  const r = Math.hypot(i.bmax[0] - i.bmin[0], i.bmax[1] - i.bmin[1], i.bmax[2] - i.bmin[2]) / 2;
  const b = [Math.min(mn[0], mx[0]), Math.min(mn[1], mx[1]), Math.min(mn[2], mx[2]), Math.max(mn[0], mx[0]), Math.max(mn[1], mx[1]), Math.max(mn[2], mx[2])];
  meshes[i.id] = { s: si, d: i.side, c, r: +r.toFixed(4), b, ...(i.mirrorOf ? { mir: i.mirrorOf } : {}), ...(i.mats.length > 1 ? { mats: i.mats } : { mat: i.mats[0] || 'None' }) };
}
const byName = new Map();
for (const [si, s] of structs.entries()) if (!byName.has(s.k)) byName.set(s.k, si);

// --- Origens e inserções: liga a malha ao músculo (ou grupo) e ao osso
const insertions = [];
const unmatched = new Set();
const underGroup = (g, target) => { while (g) { if (g === target) return true; g = groups[g]?.parent; } return false; };
const ALIAS = {
  'Adductor pollicis': ['Oblique head of adductor pollicis', 'Transverse head of adductor pollicis'],
  'Biceps femoris muscle': ['Long head of biceps femoris', 'Short head of biceps femoris'],
  'Extensor carpi ulnaris': ['Humeral head of extensor carpi ulnaris', 'Ulnar head of extensor carpi ulnaris'],
  'Flexor carpi ulnaris': ['Humeral head of flexor carpi ulnaris', 'Ulnar head of flexor carpi ulnaris'],
  'Flexor digitorum superficialis': ['Humero-ulnar head of flexor digitorum superficialis', 'Radial head of flexor digitorum superficialis'],
  'Lateral pterygoid muscle': ['Superior head of lateral pterygoid muscle', 'Inferior head of lateral pterygoid muscle'],
  'Masseter': ['Superficial part of masseter', 'Deep part of masseter'],
  'Pronator teres': ['Superficial head of pronator teres', 'Deep head of pronator teres'],
  'Quadriceps femoris muscle': ['Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle'],
  'Patellar ligament': ['Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle'],
  'Triceps surae muscle': ['Lateral head of gastrocnemius', 'Medial head of gastrocnemius', 'Soleus muscle'],
  'Common extensor tendon': ['Extensor carpi radialis brevis', 'Extensor digitorum', 'Extensor digiti minimi', 'Humeral head of extensor carpi ulnaris'],
  'Common flexor tendon': ['Superficial head of pronator teres', 'Flexor carpi radialis', 'Palmaris longus muscle', 'Humeral head of flexor carpi ulnaris', 'Humero-ulnar head of flexor digitorum superficialis'],
};
for (const i of items) {
  if (i.sys !== 'insertions') continue;
  const bone = structs.findIndex((s) => s.k === i.parent && s.s !== 'insertions');
  let ms = [];
  if (byName.has(i.name) && structs[byName.get(i.name)].s === 'muscles') ms = [byName.get(i.name)];
  else if (groups[i.name]) ms = structs.map((s, si) => [s, si]).filter(([s]) => s.s === 'muscles' && s.c === 'muscle' && underGroup(s.g, i.name)).map(([, si]) => si);
  else if (ALIAS[i.name]) ms = ALIAS[i.name].map((n) => byName.get(n)).filter((x) => x !== undefined);
  if (!ms.length) unmatched.add(i.name);
  const r = Math.hypot(i.bmax[0] - i.bmin[0], i.bmax[1] - i.bmin[1], i.bmax[2] - i.bmin[2]) / 2;
  insertions.push({ id: i.id, ms, mk: i.name, t: i.kind, n: i.idx, d: i.side, b: bone, c: yup(i.c), r: +r.toFixed(4), ...(i.mirrorOf ? { mir: i.mirrorOf } : {}) });
}

// --- Acidentes ósseos e demais etiquetas
const seen = new Set();
const landmarks = [];
for (const l of raw.landmarks) {
  const si = idToStruct[l.on];
  if (si === undefined) continue;
  const key = l.on + '|' + l.name;
  if (seen.has(key)) continue; seen.add(key);
  const t = taOf(l.name);
  landmarks.push({ k: l.name, on: l.on, p: yup(l.p), pt: t?.pt || undefined, la: t?.la || undefined });
}

// --- Grupos (hierarquia)
const G = {};
for (const [k, g] of Object.entries(groups)) {
  const t = taOf(k);
  G[k] = { p: g.parent && groups[g.parent] ? g.parent : null, s: g.sys, pt: t?.pt || undefined };
}

const manifest = { v: 1, structs, meshes, insertions, landmarks, groups: G };
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/manifest.json', JSON.stringify(manifest));

// --- Textos de apoio em inglês (Wikipedia, via Z-Anatomy) só para estruturas existentes
const names = new Set([...structs.map((s) => s.k), ...landmarks.map((l) => l.k), ...Object.keys(G)]);
const wiki = {};
for (const [k, v] of Object.entries(texts)) {
  if (!names.has(k) || typeof v !== 'string') continue;
  let t = v.replace(/\r/g, '').trim();
  const lines = t.split('\n');
  if (lines[0] && lines[0] === lines[0].toUpperCase()) lines.shift(); // título em maiúsculas
  t = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 40) wiki[k] = t.length > 2600 ? t.slice(0, t.lastIndexOf('. ', 2600) + 1) : t;
}
fs.writeFileSync('public/data/wiki-en.json', JSON.stringify(wiki));
const cats = {};
for (const s of structs) cats[s.c] = (cats[s.c] || 0) + 1;
console.log('estruturas', structs.length, 'malhas', Object.keys(meshes).length, 'inserções', insertions.length, 'acidentes', landmarks.length, 'grupos', Object.keys(G).length);
console.log(cats);
console.log('inserções sem músculo:', [...unmatched]);
console.log('manifest', (fs.statSync('public/data/manifest.json').size / 1e6).toFixed(2), 'MB; wiki', (fs.statSync('public/data/wiki-en.json').size / 1e6).toFixed(2), 'MB,', Object.keys(wiki).length, 'textos');
