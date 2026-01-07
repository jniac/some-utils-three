import { Object3D } from 'three'

const defaultOptions = {
  filter: (node: Object3D) => true,
  toString: (node: Object3D) => {
    const chunks = <string[]>[]

    if (node.name)
      chunks.push(node.name)

    chunks.push(`[${node.constructor.name}]`)

    if (node.children.length > 0)
      chunks.push(`(${node.children.length})`)

    return chunks.join(' ')
  },
}

type Options = Partial<typeof defaultOptions>

function allAncestorsOf(node: Object3D) {
  const ancestors = []
  let current = node
  while (current.parent) {
    ancestors.push(current.parent)
    current = current.parent
  }
  return ancestors.reverse()
}

/**
 * Returns true if the node itself or any of its descendants pass the filter
 */
function filterSelfOrDescendant(node: Object3D, filter: (node: Object3D) => boolean): boolean {
  return filter(node) || node.children.some(c => filterSelfOrDescendant(c, filter))
}

function isLastChild(node: Object3D, options: typeof defaultOptions) {
  if (node.parent === null)
    return true
  const children = node.parent.children.filter(c => filterSelfOrDescendant(c, options.filter))
  return children[children.length - 1] === node
}

function isLeaf(node: Object3D): boolean {
  return node.children.length === 0
}

function nodeToTreeString(node: Object3D, options: typeof defaultOptions): string {
  const indent = allAncestorsOf(node)
    .map(p => isLastChild(p, options) ? '  ' : '│ ')
    .join('')
  const parentRelation = isLastChild(node, options) === false ? '├─' : '└─'
  const childrenIndicator = isLeaf(node) ? '─' : '┬'
  return `${indent}${parentRelation}${childrenIndicator}─ ${options.toString(node)}`
}

function totalDescendantCount(node: Object3D): number {
  return 1 + node.children.reduce((sum, node) => sum + totalDescendantCount(node), 0)
}

export function treeToString(root: Object3D, userOptions?: Options): string {
  const lines = [`tree: (${totalDescendantCount(root)})`]
  const queue = [root]
  const options = { ...defaultOptions, ...userOptions }
  while (queue.length > 0) {
    const node = queue.shift()!
    lines.push(nodeToTreeString(node, options))
    queue.unshift(...node.children.filter(c => filterSelfOrDescendant(c, options.filter)))
  }
  return lines.join('\n')
}

export {
  defaultOptions as treeToStringDefaultOptions,
  Options as TreeToStringOptions
}

