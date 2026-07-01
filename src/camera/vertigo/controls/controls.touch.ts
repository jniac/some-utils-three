import { DestroyableObject } from 'some-utils-ts/types'

import { Message } from 'some-utils-ts/message'
import { Vector2, Vector3 } from 'three'
import { Vertigo } from '../vertigo'
import { VertigoControls } from './controls'

class TwoFingerState {
  screenPos1 = new Vector2()
  screenPos2 = new Vector2()
  screenCenter = new Vector2()
  screenDistance = 0

  worldPos1 = new Vector3()
  worldPos2 = new Vector3()
  worldCenter = new Vector3()
  worldDelta = new Vector3()

  angle = 0

  update(touch1: Touch, touch2: Touch, viewportRect: DOMRect, vertigo: Vertigo): this {
    const { left: L, top: T, width: W, height: H } = viewportRect
    const { realSize } = vertigo.state

    this.screenPos1.set(touch1.clientX - L, touch1.clientY - T)
    this.screenPos1.x = (this.screenPos1.x / W * 2 - 1)
    this.screenPos1.y = -(this.screenPos1.y / H * 2 - 1)

    this.screenPos2.set(touch2.clientX - L, touch2.clientY - T)
    this.screenPos2.x = (this.screenPos2.x / W * 2 - 1)
    this.screenPos2.y = -(this.screenPos2.y / H * 2 - 1)

    this.screenCenter.addVectors(this.screenPos1, this.screenPos2).multiplyScalar(0.5)
    this.screenDistance = this.screenPos1.distanceTo(this.screenPos2)

    this.worldPos1
      .set(this.screenPos1.x * realSize.x * .5, this.screenPos1.y * realSize.y * .5, 0)
      .applyMatrix4(vertigo.state.worldMatrix)
    this.worldPos2
      .set(this.screenPos2.x * realSize.x * .5, this.screenPos2.y * realSize.y * .5, 0)
      .applyMatrix4(vertigo.state.worldMatrix)

    this.worldCenter.addVectors(this.worldPos1, this.worldPos2).multiplyScalar(0.5)
    this.worldDelta.subVectors(this.worldPos2, this.worldPos1)

    this.angle = Math.atan2(this.worldDelta.y, this.worldDelta.x)

    return this
  }
}

export function handleTouch(controls: VertigoControls, element: HTMLElement): DestroyableObject {
  const previousTouches = new Map<number, Touch>()
  const currentTouches = new Map<number, Touch>()

  const isTwoFingerGesture = () => {
    return currentTouches.size === 2
      && previousTouches.size === 2
      && currentTouches.keys().every(id => previousTouches.has(id))
  }

  const touchStartHandler = (event: TouchEvent) => {
  }

  const touchMoveHandler = (event: TouchEvent) => {
    previousTouches.clear()
    for (const touch of currentTouches.values()) {
      previousTouches.set(touch.identifier, touch)
    }
    currentTouches.clear()
    for (const touch of event.touches) {
      currentTouches.set(touch.identifier, touch)
    }

    Message.send('WEBCONSOLE', `LINE:0`, {
      payload: `currentTouches: ${currentTouches.size}`
    })

    if (isTwoFingerGesture()) {
      const vertigo = controls.currentVertigo
      const viewportRect = element.getBoundingClientRect()
      const [ct1, ct2] = currentTouches.values()
      const current = new TwoFingerState()
        .update(ct1, ct2, viewportRect, vertigo)
      const previous = new TwoFingerState()
        .update(previousTouches.get(ct1.identifier)!, previousTouches.get(ct2.identifier)!, viewportRect, vertigo)
      const move = new Vector3().subVectors(current.worldCenter, previous.worldCenter)
      vertigo.focus.sub(move)
      vertigo.zoomAt(current.screenDistance / previous.screenDistance, previous.screenCenter)
    }
  }

  element.addEventListener('touchstart', touchStartHandler)
  element.addEventListener('touchmove', touchMoveHandler)

  const destroy = () => {
    element.removeEventListener('touchstart', touchStartHandler)
    element.removeEventListener('touchmove', touchMoveHandler)
  }

  return { destroy }
}