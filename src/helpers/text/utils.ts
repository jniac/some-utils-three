import { TextHelperAtlas } from './atlas'
import { DATA_STRIDE_HEADER_BYTE_SIZE } from './types'

export function getDataStringView(atlas: TextHelperAtlas, dataTextureArray: Uint8Array, dataStride: number, lineCount: number, lineLength: number, start = 0, length = 3) {
  const packed = Array.from({ length: dataTextureArray.length / 4 }, (_, i) => {
    const offset = i * 4
    const r = dataTextureArray[offset + 0]
    const g = dataTextureArray[offset + 1]
    const b = dataTextureArray[offset + 2]
    const a = dataTextureArray[offset + 3]
    return [r, g, b, a]
  }).slice(start * dataStride / 4, length * dataStride / 4)

  const withHeader = [] as string[]
  withHeader.push(`\nData texture array (${dataTextureArray.length} bytes):`)
  withHeader.push(`\ndataStride: ${dataStride} (${dataStride / 4} x 4 bytes)`)

  const LINES_INFO_START = DATA_STRIDE_HEADER_BYTE_SIZE / 4
  const TEXT_START = LINES_INFO_START + lineCount
  for (let i = 0; i < packed.length; i++) {
    const line = i % (dataStride / 4)
    if (line === 0) {
      withHeader.push(`\npack #${i / (dataStride / 4)}`)
      withHeader.push(`info:`)
    }
    if (line === LINES_INFO_START) {
      withHeader.push(`lines (${lineCount}):`)
    }
    if (line === TEXT_START) {
      withHeader.push(`chars (${lineLength}):`)
    }
    const [r, g, b, a] = packed[i]
    let str = `${i.toString().padEnd(3)} - ${(i * 4).toString().padEnd(4)}:   ${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)}, ${a.toString().padStart(3)}`
    if (line >= TEXT_START) {
      str += `     ${atlas.symbols[r]}${atlas.symbols[g]}${atlas.symbols[b]}${atlas.symbols[a]}`
    }
    withHeader.push('  ' + str)
  }

  return withHeader.join('\n')
}
