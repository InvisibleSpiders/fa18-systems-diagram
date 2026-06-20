import { useMemo, useState } from 'react';
import type { System } from './model';
import { ECS } from './data/ecs';
import { FUEL } from './data/fuel';
import { ECS_MODES, FUEL_MODES } from './data/modes';
import { Schematic } from './components/Schematic';
import { ModeSelector } from './components/ModeSelector';
import { InfoPanel } from './components/InfoPanel';
import { Silhouette } from './components/Silhouette';

export default function App() {
  const [system, setSystem] = useState<System>('ecs');
  const [mode, setMode] = useState<string>('ecs-ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = system === 'ecs' ? ECS : FUEL;
  const modes = system === 'ecs' ? ECS_MODES : FUEL_MODES;

  const selectedNode = useMemo(() => data.nodes.find((n) => n.id === selectedId) ?? null, [data, selectedId]);
  const selectedEdge = useMemo(() => data.edges.find((e) => e.id === selectedId) ?? null, [data, selectedId]);

  function switchSystem(next: System) {
    setSystem(next);
    setMode(next === 'ecs' ? 'ecs-ground' : 'fuel-feed');
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header>
        <h1>F/A-18A/B Hornet — ECS &amp; Fuel</h1>
        <div className="tabs">
          <button className={system === 'ecs' ? 'tab active' : 'tab'} onClick={() => switchSystem('ecs')}>ECS</button>
          <button className={system === 'fuel' ? 'tab active' : 'tab'} onClick={() => switchSystem('fuel')}>Fuel</button>
        </div>
      </header>

      <ModeSelector modes={modes} active={mode} onPick={setMode} />
      <p className="mode-desc">{modes.find((m) => m.id === mode)?.description}</p>

      <div className="layout">
        <Schematic data={data} mode={mode} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="side">
          <InfoPanel node={selectedNode} edge={selectedEdge} mode={mode} />
          <Silhouette node={selectedNode} />
        </div>
      </div>
    </div>
  );
}
