import { Group } from 'three';
import { fromVector3Declaration } from '../../declaration.js';
import { TextHelper } from '../text.js';
import { BaseManager } from './base.js';
import { LinesManager } from './lines.js';
import { PointsManager } from './points.js';
import { _v0 } from './shared.js';
const DEFAULT_TEXT_COUNT = 2000;
class TextsManager extends BaseManager {
    static createParts(options) {
        const textHelper = new TextHelper({
            textCount: DEFAULT_TEXT_COUNT,
            ...options,
        });
        return {
            count: textHelper.count,
            textHelper,
        };
    }
    state = { index: 0 };
    parts;
    constructor(options) {
        super();
        this.parts = TextsManager.createParts(options);
    }
    applyTransform(...transforms) {
        this.parts.textHelper.applyTransform(...transforms);
    }
    clear() {
        this.state.index = 0;
        this.parts.textHelper.clearAllText();
        return this;
    }
    onTop(renderOrder = 1000) {
        this.parts.textHelper.onTop(renderOrder);
        return this;
    }
    static textDefaults = {
        texts: ((i) => i.toString()),
    };
    texts(points, options) {
        let index = this.state.index;
        const { texts, ...rest } = { ...TextsManager.textDefaults, ...options };
        const textDelegate = typeof texts === 'function'
            ? texts
            : (i) => texts[i % texts.length];
        let i = 0;
        for (const p of points) {
            const { x, y, z } = fromVector3Declaration(p, _v0);
            this.parts.textHelper.setTextAt(index, textDelegate(i), {
                ...rest,
                x, y, z,
            });
            index++;
            i++;
        }
        this.state.index = index;
        return this;
    }
    text(p, text, options) {
        return this.texts([p], { ...options, texts: [text] });
    }
    textAt(index, text, options) {
        this.parts.textHelper.setTextAt(index, text, { ...options });
        return this;
    }
}
const defaultLinePointsOptions = {
    color: undefined,
    size: .1,
    shape: 'square',
    scale: 1,
};
class DebugHelper extends Group {
    static createParts(instance, options) {
        const { nodeMaterial } = options ?? {};
        const pointsManager = new PointsManager(options?.points);
        instance.add(pointsManager.parts.points);
        const linesManager = new LinesManager({ nodeMaterial, ...options?.lines });
        instance.add(linesManager.parts.lines);
        const textsManager = new TextsManager({ nodeMaterial, ...options?.texts });
        instance.add(textsManager.parts.textHelper);
        return {
            pointsManager,
            linesManager,
            textsManager,
        };
    }
    userData = { helper: true };
    parts;
    constructor(options) {
        super();
        this.parts = DebugHelper.createParts(this, options);
    }
    points(...args) {
        this.parts.pointsManager.points(...args);
        return this;
    }
    point(...args) {
        this.parts.pointsManager.point(...args);
        return this;
    }
    segments(...args) {
        this.parts.linesManager.segments(...args);
        return this;
    }
    line(...args) {
        this.parts.linesManager.line(...args);
        return this;
    }
    polyline(data, options) {
        this.parts.linesManager.polyline(data, options);
        if (options?.points) {
            this.points(data, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    polylines(data, options) {
        for (const d of data) {
            this.polyline(d, options);
        }
        return this;
    }
    polygon(polygonArg, options) {
        this.parts.linesManager.polygon(polygonArg, options);
        if (options?.points) {
            this.points(polygonArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    polygons(data, options) {
        for (const d of data) {
            this.polygon(d, options);
        }
        return this;
    }
    box(boxArg, options) {
        this.parts.linesManager.box(boxArg, options);
        if (options?.points) {
            this.parts.pointsManager.box(boxArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    circle(...args) {
        this.parts.linesManager.circle(...args);
        return this;
    }
    rect(...args) {
        this.parts.linesManager.rect(...args);
        return this;
    }
    regularGrid(...args) {
        this.parts.linesManager.regularGrid(...args);
        return this;
    }
    texts(...args) {
        this.parts.textsManager.texts(...args);
        return this;
    }
    text(...args) {
        this.parts.textsManager.text(...args);
        return this;
    }
    textAt(...args) {
        this.parts.textsManager.textAt(...args);
        return this;
    }
    applyTransform(...transforms) {
        this.parts.pointsManager.applyTransform(...transforms);
        this.parts.linesManager.applyTransform(...transforms);
        this.parts.textsManager.applyTransform(...transforms);
        return this;
    }
    clear() {
        this.parts.pointsManager.clear();
        this.parts.linesManager.clear();
        this.parts.textsManager.clear();
        return this;
    }
    onTop(renderOrder = 1000) {
        this.renderOrder = renderOrder;
        this.parts.pointsManager.onTop(renderOrder);
        this.parts.linesManager.onTop(renderOrder);
        this.parts.textsManager.onTop(renderOrder);
        return this;
    }
    globalExpose(name = 'debugHelper') {
        Object.assign(globalThis, { [name]: this });
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
}
/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
const debugHelper = new DebugHelper();
export { debugHelper, DebugHelper };
//# sourceMappingURL=debug-helper.js.map