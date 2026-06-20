import { useEffect, useMemo, useReducer, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { System, NodeType, FluidType, NodeState } from './model';
import { reducer } from './store/systemsStore';
import { loadState, saveState, parseImport, downloadJson } from './store/persistence';
import { tidy } from './flow/layout';
import { MODES, ECS_MODES, FUEL_MODES } from './data/modes';
import { SchematicFlow } from './flow/SchematicFlow';
import { ModeSelector } from './components/ModeSelector';
import { InfoPanel } from './components/InfoPanel';
import { EditorPanel } from './components/EditorPanel';
import { Toolbar } from './components/Toolbar';
import { Silhouette } from './components/Silhouette';

let uid = 0;
const newId = (p: string) => `${p}-${Date.now()}-${uid++}`;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const [system, setSystem] = useState<System>('ecs');
  const [mode, setMode] = useState<string>('ecs-ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  const data = state[system];
  const modes = system === 'ecs' ? ECS_MODES : FUEL_MODES;
  const modeIds = useMemo(() => MODES.map((m) => m.id), []);

  const selectedNode = data.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedEdge = data.edges.find((e) => e.id === selectedId) ?? null;

  function switchSystem(next: System) {
    setSystem(next);
    setMode(next === 'ecs' ? 'ecs-ground' : 'fuel-feed');
    setSelectedId(null);
  }

  function handleImport(file: File) {
    file.text().then((text) => {
      const result = parseImport(text, modeIds);
      if (result.ok) dispatch({ type: 'replaceAll', state: result.state });
      else alert('Import failed:\n' + result.errors.join('\n'));
    });
  }

  function handleAddNode(type: NodeType) {
    const id = newId(type);
    dispatch({ type: 'addNode', system, node: {
      id, label: `New ${type}`, type, pos: [400, 300], silhouette: {}, description: '', modeStates: {},
    } });
    setSelectedId(id);
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

      <Toolbar
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onTidy={() => dispatch({ type: 'tidy', system, positions: tidy(data) })}
        onExport={() => downloadJson(state)}
        onImport={handleImport}
        onReset={() => { if (confirm('Reset all edits to defaults?')) dispatch({ type: 'reset' }); }}
      />

      <ModeSelector modes={modes} active={mode} onPick={setMode} />
      <p className="mode-desc">{modes.find((m) => m.id === mode)?.description}</p>

      <div className="layout">
        <ReactFlowProvider>
          <SchematicFlow
            data={data}
            mode={mode}
            editMode={editMode}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNodeMove={(id, pos) => dispatch({ type: 'moveNode', system, id, pos })}
            onConnect={(from, to) => {
              const id = newId('edge');
              dispatch({ type: 'addEdge', system, edge: { id, from, to, fluid: 'fuel', waypoints: [], modeFlow: {} } });
              setSelectedId(id);
            }}
            onDeleteNode={(id) => { dispatch({ type: 'deleteNode', system, id }); setSelectedId(null); }}
            onDeleteEdge={(id) => { dispatch({ type: 'deleteEdge', system, id }); setSelectedId(null); }}
          />
        </ReactFlowProvider>

        <div className="side">
          {editMode ? (
            <EditorPanel
              node={selectedNode}
              edge={selectedEdge}
              mode={mode}
              modes={modes}
              onRename={(id, label) => dispatch({ type: 'renameNode', system, id, label })}
              onDescribe={(id, description) => dispatch({ type: 'describeNode', system, id, description })}
              onSetType={(id, nodeType) => dispatch({ type: 'setNodeType', system, id, nodeType })}
              onDelete={(id) => { dispatch({ type: 'deleteNode', system, id }); setSelectedId(null); }}
              onSetNodeModeState={(id, m, st: NodeState) => dispatch({ type: 'setNodeModeState', system, id, mode: m, state: st })}
              onSetEdgeFluid={(id, fluid: FluidType) => dispatch({ type: 'setEdgeFluid', system, id, fluid })}
              onSetEdgeFlow={(id, m, active, rate) => dispatch({ type: 'setEdgeFlow', system, id, mode: m, flow: { active, rate } })}
              onAddNode={handleAddNode}
            />
          ) : (
            <InfoPanel node={selectedNode} edge={selectedEdge} mode={mode} />
          )}
          <Silhouette
            node={selectedNode}
            editMode={editMode}
            onPlaceDot={(view, pos) => selectedNode && dispatch({ type: 'setDot', system, id: selectedNode.id, view, pos })}
          />
        </div>
      </div>
    </div>
  );
}
