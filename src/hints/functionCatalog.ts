export interface FunctionDoc {
  name: string
  signature: string
  category: 'sound' | 'pitch' | 'filter' | 'timing' | 'effects' | 'control' | 'system'
  description: string
  examples: string[]
}

export const FUNCTION_CATALOG: FunctionDoc[] = [
  {
    name: 's',
    signature: 's(pattern: string | Pattern): Pattern',
    category: 'sound',
    description: 'Выбирает сэмплы или синтезаторы по имени с поддержкой мини-нотации.',
    examples: ['s("bd sd [~ bd] sd")', 's("sawtooth").note("c3 e3")'],
  },
  {
    name: 'note',
    signature: 'note(pattern: string | Pattern): Pattern',
    category: 'pitch',
    description: 'Задаёт высоту тона именем ноты (c3, eb4, f#2) или MIDI-номером (60, 72).',
    examples: ['note("c3 e3 g3 b3").s("piano")', 'note("60 64 67").s("triangle")'],
  },
  {
    name: 'n',
    signature: 'n(pattern: string | number | Pattern): Pattern',
    category: 'pitch',
    description: 'Выбирает номер сэмпла в банке или ступень гаммы при использовании с .scale().',
    examples: ['s("bd sd").n("0 2")', 'n("0 2 4 7").scale("C:minor").s("sawtooth")'],
  },
  {
    name: 'bank',
    signature: 'bank(prefix: string | Pattern): Pattern',
    category: 'sound',
    description: 'Задаёт префикс банка сэмплов или драм-машины (например: RolandTR909, RolandTR808).',
    examples: ['s("bd sd hh*4").bank("RolandTR909")'],
  },
  {
    name: 'fast',
    signature: 'fast(factor: number | Pattern): Pattern',
    category: 'timing',
    description: 'Ускоряет паттерн в указанное количество раз.',
    examples: ['s("bd sd").fast(2)', 's("hh*4").fast("1 2")'],
  },
  {
    name: 'slow',
    signature: 'slow(factor: number | Pattern): Pattern',
    category: 'timing',
    description: 'Замедляет паттерн в указанное количество раз.',
    examples: ['s("bd sd").slow(2)'],
  },
  {
    name: 'lpf',
    signature: 'lpf(frequency: number | Pattern): Pattern',
    category: 'filter',
    description: 'Частота среза low-pass фильтра в Гц (20..20000).',
    examples: ['s("sawtooth*8").note("c2").lpf(800)', 's("sawtooth*8").lpf("400 1200 800")'],
  },
  {
    name: 'hpf',
    signature: 'hpf(frequency: number | Pattern): Pattern',
    category: 'filter',
    description: 'Частота среза high-pass фильтра в Гц (20..20000).',
    examples: ['s("hh*8").hpf(4000)'],
  },
  {
    name: 'lpq',
    signature: 'lpq(resonance: number | Pattern): Pattern',
    category: 'filter',
    description: 'Резонанс (добротность Q) low-pass фильтра (1..20).',
    examples: ['s("sawtooth*4").lpf(600).lpq(12)'],
  },
  {
    name: 'gain',
    signature: 'gain(amount: number | Pattern): Pattern',
    category: 'effects',
    description: 'Громкость / амплитуда событий (от 0 до 1.5).',
    examples: ['s("hh*8").gain("0.8 0.4")', 's("bd sd").gain(0.7)'],
  },
  {
    name: 'room',
    signature: 'room(amount: number | Pattern): Pattern',
    category: 'effects',
    description: 'Уровень реверберации (reverb send от 0 до 1).',
    examples: ['s("sd").room(0.5)', 'note("c4 g4").s("piano").room(0.7)'],
  },
  {
    name: 'delay',
    signature: 'delay(amount: number | Pattern): Pattern',
    category: 'effects',
    description: 'Уровень дилея (wet level от 0 до 1).',
    examples: ['note("c4 e4").s("triangle").delay(0.4)'],
  },
  {
    name: 'pan',
    signature: 'pan(position: number | Pattern): Pattern',
    category: 'effects',
    description: 'Панорамирование от 0 (левый) до 1 (правый), 0.5 — центр.',
    examples: ['s("hh*4").pan("0 0.3 0.7 1")'],
  },
  {
    name: 'scale',
    signature: 'scale(name: string | Pattern): Pattern',
    category: 'pitch',
    description: 'Преобразует ступени из n() в ноты музыкальной гаммы.',
    examples: ['n("0 2 4 6 7").scale("C:minor").s("sawtooth")'],
  },
  {
    name: 'stack',
    signature: 'stack(...patterns: Pattern[]): Pattern',
    category: 'control',
    description: 'Одновременно воспроизводит несколько паттернов параллельно.',
    examples: ['stack(s("bd*2"), s("~ cp"), s("hh*8"))'],
  },
  {
    name: 'cat',
    signature: 'cat(...patterns: Pattern[]): Pattern',
    category: 'control',
    description: 'Последовательно воспроизводит паттерны один за другим.',
    examples: ['cat(s("bd*4"), s("sd*4"))'],
  },
  {
    name: 'struct',
    signature: 'struct(pattern: string | Pattern): Pattern',
    category: 'timing',
    description: 'Применяет ритмическую маску мини-нотации к значениям паттерна.',
    examples: ['note("c3 e3 g3").struct("x ~ x x")'],
  },
  {
    name: 'jux',
    signature: 'jux(fn: (p: Pattern) => Pattern): Pattern',
    category: 'effects',
    description: 'Применяет трансформацию в правом канале, создавая стереоэффект.',
    examples: ['s("bd sd").jux(rev)'],
  },
  {
    name: 'rev',
    signature: 'rev(pattern: Pattern): Pattern',
    category: 'timing',
    description: 'Воспроизводит события паттерна в обратном порядке во времени.',
    examples: ['s("bd sd hh cp").rev()'],
  },
  {
    name: 'samples',
    signature: 'samples(source: string | Record<string, string | string[]>): Promise<void>',
    category: 'system',
    description: 'Загружает и регистрирует банк аудиосэмплов (GitHub или URL).',
    examples: ["samples('github:tidalcycles/dirt-samples')"],
  },
  {
    name: 'register',
    signature: 'register(name: string, fn: Function): void',
    category: 'system',
    description: 'Регистрирует пользовательскую функцию или синт в рантайме Strudel.',
    examples: ["register('acid', (x, pat) => pat.lpf(x).lpq(12).s('sawtooth'))"],
  },
]

export function getAllFunctions(): FunctionDoc[] {
  return FUNCTION_CATALOG
}

export function getFunction(name: string): FunctionDoc | undefined {
  return FUNCTION_CATALOG.find((f) => f.name === name)
}

export function searchFunctions(query: string): FunctionDoc[] {
  const q = query.toLowerCase().trim()
  if (!q) return FUNCTION_CATALOG
  return FUNCTION_CATALOG.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  )
}
