import { onMount, onCleanup } from 'solid-js'
import { EditorView } from '@codemirror/view'
import { EditorState, StateField, StateEffect } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { keymap, lineNumbers, highlightActiveLine, Decoration, type DecorationSet } from '@codemirror/view'

export const setErrorLine = StateEffect.define<number | null>()

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
  },
  { dark: true }
)

export interface EditorApi {
  getCode(): string
  setCode(c: string): void
  insert(text: string, cursorOffset?: number): void
  cursor(): number
  markError(line: number | null): void
  view: EditorView
}

export interface EditorProps {
  initialCode: string
  onReady?(api: EditorApi): void
  onChange?(code: string): void
  onCursorMove?(pos: number): void
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
        highlightActiveLine(),
        history(),
        bracketMatching(),
        javascript(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
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
