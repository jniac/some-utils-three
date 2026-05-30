import { BufferGeometry, CylinderGeometry, SphereGeometry } from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'

import { axisColors } from '../objects/tools'
import { setVertexColors } from '../utils/geometry/vertex-colors'

export class RoundedAxesGeometry extends BufferGeometry {
  constructor() {
    super()

    const radius = .05
    const sphereRadius = radius * 2
    const radialSegments = 12

    const axisY = BufferGeometryUtils.mergeGeometries([
      new CylinderGeometry(radius, radius, 1, radialSegments, 1, true),
      new SphereGeometry(radius, radialSegments, radialSegments / 2, 0, Math.PI * 2, Math.PI / 2, Math.PI)
        .translate(0, -.5, 0),
      new SphereGeometry(sphereRadius, radialSegments, radialSegments / 2, 0, Math.PI * 2, 0, Math.PI * .765)
        .translate(0, .5, 0),
    ])

    const axisX = axisY.clone().rotateZ(-Math.PI / 2)
    const axisZ = axisY.clone().rotateX(Math.PI / 2)

    setVertexColors(axisX, axisColors.X)
    setVertexColors(axisY, axisColors.Y)
    setVertexColors(axisZ, axisColors.Z)

    this.copy(BufferGeometryUtils.mergeGeometries([
      axisX,
      axisY,
      axisZ,
    ]))
  }
}
