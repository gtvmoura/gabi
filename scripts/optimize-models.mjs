// Otimiza os GLB exportados do Blender (solda, simplifica e comprime com meshopt).
// Uso: node scripts/optimize-models.mjs <pasta-raw> <pasta-saida>
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const [raw, out] = process.argv.slice(2);
const RATIO = { skeleton: 0.6, muscles: 0.42, insertions: 0.6, joints: 0.7, nervous: 0.4, vessels: 0.5, viscera: 0.7, lymph: 0.35, regions: 1 };
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(out, { recursive: true });
const tris = (doc) => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
for (const [name, ratio] of Object.entries(RATIO)) {
  const file = path.join(raw, name + '.glb');
  if (!fs.existsSync(file)) continue;
  const doc = await io.read(file);
  const before = tris(doc);
  await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }), weld());
  if (ratio < 1) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008, lockBorder: false }));
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const dest = path.join(out, name + '.glb');
  await io.write(dest, doc);
  console.log(name.padEnd(11), String(doc.getRoot().listNodes().length).padStart(5), 'nós', String(Math.round(before)).padStart(8), '→', String(Math.round(tris(doc))).padStart(8), 'tris', (fs.statSync(dest).size / 1e6).toFixed(2), 'MB');
}
