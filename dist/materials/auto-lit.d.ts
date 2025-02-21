import { MeshBasicMaterial, MeshBasicMaterialParameters, Vector3 } from 'three';
declare const defaultOptions: {
    luminosity: number;
};
type Options = Partial<typeof defaultOptions> & MeshBasicMaterialParameters;
/**
 * A simple shader material that uses vertex colors and a simple lighting model.
 */
export declare class AutoLitMaterial extends MeshBasicMaterial {
    sunPosition: Vector3;
    constructor(options?: Options);
}
export {};
