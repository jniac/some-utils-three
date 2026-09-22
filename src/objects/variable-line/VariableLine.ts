import { Mesh, Vector4, WebGLRenderer } from 'three'

import { VariableLineGeometry } from './VariableLineGeometry'
import { VariableLineMaterial } from './VariableLineMaterial'

/** 
 * One instanced quad per segment. 
 * 
 * Picking is not implemented yet.
 */
export class VariableLine extends Mesh<VariableLineGeometry, VariableLineMaterial> {
  static Geometry = VariableLineGeometry
  static Material = VariableLineMaterial

  #viewport = new Vector4()

  constructor(
    geometry = new VariableLineGeometry(),
    material = new VariableLineMaterial(),
  ) {
    super(geometry, material)
    // Base quad bounds do not describe instanced endpoints or pixel-width caps.
    this.frustumCulled = false
  }

  override onBeforeRender(renderer: WebGLRenderer): void {
    renderer.getCurrentViewport(this.#viewport)
    const { uniforms } = this.material
    uniforms.uResolution.value.set(this.#viewport.z, this.#viewport.w)
    uniforms.uViewportOrigin.value.set(this.#viewport.x, this.#viewport.y)
    uniforms.uPixelRatio.value = renderer.getRenderTarget()
      ? 1
      : renderer.getPixelRatio()
  }

  override raycast(): void {
    // Mesh.raycast would intersect the template quad, producing false hits.
  }
}
