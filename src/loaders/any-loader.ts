import { Texture, TextureLoader } from 'three'
import { RGBELoader } from 'three/examples/jsm/Addons.js'

const extensions = {
  srgb:
    ['jpg', 'jpeg', 'png', 'webp'] as const,
  linear:
    ['hdr', 'exr'] as const,
  gltf:
    ['gltf', 'glb'] as const,
}

type SRGBExtension = typeof extensions.srgb[number]
const isSRGBExtension = (ext: string): ext is SRGBExtension =>
  extensions.srgb.includes(ext as SRGBExtension)

type LinearExtension = typeof extensions.linear[number]
const isLinearExtension = (ext: string): ext is LinearExtension =>
  extensions.linear.includes(ext as LinearExtension)

type TextureExtension = SRGBExtension | LinearExtension
const isTextureExtension = (ext: string): ext is TextureExtension =>
  isSRGBExtension(ext) || isLinearExtension(ext)

type Promisified<T> = T & Promise<T>

class AnyLoader {
  #textureLoader: TextureLoader | null = null
  #rgbeLoader: RGBELoader | null = null

  loadTexture(url: string): Promisified<Texture> {
    const extension = url.match(/[^.]+$/)?.[0]

    if (extension === undefined)
      throw new Error(`No extension found in url: ${url}`)

    const loader =
      isLinearExtension(extension)
        ? (this.#rgbeLoader ??= new RGBELoader())
        : (this.#textureLoader ??= new TextureLoader())

    let resolve: (texture: Texture) => void
    let reject: (error: Error) => void
    const texture = loader.load(url, texture => {
      unpromisified()
      resolve(texture)
    }, undefined, () => {
      unpromisified()
      const error = new Error(`Cannot load texture (NOT FOUND?): ${url}`)
      reject(error)
    })
    const promise = new Promise<Texture>((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })
    Object.assign(texture, {
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
    })
    const unpromisified = () => {
      delete (texture as any).then
      delete (texture as any).catch
      delete (texture as any).finally
    }
    return texture as any
  }

  load(url: `${string}.${TextureExtension}`): ReturnType<typeof AnyLoader.prototype.loadTexture>
  load(url: string) {
    const extension = url.match(/[^.]+$/)?.[0]

    if (extension === undefined)
      throw new Error(`No extension found in url: ${url}`)

    if (isTextureExtension(extension))
      return this.loadTexture(url)

    throw new Error(`Unsupported extension: ${url}`)
  }
}

const anyLoader = new AnyLoader()

export {
  anyLoader,
  AnyLoader
}

