import { Euler, Quaternion, Vector2, Vector3 } from 'three'

import { Animation } from 'some-utils-ts/animation'

import { fromVector2Declaration, fromVector3Declaration, Vector2Declaration, Vector3Declaration } from '../../../declaration'

import { __private__, VertigoControls } from './controls'
import { findIntersection } from './utils'

const _pointer = new Vector2()
const _v0 = new Vector3()
const _v1 = new Vector3()

/**
 * The VertigoControls instance holds several Vertigo instances: 
 * - The `main` one, which is the one that is used for rendering and is updated by the controls.
 * - The `alternative` one, which can be used for escaping an animated vertigo.
 */
type VertigoControlsTarget = 'main' | 'alternative' | 'current'

export function createActions(instance: VertigoControls) {
  const {
    state,
    doEnterAlternative,
    alternativeIsActiveAndNotExiting,
  } = instance[__private__]

  const getVertigo = (target: VertigoControlsTarget) => {
    return target === 'main' ? instance.vertigo :
      target === 'alternative' ? state.alternativeVertigo :
        instance.currentVertigo
  }

  const actions = {
    togglePerspective: () => {
      const perspective = instance.currentVertigo.perspective > .5 ? 0 : 1
      Animation
        .tween({
          target: [instance.currentVertigo, 'perspective'],
          to: { perspective },
          duration: 1,
          ease: 'inOut3',
        })
    },

    focus: (focusPosition: Vector3Declaration) => {
      Animation
        .tween({
          target: instance.currentVertigo.focus,
          to: fromVector3Declaration(focusPosition),
          duration: 1,
          ease: 'inOut3',
        })
    },

    rotate: (pitch: number, yaw: number, roll: number) => {
      const qStart = new Quaternion().setFromEuler(instance.currentVertigo.rotation)
      const qEnd = new Quaternion().setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'))
      const q = new Quaternion()
      Animation
        .during({
          target: [instance.currentVertigo, 'rotation'],
          duration: 1,
        })
        .onUpdate(({ progress }) => {
          q.slerpQuaternions(qStart, qEnd, Animation.ease('inOut3')(progress))
          instance.currentVertigo.rotation.setFromQuaternion(q)
        })
    },

    enterAlternative: () => {
      state.alternativeWasStarted = instance.started
      instance.start() // ensure started
      doEnterAlternative()
    },

    exitAlternative: () => {
      if (state.alternativeWasStarted === false) {
        instance.stop() // stop if was not started before
      }
      state.alternativeExiting = true
    },

    toggleAlternative: (active?: boolean) => {
      active ??= !alternativeIsActiveAndNotExiting()
      if (active) {
        actions.enterAlternative()
      } else {
        actions.exitAlternative()
      }
    },

    setFocusAndScreenOffset: (screenOffsetArg: Vector3Declaration, target: VertigoControlsTarget = 'main') => {
      const vertigo = getVertigo(target)

      const newValue = fromVector3Declaration(screenOffsetArg, _v0)
      const oldValue = _v1.copy(vertigo.screenOffset)
      vertigo.screenOffset.copy(newValue).multiplyScalar(vertigo.zoom)
      newValue.addScaledVector(oldValue, -1 / vertigo.zoom)
      newValue.applyEuler(vertigo.rotation)
      vertigo.focus.add(newValue)
    },

    resetFocusAndScreenOffset: (target: VertigoControlsTarget = 'main') => {
      const vertigo = getVertigo(target)
      _v0.copy(vertigo.screenOffset).applyEuler(vertigo.rotation)
      vertigo.focus.addScaledVector(_v0, -1 / vertigo.zoom)
      vertigo.screenOffset.set(0, 0, 0)
    },

    /**
     * Adjusts the focus of the vertigo based on the pointer position. The pointer 
     * position is expected to be in normalized device coordinates (NDC).
     * 
     * Notes:
     * - This will change the focus AND the screen offset, in order to keep the 
     *   same view but with a different focus point (cf `setFocusAndScreenOffset()` 
     *   & `resetFocusAndScreenOffset()`), allowing to zoom or rotate around that 
     *   new focus point.
     * - A raycast is performed to find the intersection point in the world, then:
     *   - If found the focus is moved to that point.
     *   - If not found, the focus is moved inside the "focus plane".
     */
    adjustFocusFromPointer(
      pointerArg: Vector2Declaration,
      target: VertigoControlsTarget = 'main',
    ) {
      fromVector2Declaration(pointerArg, _pointer)

      const vertigo = getVertigo(target)

      const { sceneRoot, currentCamera } = instance[__private__].state
      if (sceneRoot && currentCamera) {
        const intersection = findIntersection(_pointer, currentCamera, sceneRoot)
        if (intersection) {
          const direction = new Vector3(0, 0, -1).applyEuler(vertigo.rotation)
          const delta = intersection.point.clone().sub(vertigo.focus).projectOnVector(direction)
          const deltaSignedLength = delta.dot(direction)
          const scalar = (vertigo.state.distance + deltaSignedLength) / vertigo.state.distance
          vertigo.focus.add(delta)
          vertigo.size.multiplyScalar(scalar)
        }
        vertigo.update()
      }

      const screenOffset = _pointer.clone()
        .multiply(vertigo.state.realSize)
        .divideScalar(2) // because ndc is from -1 to 1
      actions.setFocusAndScreenOffset(screenOffset, target)
    },

    adjustFocusFromWorldPoint(worldPoint: Vector3Declaration, target: VertigoControlsTarget = 'main') {
      const vertigo = getVertigo(target)
      vertigo.worldToNdc(fromVector3Declaration(worldPoint, _v0), _v1)
      actions.adjustFocusFromPointer(_v1, target)
    },

    positiveXAlign: () => {
      actions.rotate(0, Math.PI / 2, 0)
    },

    negativeXAlign: () => {
      actions.rotate(0, -Math.PI / 2, 0)
    },

    positiveYAlign: () => {
      actions.rotate(-Math.PI / 2, 0, 0)
    },

    negativeYAlign: () => {
      actions.rotate(Math.PI / 2, 0, 0)
    },

    positiveZAlign: () => {
      actions.rotate(0, 0, 0)
    },

    negativeZAlign: () => {
      actions.rotate(0, Math.PI, 0)
    },
  }

  return actions
}
