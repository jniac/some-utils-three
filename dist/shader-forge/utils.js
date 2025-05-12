import { Color } from 'three';
const _color = new Color();
export function vec3(color) {
    const { r, g, b } = _color.set(color);
    return /* glsl */ `vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`;
}
//# sourceMappingURL=utils.js.map