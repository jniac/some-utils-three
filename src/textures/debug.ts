import { CanvasTexture } from 'three'

const defaultOptions = {
  size: 2048,
  division: 8,
  yMode: 'up' as 'up' | 'down',
}

export class DebugTexture extends CanvasTexture {
  readonly options: typeof defaultOptions

  constructor(userOptions?: Partial<typeof defaultOptions>) {
    const options = { ...defaultOptions, ...userOptions }

    const canvas = document.createElement('canvas')
    canvas.width = options.size
    canvas.height = options.size
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, options.size, options.size)


    const yInvert = options.yMode === 'up'
    const step = options.size / options.division

    for (let i = 0; i <= options.division; i++) {
      const pos = i * step
      ctx.strokeStyle = '#0006'
      ctx.lineWidth = Math.ceil(.5 * options.size / 512)

      ctx.beginPath()
      ctx.moveTo((i + .5) * step, 0)
      ctx.lineTo((i + .5) * step, options.size)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, (i + .5) * step)
      ctx.lineTo(options.size, (i + .5) * step)
      ctx.stroke()


      ctx.strokeStyle = '#000'
      ctx.lineWidth = Math.ceil(2 * options.size / 512)
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, options.size)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(options.size, pos)
      ctx.stroke()

      for (let j = 0; j <= options.division; j++) {
        ctx.font = `${step / 4}px "Fira Code", monospace`
        ctx.fillStyle = '#000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const x = (i + .5) * step
        const y = (yInvert ? (options.division - j - .5) : (j + .5)) * step
        ctx.fillText(`${i},${j}`, x, y)
      }
    }

    // Draw circles in the center
    const center = options.size / 2
    ctx.strokeStyle = '#0006'
    ctx.lineWidth = Math.ceil(.5 * options.size / 512)
    for (let i = 1; i <= options.division; i++) {
      ctx.beginPath()
      ctx.arc(center, center, i * step / 2, 0, Math.PI * 2)
      ctx.stroke()
    }

    super(canvas)
    this.options = options
  }
}
