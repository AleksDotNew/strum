# 🎸 Strum

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Android](https://img.shields.io/badge/Platform-Android_10%2B-green.svg)](https://developer.android.com)
[![Strudel](https://img.shields.io/badge/Powered%20by-Strudel-ff69b4.svg)](https://strudel.cc)
[![Solid.js](https://img.shields.io/badge/Built%20with-Solid.js-446b9e.svg)](https://www.solidjs.com)
[![Release](https://img.shields.io/github/v/release/AleksDotNew/strum?label=Release&color=brightgreen)](https://github.com/AleksDotNew/strum/releases)

**Strum** — открытая мобильная live-coding студия для [Strudel](https://strudel.cc), спроектированная с нуля для комфортной игры и создания музыки на экранах смартфонов (целевой профиль: Google Pixel 9a, 412×915 dp).

---

## 🌟 Ключевая философия

- **Код — единственный источник истины:** Визуальные контролы (сенсорные слайдеры чисел, 16-шаговый секвенсор сетки, хроматический piano roll, многоканальный микшер) **никогда** не хранят собственное изолированное состояние. Все изменения хирургически переписывают AST-литералы кода через Acorn с автоматическим откатом (rollback) при нарушении синтаксиса.
- **Мобильная эргономика для живых выступлений:**
  - Сенсорные цели строго $\ge 48\times 48$ CSS px.
  - Высокочастотные контролы (Play/Stop, панель символов, переключение вкладок) расположены в **нижних 40% экрана (зоне большого пальца)**.
  - Полное отсутствие случайного зума (`user-scalable=no`, `touch-action: manipulation`) и нежелательной прокрутки документа (`scrollWidth <= clientWidth`, `scrollHeight <= clientHeight`).
  - Плавная адаптация под виртуальную клавиатуру без рывков интерфейса через динамический отступ `--kb`.
  - Отзывчивый **60/40 сплит в ландшафтной ориентации**: 60% слева отдано редактору и визуальным инструментам, 40% справа — компактной панели управления студией.
- **Offline-First надёжность:** Локальная база данных IndexedDB (`strum_db`), автоматические снимки версий кода (до 50 ревизий) при каждом запуске, хранилище аудио-сэмплов через Cache Storage API и полная автономность без необходимости доступа к интернету.

---

## 🚀 Возможности студии

### 1. Редактор кода и подсказки
- **CodeMirror 6** с адаптированной тёмной темой, подсветкой синтаксиса Strudel и моноширинным шрифтом.
- **Визуализация событий в реальном времени:** Активные воспроизводимые события (haps) подсвечиваются прямо в тексте программы с помощью `@strudel/draw`.
- **Контекстное автодополнение:** Разделение подсказок для мини-нотации (звуки, инструменты, шкалы) и JavaScript-методов/функций.
- **Инспектор токенов `HintLine`:** При перемещении курсора строка под редактором мгновенно выводит сигнатуру и документацию по текущей функции или аргументу.

### 2. Сенсорные слайдеры чисел (Hot-Eval)
- Быстрая кнопка `⚡ {параметр}: {значение}` в панели символов при наведении курсора на числовой литерал.
- Всплывающая шторка с ползунком и шаговыми кнопками `+` / `-`, автоматически подбирающая диапазон (0..1 для `gain`, 20..20000 для `lpf`, 0..1 для `room`, 0.1..8 для `fast`/`slow`).
- Мгновенная переоценка аудио во время движения пальца без перезапуска воспроизведения.

### 3. 16-шаговая ритмическая сетка (`Сетка`)
- Двунаправленный конвертер: мини-нотация `s("bd [sd hh]")` ⇄ визуальная сетка шагов.
- Добавление и удаление дорожек инструментов.
- Тап по ячейке мгновенно обновляет код в редакторе.
- Автоматический fallback с возможностью вставки готового шаблона, если код содержит сложные многоуровневые трансформации.

### 4. Хроматический Piano Roll
- Переключатель режима `[🥁 Ударные]` / `[🎹 Пиано-ролл]` во вкладке сетки.
- Редактирование мелодических паттернов `note("c4 e4 g4 b4")` и `n("0 2 4 7")`.
- Сетка нот на 16 шагов с октавным селектором (октавы 2..5) и наглядным разделением белых и чёрных (#) клавиш.

### 5. Браузер звуков и поддержка Weftpack-сэмплпаков (`Звуки`)
- Вкладки `[Звуки]` и `[Сэмплпаки]`.
- **Встроенный офлайн-саундбанк:** 80 базовых инструментов (бочки, рабочие, хэты, 808/909 киты, перкуссия, бас, Casio, Moog, ZzFX).
- **Weftpack Сэмплпаки:** 12 встроенных отборных сэмплпаков от Weft Loom (`Acid Lines`, `Chip Arcade`, `Breakbeat Heat`, `Deep House`, `Minimal Click`, `Garage Swing`, `Dub Chords`, `Glitch Lab`, `Electro Funk`, `Hand Drums`, `Nu Disco`, `Trap Sub`) с десятками чистых WAV-звуков.
- Подключение/отключение паков в один тап, мгновенное предпрослушивание `▶` любого звука и импорт внешних `.weftpack` файлов со смартфона.
- Фильтрация по категориям (Все, Ударные, Синты, Бас, Перкуссия, Мелодия, Эффекты) и мгновенный поиск.
- Интеллектуальная вставка `+ Вставить` по текущей позиции курсора.

### 6. Многоканальный микшер (`Микс`)
- Автоматическое разделение слоёв из меток `$:` / `stack(...)`.
- Канальные линейки с сенсорными фейдерами громкости (`.gain(x)`).
- Кнопки **Mute** (`M`) и **Solo** (`S`) с переключением меток в коде (`$:` ⇄ `_$:` или `gain(0)`).
- Генератор готового трёхканального джема (Beat, Bass, Lead) в один тап.

### 7. Стек Prebake-скриптов и шаблоны треков
- **Встроенные Prebake-хелперы Weft:** `shiftBy`, `cycleDegrade`, `DX`, `acidenv`, `pg`, `soloOrbit`, `muteOrbit` доступны «из коробки».
- **Встроенная коллекция шаблонов треков:**
  - *Meadow Echoes* (Minecraft C418 style ambient)
  - *Ambient Breaks* (Atmospheric DnB)
  - *Acid 303 Techno* (Switchangel Acid)
  - *Movement* (Minimal German Techno)
  - *Stranger Synths* (Darkwave / Synthwave)
  - *Breakbeat Heat* (Showcase Weftpack-сэмплов)
- Поддержка пользовательских скриптов инициализации (`samples(...)`, `register(...)`, `aliasBank(...)`).
- Изоляция ошибок в раннере и проверка флага доверия `trusted: boolean`.
- Готовые шаблоны проектов и сохранение собственных наборов в формате JSON.

### 8. Совместимость со Strudel.cc и экспорт
- Импорт и экспорт паттернов через ссылки и хэш URL (`strudel.cc/#...`).
- Экспорт чистого кода в файл `.js`.
- Сохранение истории изменений с возможностью отката к любому предыдущему состоянию.

---

## 📱 Скриншоты интерфейса

| Портретный режим (Pixel 9a) | Альбомный 60/40 сплит |
| :---: | :---: |
| Высота 915dp, нижняя зона пальца | 60% редактор/сетка + 40% контролы |

---

## 🛠 Технологический стек

- **Runtime & Audio:** [`@strudel/core`](https://www.npmjs.com/package/@strudel/core), `@strudel/mini`, `@strudel/transpiler`, `@strudel/webaudio`, `@strudel/draw`, `@strudel/tonal`, `@strudel/codemirror`.
- **UI & Реактивность:** [Solid.js](https://www.solidjs.com) + Vite 8.
- **Редактор:** [CodeMirror 6](https://codemirror.net).
- **Синтаксический анализ:** [Acorn](https://github.com/acornjs/acorn) (AST парсинг и локализация литералов без зависимостей от DOM).
- **Хранилище:** IndexedDB (`idb`) + Cache Storage API.
- **Мобильная платформа:** [Capacitor 8](https://capacitorjs.com) (Android `minSdk = 29`, `targetSdk = 36`, Temurin JDK 21).
- **Тестирование:** [Vitest](https://vitest.dev) (Unit) + [Playwright](https://playwright.dev) (Mobile E2E).

---

## 🏗 Архитектура модулей

```
src/
├── engine/        # Оболочка Strudel REPL, жизненный цикл AudioContext, запуск prebake
├── code-model/    # Чистые AST-функции (acorn, replaceLiteral, miniGrid, mixerModel, pianoRollModel) [БЕЗ DOM]
├── hints/         # Чистые каталоги (функции, сэмплы, гаммы, инспектор токенов) [БЕЗ DOM]
├── editor/        # CodeMirror 6, темы, подсветка активных haps, контекстный автокомплит
├── storage/       # IndexedDB репозитории (проекты, версии, prebake, шаблоны), кэш звуков
├── ui/            # Solid.js экраны, TopBar, SymbolBar, BottomNav, шторки слайдеров и микшера
├── styles/        # CSS Grid раскладка, адаптация под клавиатуру (--kb), тёмная тема
└── vendor/weft/   # Модули с атрибуцией из Weft Loom (AGPL-3.0-or-later)
```

---

## 💻 Установка и запуск для разработки

### Требования
- **Node.js** $\ge 20$
- **Java JDK** 21 (рекомендуется Eclipse Temurin 21)
- **Android SDK** 36 (с `build-tools`, `platform-tools` и `emulator`)

### Команды

```bash
# Клонирование репозитория
git clone https://github.com/AleksDotNew/strum.git
cd strum

# Установка зависимостей
npm install

# Запуск локального сервера разработки (порт 5180)
npm run dev

# Запуск unit-тестов (Vitest)
npm test

# Запуск мобильных E2E тестов (Playwright, Chromium 412×915)
npm run test:e2e

# Полная проверка проекта (Typecheck + Vitest + Vite Build)
npm run check
```

### Сборка и запуск на Android

```bash
# Сборка веб-бандла и синхронизация Capacitor
npm run build
npx cap sync android

# Сборка APK через Gradle
cd android
./gradlew assembleDebug       # Отладочный APK
./gradlew assembleRelease     # Релизный APK

# Запуск на подключенном устройстве или эмуляторе Pixel 9a
npm run android
```

---

## 📦 Скачать релиз

Готовые установочные APK-пакеты доступны в разделе **[Releases](https://github.com/AleksDotNew/strum/releases)**:
- **`strum-v0.1-alpha-release.apk`** — подписанный релизный пакет (~8.0 МБ).
- **`strum-v0.1-alpha-debug.apk`** — отладочный пакет с включённым WebView debugging (~9.9 МБ).

---

## 📄 Лицензия и благодарности

- Проект распространяется под свободной лицензией **[AGPL-3.0-or-later](LICENSE)**.
- Особая благодарность сообществу **[Strudel](https://strudel.cc)** и проекту **[TidalCycles](https://tidalcycles.org)** за невероятную звуковую систему.
- Компоненты адаптации и алгоритмы каталогов созданы с учётом наработок проекта **[Weft Loom](https://github.com/alaca/weft-loom)** (`alaca/weft-loom`, лицензия AGPL-3.0-or-later).
