import { LineBasicNodeMaterial } from 'three/webgpu'

import { LineHelper } from '../line'

export class LineNodeHelper extends LineHelper<LineBasicNodeMaterial> {
  /**
   * @param reservePoints If you know the number of points that will be added, you can set this value to avoid to overallocate memory later.
   */
  constructor(reservePoints = -1, material = new LineBasicNodeMaterial({ vertexColors: true })) {
    super(reservePoints, material)
  }
}
