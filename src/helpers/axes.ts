import { BufferGeometry, Mesh } from 'three'

import { AxesGeometry } from '../geometries/axis'
import { AutoLitMaterial } from '../materials/auto-lit'

type AxesPreset =
  | `fat`
  | `fat(${number})`

type AxesOptions = ConstructorParameters<typeof AxesGeometry>[0]

type Options =
  | number
  | AxesOptions
  | AxesPreset

function parseOptions(options: Options): [size: number, axesOptions: AxesOptions] {
  if (typeof options === 'number')
    return [options, {}]

  if (typeof options === 'object')
    return [1, options]

  if (typeof options === 'string') {
    const name = options.match(/^\w+/)![0]
    const size = Number(options.match(/\(([^)]+)\)/)?.[1] ?? 1)
    switch (name) {
      case 'fat':
        return [size, { radius: .08, coneRatio: .4 }]
      default:
        throw new Error(`Unknown Axes preset name: ${name}`)
    }
  }

  throw new Error(`Invalid Axes options: ${options}`)
}

export class AxesHelper extends Mesh<BufferGeometry, AutoLitMaterial> {
  constructor(size: number)
  constructor(axesOptions: AxesOptions)
  constructor(preset: AxesPreset)
  constructor(options: Options = 1) {
    const [size, axesOptions] = parseOptions(options)
    super(
      new AxesGeometry(axesOptions).scale(size, size, size),
      new AutoLitMaterial({ vertexColors: true }),
    )
  }
}