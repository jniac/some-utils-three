import { Object3D } from 'three'

const eventMap = new WeakMap<Object3D, Map<string, Set<(...args: any[]) => void>>>()

function doCall(object: Object3D, eventName: string, ...args: any[]) {
  if (eventName in object.userData) {
    const fn = object.userData[eventName]
    if (typeof fn === 'function') {
      fn.apply(object, args)
    }
  }
  if (eventName in object) {
    const fn = (object as any)[eventName]
    if (typeof fn === 'function') {
      fn.apply(object, args)
    }
  }
  const objectEvents = eventMap.get(object)
  if (!objectEvents)
    return
  const callbacks = objectEvents.get(eventName)
  if (!callbacks)
    return
  for (const callback of callbacks) {
    callback(...args)
  }
}

export class LifeCycle {
  static bind(object: Object3D, eventName: string, callback: (...args: any[]) => void) {
    if (!eventMap.has(object))
      eventMap.set(object, new Map())
    const objectEvents = eventMap.get(object)!
    if (!objectEvents.has(eventName))
      objectEvents.set(eventName, new Set())
    objectEvents.get(eventName)!.add(callback)
  }

  /**
   * Recursively calls the given lifecycle event on the object and all its children.
   */
  static call(object: Object3D, eventName: string, ...args: any[]) {
    doCall(object, eventName, ...args)
    for (const child of object.children) {
      this.call(child, eventName, ...args)
    }
  }
}

