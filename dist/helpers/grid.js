import { LineSegments, Vector3 } from 'three';
import { fromVector2Declaration } from '../declaration.js';
const defaultSimpleGridProps = {
    color: 'white',
    opacity: .5,
    plane: 'XY',
    size: [8, 8],
    step: 1,
    /**
     * Whether to draw a frame around the grid.
     */
    frame: true,
};
export class SimpleGridHelper extends LineSegments {
    constructor(props) {
        super();
        this.set(props ?? defaultSimpleGridProps);
    }
    set(props) {
        const { color, opacity, size: sizeArg, step: stepArg, frame, plane, } = { ...defaultSimpleGridProps, ...props };
        const size = fromVector2Declaration(sizeArg);
        const step = fromVector2Declaration(stepArg ?? size);
        const points = [];
        const push = (x, y) => points.push(new Vector3(x, y, 0));
        if (frame) {
            // top
            push(-size.x / 2, +size.y / 2);
            push(+size.x / 2, +size.y / 2);
            // right
            push(+size.x / 2, +size.y / 2);
            push(+size.x / 2, -size.y / 2);
            // bottom
            push(+size.x / 2, -size.y / 2);
            push(-size.x / 2, -size.y / 2);
            // left
            push(-size.x / 2, -size.y / 2);
            push(-size.x / 2, +size.y / 2);
        }
        let x = Math.ceil(-size.x / 2 / step.x) * step.x;
        // avoid double lines
        if (x === -size.x / 2) {
            x += step.x;
        }
        do {
            push(x, -size.y / 2);
            push(x, +size.y / 2);
            x += step.x;
        } while (x < size.x / 2);
        let y = Math.ceil(-size.y / 2 / step.y) * step.y;
        // avoid double lines
        if (y === -size.y / 2) {
            y += step.y;
        }
        do {
            push(-size.x / 2, y);
            push(+size.x / 2, y);
            y += step.y;
        } while (y < size.y / 2);
        this.geometry.setFromPoints(points);
        switch (plane) {
            case 'XZ': {
                this.geometry.rotateX(Math.PI / 2);
                break;
            }
            case 'YZ': {
                this.geometry.rotateY(Math.PI / 2);
                break;
            }
        }
        this.material.color.set(color);
        this.material.opacity = opacity;
        this.material.transparent = opacity < 1;
        return this;
    }
}
//# sourceMappingURL=grid.js.map