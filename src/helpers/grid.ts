import { BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments, Vector3 } from 'three'

import { fromVector2Declaration, Vector2Declaration } from '../declaration'

const defaultSimpleGridProps = {
  color: <ColorRepresentation>'white',
  opacity: .5,

  size: <Vector2Declaration>[8, 8],
  step: <Vector2Declaration | undefined>1,
  /**
   * Whether to draw a frame around the grid.
   */
  frame: true,
}

type SimpleGridProps = Partial<typeof defaultSimpleGridProps>

export class SimpleGridHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
  constructor(props?: SimpleGridProps) {
    super()
    this.set(props ?? defaultSimpleGridProps)
  }

  set(props: SimpleGridProps): this {
    const {
      color,
      opacity,
      size: sizeArg,
      step: stepArg,
      frame,
    } = { ...defaultSimpleGridProps, ...props }

    const size = fromVector2Declaration(sizeArg)
    const step = fromVector2Declaration(stepArg ?? size)

    const points = [] as Vector3[]
    const push = (x: number, y: number) => points.push(new Vector3(x, y, 0))

    if (frame) {
      // top
      push(-size.x / 2, +size.y / 2)
      push(+size.x / 2, +size.y / 2)
      // right
      push(+size.x / 2, +size.y / 2)
      push(+size.x / 2, -size.y / 2)
      // bottom
      push(+size.x / 2, -size.y / 2)
      push(-size.x / 2, -size.y / 2)
      // left
      push(-size.x / 2, -size.y / 2)
      push(-size.x / 2, +size.y / 2)
    }

    let x = Math.ceil(-size.x / 2 / step.x) * step.x
    // avoid double lines
    if (x === -size.x / 2) {
      x += step.x
    }
    do {
      push(x, -size.y / 2)
      push(x, +size.y / 2)
      x += step.x
    } while (x < size.x / 2)

    let y = Math.ceil(-size.y / 2 / step.y) * step.y
    // avoid double lines
    if (y === -size.y / 2) {
      y += step.y
    }
    do {
      push(-size.x / 2, y)
      push(+size.x / 2, y)
      y += step.y
    } while (y < size.y / 2)

    this.geometry.setFromPoints(points)

    this.material.color.set(color)
    this.material.opacity = opacity
    this.material.transparent = opacity < 1

    return this
  }
}