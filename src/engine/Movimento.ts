// Animação dos movimentos articulares: move os ossos pelo esqueleto articulado (rig.ts),
// desenha os músculos que agem como "elásticos" de origem → inserção, e um goniômetro.
import {
  BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, Matrix4, Mesh, MeshBasicMaterial,
  Quaternion, SphereGeometry, Vector3,
} from 'three';
import type { Engine } from './Engine';
import { buildRig, evalPose, type MovDef, type Rig, type V3 } from './rig';

export interface BandaSpec { nome: string; cor: string; sis: number[]; papel: 'agonista' | 'auxiliar' | 'antagonista'; lado?: 'l' | 'r' }
interface Ponto { c: Vector3; seg: string; side: 'l' | 'r' }
interface Banda { spec: BandaSpec; side: 'l' | 'r'; o: Ponto[]; e: Ponto[]; tubo: Mesh; po: Mesh; pe: Mesh; L0: number; L: number }

const S = new Matrix4().makeScale(-1, 1, 1);
const SI = S.clone();
const UP = new Vector3(0, 1, 0);

export class MovPlayer {
  readonly rig: Rig;
  a: number;
  playing = true;
  speed = 1;
  antagonistas = false;
  private t = 0;
  private last = performance.now();
  private root = new Group();
  private bandas: Banda[] = [];
  private arco: Line;
  private raios: Line;
  private label: HTMLDivElement;
  private ref: { p: Vector3; d: Vector3 } | null = null;
  onChange: (a: number, comp: { nome: string; papel: string; cor: string; pct: number }[]) => void = () => {};

  constructor(private e: Engine, readonly def: MovDef, specs: BandaSpec[]) {
    this.rig = buildRig(e.m);
    this.a = def.de;
    e.scene.add(this.root);
    const lm = new LineBasicMaterial({ color: new Color('#ffe066'), depthTest: false, transparent: true });
    this.arco = new Line(new BufferGeometry(), lm); this.arco.renderOrder = 7;
    this.raios = new Line(new BufferGeometry(), new LineBasicMaterial({ color: new Color('#ffe066'), depthTest: false, transparent: true, opacity: 0.7 })); this.raios.renderOrder = 7;
    this.root.add(this.arco, this.raios);
    this.label = document.createElement('div');
    this.label.className = 'pin-label active gonio';
    e.labels.appendChild(this.label);
    this.montarBandas(specs);
    // referência do goniômetro: a posição "zero" do movimento
    if (def.gonio) {
      const M0 = this.matrizes(def.zero ?? 0);
      const A = M0.l.get(def.gonio.seg)!;
      const bs = def.gonio.base ?? def.gonio.seg;
      const p = new Vector3(...this.rig.segs.get(bs)!.pivot).applyMatrix4(M0.l.get(bs)!);
      this.ref = { p, d: new Vector3(...def.gonio.ponta).applyMatrix4(A).sub(p).normalize() };
    }
  }

  private matrizes(a: number) { return evalPose(this.rig, this.def.pose(a), this.def.lados === 'esquerdo'); }

  private montarBandas(specs: BandaSpec[]) {
    const m = this.e.m;
    const geo = new CylinderGeometry(1, 1, 1, 10, 1, true);
    const bola = new SphereGeometry(1, 12, 8);
    for (const spec of specs) {
      const recs = new Map<string, (typeof m.insertions)[number]>();
      for (const si of spec.sis) for (const r of m.insByMuscle.get(si) ?? []) recs.set(r.id, r);
      for (const side of ['l', 'r'] as const) {
        if (spec.lado && spec.lado !== side) continue;
        if (this.def.lados === 'esquerdo' && side === 'r') continue;
        const o: Ponto[] = [], e: Ponto[] = [];
        for (const r of recs.values()) {
          const sd = r.c[0] >= 0 ? 'l' : 'r';   // pelo lado real do ponto (algumas etiquetas do modelo estão trocadas)
          if (sd !== side) continue;
          const seg = this.rig.segOfKey.get(m.structs[r.b]?.k ?? '') ?? 'pelve';
          (r.t === 'o' ? o : e).push({ c: new Vector3(...r.c), seg, side });
        }
        if (!o.length || !e.length) continue;
        const cor = new Color(spec.cor);
        const fino = spec.papel === 'antagonista';
        const mat = new MeshBasicMaterial({ color: cor, transparent: true, opacity: fino ? 0.75 : 0.92, depthTest: false });
        const tubo = new Mesh(geo, mat); tubo.renderOrder = 6; tubo.userData.raio = fino ? 0.0022 : 0.0036;
        const po = new Mesh(bola, new MeshBasicMaterial({ color: new Color('#f0434a'), depthTest: false })); po.renderOrder = 6;
        const pe = new Mesh(bola, new MeshBasicMaterial({ color: new Color('#3f83f8'), depthTest: false })); pe.renderOrder = 6;
        this.root.add(tubo, po, pe);
        this.bandas.push({ spec, side, o, e, tubo, po, pe, L0: 0, L: 0 });
      }
    }
    // comprimento de referência: no início do movimento
    const M0 = this.matrizes(this.def.de);
    for (const b of this.bandas) b.L0 = this.extremos(b, M0)[0].distanceTo(this.extremos(b, M0)[1]);
  }

  private extremos(b: Banda, M: ReturnType<MovPlayer['matrizes']>): [Vector3, Vector3] {
    const media = (ps: Ponto[]) => {
      const acc = new Vector3();
      for (const p of ps) acc.add(p.c.clone().applyMatrix4(M[p.side].get(p.seg) ?? new Matrix4()));
      return acc.multiplyScalar(1 / ps.length);
    };
    return [media(b.o), media(b.e)];
  }

  setParam(a: number) { this.a = a; this.playing = false; this.e.requestRender(); }
  setPlaying(p: boolean) {
    this.playing = p; this.last = performance.now();
    if (p) { const span = this.def.ate - this.def.de; const f = span ? Math.min(1, Math.max(0, (this.a - this.def.de) / span)) : 0; this.t = Math.acos(1 - 2 * f) / (2 * Math.PI); }
  }
  setAntagonistas(v: boolean) { this.antagonistas = v; this.e.requestRender(); }

  /** Chamado a cada quadro. Devolve true se algo mudou. */
  step(): boolean {
    const now = performance.now();
    if (this.playing) {
      this.t += ((now - this.last) / 1000) * (this.speed / 3.2);
      const s = (1 - Math.cos(2 * Math.PI * this.t)) / 2;   // vai e volta, suave nas pontas
      this.a = this.def.de + (this.def.ate - this.def.de) * s;
    }
    this.last = now;
    const M = this.matrizes(this.a);
    // ossos
    for (const it of this.e.items.values()) {
      if (!it.mesh.visible) continue;
      const seg = this.rig.segOfKey.get(this.e.m.structs[it.si].k);
      const m0 = it.mesh.userData.m0 as Matrix4;
      if (!seg || !m0) continue;
      const side = it.side === 'r' ? 'r' : 'l';
      const A = M[side].get(seg)!;
      const espelho = it.mesh.parent !== this.e.raiz;
      const out = it.mesh.matrix;
      if (espelho) out.copy(SI).multiply(A).multiply(S).multiply(m0); else out.copy(A).multiply(m0);
      it.mesh.matrixWorldNeedsUpdate = true;
    }
    // músculos (elásticos)
    const comp: { nome: string; papel: string; cor: string; pct: number }[] = [];
    const visto = new Set<string>();
    for (const b of this.bandas) {
      const show = b.spec.papel !== 'antagonista' || this.antagonistas;
      b.tubo.visible = b.po.visible = b.pe.visible = show;
      const [o, e] = this.extremos(b, M);
      b.L = o.distanceTo(e);
      if (show) {
        const mid = o.clone().add(e).multiplyScalar(0.5);
        const dir = e.clone().sub(o);
        const len = dir.length();
        b.tubo.position.copy(mid);
        b.tubo.quaternion.copy(new Quaternion().setFromUnitVectors(UP, dir.normalize()));
        const rr = b.tubo.userData.raio as number;
        b.tubo.scale.set(rr, len, rr);
        b.po.position.copy(o); b.pe.position.copy(e);
        b.po.scale.setScalar(rr * 1.9); b.pe.scale.setScalar(rr * 1.9);
      }
      if (!visto.has(b.spec.nome) && (b.side === 'l' || !this.bandas.some((x) => x.spec === b.spec && x.side === 'l'))) {
        visto.add(b.spec.nome);
        comp.push({ nome: b.spec.nome, papel: b.spec.papel, cor: b.spec.cor, pct: b.L0 ? Math.round((b.L / b.L0 - 1) * 100) : 0 });
      }
    }
    // goniômetro (lado esquerdo)
    this.gonio(M);
    this.onChange(this.a, comp);
    return true;
  }

  private gonio(M: ReturnType<MovPlayer['matrizes']>) {
    const g = this.def.gonio;
    if (!g || !this.ref) { this.arco.visible = this.raios.visible = false; this.label.style.display = 'none'; return; }
    const A = M.l.get(g.seg)!;
    const bs = g.base ?? g.seg;
    const p = new Vector3(...this.rig.segs.get(bs)!.pivot).applyMatrix4(M.l.get(bs)!);
    const tip = new Vector3(...g.ponta).applyMatrix4(A);
    const d = tip.clone().sub(p);
    const raio = Math.min(d.length() * 0.55, 0.14);
    d.normalize();
    const ang = Math.acos(Math.min(1, Math.max(-1, this.ref.d.dot(d))));
    const n = new Vector3().crossVectors(this.ref.d, d);
    if (n.lengthSq() < 1e-8 || ang < 0.01) { this.arco.visible = false; } else {
      n.normalize();
      const v = new Vector3().crossVectors(n, this.ref.d);
      const pts: number[] = [];
      const N = 48;
      for (let i = 0; i <= N; i++) { const t = (ang * i) / N; const q = this.ref.d.clone().multiplyScalar(Math.cos(t)).add(v.clone().multiplyScalar(Math.sin(t))).multiplyScalar(raio).add(p); pts.push(q.x, q.y, q.z); }
      this.arco.geometry.setAttribute('position', new Float32BufferAttribute(pts, 3));
      this.arco.geometry.computeBoundingSphere();
      this.arco.visible = true;
    }
    const r0 = this.ref.d.clone().multiplyScalar(raio * 1.25).add(p);
    const r1 = d.clone().multiplyScalar(raio * 1.25).add(p);
    this.raios.geometry.setAttribute('position', new Float32BufferAttribute([r0.x, r0.y, r0.z, p.x, p.y, p.z, r1.x, r1.y, r1.z], 3));
    this.raios.geometry.computeBoundingSphere();
    this.raios.visible = true;
    // rótulo no meio do arco
    const meio = this.ref.d.clone().add(d).normalize();
    if (meio.lengthSq() < 0.5) meio.copy(d);
    const pos = meio.multiplyScalar(raio * 1.1).add(p);
    const scr = this.e.projetar(pos);
    if (!scr) { this.label.style.display = 'none'; return; }
    this.label.style.display = '';
    this.label.textContent = `${Math.round(Math.abs(this.a - (this.def.zero ?? 0)))}°`;
    this.label.style.transform = `translate(${scr[0]}px, ${scr[1]}px)`;
  }

  /** Enquadra o movimento (no lado esquerdo, ou nos dois se o movimento for bilateral e amplo). */
  enquadrar() {
    const q = this.def.quadro;
    const ambos = !!this.def.ambos && this.def.lados !== 'esquerdo';
    const c: V3 = ambos ? [0, q.c[1], q.c[2]] : q.c;
    const rr = ambos ? q.r + Math.abs(q.c[0]) * 0.8 : q.r;
    this.e.frameAt(c, rr, this.def.vista);
  }

  dispose() {
    for (const it of this.e.items.values()) {
      const m0 = it.mesh.userData.m0 as Matrix4 | undefined;
      if (m0) { it.mesh.matrix.copy(m0); it.mesh.matrixWorldNeedsUpdate = true; }
    }
    this.e.scene.remove(this.root);
    this.label.remove();
    this.e.requestRender();
  }
}
