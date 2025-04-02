import { MeshBasicMaterialParameters, MeshBasicNodeMaterial } from 'three/webgpu';
import { AutoLitOptions } from '../../tsl/utils';
export declare class NodeAutoLitMaterial extends MeshBasicNodeMaterial {
    constructor(parameters?: MeshBasicMaterialParameters & AutoLitOptions);
}
