import { BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments, Vector3 } from 'three'

import { fromVector2Declaration, Vector2Declaration } from '../declaration'

const defaultSimpleGridProps = {
  color: <ColorRepresentation>'white',
  size: <Vector2Declaration>[8, 8],
  divisions: <Vector2Declaration | undefined>undefined,
  align: <Vector2Declaration>[.5, .5],
  opacity: .5,
}

export class SimpleGridHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
  constructor(props?: Partial<typeof defaultSimpleGridProps>) {
    super()
    this.set(props ?? defaultSimpleGridProps)
  }

  set(props: Partial<typeof defaultSimpleGridProps>) {
    const {
      color,
      opacity,
      size: sizeArg,
      divisions: divisionsArg,
      align: alignArg,
    } = { ...defaultSimpleGridProps, ...props }

    const size = fromVector2Declaration(sizeArg)
    const divisions = fromVector2Declaration(divisionsArg ?? size)
    const align = fromVector2Declaration(alignArg)

    const points = [] as Vector3[]
    const push = (x: number, y: number) => points.push(new Vector3(x, y, 0))

    const alignX = (align.x + .5) * size.x
    const alignY = (align.y + .5) * size.y

    for (let i = 0; i <= divisions.x; i++) {
      const x = (i / divisions.x - align.x) * size.x
      push(x, alignY - size.y / 2)
      push(x, alignY + size.y / 2)
    }

    for (let i = 0; i <= divisions.y; i++) {
      const y = (i / divisions.y - align.y) * size.y
      push(alignX - size.x / 2, y)
      push(alignX + size.x / 2, y)
    }

    this.geometry.setFromPoints(points)

    this.material.color.set(color)
    this.material.opacity = opacity
    this.material.transparent = opacity < 1
  }
}