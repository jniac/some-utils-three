import { BufferGeometry, CapsuleGeometry, Color, Group, Matrix4, Mesh, MeshBasicMaterial, Plane, PlaneGeometry, Quaternion, Raycaster, TorusGeometry, Vector2, Vector3, WebGLProgramParametersWithUniforms } from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'

import { ShaderForge } from '../shader-forge'
import { setVertexColors } from '../utils/geometry/vertex-colors'

const colors = {
  red: new Color('#ff0044'),
  green: new Color('#22ff44'),
  blue: new Color('#1144ff'),
}
const colorArray = [colors.red, colors.green, colors.blue]

export function createArcGeometry({
  radius = 1,
  radialSegments = 64,
  tube = .01,
  tubeSegments = 12,
  color = colors.blue,
} = {}): BufferGeometry {
  const geometry = new TorusGeometry(radius, tube, tubeSegments, radialSegments)
  return geometry
}

class Autolit {
  static createUniforms() {
    return {
      uSunPosition: { value: new Vector3(0.5, 0.7, 0.3) },
      uShadowColor: { value: new Color('#808080') },
      uRampPower: { value: 1 },
      uLuminosity: { value: 1 },
    }
  }
  static enable(shader: WebGLProgramParametersWithUniforms, uniforms: Record<string, { value: any }>) {
    ShaderForge.with(shader)
      .uniforms(uniforms)
      .varying({
        vAutoLitWorldNormal: 'vec3',
      })
      .vertex.mainAfterAll(/* glsl */`
        #ifdef USE_INSTANCING
          vAutoLitWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        #else
          vAutoLitWorldNormal = normalize(mat3(modelMatrix) * normal);
        #endif
    `)
      .fragment.before('map_fragment', /* glsl */`
        vec3 normal = normalize(vAutoLitWorldNormal);
        vec3 lightDirection = normalize(uSunPosition);
        float light = dot(normal, lightDirection) * 0.5 + 0.5;
        light = pow(light, uRampPower);
        diffuseColor.rgb *= mix(uShadowColor * uLuminosity, vec3(1.0), light);
    `)
  }
}


class HoverMaterial extends MeshBasicMaterial {
  uniforms = {
    ...Autolit.createUniforms(),
    uIndexHovered: { value: -1 },
    uHoverBumpFactor: { value: 0.01 },
  }

  constructor() {
    super({ vertexColors: true })
    this.onBeforeCompile = shader => {
      Autolit.enable(shader, this.uniforms)
      ShaderForge.with(shader)
        .vertex.replace('begin_vertex', /* glsl */`
          // Infer axe index from vertex color (red=0, green=1, blue=2)
          float axeIndex = color.r > 0.5 ? 0.0 : (color.g > 0.5 ? 1.0 : 2.0);
          float bumpFactor = axeIndex == uIndexHovered ? uHoverBumpFactor : 0.0;
          vec3 transformed = position + normal * bumpFactor;
      `)
    }
  }
}

class DiscMaterial extends MeshBasicMaterial {
  uniforms = {
    uAngle: { value: Math.PI },
  }

  constructor(color: Color) {
    super({ color, side: 2 })
    this.onBeforeCompile = shader => {
      ShaderForge.with(shader)
        .defines('USE_UV')
        .uniforms(this.uniforms)
        .fragment.after('map_fragment', /* glsl */`
          vec2 centeredUV = vUv - 0.5;
          float angle = atan(centeredUV.y, centeredUV.x);
          float radius = length(centeredUV);
          if (abs(uAngle) < 0.0001 || radius > 0.4 
            || (uAngle > 0.0 && (angle < 0.0 || angle > uAngle)) 
            || (uAngle < 0.0 && (angle > 0.0 || angle < uAngle))) {
            discard;
          }
        `)
    }
  }
}

export class RotationTool extends Group {
  static normals = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]

  static createParts(instance: RotationTool) {
    const arcZ = createArcGeometry()
    const arcX = arcZ.clone().rotateY(Math.PI / 2)
    const arcY = arcZ.clone().rotateX(Math.PI / 2)
    setVertexColors(arcX, colors.red)
    setVertexColors(arcY, colors.green)
    setVertexColors(arcZ, colors.blue)
    const geometry = BufferGeometryUtils.mergeGeometries([arcX, arcY, arcZ])

    const mesh = new Mesh(geometry, new HoverMaterial())
    mesh.name = 'RotationTool.mesh'
    instance.add(mesh)

    const hitArc = createArcGeometry({ radius: 1, tube: 0.05, radialSegments: 16, tubeSegments: 6 })
    const hitArcFaceCount = hitArc.index ? hitArc.index.count / 3 : hitArc.attributes.position.count / 3
    const hitGeometry = BufferGeometryUtils.mergeGeometries([
      hitArc.clone().rotateY(Math.PI / 2),
      hitArc.clone().rotateX(Math.PI / 2),
      hitArc,
    ])
    const hitMesh = new Mesh(hitGeometry, new MeshBasicMaterial({ wireframe: true, visible: false }))
    hitMesh.name = 'RotationTool.hitMesh'
    hitMesh.userData.isHitMesh = true
    hitMesh.userData.isHitArea = true
    instance.add(hitMesh)

    const capsuleY = new CapsuleGeometry(0.01, 0.2, 4, 8)
    const capsuleX = capsuleY.clone().rotateZ(Math.PI / 2)
    const capsuleZ = capsuleY.clone().rotateX(Math.PI / 2)
    setVertexColors(capsuleX, colors.red)
    setVertexColors(capsuleY, colors.green)
    setVertexColors(capsuleZ, colors.blue)
    const capsule = BufferGeometryUtils.mergeGeometries([
      capsuleX.translate(1.15, 0, 0),
      capsuleY.translate(0, 1.15, 0),
      capsuleZ.translate(0, 0, 1.15),
    ])
    const capsuleMesh = new Mesh(capsule, new HoverMaterial())
    capsuleMesh.name = 'RotationTool.capsuleMesh'
    instance.add(capsuleMesh)

    const discGeometry = new PlaneGeometry(2, 2)
    const discMeshX = new Mesh(discGeometry, new DiscMaterial(colors.red))
    discMeshX.name = 'RotationTool.discMeshX'
    discMeshX.rotation.set(0, -Math.PI / 2, 0)
    discMeshX.scale.set(1, -1, 1)
    const discMeshY = new Mesh(discGeometry, new DiscMaterial(colors.green))
    discMeshY.name = 'RotationTool.discMeshY'
    discMeshY.rotation.set(Math.PI / 2, 0, 0)
    discMeshY.scale.set(1, -1, 1)
    const discMeshZ = new Mesh(discGeometry, new DiscMaterial(colors.blue))
    discMeshZ.name = 'RotationTool.discMeshZ'

    return {
      mesh,
      hitArcFaceCount,
      hitMesh,
      discMeshes: [discMeshX, discMeshY, discMeshZ],
    }
  }

  userData = {
    isTool: true,
    isInteractiveTool: true,
    isHelper: true,
  }

  #private = {
    parts: RotationTool.createParts(this),
    raycaster: new Raycaster(),
    state: {
      plane: new Plane(),
      down: false,
      status: 'idle' as 'idle' | 'dragging',
      activeAxe: -1,
      startQuaternion: new Quaternion(),
      startWorldMatrix: new Matrix4(),
      startWorldMatrixInverse: new Matrix4(),
      startAngle: 0,
      angleStep: 0,
    },
  }

  constructor() {
    super()
    this.#initialize()
  }

  #initialize() {
    const { parts, state, raycaster } = this.#private
    const { mesh, hitArcFaceCount, hitMesh } = parts

    const pointer = {
      isDown: false,
      dom: new Vector2(),
      ndc: new Vector2(),
    }
    document.addEventListener('pointermove', event => {
      pointer.dom.set(event.clientX, event.clientY)
      state.angleStep = event.shiftKey ? 15 : 0
    })
    document.addEventListener('pointerdown', event => {
      pointer.dom.set(event.clientX, event.clientY)
      pointer.isDown = true
    })
    document.addEventListener('pointerup', () => {
      pointer.isDown = false
    })

    mesh.onBeforeRender = (renderer, scene, camera) => {
      const domRect = renderer.domElement.getBoundingClientRect()
      pointer.ndc.set(
        ((pointer.dom.x - domRect.left) / domRect.width) * 2 - 1,
        -((pointer.dom.y - domRect.top) / domRect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer.ndc, camera)
      const intersects = raycaster.intersectObject(hitMesh, false)

      const activeAxe = intersects.length > 0
        ? Math.floor(intersects[0].faceIndex! / hitArcFaceCount)
        : -1

      const isPressingEnter = pointer.isDown && !state.down
      const isPressingLeave = !pointer.isDown && state.down

      if (isPressingEnter) {
        state.down = true

        if (activeAxe >= 0) {
          this.#enterDrag(activeAxe)
        }
      }

      if (state.status === 'dragging') {
        this.#updateDrag()
        mesh.material.uniforms.uIndexHovered.value = state.activeAxe
      } else {
        mesh.material.uniforms.uIndexHovered.value = activeAxe
      }

      if (isPressingLeave) {
        state.down = false
        this.#exitDrag()
      }
    }
  }

  #getCurrentAngle(): number {
    const { state, raycaster } = this.#private
    const intersection = raycaster.ray.intersectPlane(state.plane, new Vector3())
    if (intersection) {
      const localIntersection = intersection.clone().applyMatrix4(state.startWorldMatrixInverse)
      switch (state.activeAxe) {
        case 0: return Math.atan2(localIntersection.z, localIntersection.y)
        case 1: return Math.atan2(localIntersection.x, localIntersection.z)
        case 2: return Math.atan2(localIntersection.y, localIntersection.x)
      }
    }
    return 0
  }

  #enterDrag(activeAxe: number) {
    const { state, parts } = this.#private
    state.activeAxe = activeAxe
    state.status = 'dragging'
    state.startWorldMatrix.copy(this.matrixWorld)
    state.startWorldMatrixInverse.copy(this.matrixWorld).invert()

    state.plane.setFromNormalAndCoplanarPoint(
      RotationTool.normals[state.activeAxe].clone().applyQuaternion(this.quaternion),
      this.getWorldPosition(new Vector3()),
    )
    state.startQuaternion.copy(this.quaternion)
    state.startAngle = this.#getCurrentAngle()
    this.add(parts.discMeshes[state.activeAxe])
  }

  #exitDrag() {
    if (this.#private.state.status !== 'dragging')
      return

    const { state, parts } = this.#private
    const discMesh = parts.discMeshes[state.activeAxe]
    discMesh.material.uniforms.uAngle.value = 0
    this.remove(discMesh)
    state.status = 'idle'
    state.activeAxe = -1
  }

  #updateDrag() {
    const { state, parts } = this.#private

    const currentAngle = this.#getCurrentAngle()
    let deltaAngle = currentAngle - state.startAngle
    if (deltaAngle > Math.PI) {
      deltaAngle -= 2 * Math.PI
    } else if (deltaAngle < -Math.PI) {
      deltaAngle += 2 * Math.PI
    }
    if (state.angleStep > 0) {
      deltaAngle = Math.round(deltaAngle / (state.angleStep * (Math.PI / 180))) * (state.angleStep * (Math.PI / 180))
    }
    const q = new Quaternion().setFromAxisAngle(RotationTool.normals[state.activeAxe], deltaAngle)
    this.quaternion.copy(state.startQuaternion).multiply(q)

    // Prevent jittering
    this.updateMatrixWorld(true)

    parts.discMeshes[state.activeAxe].material.uniforms.uAngle.value = -deltaAngle
  }
}
