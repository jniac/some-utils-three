import { VideoTexture } from 'three'

export class DisposableVideoTexture extends VideoTexture {
  video: HTMLVideoElement
  #disposed: boolean

  constructor(video: HTMLVideoElement) {
    super(video)
    this.video = video
    this.#disposed = false
  }

  dispose() {
    if (this.#disposed)
      return

    super.dispose()

    this.#disposed = true

    if (this.video) {
      this.video.pause()
      this.video.src = ''
      if (this.video.parentNode) {
        this.video.parentNode.removeChild(this.video)
      }
      this.video = null!
    }
  }

  static fromUrl(url: string, { loop = true, autoplay = true, muted = true } = {}) {
    const video = document.createElement('video')
    video.src = url
    video.loop = loop
    video.autoplay = autoplay
    video.muted = muted
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.play()
    return new DisposableVideoTexture(video)
  }
}