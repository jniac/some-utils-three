import { Texture } from 'three';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { Promisified } from 'some-utils-ts/misc/promisify';
import { DestroyableObject } from 'some-utils-ts/types';
declare const gltfExtensions: readonly ["gltf", "glb"];
type GltfExtension = typeof gltfExtensions[number];
declare const textureExtensions: readonly ["png", "jpg", "jpeg", "hdr", "exr"];
type TextureExtension = typeof textureExtensions[number];
export type TextureLoadResult<T> = {
    value: T;
    promise: Promise<T>;
};
/**
 * One loader to rule them all.
 *
 * TODO: Clean that up!!
 */
export declare class UnifiedLoader {
    private static nextId;
    private static instances;
    static current(): UnifiedLoader;
    static get(name: string): UnifiedLoader;
    id: number;
    readonly name: string;
    private loaders;
    constructor({ name }?: {
        name?: string;
    });
    path: string;
    setPath(path: string): void;
    private _onAfterLoad;
    onAfterLoad(listener: () => void): DestroyableObject;
    loadGltf(url: string): Promise<GLTF>;
    loadRgbe(url: string): Promise<Texture>;
    loadExr(url: string): Promise<import("three").DataTexture>;
    textureCache: Map<string, Promisified<Texture>>;
    loadTexture(url: string, onLoad?: (texture: Texture) => void): Promisified<Texture>;
    load(url: `${string}.${GltfExtension}`): Promise<GLTF>;
    load(url: `${string}.${TextureExtension}`): Promise<Texture>;
}
export {};
