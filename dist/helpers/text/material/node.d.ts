import { MeshBasicNodeMaterial } from 'three/webgpu';
import { TextHelperAtlas } from '../atlas';
import { TextUniforms } from './uniforms';
export declare function createTextNodeMaterial(uniforms: TextUniforms, atlas: TextHelperAtlas): MeshBasicNodeMaterial;
