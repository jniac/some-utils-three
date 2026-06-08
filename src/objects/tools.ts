import { BufferGeometry, Camera, CapsuleGeometry, Color, GreaterDepth, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Plane, PlaneGeometry, Quaternion, Raycaster, Side, TorusGeometry, Vector2, Vector3, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'

import { Message } from 'some-utils-ts/message'
import { dumpDestroyables } from 'some-utils-ts/misc/destroy'
import { Ticker, TickPhase } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { closestPointsBetweenLines } from '../math/closestPointsBetweenLines'
import { ShaderForge } from '../shader-forge'
import { setVertexColors } from '../utils/geometry/vertex-colors'

export const axisColors = {
  X: new Color('#ff0044'),
  Y: new Color('#22ff44'),
  Z: new Color('#1144ff'),
}

export function createArcGeometry({
  radius = 1,
  radialSegments = 64,
  tube = .01,
  tubeSegments = 12,
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
  #options: { xray: boolean }

  uniforms = {
    ...Autolit.createUniforms(),
    uHoverIndex: { value: -1 },
    uHoverBumpFactor: { value: 0.01 },
  }

  constructor({ xray = false, side = <Side>0 } = {}) {
    super({ vertexColors: true, side })

    this.#options = { xray }

    if (xray) {
      this.transparent = true
      this.opacity = 0.25
      this.depthFunc = GreaterDepth
    }

    this.onBeforeCompile = shader => {
      Autolit.enable(shader, this.uniforms)
      ShaderForge.with(shader)
        .varying({ vHovered: 'float' })
        .vertex.replace('begin_vertex', /* glsl */`
          // Infer axe index from vertex color (red=0, green=1, blue=2)
          float axeIndex = color.r > 0.5 ? 0.0 : (color.g > 0.5 ? 1.0 : 2.0);
          bool isHovered = int(axeIndex) == int(uHoverIndex);
          float bumpFactor = isHovered ? uHoverBumpFactor : 0.0;
          vec3 transformed = position + normal * bumpFactor;
          vHovered = isHovered ? 1.0 : 0.0;
        `)
        .fragment.after('color_fragment', /* glsl */`
          // Bump alpha on xrayed materials to make hovered part more visible
          if (vHovered > 0.5) {
            diffuseColor.a = 0.8;
          }
        `)
    }
  }

  setHoverIndex(index: number) {
    this.uniforms.uHoverIndex.value = index
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

const statusEnumValues = [
  'idle',
  'arc-dragging',
  'axis-dragging',
  'plane-dragging',
] as const

type Status = typeof statusEnumValues[number]

export class TransformTool extends Group {
  static normals = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]

  static createParts(instance: TransformTool) {
    const radius = 1
    const tube = 0.015

    const arcZ = createArcGeometry({ radius, tube })
    const arcX = arcZ.clone().rotateY(Math.PI / 2)
    const arcY = arcZ.clone().rotateX(Math.PI / 2)
    setVertexColors(arcX, axisColors.X)
    setVertexColors(arcY, axisColors.Y)
    setVertexColors(arcZ, axisColors.Z)
    const geometry = BufferGeometryUtils.mergeGeometries([arcX, arcY, arcZ])

    const arcMesh = new Mesh(geometry, new HoverMaterial())
    arcMesh.name = 'TransformTool.arcMesh'
    instance.add(arcMesh)

    const arcXrayMesh = new Mesh(geometry, new HoverMaterial({ xray: true }))
    arcXrayMesh.name = 'TransformTool.arcXrayMesh'
    instance.add(arcXrayMesh)

    const hitArc = createArcGeometry({ radius, tube: tube * 4, radialSegments: 16, tubeSegments: 6 })
    const arcHitFaceCount = hitArc.index ? hitArc.index.count / 3 : hitArc.attributes.position.count / 3
    const hitArcGeometry = BufferGeometryUtils.mergeGeometries([
      hitArc.clone().rotateY(Math.PI / 2),
      hitArc.clone().rotateX(Math.PI / 2),
      hitArc,
    ])
    const arcHitMesh = new Mesh(hitArcGeometry, new MeshBasicMaterial({ wireframe: true, visible: false }))
    arcHitMesh.name = 'TransformTool.arcHitMesh'
    arcHitMesh.userData.isHitMesh = true
    arcHitMesh.userData.isHitArea = true
    instance.add(arcHitMesh)

    const axisY = new CapsuleGeometry(tube * 2, 0.2, 4, 8)
    const axisX = axisY.clone().rotateZ(Math.PI / 2)
    const axisZ = axisY.clone().rotateX(Math.PI / 2)
    setVertexColors(axisX, axisColors.X)
    setVertexColors(axisY, axisColors.Y)
    setVertexColors(axisZ, axisColors.Z)
    const axisGeometry = BufferGeometryUtils.mergeGeometries([
      axisX.translate(1.2, 0, 0),
      axisY.translate(0, 1.2, 0),
      axisZ.translate(0, 0, 1.2),
    ])
    const axisMesh = new Mesh(axisGeometry, new HoverMaterial())
    axisMesh.name = 'TransformTool.axisMesh'
    instance.add(axisMesh)

    const axisXrayMesh = new Mesh(axisGeometry, new HoverMaterial({ xray: true }))
    axisXrayMesh.name = 'TransformTool.axisXrayMesh'
    instance.add(axisXrayMesh)

    const hitAxisY = new CapsuleGeometry(tube * 4, 0.2, 4, 8)
    const hitAxisX = hitAxisY.clone().rotateZ(Math.PI / 2)
    const hitAxisZ = hitAxisY.clone().rotateX(Math.PI / 2)
    const axisHitFaceCount = hitAxisY.index ? hitAxisY.index.count / 3 : hitAxisY.attributes.position.count / 3
    const hitAxisGeometry = BufferGeometryUtils.mergeGeometries([
      hitAxisX.translate(1.2, 0, 0),
      hitAxisY.translate(0, 1.2, 0),
      hitAxisZ.translate(0, 0, 1.2),
    ])
    const axisHitMesh = new Mesh(hitAxisGeometry, new MeshBasicMaterial({ wireframe: true, visible: false }))
    axisHitMesh.name = 'TransformTool.axisHitMesh'
    axisHitMesh.userData.isHitMesh = true
    axisHitMesh.userData.isHitArea = true
    instance.add(axisHitMesh)

    const discGeometry = new PlaneGeometry(2, 2)
    const discMeshX = new Mesh(discGeometry, new DiscMaterial(axisColors.X))
    discMeshX.name = 'TransformTool.discMeshX'
    discMeshX.rotation.set(0, -Math.PI / 2, 0)
    discMeshX.scale.set(1, -1, 1)
    const discMeshY = new Mesh(discGeometry, new DiscMaterial(axisColors.Y))
    discMeshY.name = 'TransformTool.discMeshY'
    discMeshY.rotation.set(Math.PI / 2, 0, 0)
    discMeshY.scale.set(1, -1, 1)
    const discMeshZ = new Mesh(discGeometry, new DiscMaterial(axisColors.Z))
    discMeshZ.name = 'TransformTool.discMeshZ'

    return {
      arcMesh,
      arcXrayMesh,
      arcHitFaceCount,
      arcHitMesh,
      discMeshes: [discMeshX, discMeshY, discMeshZ],

      axisMesh,
      axisXrayMesh,
      axisHitFaceCount,
      axisHitMesh,
    }
  }

  userData = {
    isTool: true,
    isInteractiveTool: true,
    isHelper: true,
  }

  #private = {
    parts: TransformTool.createParts(this),
    raycaster: new Raycaster(),
    state: {
      requestShow: false,
      requestHide: false,
      pointer: {
        isDown: false,
        dom: new Vector2(),
        ndc: new Vector2(),
      },
      plane: new Plane(),
      pressing: false,
      status: 'idle' as Status,
      arcActiveAxe: -1,
      axisActiveAxe: -1,
      planeActiveAxe: -1,
      startQuaternion: new Quaternion(),
      startPointerPosition: new Vector3(),
      startWorldMatrix: new Matrix4(),
      startWorldMatrixInverse: new Matrix4(),
      startArcAngle: 0,
      startAxisDistance: 0,
      angleStep: 0,

      renderer: null as WebGLRenderer | null,
      camera: null as Camera | null,

      target: null as Object3D | null,
      targetStartQuaternion: new Quaternion(),
      targetStartPosition: new Vector3(),
    },

    destroyed: false,
    destroyables: <Destroyable[]>[],
  }

  constructor() {
    super()
    this.#initialize()
  }

  attach(object: Object3D): this {
    this.#private.state.target = object
    object.getWorldPosition(this.position)
    object.getWorldQuaternion(this.quaternion)
    return this
  }

  destroy = () => {
    if (this.#private.destroyed)
      return
    this.removeFromParent()
    this.#private.destroyed = true
    dumpDestroyables(this.#private.destroyables)
    this.#private.destroyables = []
  }

  #initialize() {
    const { parts, state } = this.#private

    document.addEventListener('pointermove', event => {
      state.pointer.dom.set(event.clientX, event.clientY)
      state.angleStep = event.shiftKey ? 15 : 0
    })
    document.addEventListener('pointerdown', event => {
      if (event.button !== 0)
        return
      state.pointer.dom.set(event.clientX, event.clientY)
      state.pointer.isDown = true
    })
    document.addEventListener('pointerup', event => {
      if (event.button !== 0)
        return
      state.pointer.isDown = false
    })

    parts.arcMesh.onBeforeRender = (renderer, scene, camera) => {
      state.renderer = renderer
      state.camera = camera
    }

    this.#private.destroyables.push(
      Message.on(TransformTool, 'ATTACH', message => {
        const object = message.assertPayload()
        this.attach(object)
      }),

      Message.on(TransformTool, 'SHOW', () => {
        state.requestShow = true
      }),

      Message.on(TransformTool, 'HIDE', () => {
        state.requestHide = true
      }),

      // TickPhase.BeforeRender is the right place to update the tool: Camera should be up to date, so we can scale the tool properly.
      Ticker.get('three').onTick({ phase: TickPhase.BeforeRender }, tick => {
        this.#update()
      }),
    )
  }

  #update() {
    const { state, raycaster, parts } = this.#private
    const { renderer, camera, pointer } = state
    const {
      arcMesh,
      arcXrayMesh,
      arcHitFaceCount,
      arcHitMesh,
      axisMesh,
      axisXrayMesh,
      axisHitMesh,
      axisHitFaceCount,
    } = parts

    if (!renderer || !camera)
      return

    this.#updateScale(camera)
    this.#updatePositionAndRotation()

    if (state.requestShow) {
      state.requestShow = false
      this.visible = true
    }
    if (state.requestHide) {
      state.requestHide = false
      this.visible = false
      state.status = 'idle'
      arcMesh.material.setHoverIndex(-1)
      arcXrayMesh.material.setHoverIndex(-1)
      axisMesh.material.setHoverIndex(-1)
      axisXrayMesh.material.setHoverIndex(-1)
    }

    const domRect = renderer.domElement.getBoundingClientRect()
    pointer.ndc.set(
      ((pointer.dom.x - domRect.left) / domRect.width) * 2 - 1,
      -((pointer.dom.y - domRect.top) / domRect.height) * 2 + 1,

    )
    raycaster.setFromCamera(pointer.ndc, camera)
    const intersections = raycaster.intersectObjects([arcHitMesh, axisHitMesh], false)

    let arcActiveAxe = -1
    let axisActiveAxe = -1
    if (intersections.length > 0) {
      const intersection = intersections[0]
      if (intersection.object === arcHitMesh) {
        arcActiveAxe = Math.floor(intersection.faceIndex! / arcHitFaceCount)
      } else if (intersection.object === axisHitMesh) {
        axisActiveAxe = Math.floor(intersection.faceIndex! / axisHitFaceCount)
      }
    }

    const isPressingEnter = pointer.isDown && !state.pressing
    const isPressingLeave = !pointer.isDown && state.pressing

    if (isPressingEnter) {
      state.pressing = true

      if (arcActiveAxe >= 0) {
        this.#enterArcDrag(arcActiveAxe)
      }
      else if (axisActiveAxe >= 0) {
        this.#enterAxisDrag(axisActiveAxe)
      }
      // TODO: plane dragging
    }

    switch (state.status) {
      case 'arc-dragging':
        this.#updateArcDrag()
        arcMesh.material.setHoverIndex(state.arcActiveAxe)
        arcXrayMesh.material.setHoverIndex(state.arcActiveAxe)
        axisMesh.material.setHoverIndex(-1)
        axisXrayMesh.material.setHoverIndex(-1)
        break

      case 'axis-dragging':
        this.#updateAxisDrag()
        arcMesh.material.setHoverIndex(-1)
        arcXrayMesh.material.setHoverIndex(-1)
        axisMesh.material.setHoverIndex(axisActiveAxe)
        axisXrayMesh.material.setHoverIndex(axisActiveAxe)
        break

      case 'plane-dragging':
        this.#updatePlaneDrag()
        arcMesh.material.setHoverIndex(state.planeActiveAxe)
        arcXrayMesh.material.setHoverIndex(state.planeActiveAxe)
        axisMesh.material.setHoverIndex(state.planeActiveAxe)
        axisXrayMesh.material.setHoverIndex(state.planeActiveAxe)
        break

      default:
        // When not dragging (pointer.isDown === false), hover the intersected axe (if any)
        arcMesh.material.setHoverIndex(pointer.isDown ? -1 : arcActiveAxe)
        arcXrayMesh.material.setHoverIndex(pointer.isDown ? -1 : arcActiveAxe)
        axisMesh.material.setHoverIndex(pointer.isDown ? -1 : axisActiveAxe)
        axisXrayMesh.material.setHoverIndex(pointer.isDown ? -1 : axisActiveAxe)
        break
    }

    if (isPressingLeave) {
      state.pressing = false
      this.#exitArcDrag()
      this.#exitAxisDrag()
      this.#exitPlaneDrag()
    }

    this.updateMatrixWorld()
  }

  #getCurrentAngle_private = { v: new Vector3() }
  #getCurrentAngle(): number {
    const { state, raycaster } = this.#private
    const { v } = this.#getCurrentAngle_private
    const intersection = raycaster.ray.intersectPlane(state.plane, v)
    if (intersection) {
      v.applyMatrix4(state.startWorldMatrixInverse)
      switch (state.arcActiveAxe) {
        case 0: return Math.atan2(v.z, v.y)
        case 1: return Math.atan2(v.x, v.z)
        case 2: return Math.atan2(v.y, v.x)
      }
    }
    return 0
  }

  #updateScale(camera: Camera) {
    camera.updateWorldMatrix(false, false)
    camera.matrixWorld.clone().invert()
    const inViewPosition = this.getWorldPosition(new Vector3()).applyMatrix4(camera.matrixWorld.clone().invert())
    if (camera instanceof PerspectiveCamera) {
      const viewHeight = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * Math.abs(inViewPosition.z)
      this.scale.setScalar(viewHeight / 10)
    }
  }

  #updatePositionAndRotation() {
    const { state } = this.#private
    if (state.target) {
      if (state.status !== 'arc-dragging') {
        state.target.getWorldPosition(this.position)
        state.target.getWorldQuaternion(this.quaternion)
      }
    }
  }

  #enterArcDrag(activeAxe: number) {
    const { state, parts } = this.#private
    state.arcActiveAxe = activeAxe
    state.status = 'arc-dragging'
    state.startWorldMatrix.copy(this.matrixWorld)
    state.startWorldMatrixInverse.copy(this.matrixWorld).invert()

    state.plane.setFromNormalAndCoplanarPoint(
      TransformTool.normals[state.arcActiveAxe].clone().applyQuaternion(this.quaternion),
      this.getWorldPosition(new Vector3()),
    )
    state.startQuaternion.copy(this.quaternion)
    state.startArcAngle = this.#getCurrentAngle()
    this.add(parts.discMeshes[state.arcActiveAxe])

    if (state.target) {
      state.targetStartQuaternion.copy(state.target.quaternion)
    }
  }

  #exitArcDrag() {
    if (this.#private.state.status !== 'arc-dragging')
      return

    const { state, parts } = this.#private
    const discMesh = parts.discMeshes[state.arcActiveAxe]
    discMesh.material.uniforms.uAngle.value = 0
    this.remove(discMesh)
    state.status = 'idle'
    state.arcActiveAxe = -1
  }

  #updateArcDrag() {
    const { state, parts } = this.#private

    const currentAngle = this.#getCurrentAngle()
    let deltaAngle = currentAngle - state.startArcAngle
    if (deltaAngle > Math.PI) {
      deltaAngle -= 2 * Math.PI
    } else if (deltaAngle < -Math.PI) {
      deltaAngle += 2 * Math.PI
    }
    if (state.angleStep > 0) {
      deltaAngle = Math.round(deltaAngle / (state.angleStep * (Math.PI / 180))) * (state.angleStep * (Math.PI / 180))
    }
    const q = new Quaternion().setFromAxisAngle(TransformTool.normals[state.arcActiveAxe], deltaAngle)
    this.quaternion.copy(state.startQuaternion).multiply(q)

    parts.discMeshes[state.arcActiveAxe].material.uniforms.uAngle.value = -deltaAngle

    if (state.target) {
      state.target.quaternion.copy(state.targetStartQuaternion).multiply(q)
      state.target.updateMatrixWorld()
    }
  }

  #getCurrentAxisDistance_private = { v1: new Vector3(), v2: new Vector3() }
  #getCurrentAxisDistance(): number {
    const { state, raycaster } = this.#private
    const { v1, v2 } = this.#getCurrentAxisDistance_private
    v1.setFromMatrixPosition(state.startWorldMatrix)
    v2.setFromMatrixColumn(state.startWorldMatrix, state.axisActiveAxe)
    const { t1 } = closestPointsBetweenLines(v1, v2, raycaster.ray.origin, raycaster.ray.direction)
    return t1
  }

  #enterAxisDrag(activeAxe: number) {
    const { state } = this.#private
    state.axisActiveAxe = activeAxe
    state.status = 'axis-dragging'
    state.startWorldMatrix.copy(this.matrixWorld)
    state.startWorldMatrixInverse.copy(this.matrixWorld).invert()
    state.startAxisDistance = this.#getCurrentAxisDistance()

    if (state.target) {
      state.target.getWorldPosition(state.targetStartPosition)
    }
  }

  #exitAxisDrag() {
    if (this.#private.state.status !== 'axis-dragging')
      return

    const { state } = this.#private
    state.status = 'idle'
    state.axisActiveAxe = -1
  }

  #updateAxisDrag_private = { v1: new Vector3(), v2: new Vector3(), m: new Matrix4() }
  #updateAxisDrag() {
    const { v1, v2, m } = this.#updateAxisDrag_private
    const { state } = this.#private
    const distance = this.#getCurrentAxisDistance()
    const delta = distance - this.#private.state.startAxisDistance
    v1.setFromMatrixPosition(state.startWorldMatrix)
    v2.setFromMatrixColumn(state.startWorldMatrix, state.axisActiveAxe)
    v1.addScaledVector(v2, delta)
    this.position.copy(v1)

    if (state.target) {
      const parent = state.target.parent
      if (parent) {
        m.copy(parent.matrixWorld).invert()
        v1.applyMatrix4(m)
        state.target.position.copy(v1)
        state.target.updateMatrixWorld()
      }
    }
  }

  #enterPlaneDrag(activeAxe: number) {
    const { state, raycaster } = this.#private
    state.planeActiveAxe = activeAxe
    state.status = 'plane-dragging'
    state.plane.setFromNormalAndCoplanarPoint(
      TransformTool.normals[state.planeActiveAxe].clone().applyQuaternion(this.quaternion),
      this.getWorldPosition(new Vector3()),
    )
    raycaster.ray.intersectPlane(state.plane, state.startPointerPosition)
    state.startWorldMatrix.copy(this.matrixWorld)
    state.startWorldMatrixInverse.copy(this.matrixWorld).invert()
  }

  #exitPlaneDrag() {
    if (this.#private.state.status !== 'plane-dragging')
      return

    const { state } = this.#private
    state.status = 'idle'
    state.planeActiveAxe = -1
  }

  #updatePlaneDrag_private = { v1: new Vector3(), v2: new Vector3(), m: new Matrix4() }
  #updatePlaneDrag() {
    const { state, raycaster } = this.#private
    const { v1, v2, m } = this.#updatePlaneDrag_private
    raycaster.ray.intersectPlane(state.plane, v1)
    v1.sub(state.startPointerPosition)
    v2.setFromMatrixPosition(state.startWorldMatrix)
    v2.add(v1)
    this.position.copy(v2)
    // Not implemented yet
  }
}
