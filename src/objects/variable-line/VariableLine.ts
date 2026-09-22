import { Mesh, Vector4, WebGLRenderer } from 'three'

import { VariableLineGeometry } from './VariableLineGeometry'
import { VariableLineMaterial } from './VariableLineMaterial'

/** One instanced quad per segment. Picking is not implemented. */
export class VariableLine extends Mesh<VariableLineGeometry, VariableLineMaterial> {
  private readonly viewport = new Vector4()

  constructor(
    geometry = new VariableLineGeometry(),
    material = new VariableLineMaterial(),
  ) {
    super(geometry, material)
    // Base quad bounds do not describe instanced endpoints or pixel-width caps.
    this.frustumCulled = false
  }

  override onBeforeRender(renderer: WebGLRenderer): void {
    renderer.getCurrentViewport(this.viewport)
    const { uniforms } = this.material
    uniforms.resolution.value.set(this.viewport.z, this.viewport.w)
    uniforms.viewportOrigin.value.set(this.viewport.x, this.viewport.y)
    uniforms.pixelRatio.value = renderer.getRenderTarget()
      ? 1
      : renderer.getPixelRatio()
  }

  override raycast(): void {
    // Mesh.raycast would intersect the template quad, producing false hits.
  }
}
