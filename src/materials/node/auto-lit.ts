import { MeshBasicMaterialParameters, MeshBasicNodeMaterial } from 'three/webgpu'
import { autoLit, AutoLitOptions, autoLitOptionsDefaults } from '../../tsl/utils'

export class NodeAutoLitMaterial extends MeshBasicNodeMaterial {
  constructor(parameters?: MeshBasicMaterialParameters & AutoLitOptions) {
    const {
      color = 'white',
      emissive,
      shadowColor,
      power,
      ...rest
    } = { ...autoLitOptionsDefaults, ...parameters }
    super(rest)
    this.colorNode = autoLit(color, {
      emissive,
      shadowColor,
      power,
    })
  }
}
