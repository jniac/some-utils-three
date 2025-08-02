import { Texture, TextureLoader } from 'three'
import { RGBELoader } from 'three/examples/jsm/Addons.js'

import { Promisified, promisify } from 'some-utils-ts/misc/promisify'

import { DisposableVideoTexture } from '../utils/texture/disposable-video-texture'

const extensions = {
  video:
    ['mp4', 'webm'] as const,
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

type VideoExtension = typeof extensions.video[number]
const isVideoExtension = (ext: string): ext is VideoExtension =>
  extensions.video.includes(ext as VideoExtension)

type TextureExtension = SRGBExtension | LinearExtension | VideoExtension
const isTextureExtension = (ext: string): ext is TextureExtension =>
  isSRGBExtension(ext) || isLinearExtension(ext)

function filenameFromUrl(url: string): string {
  return new URL(url, window.location.href).pathname.split('/').pop() || 'unknown'
}

class AnyLoader {
  #textureLoader: TextureLoader | null = null
  #rgbeLoader: RGBELoader | null = null

  /**
   * Loads a texture from a URL.
   * 
   * Features:
   * - Supports various texture formats (e.g., jpg, png, hdr, exr, webm, mp4).
   * - Automatically handles video textures with proper cleanup.
   * - Returns a "promisified" texture that can be used like a Promise AND a Texture.
   * - When video textures are loaded, it sets the width and height based on the video metadata.
   */
  loadTexture(url: string): Promisified<Texture> {
    const filename = filenameFromUrl(url)
    const extension = filename.match(/[^.]+$/)?.[0]

    if (extension === undefined)
      throw new Error(`No extension found in url: ${url}`)

    if (isVideoExtension(extension)) {
      const videoTexture = promisify(DisposableVideoTexture.fromUrl(url))
      videoTexture.video.onloadedmetadata = () => {
        videoTexture.image.width = videoTexture.video.videoWidth
        videoTexture.image.height = videoTexture.video.videoHeight
        videoTexture.resolve()
      }
      videoTexture.name = filename
      return videoTexture
    }

    const loader =
      isLinearExtension(extension)
        ? (this.#rgbeLoader ??= new RGBELoader())
        : (this.#textureLoader ??= new TextureLoader())

    let resolve: (texture: Texture) => void
    let reject: (error: Error) => void
    const texture = loader.load(url, texture => {
      texture.name = filename
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

