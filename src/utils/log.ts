import { Group, InstancedMesh, LineSegments, Mesh, Object3D, Points, Scene } from 'three'

function toLetter(node: Object3D) {
  if (node.constructor === Scene)
    return 'S'

  if (node.constructor === Group)
    return 'G'

  if (node.constructor === Points)
    return 'P'

  if (node.constructor === LineSegments)
    return 'LS'

  if (node.constructor === InstancedMesh)
    return 'IM'

  if (node.constructor === Mesh)
    return 'M'

  if (node.constructor === Object3D)
    return 'O'

  return '•'
}

function getName(node: Object3D) {
  return node.name || node.constructor.name
}

class YieldItem {
  map: Map<Object3D, YieldItem>
  node: Object3D
  index: number
  depth: number
  indexMax: number
  constructor(map: Map<Object3D, YieldItem>, node: Object3D, index: number, depth: number, indexMax: number) {
    this.map = map
    this.node = node
    this.index = index
    this.depth = depth
    this.indexMax = indexMax
  }
  isLastChild(): boolean {
    return this.index === this.indexMax - 1
  }
  getParentItems(): YieldItem[] {
    const items = [] as YieldItem[]
    let current: Object3D | null = this.node.parent
    while (current) {
      const item = this.map.get(current)
      if (item)
        items.push(item)
      current = current.parent
    }
    return items
  }
}

function* allDescendantsOf(node: Object3D, {
  includeSelf = false,
} = {}): Generator<YieldItem> {
  const queue = <YieldItem[]>[]
  const map = new Map<Object3D, YieldItem>()
  const toYieldItem = (depth: number) => (child: Object3D, i: number, array: Object3D[]) => {
    const item = new YieldItem(map, child, i, depth, array.length)
    map.set(child, item)
    return item
  }

  if (includeSelf) {
    queue.push(new YieldItem(map, node, 0, 0, 1))
  } else {
    queue.push(...node.children.map(toYieldItem(1)))
  }

  while (queue.length > 0) {
    const item = queue.shift()!
    yield item

    const children = item.node.children.map(toYieldItem(item.depth + 1))
    queue.unshift(...children)
  }
}

export class LogUtils {
  static tree(root: Object3D) {
    const lines = <string[]>[]
    let total = 0
    for (const item of allDescendantsOf(root, { includeSelf: true })) {
      const indent = item.getParentItems()
        .map(parentItem => {
          return parentItem.isLastChild() ? '   ' : '│  '
        })
        .reverse()
        .join('')
      const letter = toLetter(item.node)
      const relation = item.depth === 0 ? '•' :
        item.isLastChild() === false ? '├─' : '└─'
      const childrenCount = item.node.children.length > 0 ? `(${item.node.children.length})` : ''
      const line = `${indent}${relation} ${letter} (${getName(item.node)})${childrenCount}`
      lines.push(line)
      total++
    }
    lines.unshift(`Tree of "${getName(root)}": (${total} nodes)`)
    const str = lines.join('\n')
    console.log(str)
  }
}