import { TextureLoader } from 'three';
const extensions = {
    srgb: ['jpg', 'jpeg', 'png', 'webp'],
    linear: ['hdr', 'exr'],
    gltf: ['gltf', 'glb'],
};
class AnyLoader {
    #textureLoader = null;
    loadTexture(url) {
        const loader = this.#textureLoader ??= new TextureLoader();
        let resolve;
        let reject;
        const texture = loader.load(url, texture => {
            unpromisified();
            resolve(texture);
        }, undefined, () => {
            unpromisified();
            const error = new Error(`Cannot load texture (NOT FOUND?): ${url}`);
            reject(error);
        });
        const promise = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });
        Object.assign(texture, {
            then: promise.then.bind(promise),
            catch: promise.catch.bind(promise),
            finally: promise.finally.bind(promise),
        });
        const unpromisified = () => {
            delete texture.then;
            delete texture.catch;
            delete texture.finally;
        };
        return texture;
    }
    load(url) {
        const extension = url.match(/[^.]+$/)?.[0];
        if (extension === undefined)
            throw new Error(`No extension found in url: ${url}`);
        if (extensions.srgb.includes(extension))
            return this.loadTexture(url);
        throw new Error(`Unsupported extension: ${url}`);
    }
}
const anyLoader = new AnyLoader();
export { anyLoader, AnyLoader };
//# sourceMappingURL=any-loader.js.map