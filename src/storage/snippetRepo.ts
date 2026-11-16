import { initDb, monotonicNow, type SnippetRecord } from './db'

export const BUILTIN_SNIPPETS: SnippetRecord[] = [
  // Beats
  {
    id: 'builtin:snippet:trap-hat-roll',
    name: 'Trap Hat Roll',
    category: 'Beats',
    code: '$: s("hh*16").gain("<0.5 0.7 0.9 0.6>").pan(sine.range(0.2, 0.8))',
    tags: ['trap', 'hihat', 'drums'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'builtin:snippet:boom-bap',
    name: 'Boom Bap',
    category: 'Beats',
    code: '$: s("bd [~ bd] sd [~ [sd bd]]").bank("RolandTR909")\n$: s("[~ hh]*4").gain(0.6)',
    tags: ['boombap', 'hiphop', 'drums'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'builtin:snippet:jungle-amen',
    name: 'Jungle Amen',
    category: 'Beats',
    code: '$: s("amen").slice(8, "0 1 2 3 [4 5] 6 7 [~ 2]").fast(2)',
    tags: ['jungle', 'dnb', 'breakbeat'],
    isBuiltin: true,
    createdAt: 0,
  },

  // Bass
  {
    id: 'builtin:snippet:acid-303',
    name: 'Acid 303',
    category: 'Bass',
    code: '$: note("0 12 0 7").s("sawtooth").cutoff(slider(800, 100, 4000)).decay(0.2).resonance(12)',
    tags: ['acid', 'tb303', 'bass'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'builtin:snippet:reese-bass',
    name: 'Reese Bass',
    category: 'Bass',
    code: '$: note("c1 [~ eb1] f1 [~ g1]").s("sawtooth").detune(slider(8, 0, 30)).lpf(400)',
    tags: ['reese', 'dnb', 'bass'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'builtin:snippet:sub-808',
    name: 'Sub 808',
    category: 'Bass',
    code: '$: note("c1 ~ c1 [~ f1]").s("sine").gain(1.2).distort(0.2)',
    tags: ['808', 'sub', 'bass', 'trap'],
    isBuiltin: true,
    createdAt: 0,
  },

  // Melodies
  {
    id: 'builtin:snippet:arpeggio-pluck',
    name: 'Arpeggio Pluck',
    category: 'Melodies',
    code: '$: note("c4 e4 g4 b4 c5 b4 g4 e4").s("triangle").fast(2).decay(0.15).room(0.5)',
    tags: ['arpeggio', 'pluck', 'melody'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'builtin:snippet:synthwave-lead',
    name: 'Synthwave Lead',
    category: 'Melodies',
    code: '$: note("a3 c4 e4 g4 a4").s("square").gain(0.7).delay(0.3).delaytime(0.25)',
    tags: ['synthwave', 'lead', 'retro'],
    isBuiltin: true,
    createdAt: 0,
  },

  // FX
  {
    id: 'builtin:snippet:noise-sweep',
    name: 'Noise Sweep',
    category: 'FX',
    code: '$: s("white").cutoff(sine.range(200, 5000).slow(4)).gain(0.4)',
    tags: ['noise', 'sweep', 'riser', 'fx'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'builtin:snippet:tape-stop',
    name: 'Tape Stop',
    category: 'FX',
    code: '$: s("sd").speed(saw.range(1, 0.05).slow(2)).room(0.8)',
    tags: ['tape-stop', 'fx', 'glitch'],
    isBuiltin: true,
    createdAt: 0,
  },
]

export function getCategories(): string[] {
  return ['All', 'Beats', 'Bass', 'Melodies', 'FX', 'Custom']
}

export async function listSnippets(category?: string): Promise<SnippetRecord[]> {
  const db = await initDb()
  const customList = await db.getAll('snippets')
  customList.sort((a, b) => b.createdAt - a.createdAt)

  const all = [...customList, ...BUILTIN_SNIPPETS]

  if (!category || category === 'All') {
    return all
  }

  if (category === 'Custom') {
    return all.filter((s) => !s.isBuiltin || s.category === 'Custom')
  }

  return all.filter((s) => s.category.toLowerCase() === category.toLowerCase())
}

export async function saveSnippet(
  snippet: Omit<SnippetRecord, 'id' | 'createdAt'>
): Promise<string> {
  const db = await initDb()
  const id = crypto.randomUUID()
  const now = monotonicNow()
  const record: SnippetRecord = {
    ...snippet,
    id,
    isBuiltin: false,
    createdAt: now,
  }
  await db.put('snippets', record)
  return id
}

export async function deleteSnippet(id: string): Promise<void> {
  if (id.startsWith('builtin:')) {
    return
  }
  const db = await initDb()
  const existing = await db.get('snippets', id)
  if (existing) {
    await db.delete('snippets', id)
  }
}

export const snippetRepo = {
  listSnippets,
  saveSnippet,
  deleteSnippet,
  getCategories,
  BUILTIN_SNIPPETS,
}
