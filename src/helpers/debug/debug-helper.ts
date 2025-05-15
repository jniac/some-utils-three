import { ColorRepresentation, Group, Object3D } from 'three'

import { fromVector3Declaration, TransformDeclaration, Vector3Declaration } from '../../declaration'
import { SetTextOption, TextHelper } from '../text'
import { BaseManager } from './base'
import { LinesManager } from './lines'
import { PointsManager } from './points'
import { _v0 } from './shared'

const DEFAULT_TEXT_COUNT = 2000

class TextsManager extends BaseManager {
  static createParts(options?: ConstructorParameters<typeof TextHelper>[0]) {
    const textHelper = new TextHelper({
      textCount: DEFAULT_TEXT_COUNT,
      ...options,
    })
    return {
      count: textHelper.count,
      textHelper,
    }
  }

  state = { index: 0 }

  parts: ReturnType<typeof TextsManager.createParts>

  constructor(options?: Parameters<typeof TextsManager.createParts>[0]) {
    super()
    this.parts = TextsManager.createParts(options)
  }

  override applyTransform(...transforms: TransformDeclaration[]) {
    this.parts.textHelper.applyTransform(...transforms)
  }

  clear() {
    this.state.index = 0
    this.parts.textHelper.clearAllText()
    return this
  }

  onTop(renderOrder = 1000) {
    this.parts.textHelper.onTop(renderOrder)
    return this
  }

  static textDefaults = {
    texts: ((i: number) => i.toString()) as ((i: number) => string) | string[],
  }
  texts(
    points: Vector3Declaration[],
    options?: Partial<typeof TextsManager.textDefaults> & SetTextOption,
  ) {
    let index = this.state.index
    const { texts, ...rest } = { ...TextsManager.textDefaults, ...options }
    const textDelegate = typeof texts === 'function'
      ? texts
      : (i: number) => texts[i % texts.length]
    let i = 0
    for (const p of points) {
      const { x, y, z } = fromVector3Declaration(p, _v0)
      this.parts.textHelper.setTextAt(index, textDelegate(i), {
        ...rest,
        x, y, z,
      })
      index++
      i++
    }
    this.state.index = index
    return this
  }

  text(p: Vector3Declaration, text: string, options?: SetTextOption) {
    return this.texts([p], { ...options, texts: [text] })
  }

  textAt(index: number, text: string, options?: SetTextOption) {
    this.parts.textHelper.setTextAt(index, text, { ...options })
    return this
  }
}

const defaultLinePointsOptions = {
  color: undefined as ColorRepresentation | undefined,
  size: .1,
  shape: 'square' as keyof typeof PointsManager.shapes,
  scale: 1,
}

type LinePointsOptions = {
  points?: boolean | Partial<typeof defaultLinePointsOptions>
}

class DebugHelper extends Group {
  static createParts(instance: DebugHelper, options?: Partial<{
    nodeMaterial: boolean,
    texts: ConstructorParameters<typeof TextsManager>[0],
    lines: ConstructorParameters<typeof LinesManager>[0],
    points: ConstructorParameters<typeof PointsManager>[0],
  }>) {
    const { nodeMaterial } = options ?? {}
    const pointsManager = new PointsManager(options?.points)
    instance.add(pointsManager.parts.points)

    const linesManager = new LinesManager({ nodeMaterial, ...options?.lines })
    instance.add(linesManager.parts.lines)

    const textsManager = new TextsManager({ nodeMaterial, ...options?.texts })
    instance.add(textsManager.parts.textHelper)

    return {
      pointsManager,
      linesManager,
      textsManager,
    }
  }

  parts: ReturnType<typeof DebugHelper.createParts>

  constructor(options?: Parameters<typeof DebugHelper.createParts>[1]) {
    super()
    this.parts = DebugHelper.createParts(this, options)
  }

  points(...args: Parameters<PointsManager['points']>): this {
    this.parts.pointsManager.points(...args)
    return this
  }

  point(...args: Parameters<PointsManager['point']>): this {
    this.parts.pointsManager.point(...args)
    return this
  }

  segments(...args: Parameters<LinesManager['segments']>): this {
    this.parts.linesManager.segments(...args)
    return this
  }

  line(...args: Parameters<LinesManager['line']>): this {
    this.parts.linesManager.line(...args)
    return this
  }

  polyline(
    data: Parameters<LinesManager['polyline']>[0],
    options?: Parameters<LinesManager['polyline']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.polyline(data, options)
    if (options?.points) {
      this.points(data, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  polylines(
    data: Parameters<DebugHelper['polyline']>[0][],
    options?: Parameters<DebugHelper['polyline']>[1],
  ): this {
    for (const d of data) {
      this.polyline(d, options)
    }
    return this
  }

  polygon(
    polygonArg: Parameters<LinesManager['polygon']>[0],
    options?: Parameters<LinesManager['polygon']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.polygon(polygonArg, options)
    if (options?.points) {
      this.points(polygonArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  polygons(
    data: Parameters<DebugHelper['polygon']>[0][],
    options?: Parameters<DebugHelper['polygon']>[1],
  ): this {
    for (const d of data) {
      this.polygon(d, options)
    }
    return this
  }

  box(
    boxArg: Parameters<LinesManager['box']>[0],
    options?: Parameters<LinesManager['box']>[1] & LinePointsOptions,
  ): this {
    this.parts.linesManager.box(boxArg, options)
    if (options?.points) {
      this.parts.pointsManager.box(boxArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) })
    }
    return this
  }

  circle(...args: Parameters<LinesManager['circle']>): this {
    this.parts.linesManager.circle(...args)
    return this
  }

  rect(...args: Parameters<LinesManager['rect']>): this {
    this.parts.linesManager.rect(...args)
    return this
  }

  regularGrid(...args: Parameters<LinesManager['regularGrid']>): this {
    this.parts.linesManager.regularGrid(...args)
    return this
  }

  texts(...args: Parameters<TextsManager['texts']>): this {
    this.parts.textsManager.texts(...args)
    return this
  }

  text(...args: Parameters<TextsManager['text']>): this {
    this.parts.textsManager.text(...args)
    return this
  }

  textAt(...args: Parameters<TextsManager['textAt']>): this {
    this.parts.textsManager.textAt(...args)
    return this
  }

  applyTransform(...transforms: TransformDeclaration[]): this {
    this.parts.pointsManager.applyTransform(...transforms)
    this.parts.linesManager.applyTransform(...transforms)
    this.parts.textsManager.applyTransform(...transforms)
    return this
  }

  clear(): this {
    this.parts.pointsManager.clear()
    this.parts.linesManager.clear()
    this.parts.textsManager.clear()
    return this
  }

  onTop(renderOrder = 1000): this {
    this.renderOrder = renderOrder
    this.parts.pointsManager.onTop(renderOrder)
    this.parts.linesManager.onTop(renderOrder)
    this.parts.textsManager.onTop(renderOrder)
    return this
  }

  globalExpose(name = 'debugHelper'): this {
    Object.assign(globalThis, { [name]: this })
    return this
  }

  addTo(parent: Object3D | null): this {
    if (parent) {
      parent.add(this)
    } else {
      this.removeFromParent()
    }
    return this
  }
}

/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
const debugHelper = new DebugHelper()

export {
  debugHelper,
  DebugHelper
}

