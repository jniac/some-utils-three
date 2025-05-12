import { TextureLoader } from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { promisify } from 'some-utils-ts/misc/promisify';
const gltfExtensions = ['gltf', 'glb'];
function isGltfExtension(extension) {
    return gltfExtensions.includes(extension);
}
const textureExtensions = ['png', 'jpg', 'jpeg', 'hdr', 'exr'];
function isTextureExtension(extension) {
    return textureExtensions.includes(extension);
}
class Callbacks {
    listeners = new Set();
    add(listener) {
        this.listeners.add(listener);
        const destroy = () => this.listeners.delete(listener);
        return { destroy };
    }
    call(...args) {
        for (const listener of this.listeners) {
            listener.apply(null, args);
        }
    }
}
/**
 * One loader to rule them all.
 *
 * TODO: Clean that up!!
 */
export class UnifiedLoader {
    static nextId = 0;
    static instances = [];
    static current() {
        return this.instances[this.instances.length - 1] ?? new UnifiedLoader();
    }
    static get(name) {
        return this.instances.find(instance => instance.name === name) ?? new UnifiedLoader({ name });
    }
    id = UnifiedLoader.nextId++;
    name;
    loaders = {
        gltf: new GLTFLoader(),
        texture: new TextureLoader(),
        rgbeLoader: new RGBELoader(),
        exrLoader: new EXRLoader(),
    };
    constructor({ name } = {}) {
        this.name = name ?? `UnifiedLoader-${this.id}`;
        UnifiedLoader.instances.push(this);
    }
    path = '';
    setPath(path) {
        this.path = path;
        // this.loaders.gltf.setPath(path)
        // this.loaders.texture.setPath(path)
        // this.loaders.rgbeLoader.setPath(path)
        // this.loaders.exrLoader.setPath(path)
    }
    _onAfterLoad = new Callbacks();
    onAfterLoad(listener) {
        return this._onAfterLoad.add(listener);
    }
    async loadGltf(url) {
        return new Promise((resolve, reject) => {
            this.loaders.gltf.load(url, value => {
                resolve(value);
                this._onAfterLoad.call();
            }, undefined, reject);
        });
    }
    async loadRgbe(url) {
        const texture = promisify(this.loaders.rgbeLoader.load(url, value => {
            texture.resolve();
            this._onAfterLoad.call();
        }, undefined, () => {
            console.log(`Failed to load RGBE: ${url}`);
        }));
        return texture;
    }
    async loadExr(url) {
        const texture = promisify(this.loaders.exrLoader.load(url, value => {
            texture.resolve();
            this._onAfterLoad.call();
        }, undefined, () => {
            console.log(`Failed to load EXR: ${url}`);
        }));
        return texture;
    }
    textureCache = new Map();
    loadTexture(url, onLoad) {
        const fullUrl = new URL(this.path + url, window.location.href).href;
        if (this.textureCache.has(fullUrl)) {
            const texture = this.textureCache.get(fullUrl);
            onLoad?.(texture);
            return texture;
        }
        const texture = promisify(this.loaders.texture.load(fullUrl, value => {
            this.textureCache.set(fullUrl, texture);
            onLoad?.(value);
            texture.resolve();
            this._onAfterLoad.call();
        }, undefined, () => {
            console.log(`Failed to load texture: ${fullUrl}`);
        }));
        return texture;
    }
    async load(url) {
        const extension = url.split('.').pop();
        if (isGltfExtension(extension)) {
            return this.loadGltf(url);
        }
        if (isTextureExtension(extension)) {
            let value;
            const promise = new Promise((resolve, reject) => {
                value = this.loaders.texture.load(url, value => {
                    resolve(value);
                    this._onAfterLoad.call();
                }, undefined, reject);
            });
            return promise;
        }
        throw new Error(`Unsupported extension: ${extension}`);
    }
}
//# sourceMappingURL=unified-loader.js.map