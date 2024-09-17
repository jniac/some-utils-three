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

export class UnifiedLoader {
  private loaders = {
    gltf: new GLTFLoader(),
    texture: new TextureLoader(),
    rgbeLoader: new RGBELoader(),
    exrLoader: new EXRLoader(),
  }

  async loadGltf(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loaders.gltf.load(url, resolve, undefined, reject)
    })
  }

  async loadRgbe(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.loaders.rgbeLoader.load(url, resolve, undefined, reject)
    })
  }

  async loadExr(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.loaders.exrLoader.load(url, resolve, undefined, reject)
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
        this.loaders.texture.load(url, resolve, undefined, reject)
      })
    }

    throw new Error(`Unsupported extension: ${extension}`)
  }
}
