import { Matrix4 } from 'three'

import { TransformDeclaration } from '../../declaration'

export class BaseManager {
  keyMap = new Map<any, { index: number; count: number }>()

  ensureKeyEntry(key: any, index: number, count: number) {
    const entry = this.keyMap.get(key)
    if (entry) {
      if (entry.count !== count)
        throw new Error('A key entry already exists with a different count. This is not allowed. Once a key is set, it cannot be changed.')
      return entry
    } else {
      const newEntry = { index, count }
      this.keyMap.set(key, newEntry)
      return newEntry
    }
  }

  transformMatrix = new Matrix4()
  applyTransform(...transforms: TransformDeclaration[]) {
    throw new Error('Not implemented!')
  }

  clear() {
    this.keyMap.clear()
    return this
  }
}
