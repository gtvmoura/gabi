import {
  AmbientLight, Box3, BufferAttribute, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, Material, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, Scene, SphereGeometry, SRGBColorSpace,
  Vector2, Vector3, WebGLRenderer, DoubleSide, ACESFilmicToneMapping, PMREMGenerator, CanvasTexture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gunzipSync } from 'fflate';
import type { MovPlayer } from './Movimento';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Cat, Indexed, Side } from '../data/manifest';
import { CAT_LAYER, layerOf, CAT_OPACITY, CAT_ROUGHNESS, COLORS, DEFAULT_LAYERS, LAYER_FILE, colorFor, type LayerId, type LayerState } from './palette';

export type ViewName = 'anterior' | 'posterior' | 'direita' | 'esquerda' | 'superior' | 'inferior';
export interface Pick { si: number; side: Side; meshId: string; point: Vector3; ins?: string; pin?: string }
/** others: o que acontece com o resto do corpo — fantasma, oculto, normal, ou só o esqueleto em fantasma. */
export interface Focus { set: Map<number, string | null>; others: 'ghost' | 'hide' | 'keep' | 'ossos'; respectLayers?: boolean }
export interface PinDef { id: string; p: [number, number, number]; label: string }
export interface Sphere { c: Vector3; r: number }

export interface Item { mesh: Mesh; si: number; side: Side; id: string; cat: Cat; base: Material }

const VIEW_DIR: Record<ViewName, [number, number, number]> = {
  anterior: [0, 0, 1], posterior: [0, 0, -1], esquerda: [1, 0, 0], direita: [-1, 0, 0], superior: [0, 1, 0.001], inferior: [0, -1, 0.001],
};

export class Engine {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  readonly scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.01, 30);
  private controls: OrbitControls;
  private root = new Group();
  get raiz() { return this.root; }
  get labels() { return this.labelLayer; }
  /** Animação de movimento articular em andamento (Movimento.ts). */
  mov: MovPlayer | null = null;
  private mirrorRoot = new Group();
  private pinRoot = new Group();
  private raycaster = new Raycaster();
  private loader = new GLTFLoader();
  private files = new Map<string, Promise<void>>();
  readonly items = new Map<string, Item>();
  private byStruct = new Map<number, Item[]>();
  private insMeshes = new Map<string, Mesh>();
  private pickables: Object3D[] = [];
  private xray: Mesh[] = [];
  private mats = new Map<string, Material>();
  private pins: { def: PinDef; mesh: Mesh; el: HTMLDivElement }[] = [];
  private labelLayer: HTMLDivElement;
  private dirty = true;
  private raf = 0;
  private disposed = false;
  private anim: { t0: number; dur: number; p0: Vector3; p1: Vector3; q0: Vector3; q1: Vector3 } | null = null;
  private insets = { left: 0, right: 0, top: 0, bottom: 0 };
  private size = { w: 1, h: 1 };

  // estado de aparência
  layers: Record<LayerId, LayerState> = { ...DEFAULT_LAYERS };
  side: 'both' | 'l' | 'r' = 'both';
  hidden = new Set<number>();
  focus: Focus | null = null;
  selected: { si: number; side: Side | 'both' } | null = null;
  faded = new Set<number>();
  /** Modo "origem e inserção": músculos viram fantasma e os ossos aparecem sempre. */
  revealBones = false;
  insShown = new Map<string, 'o' | 'e'>();
  tint = new Map<number, string>();
  activePin: string | null = null;
  showPinLabels = false;
  /** Esconde os nomes dos pinos (jogo de acidentes ósseos, antes da resposta). */
  muteLabels = false;

  onPick: (p: Pick | null, kind: 'tap' | 'double') => void = () => {};
  /** A peça fixa foi solta pelo próprio motor (outro enquadramento). */
  onSoltar: () => void = () => {};
  onFile: (file: string, state: 'loading' | 'ready' | 'error', progress: number) => void = () => {};

  constructor(private host: HTMLElement, readonly m: Indexed) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gl';
    host.appendChild(this.canvas);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'gl-labels';
    host.appendChild(this.labelLayer);

    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    // Acabamento de "estúdio": reflexos suaves de um ambiente iluminado e tone mapping fílmico,
    // para o modelo parecer uma ilustração de atlas e não carne crua.
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.38;
    pmrem.dispose();

    this.mirrorRoot.scale.x = -1;
    this.scene.add(this.root, this.mirrorRoot, this.pinRoot);
    this.scene.add(new HemisphereLight(0xfff4ec, 0x6a6f86, 0.55));
    this.scene.add(new AmbientLight(0xffffff, 0.08));
    const head = new DirectionalLight(0xfff3e6, 1.35);  // luz "de cabeça": acompanha a câmera, como num atlas
    head.position.set(0.4, 0.6, 1);
    const rim = new DirectionalLight(0xc7dcff, 0.9);   // contraluz azulada: recorta a silhueta
    rim.position.set(-0.9, 0.5, -1);
    const fill = new DirectionalLight(0xffe2d6, 0.35);
    fill.position.set(-1, -0.2, 0.6);
    this.camera.add(fill);
    this.camera.add(head, rim);
    this.scene.add(this.camera);

    // sombra de contato suave sob os pés
    const sh = document.createElement('canvas'); sh.width = sh.height = 128;
    const g = sh.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const floor = new Mesh(new PlaneGeometry(0.9, 0.55), new MeshBasicMaterial({ map: new CanvasTexture(sh), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.004, 0.02); floor.renderOrder = -1;
    this.scene.add(floor);
    this.camera.position.set(0, 1.0, 4.4);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0.92, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 1.1;
    this.controls.panSpeed = 0.9;
    this.controls.minDistance = 0.04;
    this.controls.maxDistance = 8;
    this.controls.zoomToCursor = true;
    this.controls.addEventListener('change', () => { this.dirty = true; });
    this.controls.addEventListener('start', () => { this.anim = null; });

    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.bindPointer();
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(host);
    this.resize();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.renderer.dispose();
    this.canvas.remove();
    this.labelLayer.remove();
  }

  // ------------------------------------------------------------------ carregamento

  /** Garante que os arquivos das camadas ligadas estejam carregados. */
  ensureLayers(): Promise<void[]> {
    const need = new Set<string>();
    for (const [id, st] of Object.entries(this.layers) as [LayerId, LayerState][]) if (st) need.add(LAYER_FILE[id]);
    // os olhos moram no arquivo do sistema nervoso: carrega em segundo plano, sem atrasar a abertura
    if (this.layers.musculos && !this.files.has('nervous')) setTimeout(() => void this.loadFile('nervous', true), 1500);
    return Promise.all([...need].map((f) => this.loadFile(f)));
  }

  /** Garante o arquivo de um conjunto de estruturas (ex.: resultado de busca numa camada desligada). */
  ensureStructs(sis: Iterable<number>): Promise<void[]> {
    const need = new Set<string>();
    for (const si of sis) need.add(this.m.structs[si].s);
    return Promise.all([...need].map((f) => this.loadFile(f)));
  }

  loadFile(file: string, quiet = false): Promise<void> {
    let p = this.files.get(file);
    if (!p) {
      if (!quiet) this.onFile(file, 'loading', 0);
      const ok = (gltf: { scene: Object3D }, resolve: () => void) => { this.ingest(file, gltf.scene); if (!quiet) this.onFile(file, 'ready', 1); this.apply(); resolve(); };
      const fail = (err: unknown, resolve: () => void) => { console.error('Falha ao carregar', file, err); this.files.delete(file); this.onFile(file, 'error', 0); resolve(); };
      p = new Promise<void>((resolve) => {
        if (import.meta.env.VITE_MODELOS_EMPACOTADOS) {
          // hospedagem que não serve .glb: o modelo vem como texto (gzip + base64)
          baixarTexto(`${import.meta.env.BASE_URL}models/${file}.glb.txt`, (f) => { if (!quiet) this.onFile(file, 'loading', f); })
            .then((txt) => {
              const bin = Uint8Array.from(atob(txt), (c) => c.charCodeAt(0));
              const glb = gunzipSync(bin);
              this.loader.parse(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer, '', (g) => ok(g, resolve), (e) => fail(e, resolve));
            })
            .catch((e) => fail(e, resolve));
          return;
        }
        this.loader.load(
          `${import.meta.env.BASE_URL}models/${file}.glb`,
          (gltf) => ok(gltf, resolve),
          (ev) => { if (ev.total && !quiet) this.onFile(file, 'loading', ev.loaded / ev.total); },
          (err) => fail(err, resolve),
        );
      });
      this.files.set(file, p);
    }
    return p;
  }

  private ingest(file: string, scene: Object3D) {
    scene.updateMatrixWorld(true);
    const nodes: Object3D[] = [];
    scene.traverse((o) => { if (o.name && (this.m.meshes[o.name] || this.m.insById.has(o.name))) nodes.push(o); });
    const usedGeo = new Set<BufferGeometry>();
    for (const node of nodes) {
      const id = node.name;
      const prims: Mesh[] = [];
      node.traverse((o) => { if ((o as Mesh).isMesh) prims.push(o as Mesh); });
      if (!prims.length) continue;
      const ins = this.m.insById.get(id);
      const rec = this.m.meshes[id];
      const struct = rec ? this.m.structs[rec.s] : null;
      // Une as primitivas numa só geometria, levando a cor do material para os vértices.
      const geos = prims.map((p) => {
        let g = p.geometry;
        if (usedGeo.has(g) || prims.length > 1) g = g.clone();
        usedGeo.add(p.geometry);
        if (!ins && struct) {
          const name = ((p.material as Material).name || 'None').replace(/^X_/, '');
          const c = colorFor(name, struct);
          const n = g.getAttribute('position').count;
          const arr = new Uint8Array(n * 3);
          const r = Math.round(c.r * 255), gg = Math.round(c.g * 255), b = Math.round(c.b * 255);
          for (let i = 0; i < n; i++) { arr[i * 3] = r; arr[i * 3 + 1] = gg; arr[i * 3 + 2] = b; }
          g.setAttribute('color', new BufferAttribute(arr, 3, true));
        }
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
        return g;
      });
      let geo = geos[0];
      if (geos.length > 1) {
        const merged = mergeGeometries(geos, false);
        if (merged) geo = merged;
      }
      const first = prims[0];
      first.updateWorldMatrix(true, false);
      const make = (parent: Group, mid: string): Mesh => {
        const mesh = new Mesh(geo);
        first.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
        mesh.name = mid;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        parent.add(mesh);
        return mesh;
      };
      if (ins) {
        const mat = this.insMat(ins.t);
        const reg = (mid: string, parent: Group) => { const mesh = make(parent, mid); mesh.material = mat; mesh.visible = false; mesh.userData.ins = mid; mesh.renderOrder = 2; this.insMeshes.set(mid, mesh); };
        reg(id, this.root);
        for (const other of this.m.insertions) if (other.mir === id) reg(other.id, this.mirrorRoot);
        continue;
      }
      if (!rec || !struct) continue;
      const base = this.baseMat(struct.c);
      const reg = (mid: string, parent: Group) => {
        const r2 = this.m.meshes[mid];
        const mesh = make(parent, mid);
        mesh.material = base;
        mesh.userData.m0 = mesh.matrix.clone();
        const item: Item = { mesh, si: r2.s, side: r2.d, id: mid, cat: this.m.structs[r2.s].c, base };
        mesh.userData.item = item;
        this.items.set(mid, item);
        if (!this.byStruct.has(r2.s)) this.byStruct.set(r2.s, []);
        this.byStruct.get(r2.s)!.push(item);
      };
      reg(id, this.root);
      const mirrorId = this.mirrorIdOf(id);
      if (mirrorId) reg(mirrorId, this.mirrorRoot);
    }
    this.root.updateMatrixWorld(true);
    this.mirrorRoot.updateMatrixWorld(true);
    void file;
  }

  private mirrorIndex: Map<string, string> | null = null;
  private mirrorIdOf(id: string): string | undefined {
    if (!this.mirrorIndex) {
      this.mirrorIndex = new Map();
      for (const [mid, r] of Object.entries(this.m.meshes)) if (r.mir) this.mirrorIndex.set(r.mir, mid);
    }
    return this.mirrorIndex.get(id);
  }

  // ------------------------------------------------------------------ materiais

  private mat<T extends Material>(key: string, make: () => T): T {
    let m = this.mats.get(key);
    if (!m) { m = make(); this.mats.set(key, m); }
    return m as T;
  }
  private baseMat(cat: Cat): Material {
    return this.mat('base:' + cat, () => {
      const op = CAT_OPACITY[cat] ?? 1;
      return new MeshStandardMaterial({
        vertexColors: true, roughness: CAT_ROUGHNESS[cat] ?? 0.55, metalness: 0, envMapIntensity: cat === 'muscle' || cat === 'tendon' ? 0.9 : 0.6,
        transparent: op < 1, opacity: op, depthWrite: op >= 1, side: DoubleSide,
      });
    });
  }
  private ghostMat(): Material {
    return this.mat('ghost', () => new MeshStandardMaterial({ color: 0x9fb0c8, roughness: 0.9, transparent: true, opacity: 0.085, depthWrite: false }));
  }
  private fadeMat(): Material {
    return this.mat('fade', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, opacity: 0.22, depthWrite: false }));
  }
  private selMat(): Material {
    return this.mat('sel', () => new MeshStandardMaterial({ color: new Color(COLORS.select), roughness: 0.42, emissive: new Color(COLORS.select), emissiveIntensity: 0.22, side: DoubleSide }));
  }
  private tintMat(color: string): Material {
    return this.mat('tint:' + color, () => new MeshStandardMaterial({ color: new Color(color), roughness: 0.5, emissive: new Color(color), emissiveIntensity: 0.12, side: DoubleSide }));
  }
  private insMat(t: 'o' | 'e'): Material {
    return this.mat('ins:' + t, () => new MeshStandardMaterial({
      color: new Color(t === 'o' ? COLORS.origin : COLORS.insertion), roughness: 0.5, emissive: new Color(t === 'o' ? COLORS.origin : COLORS.insertion),
      emissiveIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: DoubleSide,
    }));
  }

  // ------------------------------------------------------------------ aparência

  /** Recalcula visibilidade e material de todas as malhas a partir do estado. */
  apply() {
    const picks: Object3D[] = [];
    const ghost = this.ghostMat(), fade = this.fadeMat(), sel = this.selMat();
    if (this.mov) {
      // durante a animação: só o esqueleto, sem seleção nem toque
      for (const it of this.items.values()) {
        const osso = it.cat === 'bone' || it.cat === 'cartilage' || it.cat === 'tooth';
        it.mesh.visible = osso;
        if (it.mesh.visible) { it.mesh.material = it.base; it.mesh.renderOrder = 0; }
      }
      for (const x of this.xray) x.parent?.remove(x);
      this.xray = [];
      for (const mesh of this.insMeshes.values()) mesh.visible = false;
      for (const p of this.pins) { p.mesh.visible = false; p.el.style.display = 'none'; }
      this.pickables = [];
      this.dirty = true;
      return;
    }
    for (const p of this.pins) p.mesh.visible = true;
    for (const it of this.items.values()) {
      const mesh = it.mesh;
      const layer = this.layers[layerOf(this.m.structs[it.si])];
      const inFocus = (this.focus?.set.has(it.si) ?? false) && !(this.focus!.respectLayers && layer === 0);
      const isSel = !!this.selected && this.selected.si === it.si && (this.selected.side === 'both' || this.selected.side === it.side || it.side === '');
      const selStruct = !!this.selected && this.selected.si === it.si;
      let visible = layer !== 0 || inFocus || selStruct;
      if (this.side !== 'both' && it.side && it.side !== this.side) visible = false;
      if (this.hidden.has(it.si) && !selStruct) visible = false;
      let mat: Material = it.base;
      let pickable = true;
      const soft = it.cat === 'muscle' || it.cat === 'tendon' || it.cat === 'fascia' || it.cat === 'bursa' || it.cat === 'sheath';
      if (this.revealBones && it.cat === 'bone' && !this.hidden.has(it.si) && (this.side === 'both' || !it.side || it.side === this.side)) visible = true;
      if (visible) {
        if (isSel) mat = sel;
        else if (this.faded.has(it.si)) { mat = fade; pickable = false; }
        else if (this.revealBones && soft) { mat = ghost; pickable = false; }
        else if (this.focus && !(this.focus.set.has(it.si)) && this.focus.others !== 'keep') {
          if (this.focus.others === 'hide' || (this.focus.others === 'ossos' && it.cat !== 'bone' && it.cat !== 'cartilage' && it.cat !== 'tooth')) visible = false; else { mat = ghost; pickable = false; }
        } else if (this.faded.has(it.si)) { mat = fade; pickable = false; }
        else if (inFocus && this.focus!.set.get(it.si)) mat = this.tintMat(this.focus!.set.get(it.si)!);
        else if (layer === 2 && !inFocus) { mat = ghost; pickable = false; }
        else if (this.tint.has(it.si)) mat = this.tintMat(this.tint.get(it.si)!);
      }
      mesh.visible = visible;
      if (visible) {
        mesh.material = mat;
        mesh.renderOrder = mat.transparent ? 1 : 0;
        if (pickable) picks.push(mesh);
      }
    }
    // "raio X" da seleção: uma segunda passada translúcida sem teste de profundidade,
    // para a estrutura aparecer mesmo quando está coberta por outras.
    for (const x of this.xray) x.parent?.remove(x);
    this.xray = [];
    if (this.selected) {
      const xm = this.mat('xray', () => new MeshBasicMaterial({ color: new Color(COLORS.select), transparent: true, opacity: 0.2, depthTest: false, depthWrite: false }));
      for (const it of this.byStruct.get(this.selected.si) ?? []) {
        if (!it.mesh.visible || it.mesh.material !== sel) continue;
        const x = new Mesh(it.mesh.geometry, xm);
        x.matrixAutoUpdate = false; x.matrix.copy(it.mesh.matrix); x.renderOrder = 4;
        it.mesh.parent!.add(x); x.updateMatrixWorld(true);
        this.xray.push(x);
      }
    }
    for (const [id, mesh] of this.insMeshes) {
      const rec = this.m.insById.get(id)!;
      const on = this.insShown.has(id) && (this.side === 'both' || !rec.d || rec.d === this.side);
      mesh.visible = on;
      if (on) picks.push(mesh);
    }
    for (const p of this.pins) picks.push(p.mesh);
    this.pickables = picks;
    this.dirty = true;
  }

  /** Mostra as áreas de origem (vermelho) e inserção (azul). */
  async showInsertions(ids: Iterable<string>) {
    this.insShown.clear();
    for (const id of ids) this.insShown.set(id, this.m.insById.get(id)!.t);
    if (this.insShown.size) await this.loadFile('insertions');
    this.apply();
  }

  // ------------------------------------------------------------------ pinos (acidentes ósseos)

  setPins(defs: PinDef[]) {
    for (const p of this.pins) { this.pinRoot.remove(p.mesh); p.el.remove(); }
    const geo = this.pinGeo ?? (this.pinGeo = new SphereGeometry(1, 14, 10));
    this.pins = defs.map((def) => {
      const mesh = new Mesh(geo, this.pinMat(false));
      mesh.position.set(def.p[0], def.p[1], def.p[2]);
      mesh.userData.pin = def.id;
      mesh.renderOrder = 3;
      this.pinRoot.add(mesh);
      const el = document.createElement('div');
      el.className = 'pin-label';
      el.textContent = def.label;
      this.labelLayer.appendChild(el);
      return { def, mesh, el };
    });
    this.apply();
  }
  private pinGeo: SphereGeometry | null = null;
  private pinMat(active: boolean): Material {
    return this.mat('pin:' + active, () => new MeshBasicMaterial({ color: new Color(active ? COLORS.pinActive : COLORS.pin), depthTest: true }));
  }
  setActivePin(id: string | null, showAll = this.showPinLabels) {
    this.activePin = id;
    this.showPinLabels = showAll;
    this.dirty = true;
  }

  // ------------------------------------------------------------------ câmera

  setInsets(i: Partial<typeof this.insets>) {
    Object.assign(this.insets, i);
    this.applyViewOffset();
    this.dirty = true;
  }
  private applyViewOffset() {
    const { w, h } = this.size;
    const cx = (this.insets.left + (w - this.insets.right)) / 2, cy = (this.insets.top + (h - this.insets.bottom)) / 2;
    const dx = w / 2 - cx, dy = h / 2 - cy;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, dx, dy, w, h);
  }
  private resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.size = { w, h };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /** Esfera que envolve um conjunto de estruturas (a partir do manifesto; não precisa da malha carregada). */
  sphereOf(sis: Iterable<number>, side: Side | 'both' = 'both'): Sphere | null {
    const box = new Box3();
    let any = false;
    for (const si of sis) {
      const s = this.m.structs[si];
      for (const [d, id] of Object.entries(s.m)) {
        if (!id) continue;
        if (side !== 'both' && d !== 'c' && d !== side) continue;
        if (this.side !== 'both' && d !== 'c' && d !== this.side) continue;
        const r = this.m.meshes[id];
        box.expandByPoint(new Vector3(r.b[0], r.b[1], r.b[2]));
        box.expandByPoint(new Vector3(r.b[3], r.b[4], r.b[5]));
        any = true;
      }
    }
    if (!any) return null;
    const c = box.getCenter(new Vector3());
    return { c, r: box.getSize(new Vector3()).length() / 2 };
  }

  /** Enquadra uma esfera. Mantém a direção atual, a menos que `view` seja dado. */
  frame(s: Sphere, opts: { view?: ViewName; dir?: Vector3; pad?: number; instant?: boolean } = {}) {
    if (this.fixo && s.c.distanceTo(this.fixo.c) > 1e-4) { this.fixar(null); this.onSoltar(); }
    const dir = opts.dir ? opts.dir.clone().normalize()
      : opts.view ? new Vector3(...VIEW_DIR[opts.view]).normalize()
      : this.camera.position.clone().sub(this.controls.target).normalize();
    const freeW = Math.max(120, this.size.w - this.insets.left - this.insets.right);
    const freeH = Math.max(120, this.size.h - this.insets.top - this.insets.bottom);
    const vfov = (this.camera.fov * Math.PI) / 180;
    const tanV = Math.tan(vfov / 2);
    const tanFreeV = tanV * (freeH / this.size.h);
    const tanFreeH = tanV * this.camera.aspect * (freeW / this.size.w);
    const r = Math.max(s.r, 0.015) * (opts.pad ?? 1.18);
    const dist = Math.max(r / Math.sin(Math.atan(Math.min(tanFreeV, tanFreeH))), this.controls.minDistance * 1.5);
    const p1 = s.c.clone().add(dir.multiplyScalar(dist));
    if (opts.instant) {
      this.camera.position.copy(p1); this.controls.target.copy(s.c); this.controls.update(); this.dirty = true;
      return;
    }
    this.anim = { t0: performance.now(), dur: 620, p0: this.camera.position.clone(), p1, q0: this.controls.target.clone(), q1: s.c.clone() };
  }

  view(v: ViewName) {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const dir = new Vector3(...VIEW_DIR[v]).normalize();
    this.anim = { t0: performance.now(), dur: 520, p0: this.camera.position.clone(), p1: this.controls.target.clone().add(dir.multiplyScalar(dist)), q0: this.controls.target.clone(), q1: this.controls.target.clone() };
  }

  home(instant = false) {
    if (this.fixo) { this.frame(this.fixo, { pad: 1.15, instant }); return; }
    const all = this.side === 'both' ? { c: new Vector3(0, 0.89, 0), r: 0.95 } : { c: new Vector3(this.side === 'l' ? 0.12 : -0.12, 0.89, 0), r: 0.95 };
    this.frame(all, { view: 'anterior', instant, pad: 1.02 });
  }

  zoomBy(f: number) {
    const off = this.camera.position.clone().sub(this.controls.target).multiplyScalar(f);
    this.anim = { t0: performance.now(), dur: 220, p0: this.camera.position.clone(), p1: this.controls.target.clone().add(off), q0: this.controls.target.clone(), q1: this.controls.target.clone() };
  }

  // ------------------------------------------------------------------ interação

  private bindPointer() {
    const el = this.canvas;
    let down: { x: number; y: number; t: number; id: number } | null = null;
    let active = 0;
    let lastTap = { t: 0, x: 0, y: 0 };
    el.addEventListener('pointerdown', (e) => {
      active++;
      down = active === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null;
    });
    const end = (e: PointerEvent) => {
      active = Math.max(0, active - 1);
      if (!down || e.pointerId !== down.id) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const dt = performance.now() - down.t;
      down = null;
      if (moved > 7 || dt > 450) return;
      const now = performance.now();
      const dbl = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28;
      lastTap = dbl ? { t: 0, x: 0, y: 0 } : { t: now, x: e.clientX, y: e.clientY };
      const pick = this.pickAt(e.clientX, e.clientY);
      this.onPick(pick, dbl ? 'double' : 'tap');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { active = Math.max(0, active - 1); down = null; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  pickAt(clientX: number, clientY: number): Pick | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false).filter((h) => !this.clip || this.clip.distanceToPoint(h.point) >= 0);
    if (!hits.length) return null;
    // pinos têm prioridade quando estão praticamente na mesma profundidade da superfície
    const first = hits[0];
    const pinHit = hits.find((h) => h.object.userData.pin && h.distance - first.distance < 0.012);
    const h = pinHit ?? first;
    const o = h.object;
    if (o.userData.pin) {
      const pin = this.pins.find((p) => p.def.id === o.userData.pin)!;
      const rec = this.m.landmarks.find((l) => l.on + '|' + l.k === pin.def.id);
      const mr = rec ? this.m.meshes[rec.on] : null;
      return { si: mr ? mr.s : -1, side: mr ? mr.d : '', meshId: rec?.on ?? '', point: h.point, pin: pin.def.id };
    }
    if (o.userData.ins) {
      const ins = this.m.insById.get(o.userData.ins)!;
      return { si: ins.ms[0] ?? -1, side: ins.d, meshId: ins.id, point: h.point, ins: ins.id };
    }
    const it = o.userData.item as Item;
    return { si: it.si, side: it.side, meshId: it.id, point: h.point };
  }

  // ------------------------------------------------------------------ plano de corte
  private clip: Plane | null = null;
  /** Corta o modelo por um plano. `t` vai de 0 a 1 ao longo do eixo; null desliga. */
  setClip(axis: 'x' | 'y' | 'z' | null, t = 0.5) {
    if (!axis) { this.clip = null; this.renderer.clippingPlanes = []; this.dirty = true; return; }
    const range = { x: [-0.36, 0.36], y: [0, 1.76], z: [-0.2, 0.3] }[axis];
    const v = range[0] + (range[1] - range[0]) * t;
    const n = new Vector3(axis === 'x' ? -1 : 0, axis === 'y' ? -1 : 0, axis === 'z' ? -1 : 0);
    this.clip = new Plane(n, v);
    this.renderer.clippingPlanes = [this.clip];
    this.dirty = true;
  }

  /** Enquadra um ponto (ex.: acidente ósseo). */
  framePoint(p: [number, number, number], r = 0.05) { this.frame({ c: new Vector3(p[0], p[1], p[2]), r }, { pad: 1 }); }

  frameAt(c: [number, number, number], r: number, view?: ViewName) { this.frame({ c: new Vector3(c[0], c[1], c[2]), r }, { view, pad: 1.05 }); }

  /** Aproxima a câmera de um ponto (duplo toque). */
  focusPoint(p: Vector3) {
    if (this.fixo) { this.zoomBy(0.65); return; }   // fixo: aproxima sem tirar a peça do centro
    const off = this.camera.position.clone().sub(this.controls.target);
    const d = Math.max(off.length() * 0.55, 0.12);
    this.anim = { t0: performance.now(), dur: 420, p0: this.camera.position.clone(), p1: p.clone().add(off.normalize().multiplyScalar(d)), q0: this.controls.target.clone(), q1: p.clone() };
  }

  // ------------------------------------------------------------------ laço de desenho

  private tick() {
    if (this.anim) {
      const a = this.anim;
      const t = Math.min(1, (performance.now() - a.t0) / a.dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.q0, a.q1, e);
      if (t >= 1) this.anim = null;
      this.dirty = true;
    }
    if (this.fixo && !this.anim && !this.controls.target.equals(this.fixo.c)) { this.controls.target.copy(this.fixo.c); this.dirty = true; }
    this.controls.update();
    if (this.mov && this.mov.step()) this.dirty = true;
    if (!this.dirty) return;
    this.dirty = false;
    this.updatePins();
    this.renderer.render(this.scene, this.camera);
  }

  private v = new Vector3();
  private updatePins() {
    if (!this.pins.length) return;
    const { w, h } = this.size;
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360);
    for (const p of this.pins) {
      const active = p.def.id === this.activePin;
      const d = this.camera.position.distanceTo(p.mesh.position);
      const px = active ? 7 : 4.2;                       // raio em pixels na tela
      p.mesh.scale.setScalar(Math.max(0.0006, (px / h) * 2 * tanV * d));
      p.mesh.material = this.pinMat(active);
      const show = !this.muteLabels && (active || this.showPinLabels);
      if (!show) { p.el.style.display = 'none'; continue; }
      this.v.copy(p.mesh.position).project(this.camera);
      if (this.v.z > 1 || this.v.z < -1) { p.el.style.display = 'none'; continue; }
      p.el.style.display = '';
      p.el.classList.toggle('active', active);
      p.el.style.transform = `translate(${((this.v.x + 1) / 2) * w}px, ${((1 - this.v.y) / 2) * h}px)`;
    }
  }

  requestRender() { this.dirty = true; }

  // ------------------------------------------------------------------ peça fixa no centro
  private fixo: Sphere | null = null;
  /** Fixa a câmera numa peça: ela fica no centro, a rotação gira em volta dela e o arrasto lateral é desligado. */
  fixar(s: Sphere | null, view?: ViewName) {
    this.fixo = s;
    this.controls.enablePan = !s;
    this.controls.zoomToCursor = !s;
    this.controls.maxDistance = s ? Math.max(0.6, s.r * 9) : 8;
    if (s) this.frame(s, { pad: 1.15, view });
    this.dirty = true;
  }
  get estaFixo() { return !!this.fixo; }

  /** Posição na tela (px) de um ponto 3D, ou null se estiver atrás da câmera. */
  projetar(p: Vector3): [number, number] | null {
    const v = p.clone().project(this.camera);
    if (v.z > 1 || v.z < -1) return null;
    return [((v.x + 1) / 2) * this.size.w, ((1 - v.y) / 2) * this.size.h];
  }

  /** Miniatura da cena atual (para compartilhar ou salvar). */
  snapshot(): HTMLCanvasElement {
    for (const p of this.pins) p.mesh.visible = false;
    this.renderer.render(this.scene, this.camera);
    const out = document.createElement('canvas');
    out.width = this.canvas.width; out.height = this.canvas.height;
    out.getContext('2d')!.drawImage(this.canvas, 0, 0);
    for (const p of this.pins) p.mesh.visible = true;
    this.dirty = true;
    return out;
  }

  stats() {
    return { items: this.items.size, visible: [...this.items.values()].filter((i) => i.mesh.visible).length, calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles };
  }
}

/** Baixa um arquivo de texto informando o progresso (0–1). */
async function baixarTexto(url: string, prog: (f: number) => void): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const total = Number(r.headers.get('content-length')) || 0;
  if (!r.body || !total) return r.text();
  const reader = r.body.getReader(); const parts: Uint8Array[] = []; let n = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); n += value.length; prog(Math.min(0.99, n / total)); }
  const all = new Uint8Array(n); let o = 0; for (const x of parts) { all.set(x, o); o += x.length; }
  return new TextDecoder().decode(all);
}
