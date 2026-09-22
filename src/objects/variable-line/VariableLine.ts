import { Camera, Mesh, Scene, Vector4, WebGLRenderer } from 'three'

import { VariableLineGeometry } from './VariableLineGeometry'
import { VariableLineMaterial } from './VariableLineMaterial'

/**
 * One instanced quad per segment.
 *
 * Picking is not implemented yet.
 */
export class VariableLine extends Mesh<
  VariableLineGeometry,
  VariableLineMaterial
> {
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
    this.customDepthMaterial = material.depthMaterial
    this.customDistanceMaterial = material.distanceMaterial
  }

  #updateCamera(camera: Camera, pixelRatio: number): void {
    const { uniforms } = this.material
    uniforms.uResolution.value.set(this.#viewport.z, this.#viewport.w)
    uniforms.uPixelRatio.value = pixelRatio
    uniforms.uCameraView.value.copy(camera.matrixWorldInverse)
    uniforms.uCameraProjection.value.copy(camera.projectionMatrix)
    uniforms.uCameraProjectionInverse.value.copy(camera.projectionMatrixInverse)
    uniforms.uCameraWorld.value.copy(camera.matrixWorld)
    this.material.uniformsNeedUpdate = true
  }

  override onBeforeRender(
    renderer: WebGLRenderer,
    _scene: Scene,
    camera: Camera,
  ): void {
    renderer.getCurrentViewport(this.#viewport)
    this.#updateCamera(
      camera,
      renderer.getRenderTarget() ? 1 : renderer.getPixelRatio(),
    )
    this.customDepthMaterial = this.material.depthMaterial
    this.customDistanceMaterial = this.material.distanceMaterial
  }

  override onBeforeShadow(
    renderer: WebGLRenderer,
    _object: unknown,
    camera: Camera,
  ): void {
    // Shadows render before the color pass. Use the main camera, never the light camera.
    // getCurrentViewport() here is the shadow-map viewport, so use the canvas viewport.
    renderer.getViewport(this.#viewport)
    const pixelRatio = renderer.getPixelRatio()
    this.#viewport.multiplyScalar(pixelRatio)
    this.#updateCamera(camera, pixelRatio)
    this.material.syncShadowDefines()
  }

  override raycast(): void {
    // Mesh.raycast would intersect the template quad, producing false hits.
  }
}
