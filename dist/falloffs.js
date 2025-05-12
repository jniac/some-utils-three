import { BufferGeometry, Group, Line, LineBasicMaterial, Vector3 } from 'three';
const material = new LineBasicMaterial({
    color: 'white',
    transparent: true,
    depthTest: false,
});
const geometries = {
    circle: (() => {
        const subdivisions = 80;
        const geometry = new BufferGeometry();
        const points = Array.from({ length: subdivisions + 1 }, (_, i) => {
            const a = i / subdivisions * Math.PI * 2;
            return new Vector3(Math.cos(a), Math.sin(a), 0);
        });
        geometry.setFromPoints(points);
        return geometry;
    })(),
    box2: (() => {
        const geometry = new BufferGeometry();
        const extent = .5;
        const points = [
            new Vector3(-extent, -extent, 0),
            new Vector3(+extent, -extent, 0),
            new Vector3(+extent, +extent, 0),
            new Vector3(-extent, +extent, 0),
            new Vector3(-extent, -extent, 0),
        ];
        geometry.setFromPoints(points);
        return geometry;
    })(),
};
class AbstractFalloff extends Group {
    props;
    setupUniforms({ value: matrix }, { value: vector }) {
        matrix.copy(this.matrixWorld);
        matrix.invert();
    }
    init(props) {
        this.props = props;
        this.renderOrder = 1; // Transparent + renderOrder: Gives a chance to render after all other objects.
    }
    setup() { }
    set(props) {
        Object.assign(this.props, props);
        this.setup();
    }
}
const defaultCircleFalloffProps = {
    radius: 2,
    falloff: 1,
};
export class CircleFalloff extends AbstractFalloff {
    static glsl = /* glsl */ `
    struct CircleFalloff {
      mat4 matrix;
      float radius;
      float falloff;
    };
    float falloff(CircleFalloff falloff, vec3 p) {
      p = (falloff.matrix * vec4(p, 1.0)).xyz;
      float d = length(p);
      return 1.0 - (d - falloff.radius) / falloff.falloff;
    }
  `;
    parts = {
        circle0: new Line(geometries.circle, material),
        circle1: new Line(geometries.circle, material),
    };
    get radius() { return this.props.radius; }
    set radius(value) {
        this.props.radius = value;
        this.setup();
    }
    get falloff() { return this.props.falloff; }
    set falloff(value) {
        this.props.falloff = value;
        this.setup();
    }
    constructor(props) {
        super();
        this.init({ ...defaultCircleFalloffProps, ...props });
        this.add(this.parts.circle0);
        this.add(this.parts.circle1);
        this.setup();
    }
    setupUniforms(matrix, vector) {
        super.setupUniforms(matrix, vector);
        const { radius, falloff } = this.props;
        vector.value.set(radius, falloff, 0, 0);
    }
    setup() {
        const { circle0, circle1 } = this.parts;
        const { radius, falloff } = this.props;
        circle0.scale.setScalar(radius);
        circle1.scale.setScalar(radius + falloff);
    }
}
const defaultManhattanBox2FalloffProps = {
    width: 1,
    height: 1,
    falloff: 1,
};
export class ManhattanBox2Falloff extends AbstractFalloff {
    static glsl = /* glsl */ `
    struct ManhattanBox2Falloff {
      mat4 matrix;
      float width;
      float height;
      float falloff;
    };
    float falloff(ManhattanBox2Falloff falloff, vec3 p) {
      p = (falloff.matrix * vec4(p, 1.0)).xyz;
      float x = abs(p.x) - falloff.width * 0.5;
      float y = abs(p.y) - falloff.height * 0.5;
      return 1.0 - max(x, y) / falloff.falloff;
    }
  `;
    parts = {
        box0: new Line(geometries.box2, material),
        box1: new Line(geometries.box2, material),
    };
    constructor(props) {
        super();
        this.init({ ...defaultManhattanBox2FalloffProps, ...props });
        this.add(this.parts.box0);
        this.add(this.parts.box1);
        this.setup();
    }
    setupUniforms(matrix, vector) {
        super.setupUniforms(matrix, vector);
        const { width, height, falloff } = this.props;
        vector.value.set(width, height, falloff, 0);
    }
    setup() {
        const { box0, box1 } = this.parts;
        const { width, height, falloff } = this.props;
        box0.scale.set(width, height, 1);
        box1.scale.set(width + falloff * 2, height + falloff * 2, 1);
    }
}
// Powerful but tricky?
// Automatically extends a class with properties from an object.
// function extendsAbstratBase<T>(props: T, _class: new () => {}) {
//   for (const key in props) {
//     Object.defineProperty(_class.prototype, key, {
//       get() { return this.props[key] },
//       set(value) {
//         this.props[key] = value
//         this.setup()
//       },
//     })
//   }
//   return _class as new () => AbstractFalloff<T> & T
// }
// const defaultFooProps = { foo: 1 }
// const Foo = extendsAbstratBase(defaultFooProps, class extends AbstractFalloff<typeof defaultFooProps> {
//   bar = 2
//   constructor() {
//     super()
//     this.initProps({ ...defaultFooProps })
//     this.setup()
//   }
//   fooBar() {
//     return this.props.foo
//   }
// })
// const foo = new Foo()
// foo.foo = 4
// foo.props.foo
//# sourceMappingURL=falloffs.js.map