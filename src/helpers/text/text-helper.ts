import { BufferGeometry, Color, InstancedMesh, Material, Matrix4, Object3D, PlaneGeometry, Vector2 } from 'three'

import { fromTransformDeclarations, TransformDeclaration } from '../../declaration'
import { makeMatrix4 } from '../../utils/make'

import { TextHelperAtlas } from './atlas'
import { TextHelperData } from './data'
import { createTextNodeMaterial } from './material/node'
import { createTextUniforms } from './material/uniforms'
import { createWebglMaterial } from './material/webgl'
import { optionsDefaults, SetColorOptions, SetTextOption } from './types'
import { getDataStringView } from './utils'

let nextId = 0
export class TextHelper extends InstancedMesh<BufferGeometry, Material> {
  // Expose some statics
  static readonly defaultOptions = optionsDefaults
  static readonly Atlas = TextHelperAtlas
  static readonly Data = TextHelperData

  // Instance properties
  readonly textHelperId = nextId++
  readonly options: typeof optionsDefaults
  readonly derived: {
    planeSize: Vector2
  }

  atlas: TextHelperAtlas
  data: TextHelperData

  transformMatrix = new Matrix4()

  setTransformMatrix(matrix: Matrix4): this {
    this.transformMatrix.copy(matrix)
    return this
  }

  resetTransformMatrix(): this {
    this.transformMatrix.identity()
    return this
  }

  constructor(userOptions?: Partial<typeof optionsDefaults>) {
    const options = { ...optionsDefaults, ...userOptions }
    const atlas = new TextHelperAtlas()
    const data = new TextHelperData(atlas.symbols, options.textCount, options.lineCount, options.lineLength)
    const uniforms = createTextUniforms(options, data, atlas)

    const planeSize = uniforms.uPlaneSize.value
    const geometry = new PlaneGeometry(planeSize.width, planeSize.height)

    const material = options.nodeMaterial
      ? createTextNodeMaterial(uniforms, atlas)
      : createWebglMaterial(uniforms, atlas)
    super(geometry, material, options.textCount)

    this.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      uniforms.uCameraMatrix.value.copy(camera.matrixWorld)
    }

    // Frustum culling cannot be applied since each text position is defined into the data texture.
    this.frustumCulled = false
    this.layers

    this.options = options
    this.atlas = atlas
    this.data = data
    this.derived = { planeSize }
  }

  /**
   * Apply a transform to all text instances (not the TextHelper itself).
   */
  applyTransform(...transforms: TransformDeclaration[]) {
    const mt = fromTransformDeclarations(transforms)
    const mi = new Matrix4()
    const count = this.instanceMatrix.array.length
    for (let i = 0; i < count; i += 16) {
      mi
        .fromArray(this.instanceMatrix.array, i)
        .multiply(mt)
        .toArray(this.instanceMatrix.array, i)
    }
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

  onTop(renderOrder = 1000) {
    if (renderOrder !== 0) {
      this.renderOrder = renderOrder
      this.material.depthTest = false
      this.material.depthWrite = false
      this.material.transparent = true
    } else {
      this.renderOrder = 0
      this.material.depthTest = true
      this.material.depthWrite = true
      this.material.transparent = false
    }
    return this
  }

  setData(data: TextHelperData) {
    this.data = data
    return this
  }

  clearAllText() {
    this.instanceMatrix.array.fill(0)
    this.instanceMatrix.needsUpdate = true
    return this
  }

  setTextAt(index: number, text: string, options: SetTextOption = {}) {
    this.data.setTextAt(index, text, { ...this.options.textDefaults, ...options })

    this.setMatrixAt(index, makeMatrix4(options).premultiply(this.transformMatrix))
    this.instanceMatrix.needsUpdate = true

    return this
  }

  override setColorAt(index: number, color: Color): void {
    this.data.setColorAt(index, { color })
  }

  setTextColorAt(index: number, options: SetColorOptions): this {
    this.data.setColorAt(index, options)
    return this
  }

  getDataStringView(start = 0, length = 3) {
    return getDataStringView(
      this.atlas,
      this.data.array,
      this.data.strideByteSize,
      this.options.lineCount,
      this.options.lineLength,
      start,
      length,
    )
  }
}
