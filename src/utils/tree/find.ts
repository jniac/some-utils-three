import { Object3D } from 'three'

type Predicate<T extends Object3D> =
  | ((instance: T) => boolean)
  | (new (...params: any) => T)

function solvePredicate<T extends Object3D>(predicate: Predicate<T>): (instance: Object3D) => boolean {
  if (typeof predicate === 'function' && /^class\s/.test(Function.prototype.toString.call(predicate))) {
    return (instance: Object3D) => instance instanceof predicate
  }

  return predicate as (instance: Object3D) => boolean
}

export function findAll<T extends Object3D>(
  root: Object3D,
  predicateArg: (instance: Object3D) => boolean,
) {
  const predicate = solvePredicate(predicateArg)
  const result: T[] = []
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (predicate(node)) {
      result.push(node as T)
    }

    for (const child of node.children) {
      stack.push(child)
    }
  }
  return result
}

export function find<T extends Object3D>(
  root: Object3D,
  predicateArg: Predicate<T>,
) {
  const predicate = solvePredicate(predicateArg)
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (predicate(node))
      return node as T

    for (const child of node.children) {
      stack.push(child)
    }
  }
  return null
}
