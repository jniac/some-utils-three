import { Object3D } from 'three'

function isClass(fn: any): fn is new (...params: any) => any {
  return typeof fn === 'function'
    && /^class\s/.test(Function.prototype.toString.call(fn))
}

type Filter<T> =
  | ((instance: T) => boolean)
  | (new (...params: any) => T)

export function* traverse<T extends Object3D>(
  root: Object3D,
  filterArg?: Filter<T>,
): Generator<{ node: T, depth: number }> {
  const stack = [{ node: root, depth: 0 }]
  const filter = isClass(filterArg) ? (value: any) => value instanceof filterArg : filterArg
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!
    yield { node, depth } as any

    if (filter?.(node as any) === false)
      continue

    for (const child of node.children) {
      stack.push({ node: child, depth: depth + 1 })
    }
  }
}
