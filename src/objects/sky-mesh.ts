import { BackSide, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshBasicMaterialParameters, PerspectiveCamera } from 'three'

const geometry = new IcosahedronGeometry(1, 4)

export class SkyMesh extends Mesh {
  constructor(props?: MeshBasicMaterialParameters) {
    const material = new MeshBasicMaterial({
      color: '#0c529d',
      ...props,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
    })

    super(geometry, material)

    this.renderOrder = -1
    this.frustumCulled = false
    this.matrixAutoUpdate = false

    this.onBeforeRender = (renderer, scene, camera) => {
      const scale = ((camera as PerspectiveCamera).near + (camera as PerspectiveCamera).far) / 2
      this.position.copy(camera.position)
      this.scale.setScalar(scale)
      this.updateMatrix()
      this.updateMatrixWorld()
    }
  }
}
