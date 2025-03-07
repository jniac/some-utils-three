import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { handleAnyUserInteraction } from 'some-utils-dom/handle/any-user-interaction';
import { destroy } from 'some-utils-ts/misc/destroy';
import { Ticker } from 'some-utils-ts/ticker';
import { fromVector3Declaration } from 'xxx';
import { UnifiedLoader } from 'xxx';
import { Pointer, PointerButton } from 'xxx';
import { BasicPipeline } from 'xxx';
/**
 * A context that provides a WebGLRenderer, a Scene, a Camera, and a Ticker.
 */
export class ThreeWebglContext {
    static instances = [];
    static current() {
        return this.instances[this.instances.length - 1];
    }
    width = 300;
    height = 150;
    pixelRatio = 1;
    renderer = new WebGLRenderer();
    perspectiveCamera = new PerspectiveCamera();
    orhtographicCamera = new PerspectiveCamera();
    scene = new Scene();
    gizmoScene = new Scene();
    pointer = new Pointer();
    // NOTE: The ticker is not explicitly created, but rather is require through a
    // name ("three"). This is to allow the user to use the same ticker, even before
    // it is eventually created here.
    ticker = Ticker.get('three').set({ minActiveDuration: 8 });
    pipeline = new BasicPipeline(this.renderer, this.scene, this.gizmoScene, this.perspectiveCamera);
    /** The current camera (perspective or ortho). */
    camera = this.perspectiveCamera;
    internal = {
        size: new Vector2(),
        fullSize: new Vector2(),
        destroyables: [],
        orbitControls: null,
    };
    // Accessors:
    get aspect() {
        return this.width / this.height;
    }
    get size() {
        return this.internal.size.set(this.width, this.height);
    }
    get fullSize() {
        return this.internal.fullSize.set(this.width * this.pixelRatio, this.height * this.pixelRatio);
    }
    onTick = this.ticker.onTick.bind(this.ticker);
    onDestroy = this.internal.destroyables.push.bind(this.internal.destroyables);
    // NOTE: Same as the ticker, the loader is not explicitly created, but rather is
    // required through a name ("three"). This is to allow the user to use the same
    // loader, even before it is eventually created here.
    loader = UnifiedLoader.get('three');
    constructor() {
        this.camera.position.set(0, 1, 10);
        this.camera.lookAt(0, 0, 0);
        ThreeWebglContext.instances.push(this);
    }
    setScene(scene) {
        this.scene = scene;
        // this.pipeline.setScene(scene)
    }
    useOrbitControls({ position = null, target = null, element = null, } = {}) {
        this.internal.orbitControls ??= new OrbitControls(this.camera, this.renderer.domElement);
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element && element !== this.internal.orbitControls.domElement) {
            this.internal.orbitControls.dispose();
            this.internal.orbitControls = new OrbitControls(this.camera, element);
        }
        if (position) {
            fromVector3Declaration(position, this.internal.orbitControls.object.position);
        }
        if (target) {
            fromVector3Declaration(target, this.internal.orbitControls.target);
        }
        this.internal.orbitControls.update();
        return this.internal.orbitControls;
    }
    initialized = false;
    initialize(domContainer) {
        if (this.initialized) {
            console.warn('ThreeWebglContext is already initialized.');
            return this;
        }
        Object.defineProperty(this, 'initialized', { value: true, writable: false, configurable: false, enumerable: false });
        const { onDestroy } = this;
        domContainer.appendChild(this.renderer.domElement);
        // Resize
        const resize = () => {
            this.setSize({
                width: domContainer.clientWidth,
                height: domContainer.clientHeight,
                pixelRatio: window.devicePixelRatio,
            });
        };
        const observer = new ResizeObserver(resize);
        observer.observe(domContainer);
        onDestroy(() => {
            observer.disconnect();
        });
        resize();
        // Pointer
        const onPointerMove = (event) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.update(this.camera, { x: event.clientX, y: event.clientY }, rect);
        };
        const onPointerDown = (event) => {
            this.pointer.status.button |= PointerButton.LeftDown;
        };
        const onPointerUp = (event) => {
            this.pointer.status.button &= ~PointerButton.LeftDown;
        };
        domContainer.addEventListener('pointermove', onPointerMove);
        domContainer.addEventListener('pointerdown', onPointerDown);
        domContainer.addEventListener('pointerup', onPointerUp);
        onDestroy(() => {
            domContainer.removeEventListener('pointermove', onPointerMove);
            domContainer.removeEventListener('pointerdown', onPointerDown);
            domContainer.removeEventListener('pointerup', onPointerUp);
        });
        // Tick
        onDestroy(handleAnyUserInteraction(this.ticker.requestActivation), this.ticker.onTick(this.update));
        // Orbit controls
        onDestroy(() => {
            this.internal.orbitControls?.dispose();
        });
        return this;
    }
    destroyed = false;
    destroy = () => {
        if (this.destroyed) {
            console.warn('ThreeWebglContext is already destroyed.');
            return;
        }
        Object.defineProperty(this, 'destroyed', { value: true, writable: false, configurable: false, enumerable: false });
        destroy(this.internal.destroyables);
        this.internal.destroyables = [];
        this.renderer.dispose();
    };
    setSize(size) {
        const { width: newWidth, height: newHeight, pixelRatio: newPixelRatio } = { ...this, ...size };
        if (newWidth === this.width && newHeight === this.height && newPixelRatio === this.pixelRatio) {
            return this;
        }
        this.width = newWidth;
        this.height = newHeight;
        this.pixelRatio = newPixelRatio;
        const { renderer, perspectiveCamera, pipeline } = this;
        renderer.setSize(newWidth, newHeight);
        renderer.setPixelRatio(newPixelRatio);
        pipeline.setSize(newWidth, newHeight, newPixelRatio);
        const aspect = newWidth / newHeight;
        perspectiveCamera.aspect = aspect;
        perspectiveCamera.updateProjectionMatrix();
        return this;
    }
    update = (tick) => {
        this.internal.orbitControls?.update(tick.deltaTime);
        this.pipeline.render(tick);
    };
    *findAll(query) {
        const findDelegate = typeof query === 'string' ? (object) => object.name === query :
            query instanceof RegExp ? (object) => query.test(object.name) :
                query;
        const queue = [this.scene];
        while (queue.length > 0) {
            const object = queue.shift();
            if (findDelegate(object)) {
                yield object;
            }
            queue.push(...object.children);
        }
    }
    find(query) {
        for (const object of this.findAll(query)) {
            return object;
        }
        return null;
    }
    isPartOfScene(object) {
        let current = object;
        while (current) {
            if (current === this.scene) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
}
