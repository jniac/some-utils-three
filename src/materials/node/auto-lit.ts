import { MeshBasicMaterialParameters, MeshBasicNodeMaterial } from 'three/webgpu'
import { autoLit, AutoLitOptions, autoLitOptionsDefaults } from '../../tsl/utils'

export class AutoLitNodeMaterial extends MeshBasicNodeMaterial {
  constructor(parameters?: MeshBasicMaterialParameters & AutoLitOptions) {
    const {
      color = 'white',
      emissive,
      shadowColor,
      power,
      sunDirection, // consume
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

export {
  /**
   * @deprecated Use `AutoLitNodeMaterial` instead.
   */
  AutoLitNodeMaterial as NodeAutoLitMaterial
}
