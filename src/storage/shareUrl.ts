export function encodeStrudelUrl(code: string): string {
  const bytes = new TextEncoder().encode(code)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `https://strudel.cc/#${btoa(binary)}`
}

export function decodeStrudelUrl(urlOrHash: string): string | null {
  try {
    const hashIndex = urlOrHash.indexOf('#')
    const hash = hashIndex >= 0 ? urlOrHash.slice(hashIndex + 1) : urlOrHash
    if (!hash) return null
    const binary = atob(hash)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function exportJsFile(filename: string, code: string): void {
  const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.js') ? filename : `${filename}.strudel.js`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
