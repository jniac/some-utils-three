import { Texture, TextureLoader } from 'three'

const extensions = {
  srgb:
    ['jpg', 'jpeg', 'png', 'webp'] as const,
  linear:
    ['hdr', 'exr'] as const,
  gltf:
    ['gltf', 'glb'] as const,
}

type TextureExtension = typeof extensions.srgb[number] | typeof extensions.linear[number]

type Promisified<T> = T & Promise<T>

class AnyLoader {
  #textureLoader: TextureLoader | null = null
  loadTexture(url: string): Promisified<Texture> {
    const loader = this.#textureLoader ??= new TextureLoader()
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

    if (extensions.srgb.includes(extension as any))
      return this.loadTexture(url)

    throw new Error(`Unsupported extension: ${url}`)
  }
}

const anyLoader = new AnyLoader()

export {
  anyLoader,
  AnyLoader
}

