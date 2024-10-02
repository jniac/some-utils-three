import { Texture, TextureLoader } from 'three'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

import { promisify } from 'some-utils-ts/misc/promisify'
import { DestroyableObject } from 'some-utils-ts/types'

const gltfExtensions = ['gltf', 'glb'] as const
type GltfExtension = typeof gltfExtensions[number]
function isGltfExtension(extension: string): extension is GltfExtension {
  return gltfExtensions.includes(extension as any)
}

const textureExtensions = ['png', 'jpg', 'jpeg', 'hdr', 'exr'] as const
type TextureExtension = typeof textureExtensions[number]
function isTextureExtension(extension: string): extension is TextureExtension {
  return textureExtensions.includes(extension as any)
}

type Extension = GltfExtension | TextureExtension

class Callbacks<T extends [] = []> {
  listeners = new Set<() => void>()

  add(listener: (...args: T) => void): DestroyableObject {
    this.listeners.add(listener)
    const destroy = () => this.listeners.delete(listener)
    return { destroy }
  }

  call(...args: T) {
    for (const listener of this.listeners) {
      listener.apply(null, args)
    }
  }
}

export type TextureLoadResult<T> = { value: T, promise: Promise<T> }

/**
 * One loader to rule them all.
 */
export class UnifiedLoader {
  private static nextId = 0
  private static instances: UnifiedLoader[] = []
  static current() {
    return this.instances[this.instances.length - 1] ?? new UnifiedLoader()
  }
  static get(name: string) {
    return this.instances.find(instance => instance.name === name) ?? new UnifiedLoader({ name })
  }

  id = UnifiedLoader.nextId++
  readonly name: string

  private loaders = {
    gltf: new GLTFLoader(),
    texture: new TextureLoader(),
    rgbeLoader: new RGBELoader(),
    exrLoader: new EXRLoader(),
  }

  constructor({ name }: { name?: string } = {}) {
    this.name = name ?? `UnifiedLoader-${this.id}`
    UnifiedLoader.instances.push(this)
  }

  setPath(path: string) {
    this.loaders.gltf.setPath(path)
    this.loaders.texture.setPath(path)
    this.loaders.rgbeLoader.setPath(path)
    this.loaders.exrLoader.setPath(path)
  }

  private _onAfterLoad = new Callbacks()
  onAfterLoad(listener: () => void) {
    return this._onAfterLoad.add(listener)
  }

  async loadGltf(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loaders.gltf.load(url, value => {
        resolve(value)
        this._onAfterLoad.call()
      }, undefined, reject)
    })
  }

  async loadRgbe(url: string): Promise<Texture> {
    const texture = promisify(this.loaders.rgbeLoader.load(url, value => {
      texture.resolve()
      this._onAfterLoad.call()
    }, undefined, () => {
      console.log(`Failed to load RGBE: ${url}`)
    }))
    return texture
  }

  async loadExr(url: string) {
    const texture = promisify(this.loaders.exrLoader.load(url, value => {
      texture.resolve()
      this._onAfterLoad.call()
    }, undefined, () => {
      console.log(`Failed to load EXR: ${url}`)
    }))
    return texture
  }

  loadTexture(url: string, callback?: (texture: Texture) => void) {
    const texture = promisify(this.loaders.texture.load(url, value => {
      callback?.(value)
      texture.resolve()
      this._onAfterLoad.call()
    }, undefined, () => {
      console.log(`Failed to load texture: ${url}`)
    }))

    return texture
  }

  async load(url: `${string}.${GltfExtension}`): Promise<GLTF>
  async load(url: `${string}.${TextureExtension}`): Promise<Texture>
  async load(url: string): Promise<any> {
    const extension = url.split('.').pop()! as Extension

    if (isGltfExtension(extension)) {
      return this.loadGltf(url)
    }

    if (isTextureExtension(extension)) {
      let value: Texture
      const promise = new Promise((resolve, reject) => {
        value = this.loaders.texture.load(url, value => {
          resolve(value)
          this._onAfterLoad.call()
        }, undefined, reject)
      })
      return promise
    }

    throw new Error(`Unsupported extension: ${extension}`)
  }
}
