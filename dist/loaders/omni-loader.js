import { TextureLoader } from 'three';
const extensions = {
    srgb: ['jpg', 'jpeg', 'png', 'webp'],
    linear: ['hdr', 'exr'],
    gltf: ['gltf', 'glb'],
};
class OmniLoader {
    #textureLoader = null;
    loadTexture(url) {
        const loader = this.#textureLoader ??= new TextureLoader();
        return new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
        });
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
const instance = new OmniLoader();
export { instance as OmniLoader };
