import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

export function computeInset(layoutH: number, visualH: number, offsetTop: number): number {
  const d = Math.round(layoutH - visualH - offsetTop)
  return d > 80 ? d : 0
}

export function installKeyboardInset(root: HTMLElement): () => void {
  const apply = (px: number) => {
    root.style.setProperty('--kb', `${px}px`)
    root.classList.toggle('kb-open', px > 0)
  }

  if (Capacitor.isNativePlatform()) {
    const subs = [
      Keyboard.addListener('keyboardWillShow', (i) => apply(i.keyboardHeight)),
      Keyboard.addListener('keyboardWillHide', () => apply(0)),
    ]
    return () => {
      subs.forEach((s) => s.then((h) => h.remove()))
    }
  }

  const vv = window.visualViewport
  if (!vv) {
    return () => {}
  }

  const on = () => apply(computeInset(window.innerHeight, vv.height, vv.offsetTop))
  vv.addEventListener('resize', on)
  return () => {
    vv.removeEventListener('resize', on)
  }
}

