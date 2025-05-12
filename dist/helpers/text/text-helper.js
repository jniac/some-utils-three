import { InstancedMesh, Matrix4, PlaneGeometry } from 'three';
import { fromTransformDeclarations } from '../../declaration.js';
import { makeMatrix4 } from '../../utils/make.js';
import { TextHelperAtlas } from './atlas.js';
import { TextHelperData } from './data.js';
import { createTextNodeMaterial } from './material/node.js';
import { createTextUniforms } from './material/uniforms.js';
import { createWebglMaterial } from './material/webgl.js';
import { optionsDefaults } from './types.js';
import { getDataStringView } from './utils.js';
let nextId = 0;
export class TextHelper extends InstancedMesh {
    // Expose some statics
    static defaultOptions = optionsDefaults;
    static Atlas = TextHelperAtlas;
    static Data = TextHelperData;
    // Instance properties
    textHelperId = nextId++;
    options;
    derived;
    atlas;
    data;
    constructor(userOptions) {
        const options = { ...optionsDefaults, ...userOptions };
        const atlas = new TextHelperAtlas();
        const data = new TextHelperData(atlas.symbols, options.textCount, options.lineCount, options.lineLength);
        const uniforms = createTextUniforms(options, data, atlas);
        const planeSize = uniforms.uPlaneSize.value;
        const geometry = new PlaneGeometry(planeSize.width, planeSize.height);
        const material = options.nodeMaterial
            ? createTextNodeMaterial(uniforms, atlas)
            : createWebglMaterial(uniforms, atlas);
        super(geometry, material, options.textCount);
        this.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            uniforms.uCameraMatrix.value.copy(camera.matrixWorld);
        };
        // Frustum culling cannot be applied since each text position is defined into the data texture.
        this.frustumCulled = false;
        this.layers;
        this.options = options;
        this.atlas = atlas;
        this.data = data;
        this.derived = { planeSize };
    }
    /**
     * Apply a transform to all text instances (not the TextHelper itself).
     */
    applyTransform(...transforms) {
        const mt = fromTransformDeclarations(transforms);
        const mi = new Matrix4();
        const count = this.instanceMatrix.array.length;
        for (let i = 0; i < count; i += 16) {
            mi
                .fromArray(this.instanceMatrix.array, i)
                .multiply(mt)
                .toArray(this.instanceMatrix.array, i);
        }
        return this;
    }
    addTo(parent) {
        if (parent) {
            parent.add(this);
        }
        else {
            this.removeFromParent();
        }
        return this;
    }
    onTop(renderOrder = 1000) {
        if (renderOrder !== 0) {
            this.renderOrder = renderOrder;
            this.material.depthTest = false;
            this.material.depthWrite = false;
            this.material.transparent = true;
        }
        else {
            this.renderOrder = 0;
            this.material.depthTest = true;
            this.material.depthWrite = true;
            this.material.transparent = false;
        }
        return this;
    }
    setData(data) {
        this.data = data;
        return this;
    }
    clearAllText() {
        this.instanceMatrix.array.fill(0);
        this.instanceMatrix.needsUpdate = true;
        return this;
    }
    setTextAt(index, text, options = {}) {
        this.data.setTextAt(index, text, { ...this.options.textDefaults, ...options });
        this.setMatrixAt(index, makeMatrix4(options));
        this.instanceMatrix.needsUpdate = true;
        return this;
    }
    setColorAt(index, color) {
        this.data.setColorAt(index, { color });
    }
    setTextColorAt(index, options) {
        this.data.setColorAt(index, options);
        return this;
    }
    getDataStringView(start = 0, length = 3) {
        return getDataStringView(this.atlas, this.data.array, this.data.strideByteSize, this.options.lineCount, this.options.lineLength, start, length);
    }
}
//# sourceMappingURL=text-helper.js.map