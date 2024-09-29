import { BufferGeometry, Group, Line, LineBasicMaterial, Matrix4, Uniform, Vector3, Vector4 } from 'three'

const material = new LineBasicMaterial({
  color: 'white',
  transparent: true,
  depthTest: false,
})

const geometries = {
  circle: (() => {
    const subdivisions = 80
    const geometry = new BufferGeometry()
    const points = Array.from({ length: subdivisions + 1 }, (_, i) => {
      const a = i / subdivisions * Math.PI * 2
      return new Vector3(Math.cos(a), Math.sin(a), 0)
    })
    geometry.setFromPoints(points)
    return geometry
  })(),

  box2: (() => {
    const geometry = new BufferGeometry()
    const extent = .5
    const points = [
      new Vector3(-extent, -extent, 0),
      new Vector3(+extent, -extent, 0),
      new Vector3(+extent, +extent, 0),
      new Vector3(-extent, +extent, 0),
      new Vector3(-extent, -extent, 0),
    ]
    geometry.setFromPoints(points)
    return geometry
  })(),
}

class AbstractFalloff<Props> extends Group {
  props: Props

  setupUniforms({ value: matrix }: Uniform<Matrix4>, { value: vector }: Uniform<Vector4>) {
    matrix.copy(this.matrixWorld)
    matrix.invert()
  }

  constructor(props: Props) {
    super()
    this.props = props
    this.renderOrder = 1 // Transparent + renderOrder: Gives a chance to render after all other objects.
  }

  setup() { }

  set(props: Partial<Props>) {
    Object.assign(this.props as any, props)
    this.setup()
  }
}

const defaultCircleFalloffProps = {
  radius: 2,
  falloff: 1,
}

export class CircleFalloff extends AbstractFalloff<typeof defaultCircleFalloffProps> {
  static glsl = /* glsl */`
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
  `

  parts = {
    circle0: new Line(geometries.circle, material),
    circle1: new Line(geometries.circle, material),
  }

  get radius() { return this.props.radius }
  set radius(value) {
    this.props.radius = value
    this.setup()
  }

  get falloff() { return this.props.falloff }
  set falloff(value) {
    this.props.falloff = value
    this.setup()
  }

  constructor(props?: Partial<typeof CircleFalloff.prototype.props>) {
    super({ ...defaultCircleFalloffProps, ...props })
    this.add(this.parts.circle0)
    this.add(this.parts.circle1)
    this.setup()
  }

  override setupUniforms(matrix: Uniform<Matrix4>, vector: Uniform<Vector4>) {
    super.setupUniforms(matrix, vector)
    const { radius, falloff } = this.props
    vector.value.set(radius, falloff, 0, 0)
  }

  override setup() {
    const { circle0, circle1 } = this.parts
    const { radius, falloff } = this.props
    circle0.scale.setScalar(radius)
    circle1.scale.setScalar(radius + falloff)
  }
}

const defaultManhattanBox2FalloffProps = {
  width: 1,
  height: 1,
  falloff: 1,
}

export class ManhattanBox2Falloff extends AbstractFalloff<typeof defaultManhattanBox2FalloffProps> {
  static glsl = /* glsl */`
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
  `

  parts = {
    box0: new Line(geometries.box2, material),
    box1: new Line(geometries.box2, material),
  }

  constructor(props?: Partial<typeof ManhattanBox2Falloff.prototype.props>) {
    super({ ...defaultManhattanBox2FalloffProps, ...props })
    this.add(this.parts.box0)
    this.add(this.parts.box1)
    this.setup()
  }

  override setupUniforms(matrix: Uniform<Matrix4>, vector: Uniform<Vector4>) {
    super.setupUniforms(matrix, vector)
    const { width, height, falloff } = this.props
    vector.value.set(width, height, falloff, 0)
  }

  override setup() {
    const { box0, box1 } = this.parts
    const { width, height, falloff } = this.props
    box0.scale.set(width, height, 1)
    box1.scale.set(width + falloff * 2, height + falloff * 2, 1)
  }
}