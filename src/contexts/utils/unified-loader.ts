import { DestroyableObject } from 'some-utils-ts/types'
import { Texture, TextureLoader } from 'three'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

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

export class UnifiedLoader {
  private loaders = {
    gltf: new GLTFLoader(),
    texture: new TextureLoader(),
    rgbeLoader: new RGBELoader(),
    exrLoader: new EXRLoader(),
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
    return new Promise((resolve, reject) => {
      this.loaders.rgbeLoader.load(url, value => {
        resolve(value)
        this._onAfterLoad.call()
      }, undefined, reject)
    })
  }

  async loadExr(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.loaders.exrLoader.load(url, value => {
        resolve(value)
        this._onAfterLoad.call()
      }, undefined, reject)
      this._onAfterLoad.call()
    })
  }

  async load(url: `${string}.${GltfExtension}`): Promise<GLTF>
  async load(url: `${string}.${TextureExtension}`): Promise<Texture>
  async load(url: string): Promise<any> {
    const extension = url.split('.').pop()! as Extension

    if (isGltfExtension(extension)) {
      return this.loadGltf(url)
    }

    if (isTextureExtension(extension)) {
      return new Promise((resolve, reject) => {
        this.loaders.texture.load(url, value => {
          resolve(value)
          this._onAfterLoad.call()
        }, undefined, reject)
      })
    }

    throw new Error(`Unsupported extension: ${extension}`)
  }
}
