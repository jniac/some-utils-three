import { MeshBasicNodeMaterial } from 'three/webgpu';
import { autoLit, autoLitOptionsDefaults } from '../../tsl/utils.js';
export class NodeAutoLitMaterial extends MeshBasicNodeMaterial {
    constructor(parameters) {
        const { color = 'white', emissive, shadowColor, power, ...rest } = { ...autoLitOptionsDefaults, ...parameters };
        super(rest);
        this.colorNode = autoLit(color, {
            emissive,
            shadowColor,
            power,
        });
    }
}
//# sourceMappingURL=auto-lit.js.map