export type FluidType =
  | 'bleed-hot' | 'bleed-regulated' | 'conditioned-air' | 'ram-air'
  | 'fuel' | 'fuel-vapor' | 'pao-coolant';

export type NodeType =
  | 'valve' | 'heat-exchanger' | 'acm' | 'compressor' | 'tank' | 'pump'
  | 'regulator' | 'sensor' | 'engine' | 'probe' | 'duct-junction'
  | 'lox-converter' | 'receptacle' | 'mast';

export type System = 'ecs' | 'fuel';
export type NodeState = 'active' | 'inactive' | 'standby';

export interface SilhouettePos {
  top?: [number, number];
  sideL?: [number, number];
  sideR?: [number, number];
}

export interface SystemNode {
  id: string;
  label: string;
  type: NodeType;
  pos: [number, number];
  silhouette: SilhouettePos;
  description: string;
  modeStates: Record<string, NodeState>;
}

export interface EdgeFlow {
  active: boolean;
  direction?: 'forward' | 'reverse';
  rate?: 'low' | 'med' | 'high';
}

export interface SystemEdge {
  id: string;
  from: string;
  to: string;
  fluid: FluidType;
  waypoints: [number, number][];
  modeFlow: Record<string, EdgeFlow>;
}

export interface Mode {
  id: string;
  label: string;
  description: string;
  system: System;
}

export interface SystemData {
  nodes: SystemNode[];
  edges: SystemEdge[];
}
