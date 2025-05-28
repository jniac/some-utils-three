import { MeshBasicMaterialParameters, MeshBasicNodeMaterial } from 'three/webgpu';
import { AutoLitOptions } from '../../tsl/utils';
export declare class AutoLitNodeMaterial extends MeshBasicNodeMaterial {
    constructor(parameters?: MeshBasicMaterialParameters & AutoLitOptions);
}
export { 
/**
 * @deprecated Use `AutoLitNodeMaterial` instead.
 */
AutoLitNodeMaterial as NodeAutoLitMaterial };
//# sourceMappingURL=auto-lit.d.ts.map