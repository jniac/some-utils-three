import { Box3, Sphere, Vector3, Vector3Like } from 'three'

export type AgentLike = {
  position: Vector3Like
}

export type ActiveZone =
  | {
    type: 'box'
    bounds: Box3
  }
  | {
    type: 'sphere'
    sphere: Sphere
  }
  | {
    type: 'agent-sphere'
    agent: AgentLike
    radius: number
  }

const _center = new Vector3()

export function getActiveZoneBounds(zone: ActiveZone, out = new Box3()): Box3 {
  switch (zone.type) {
    case 'box':
      return out.copy(zone.bounds)
    case 'sphere':
      return out.setFromCenterAndSize(
        zone.sphere.center,
        _center.setScalar(zone.sphere.radius * 2),
      )
    case 'agent-sphere':
      return out.setFromCenterAndSize(
        _center.copy(zone.agent.position),
        new Vector3(zone.radius * 2, zone.radius * 2, zone.radius * 2),
      )
  }
}

