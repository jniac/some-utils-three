import { BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments, Material, Vector2, Vector3 } from 'three'

import { fromVector2Declaration, Vector2Declaration } from 'some-utils-ts/declaration'

import sans1strokeJson from './sans-1-stroke.json'

const defaultPointsProps = {
  lineHeight: 32 / 24,
  height: Infinity,
  width: Infinity,
  align: <Vector2Declaration>.5,
}

const defaultHersheyLineProps = {
  color: <ColorRepresentation>'white',
  pivot: <Vector2Declaration>.5,
  size: 1,
  helper: <boolean | ColorRepresentation>false,
  helperOpacity: .1,
}

const _align = new Vector2()
export function getHersheyPoints(text: string, {
  lineHeight = 1.25,
  height = Infinity,
  width = Infinity,
  align = <Vector2Declaration>.5,
  size = 1,
} = {}) {
  const offset = new Vector3()
  const p1 = new Vector3()
  fromVector2Declaration(align, _align)

  let currentLineLength = 0
  let currentLineY = 0
  let currentCharOffset = 0
  let points = [] as Vector3[]
  const lines = [] as {
    lineLength: number
    points: Vector3[]
  }[]

  const newLine = () => {
    lines.push({
      lineLength: currentLineLength,
      points,
    })

    currentLineLength = 0
    currentLineY += -lineHeight * size

    offset.x = 0
    offset.y = currentLineY

    points = []
  }

  for (const char of text) {
    if (char === '\n') {
      newLine()
      continue
    }

    const charIndex = sans1strokeJson.alphabet.indexOf(char)
    if (charIndex === -1) {
      currentLineLength += 10 / 24 * size
      continue
    }

    const { d, o } = sans1strokeJson.chars[charIndex]
    currentCharOffset = o / 12 * size

    if (currentLineLength + currentCharOffset > width) {
      newLine()
    }

    offset.x = currentLineLength
    for (const token of d.split(' ')) {
      if (token[0] === 'M') {
        let [px, py] = token.slice(1).split(',').map(Number)
        px *= size / 24
        py *= size / 24
        py = -py
        p1.set(px, py, 0)
        continue
      }

      points.push(p1.clone().add(offset))
      let [px, py] = (token[0] === 'L' ? token.slice(1) : token).split(',').map(Number)
      px *= size / 24
      py *= size / 24
      py = -py
      p1.set(px, py, 0)
      points.push(p1.clone().add(offset))
    }

    currentLineLength += currentCharOffset
  }

  newLine()

  const textWidth = Math.max(...lines.map(l => l.lineLength))
  const textHeight = ((lines.length - 1) * lineHeight + 1) * size // last line counts as 1

  const refWidth = Number.isFinite(width) ? width : textWidth
  const refHeight = Number.isFinite(height) ? height : textHeight

  const oy = textHeight + (refHeight - textHeight) * _align.y
  for (const line of lines) {
    const ox = (refWidth - line.lineLength) * _align.x
    for (const point of line.points) {
      point.x += ox
      point.y += oy
    }
  }

  return {
    textWidth,
    textHeight,
    points: lines.map(l => l.points).flat(),
  }
}

function getHelperPoints({ width, height, size }: typeof defaultHersheyLineProps & typeof defaultPointsProps, textWidth: number, textHeight: number, pivotX: number, pivotY: number) {
  const points = [] as Vector3[]

  let A: Vector3, B: Vector3, C: Vector3, D: Vector3
  if (Number.isFinite(width) && Number.isFinite(height)) {
    A = new Vector3(0, 0, 0)
    B = new Vector3(width, 0, 0)
    C = new Vector3(width, height, 0)
    D = new Vector3(0, height, 0)
  } else {
    A = new Vector3(0, 0, 0)
    B = new Vector3(textWidth, 0, 0)
    C = new Vector3(textWidth, textHeight, 0)
    D = new Vector3(0, textHeight, 0)
  }

  for (const point of [A, B, C, D]) {
    point.x += pivotX
    point.y += pivotY
  }

  points.push(A, B, B, C, C, D, D, A)

  const d = .2 * size
  points.push(
    new Vector3(-d, -d, 0),
    new Vector3(+d, +d, 0),
    new Vector3(+d, -d, 0),
    new Vector3(-d, +d, 0),
  )

  return points
}

type HersheyLineProps = Partial<typeof defaultHersheyLineProps & typeof defaultPointsProps>

const _pivot = new Vector2()
/**
 * Usage: 
 * ```
 * const text = new HersheyLine('Hello,\nworld!\n123#!?', {
 *   width: 5.5,
 *   height: 6,
 *   align: [0, 1], // top-left
 *   pivot: [0, 1], // top-left
 *   helper: 'cyan'
 * })
 * ```
 */
export class HersheyText<TMaterial extends Material = LineBasicMaterial> extends LineSegments<BufferGeometry, TMaterial> {

  width: number
  height: number

  constructor(text: string, incomingProps?: HersheyLineProps, material?: TMaterial) {
    const props = { ...defaultHersheyLineProps, ...defaultPointsProps, ...incomingProps }
    const { points, textWidth, textHeight } = getHersheyPoints(text, props)
    fromVector2Declaration(props.pivot, _pivot)
    const width = Number.isFinite(props.width) ? props.width : textWidth
    const height = Number.isFinite(props.height) ? props.height : textHeight
    const px = _pivot.x * -width
    const py = _pivot.y * -height
    const geometry = new BufferGeometry().setFromPoints(points)
      .translate(px, py, 0)
    super(geometry, material ?? new LineBasicMaterial({ vertexColors: true }) as unknown as TMaterial)

    if (props.helper) {
      const points = getHelperPoints(props, textWidth, textHeight, px, py)
      const geometry = new BufferGeometry().setFromPoints(points)
      const color = typeof props.helper === 'boolean' ? 'white' : props.helper
      const gridMaterial = new LineBasicMaterial({ color, opacity: props.helperOpacity, transparent: props.helperOpacity < 1 })
      this.add(new LineSegments(geometry, gridMaterial))
    }

    this.width = width
    this.height = height
  }
}
