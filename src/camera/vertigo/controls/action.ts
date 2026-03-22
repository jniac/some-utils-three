import { Euler, Quaternion } from 'three'

import { Animation } from 'some-utils-ts/animation'

import { fromVector3Declaration, Vector3Declaration } from '../../../declaration'
import { __private__, VertigoControls } from './controls'

export function createActions(instance: VertigoControls) {
  const {
    state,
    doEnterAlternative,
    alternativeIsActiveAndNotExiting,
  } = instance[__private__]

  return {
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
        instance.actions.enterAlternative()
      } else {
        instance.actions.exitAlternative()
      }
    },

    positiveXAlign: () => {
      instance.actions.rotate(0, Math.PI / 2, 0)
    },

    negativeXAlign: () => {
      instance.actions.rotate(0, -Math.PI / 2, 0)
    },

    positiveYAlign: () => {
      instance.actions.rotate(-Math.PI / 2, 0, 0)
    },

    negativeYAlign: () => {
      instance.actions.rotate(Math.PI / 2, 0, 0)
    },

    positiveZAlign: () => {
      instance.actions.rotate(0, 0, 0)
    },

    negativeZAlign: () => {
      instance.actions.rotate(0, Math.PI, 0)
    },
  }
}
