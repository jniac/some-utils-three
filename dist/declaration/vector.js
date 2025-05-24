import { Vector2, Vector3, Vector4 } from 'three';
import * as agnostic from 'some-utils-ts/declaration';
function fromVector2Declaration(arg, out = new Vector2()) {
    return agnostic.fromVector2Declaration(arg, out);
}
function fromVector3Declaration(arg, out = new Vector3()) {
    return agnostic.fromVector3Declaration(arg, out);
}
function fromVector4Declaration(arg, out = new Vector4()) {
    return agnostic.fromVector4Declaration(arg, out);
}
export { fromVector2Declaration, fromVector3Declaration, fromVector4Declaration };
//# sourceMappingURL=vector.js.map