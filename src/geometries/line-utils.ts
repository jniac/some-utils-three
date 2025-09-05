import { Vector3Declaration } from 'some-utils-ts/declaration'
import { BufferAttribute, BufferGeometry, Color, ColorRepresentation } from 'three'
import { fromVector3Declaration } from '../declaration'

export class LineGeometryUtils {
  static setColor<T extends BufferGeometry>(geometry: T, color: ColorRepresentation): T {
    const count = geometry.attributes.position.count
    const colorAttribute = new BufferAttribute(new Float32Array(count * 3), 3)
    const { r, g, b } = new Color(color)
    for (let i = 0; i < count; i++) {
      colorAttribute.setXYZ(i, r, g, b)
    }
    geometry.setAttribute('color', colorAttribute)
    return geometry
  }

  /**
   * Set geometry as a box line from min to max.
   * 
   * ```
   * // Example
   * const geometry = LineGeometryUtils.setAsBounds(null, 0, 1)
   * const material = new LineBasicMaterial({ color: 'yellow' })
   * const line = new LineSegments(geometry, material)
   * scene.add(line)
   * ```
   * 
   * @param geometry If null, a new BufferGeometry will be created.
   * @param min Minimum corner.
   * @param max Maximum corner.
   * @returns The geometry.
   */
  static setAsBounds<T extends BufferGeometry>(geometry: T | null, min: Vector3Declaration, max: Vector3Declaration): T {
    const { x: minx, y: miny, z: minz } = fromVector3Declaration(min)
    const { x: maxx, y: maxy, z: maxz } = fromVector3Declaration(max)
    const positions = new Float32Array([
      minx, miny, minz, maxx, miny, minz,
      maxx, miny, minz, maxx, maxy, minz,
      maxx, maxy, minz, minx, maxy, minz,
      minx, maxy, minz, minx, miny, minz,

      minx, miny, maxz, maxx, miny, maxz,
      maxx, miny, maxz, maxx, maxy, maxz,
      maxx, maxy, maxz, minx, maxy, maxz,
      minx, maxy, maxz, minx, miny, maxz,

      minx, miny, minz, minx, miny, maxz,
      maxx, miny, minz, maxx, miny, maxz,
      maxx, maxy, minz, maxx, maxy, maxz,
      minx, maxy, minz, minx, maxy, maxz,
    ])
    geometry ??= new BufferGeometry() as T
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
  }
}
