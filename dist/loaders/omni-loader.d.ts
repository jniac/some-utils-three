import { Texture } from 'three';
declare const extensions: {
    srgb: readonly ["jpg", "jpeg", "png", "webp"];
    linear: readonly ["hdr", "exr"];
    gltf: readonly ["gltf", "glb"];
};
declare class OmniLoader {
    #private;
    loadTexture(url: string): Promise<Texture>;
    load(url: `${string}.${(typeof extensions.srgb)[number]}`): Promise<Texture>;
}
declare const instance: OmniLoader;
export { instance as OmniLoader };
