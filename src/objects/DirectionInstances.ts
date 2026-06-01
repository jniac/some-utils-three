import { CircleGeometry, ColorRepresentation, ConeGeometry, CylinderGeometry, Matrix4, RingGeometry, Vector3 } from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'

import { Vector3Declaration } from 'some-utils-ts/declaration'
import { fromVector3Declaration } from '../declaration'
import { AutoLitMaterial } from '../materials/auto-lit'
import { DynamicInstancedMesh } from './DynamicInstancedMesh'

function createDirectionGeometry({
  length = 1,
  tubeRadius = 0.02,
  arrowRadius = 0.06,
  arrowLength = 0.2,
  radialSegments = 16,
} = {}) {
  const ring = new RingGeometry(arrowRadius, tubeRadius, radialSegments)
    .rotateY(Math.PI / 2)
    .translate(length - arrowLength, 0, 0)
  ring.computeVertexNormals() // For some reason, RingGeometry doesn't compute vertex normals.
  return BufferGeometryUtils.mergeGeometries([
    new CylinderGeometry(tubeRadius, tubeRadius, length - arrowLength, radialSegments, 1, true)
      .rotateZ(Math.PI / 2)
      .translate((length - arrowLength) / 2, 0, 0),
    new ConeGeometry(arrowRadius, arrowLength, radialSegments, 1, true)
      .rotateZ(-Math.PI / 2)
      .translate(length - arrowLength / 2, 0, 0),
    ring,
    new CircleGeometry(tubeRadius, radialSegments)
      .rotateY(-Math.PI / 2),
  ])
}

export class DirectionInstances extends DynamicInstancedMesh {
  constructor() {
    super(createDirectionGeometry(), new AutoLitMaterial(), {
      initialCapacity: 256,
      enableColors: true,
    })
  }

  #addDirection_private = {
    o: new Vector3(),
    d: new Vector3(),
    n: new Vector3(), // normal
    bn: new Vector3(), // binormal
    m: new Matrix4(),
  }
  addDirection(origin: Vector3Declaration, direction: Vector3Declaration, {
    color = <ColorRepresentation | undefined>undefined,
    scale = 1,
  } = {}) {
    const { o, d, n, bn, m } = this.#addDirection_private
    fromVector3Declaration(origin, o)
    fromVector3Declaration(direction, d)
    const directionLength = d.length()

    if (directionLength === 0)
      return

    d.multiplyScalar(1 / directionLength)
    n.set(1, 0, 0).cross(d).normalize()
    bn.crossVectors(d, n).normalize()

    d.multiplyScalar(directionLength * scale)
    n.multiplyScalar(directionLength * scale)
    bn.multiplyScalar(directionLength * scale)

    m.makeBasis(d, n, bn).setPosition(o)

    this.addInstance(m, color)
  }
}
