import fs from 'node:fs'
import path from 'node:path'

const kits = [
  'bd', 'sd', 'hh', 'cp', 'rm', 'rs', 'cr', 'cb', 'clak', 'ht', 'mt', 'lt',
  '808bd', '808sd', '808oh', '808cy', '808hc', '808lc', '808mc', '808ht', '808mt', '808lt',
  '909', 'casio', 'bass', 'bass0', 'bass1', 'bass2', 'arpy', 'bleep', 'blip',
  'tabla', 'feelfx', 'flick', 'bin', 'bottle', 'future', 'glitch', 'pluck', 'stab', 'jazz', 'house'
]

const baseRemote = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/'
const indexUrl = 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json'

async function run() {
  console.log('Fetching dirt-samples index...')
  const res = await fetch(indexUrl)
  const map = await res.json()

  const outDir = path.resolve('public/samples')
  fs.mkdirSync(outDir, { recursive: true })

  const localIndex = {
    _base: '/samples/',
  }

  let totalSize = 0
  let count = 0

  for (const kit of kits) {
    const remoteFiles = (map[kit] || []).slice(0, 2)
    if (!remoteFiles.length) continue

    const kitDir = path.join(outDir, kit)
    fs.mkdirSync(kitDir, { recursive: true })

    const localFileList = []

    for (let i = 0; i < remoteFiles.length; i++) {
      const relPath = remoteFiles[i]
      const ext = path.extname(relPath) || '.wav'
      const localFilename = `${i}${ext}`
      const localRel = `${kit}/${localFilename}`
      const localFull = path.join(kitDir, localFilename)

      localFileList.push(localRel)

      if (fs.existsSync(localFull) && fs.statSync(localFull).size > 0) {
        count++
        totalSize += fs.statSync(localFull).size
        continue
      }

      const fileUrl = baseRemote + relPath
      try {
        const fileRes = await fetch(fileUrl)
        if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`)
        const arrayBuf = await fileRes.arrayBuffer()
        fs.writeFileSync(localFull, Buffer.from(arrayBuf))
        totalSize += arrayBuf.byteLength
        count++
        console.log(`[${count}] Saved ${localRel} (${Math.round(arrayBuf.byteLength / 1024)} KB)`)
      } catch (err) {
        console.error(`Failed to download ${fileUrl}:`, err.message)
      }
    }

    localIndex[kit] = localFileList
  }

  // Alias rim to rm so both s("rim") and s("rm") work offline
  if (localIndex.rm) {
    localIndex.rim = localIndex.rm
  }

  fs.writeFileSync(path.join(outDir, 'strudel.json'), JSON.stringify(localIndex, null, 2))
  console.log(`\nDone! Downloaded ${count} samples (${(totalSize / (1024 * 1024)).toFixed(2)} MB) into public/samples/`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
