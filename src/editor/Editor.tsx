import { onMount, onCleanup } from 'solid-js'
import { EditorView } from '@codemirror/view'
import { EditorState, StateField, StateEffect } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { defaultKeymap, history, historyKeymap, insertNewlineAndIndent } from '@codemirror/commands'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
  Decoration,
  type DecorationSet,
  gutter,
  GutterMarker,
} from '@codemirror/view'
import {
  highlightExtension,
  highlightMiniLocations,
  updateMiniLocations,
  sliderPlugin,
  widgetPlugin,
  updateSliderWidgets,
  updateWidgets,
} from '@strudel/codemirror'
import { strumAutocompleteExtension, strumCompletionKeymap } from './autocomplete'
import { findRootBlocks, toggleBlockMute, type RootBlock, type LineOrPos } from '../code-model/muteToggle'

export const setErrorLine = StateEffect.define<number | null>()

class MuteMarker extends GutterMarker {
  constructor(public readonly muted: boolean, public readonly blockName: string) {
    super()
  }

  eq(other: GutterMarker): boolean {
    return (
      other instanceof MuteMarker &&
      other.muted === this.muted &&
      other.blockName === this.blockName
    )
  }

  toDOM(): Node {
    const btn = document.createElement('span')
    btn.className = `cm-mute-marker ${this.muted ? 'cm-mute-marker-muted' : 'cm-mute-marker-active'}`
    btn.textContent = this.muted ? '[M]' : '[S]'
    btn.setAttribute('data-muted', String(this.muted))
    btn.setAttribute('data-block', this.blockName)
    btn.setAttribute('role', 'button')
    btn.setAttribute('aria-label', this.muted ? `Unmute ${this.blockName}` : `Mute ${this.blockName}`)
    return btn
  }
}

let cachedDoc: any = null
let cachedBlocksByLine = new Map<number, RootBlock>()

function getCachedRootBlockForLine(doc: any, lineIndex: number): RootBlock | undefined {
  if (doc !== cachedDoc) {
    cachedDoc = doc
    const blocks = findRootBlocks(doc.toString())
    cachedBlocksByLine = new Map(blocks.map((b) => [b.line, b]))
  }
  return cachedBlocksByLine.get(lineIndex)
}

export function muteGutterExtension(
  onToggle?: (newCode: string, muted: boolean, block: RootBlock) => void
) {
  return gutter({
    class: 'cm-mute-gutter',
    lineMarker(view, line) {
      const lineObj = view.state.doc.lineAt(line.from)
      const lineIndex = lineObj.number - 1
      const block = getCachedRootBlockForLine(view.state.doc, lineIndex)
      if (block) {
        return new MuteMarker(block.muted, block.name)
      }
      return null
    },
    lineMarkerChange(update) {
      return update.docChanged
    },
    domEventHandlers: {
      mousedown(view, line, event) {
        const isMarker = (event.target as HTMLElement)?.closest('.cm-mute-marker')
        if (!isMarker) return false

        event.preventDefault()
        const lineObj = view.state.doc.lineAt(line.from)
        const lineIndex = lineObj.number - 1
        const block = getCachedRootBlockForLine(view.state.doc, lineIndex)
        if (!block) return false

        const res = toggleBlockMute(view.state.doc.toString(), { line: lineIndex })
        if (res) {
          if (block.muted) {
            view.dispatch({
              changes: { from: block.start, to: block.start + 1, insert: '' },
            })
          } else {
            view.dispatch({
              changes: { from: block.start, to: block.start, insert: '_' },
            })
          }
          onToggle?.(res.newCode, res.muted, res.block)
          return true
        }
        return false
      },
      touchstart(view, line, event) {
        const isMarker = (event.target as HTMLElement)?.closest('.cm-mute-marker')
        if (!isMarker) return false

        event.preventDefault()
        const lineObj = view.state.doc.lineAt(line.from)
        const lineIndex = lineObj.number - 1
        const block = getCachedRootBlockForLine(view.state.doc, lineIndex)
        if (!block) return false

        const res = toggleBlockMute(view.state.doc.toString(), { line: lineIndex })
        if (res) {
          if (block.muted) {
            view.dispatch({
              changes: { from: block.start, to: block.start + 1, insert: '' },
            })
          } else {
            view.dispatch({
              changes: { from: block.start, to: block.start, insert: '_' },
            })
          }
          onToggle?.(res.newCode, res.muted, res.block)
          return true
        }
        return false
      },
    },
    initialSpacer() {
      return new MuteMarker(false, '$')
    },
  })
}

const errorLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null) {
          decorations = Decoration.none
        } else {
          try {
            const line = tr.state.doc.line(Math.min(e.value, tr.state.doc.lines))
            decorations = Decoration.set([
              Decoration.line({ class: 'cm-error-line' }).range(line.from),
            ])
          } catch {
            decorations = Decoration.none
          }
        }
      }
    }
    return decorations
  },
  provide: (f) => EditorView.decorations.from(f),
})

const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0e0f12',
      color: '#e8e6e3',
      fontSize: '15px',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'monospace',
      caretColor: '#7cf0b0',
      padding: '8px 0',
    },
    '.cm-cursor': {
      borderLeftColor: '#7cf0b0',
    },
    '.cm-gutters': {
      backgroundColor: '#14171d',
      color: '#555b68',
      border: 'none',
    },
    '.cm-activeLine': {
      backgroundColor: '#191d24',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1f242e',
      color: '#7cf0b0',
    },
    '.cm-error-line': {
      backgroundColor: 'rgba(255, 107, 107, 0.25)',
      borderLeft: '3px solid #ff6b6b',
    },
    '.cm-mute-gutter': {
      width: '26px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '.cm-mute-marker': {
      cursor: 'pointer',
      userSelect: 'none',
      fontSize: '11px',
      lineHeight: '1.2',
      padding: '1px 3px',
      borderRadius: '3px',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      display: 'inline-block',
      textAlign: 'center',
    },
    '.cm-mute-marker-muted': {
      color: '#ff6b6b',
      backgroundColor: 'rgba(255, 107, 107, 0.2)',
      border: '1px solid rgba(255, 107, 107, 0.4)',
    },
    '.cm-mute-marker-active': {
      color: '#7cf0b0',
      backgroundColor: 'rgba(124, 240, 176, 0.15)',
      border: '1px solid rgba(124, 240, 176, 0.3)',
    },
    '.cm-tooltip': {
      backgroundColor: '#191d24',
      border: '1px solid #2a313d',
      color: '#e8e6e3',
      borderRadius: '6px',
      zIndex: '50',
    },
    '.cm-tooltip-autocomplete': {
      maxHeight: '120px',
      maxWidth: '85vw',
      overflowY: 'auto',
      '& > ul': {
        fontFamily: 'monospace',
        fontSize: '13px',
      },
      '& > ul > li': {
        padding: '2px 8px',
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: '#2b3442',
        color: '#7cf0b0',
      },
    },
    '.cm-completionInfo': {
      maxHeight: '70px',
      maxWidth: '260px',
      overflowY: 'auto',
      fontSize: '12px',
      padding: '4px 8px',
    },
  },
  { dark: true }
)

export interface EditorApi {
  getCode(): string
  setCode(c: string): void
  insert(text: string, cursorOffset?: number): void
  cursor(): number
  markError(line: number | null): void
  setMiniLocations(locations: any[]): void
  setWidgets(widgets: any[]): void
  highlightHaps(time: number, haps: any[]): void
  toggleBlockMute(target?: LineOrPos): boolean
  view: EditorView
}

export interface EditorProps {
  initialCode: string
  onReady?(api: EditorApi): void
  onChange?(code: string): void
  onCursorMove?(pos: number): void
  onToggleMute?(newCode: string, muted: boolean, block: RootBlock): void
}

export function Editor(props: EditorProps) {
  let containerRef!: HTMLDivElement
  let view!: EditorView

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        props.onChange?.(update.state.doc.toString())
      }
      if (update.selectionSet) {
        props.onCursorMove?.(update.state.selection.main.head)
      }
    })

    const state = EditorState.create({
      doc: props.initialCode,
      extensions: [
        lineNumbers(),
        muteGutterExtension(props.onToggleMute),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        javascript(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,
        keymap.of([
          ...strumCompletionKeymap,
          { key: 'Enter', run: insertNewlineAndIndent },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        updateListener,
        highlightExtension,
        sliderPlugin,
        widgetPlugin,
        strumAutocompleteExtension(),
        errorLineField,
        darkTheme,
      ],
    })

    view = new EditorView({
      state,
      parent: containerRef,
    })

    const api: EditorApi = {
      getCode: () => view.state.doc.toString(),
      setCode: (c: string) => {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: c },
        })
      },
      insert: (text: string, cursorOffset?: number) => {
        const sel = view.state.selection.main
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: {
            anchor: sel.from + (cursorOffset !== undefined ? cursorOffset : text.length),
          },
          scrollIntoView: true,
        })
        view.focus()
      },
      cursor: () => view.state.selection.main.head,
      markError: (line: number | null) => {
        view.dispatch({ effects: setErrorLine.of(line) })
      },
      setMiniLocations: (locations: any[]) => {
        try {
          updateMiniLocations(view, locations || [])
        } catch {}
      },
      setWidgets: (widgets: any[]) => {
        try {
          const list = widgets || []
          const sliders = list.filter((w: any) => w.type === 'slider')
          updateSliderWidgets(view, sliders)
          const otherWidgets = list.filter((w: any) => w.type !== 'slider')
          updateWidgets(view, otherWidgets)
        } catch (err) {
          console.warn('Failed to update widgets:', err)
        }
      },
      highlightHaps: (time: number, haps: any[]) => {
        try {
          highlightMiniLocations(view, time, haps)
        } catch {}
      },
      toggleBlockMute: (target?: LineOrPos) => {
        const lineOrPos = target ?? { pos: view.state.selection.main.head }
        const res = toggleBlockMute(view.state.doc.toString(), lineOrPos)
        if (res) {
          const wasMuted = !res.muted
          if (wasMuted) {
            view.dispatch({
              changes: { from: res.block.start, to: res.block.start + 1, insert: '' },
            })
          } else {
            view.dispatch({
              changes: { from: res.block.start, to: res.block.start, insert: '_' },
            })
          }
          props.onToggleMute?.(res.newCode, res.muted, res.block)
          return true
        }
        return false
      },
      view,
    }

    props.onReady?.(api)
  })

  onCleanup(() => {
    view?.destroy()
  })

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        'overflow-y': 'auto',
      }}
    />
  )
}
