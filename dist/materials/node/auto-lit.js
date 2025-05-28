import { MeshBasicNodeMaterial } from 'three/webgpu';
import { autoLit, autoLitOptionsDefaults } from '../../tsl/utils.js';
export class AutoLitNodeMaterial extends MeshBasicNodeMaterial {
    constructor(parameters) {
        const { color = 'white', emissive, shadowColor, power, sunDirection, // consume
        ...rest } = { ...autoLitOptionsDefaults, ...parameters };
        super(rest);
        this.colorNode = autoLit(color, {
            emissive,
            shadowColor,
            power,
        });
    }
}
export { 
/**
 * @deprecated Use `AutoLitNodeMaterial` instead.
 */
AutoLitNodeMaterial as NodeAutoLitMaterial };
//# sourceMappingURL=auto-lit.js.map