import { Euler, Quaternion, Vector3 } from 'three';
function doLerpQTransforms(a, b, t, out) {
    out.position.lerpVectors(a.position, b.position, t);
    out.rotation.slerpQuaternions(a.rotation, b.rotation, t);
    out.scale.lerpVectors(a.scale, b.scale, t);
    out.visible = t < .5 ? a.visible : b.visible;
}
class QTransform {
    position = new Vector3();
    rotation = new Quaternion();
    scale = new Vector3(1, 1, 1);
    visible = undefined;
    getEuler(out = new Euler()) {
        return out.setFromQuaternion(this.rotation);
    }
    get euler() {
        return this.getEuler();
    }
    set euler(value) {
        this.rotation.setFromEuler(value);
    }
    lerp(b, t) {
        doLerpQTransforms(this, b, t, this);
        return this;
    }
    lerpQTransforms(a, b, t) {
        doLerpQTransforms(a, b, t, this);
        return this;
    }
    applyToMatrix4(out) {
        const { position, rotation, scale } = this;
        return out.compose(position, rotation, scale);
    }
}
//# sourceMappingURL=q-transform.js.map