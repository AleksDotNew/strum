import { initDb, monotonicNow, type TemplateRecord, type PrebakeScript } from './db'
import { prebakeRepo } from './prebakeRepo'

export interface TemplateBundle {
  schemaVersion: number
  template: {
    id: string
    name: string
    prebakeIds: string[]
    starterCode: string | null
    createdAt: number
  }
  prebakes: PrebakeScript[]
}

export const BUILTIN_TEMPLATES: TemplateRecord[] = [
  {
    id: 'builtin:tpl:meadow-echoes',
    name: 'Meadow Echoes (Ambient)',
    prebakeIds: ['builtin:default'],
    starterCode: `// Meadow Echoes - C418 style ambient
setcps(0.48);

$: s("bd*4").gain(0.08).room(0.5);

p1: note("<~ c4 ~ e4 ~ g4 ~ a4>")
  .slow(2)
  .s("sine")
  .lpf(1200)
  .gain(0.2);

p2: note("c3 ~ g3 ~ e3 ~ a2 ~")
  .s("sine")
  .lpf(600)
  .gain(0.3)
  .room(2)
  .roomsize(6);

p3: note("<c5 e5 g5 b5> [~ c6] ~ ~")
  .struct("x*2 ~ [~ x] ~")
  .s("sine")
  .lpf(2500)
  .gain(0.18)
  .room(2);

$: s("hh*8")
  .gain(perlin.slow(12).range(0.05, 0.2))
  .hpf(5000);
`,
    createdAt: 1000,
  },
  {
    id: 'builtin:tpl:ambient-breaks',
    name: 'Ambient Breaks (Atmospheric DnB)',
    prebakeIds: ['builtin:default'],
    starterCode: `// Ambient Breaks - Atmospheric DnB
setCps(172 / 60 / 4);

$: s("bd:0").beat("0,6?,10,13?", 16).gain(0.7);
$: s("sd:2").beat("4,12,14?", 16).gain(0.65);
$: s("hh*16").hpf(perlin.slow(12).range(2000, 6000)).gain(0.4);
$: s("~ ~ ~ cp").gain(0.4).room(1);

p1: n("0 3 <5 7> 3 <2 5?> 7 5 3")
  .scale("<d1:major>/2")
  .s("sine")
  .lpf(perlin.slow(10).range(200, 600))
  .gain(0.55);

p2: "<d3 b#2 d3 b#2>/8".clip(0.68).struct("x*8").s("sawtooth").note().lpf(perlin.slow(8).range(150, 600)).gain(0.15);

p3: n("<d3 b#2 d3 b#2>/8")
  .s("supersaw")
  .detune("<0.18 0.28 0.38 0.48>")
  .hpf(180)
  .lpf(perlin.slow(12).range(280, 1800))
  .distort(0.34)
  .gain(0.18)
  .room(1)
  .roomsize(4);
`,
    createdAt: 1001,
  },
  {
    id: 'builtin:tpl:acid-techno',
    name: 'Acid 303 Techno',
    prebakeIds: ['builtin:default', 'builtin:weft-helpers'],
    starterCode: `// Acid 303 Techno (uses Weft Helpers)
setCps(140 / 60 / 4);

$: s("bd!4").distort("2:.3");

$bass: n(irand(10).sub(7).seg(16)).scale("c:minor")
  .rib(46, 1)
  .distort("2.2:.3")
  .s("sawtooth")
  .lpf(200)
  .lpenv(2.256)
  .lpq(12)
  .gain(0.7);

$: s("hh*8").gain(0.3);
$: s("~ ~ cp ~").gain(0.4);
`,
    createdAt: 1002,
  },
  {
    id: 'builtin:tpl:german-techno',
    name: 'Movement (German Techno)',
    prebakeIds: ['builtin:default'],
    starterCode: `// Movement - Minimal German Techno
setcps(0.54);

$: s("bd*4").gain(0.8).distort(0.2);
$: s("hh*8").gain(perlin.slow(16).range(0.15, 0.35));
$: s("~ ~ ~ cp").gain(0.5).room(1);
$: n("g2 g2 g2 g2").s("sine").lpf(180).gain(0.6);
$: s("[rim ~] ~ ~ ~").hpf(5000).gain(0.4);
$: s("hh*16").hpf(4000).gain(0.15);
`,
    createdAt: 1003,
  },
  {
    id: 'builtin:tpl:stranger-synths',
    name: 'Stranger Synths (Darkwave)',
    prebakeIds: ['builtin:default'],
    starterCode: `// Stranger Synths - Darkwave
setcps(0.72);

p1: n("0 2 4 6 7 6 4 2")
  .scale("<c3:major>/2")
  .s("supersaw")
  .distort(0.5)
  .superimpose(x => x.detune(0.5))
  .lpf(perlin.slow(12).range(300, 2500))
  .gain(0.25);

p2: note("<a2 e3 b2 a2>/8").clip(0.8).struct("x*8").s("sawtooth").gain(0.15);

$: s("bd:4").beat("0,7?,10", 16).gain(0.7);
$: s("sd:2").beat("4,12", 16).gain(0.5);
$: s("hh*16").gain(0.25).hpf(3000);
$: s("~ ~ ~ cp").gain(0.3).room(1);
`,
    createdAt: 1004,
  },
  {
    id: 'builtin:tpl:breakbeat-heat',
    name: 'Breakbeat Heat (Weftpack)',
    prebakeIds: ['builtin:default'],
    starterCode: `// Breakbeat Heat - Powered by Weftpack samples
setCps(160 / 60 / 4);

$: s("breaks_break").slow(2).gain(0.85);
$: s("breaks_kick breaks_snare").gain(0.75);
$: s("breaks_hat*8").gain(0.4);
$: n("<c2 f2 g2 eb2>/2").s("sawtooth").lpf(400).gain(0.6);
`,
    createdAt: 1005,
  },
]

export const templateRepo = {
  async getAll(): Promise<TemplateRecord[]> {
    await this.ensureBuiltinTemplates()
    const db = await initDb()
    const all = await db.getAll('templates')
    return all.sort((a, b) => b.createdAt - a.createdAt)
  },

  async get(id: string): Promise<TemplateRecord | undefined> {
    const db = await initDb()
    return db.get('templates', id)
  },

  async ensureBuiltinTemplates(): Promise<void> {
    const db = await initDb()
    for (const tpl of BUILTIN_TEMPLATES) {
      const existing = await db.get('templates', tpl.id)
      if (!existing) {
        await db.put('templates', tpl)
      }
    }
  },

  async create(data: {
    id?: string
    name: string
    prebakeIds: string[]
    starterCode?: string | null
  }): Promise<TemplateRecord> {
    const db = await initDb()
    const now = monotonicNow()
    const record: TemplateRecord = {
      id: data.id ?? `tpl:${crypto.randomUUID()}`,
      name: data.name,
      prebakeIds: data.prebakeIds,
      starterCode: data.starterCode ?? null,
      createdAt: now,
    }
    await db.put('templates', record)
    return record
  },

  async delete(id: string): Promise<boolean> {
    if (id.startsWith('builtin:')) return false
    const db = await initDb()
    const existing = await db.get('templates', id)
    if (!existing) return false
    await db.delete('templates', id)
    return true
  },

  async packBundle(templateId: string): Promise<TemplateBundle | null> {
    const tpl = await this.get(templateId)
    if (!tpl) return null
    const prebakes: PrebakeScript[] = []
    for (const pid of tpl.prebakeIds) {
      if (pid === 'builtin:default') continue
      const pb = await prebakeRepo.get(pid)
      if (pb) {
        prebakes.push(pb)
      }
    }
    return {
      schemaVersion: 1,
      template: {
        id: tpl.id,
        name: tpl.name,
        prebakeIds: tpl.prebakeIds,
        starterCode: tpl.starterCode,
        createdAt: tpl.createdAt,
      },
      prebakes,
    }
  },

  async importBundle(bundle: TemplateBundle): Promise<TemplateRecord> {
    if (bundle.schemaVersion !== 1 || !bundle.template) {
      throw new Error('Unsupported template bundle schema')
    }

    if (Array.isArray(bundle.prebakes)) {
      for (const pb of bundle.prebakes) {
        const existing = await prebakeRepo.get(pb.id)
        if (!existing) {
          await prebakeRepo.create({
            id: pb.id,
            name: pb.name,
            source: pb.source ?? 'inline',
            code: pb.code,
            url: pb.url,
            trusted: false,
          })
        }
      }
    }

    const record = await this.create({
      id: bundle.template.id,
      name: bundle.template.name,
      prebakeIds: bundle.template.prebakeIds ?? [],
      starterCode: bundle.template.starterCode ?? null,
    })
    return record
  },
}
