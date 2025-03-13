import { Texture } from 'three';
declare const extensions: {
    srgb: readonly ["jpg", "jpeg", "png", "webp"];
    linear: readonly ["hdr", "exr"];
    gltf: readonly ["gltf", "glb"];
};
type TextureExtension = typeof extensions.srgb[number] | typeof extensions.linear[number];
type Promisified<T> = T & Promise<T>;
declare class AnyLoader {
    #private;
    loadTexture(url: string): Promisified<Texture>;
    load(url: `${string}.${TextureExtension}`): ReturnType<typeof AnyLoader.prototype.loadTexture>;
}
declare const anyLoader: AnyLoader;
export { anyLoader, AnyLoader };
