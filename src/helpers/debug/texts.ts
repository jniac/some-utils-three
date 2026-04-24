import { Matrix4 } from 'three'

import { fromVector3Declaration, TransformDeclaration, Vector3Declaration } from '../../declaration'
import { SetTextOption, TextHelper } from '../text'
import { BaseManager } from './base'
import { _v0 } from './shared'

const DEFAULT_TEXT_COUNT = 2000

export class TextsManager extends BaseManager {
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

  state = { index: 0 };

  parts: ReturnType<typeof TextsManager.createParts>

  constructor(options?: Parameters<typeof TextsManager.createParts>[0]) {
    super()
    this.parts = TextsManager.createParts(options)
  }

  override setTransformMatrix(matrix: Matrix4): this {
    this.parts.textHelper.setTransformMatrix(matrix)
    return this
  }

  override resetTransformMatrix(): this {
    this.parts.textHelper.resetTransformMatrix()
    return this
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
  };
  texts(
    points: Vector3Declaration[],
    options?: Partial<typeof TextsManager.textDefaults> & SetTextOption
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
