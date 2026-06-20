import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Toolbar } from '../src/components/Toolbar';
import { EditorPanel } from '../src/components/EditorPanel';
import { ECS_MODES } from '../src/data/modes';
import type { SystemNode } from '../src/model';

describe('Toolbar', () => {
  it('toggles edit mode', () => {
    let edit = false;
    const { getByRole } = render(
      <Toolbar
        editMode={edit}
        onToggleEdit={() => (edit = !edit)}
        onTidy={() => {}} onExport={() => {}} onImport={() => {}} onReset={() => {}}
      />,
    );
    fireEvent.click(getByRole('button', { name: /edit/i }));
    expect(edit).toBe(true);
  });

  it('fires tidy', () => {
    let tidied = false;
    const { getByRole } = render(
      <Toolbar editMode onToggleEdit={() => {}} onTidy={() => (tidied = true)} onExport={() => {}} onImport={() => {}} onReset={() => {}} />,
    );
    fireEvent.click(getByRole('button', { name: /tidy/i }));
    expect(tidied).toBe(true);
  });
});

const node: SystemNode = { id: 'a', label: 'A', type: 'valve', pos: [0, 0], silhouette: {}, description: 'd', modeStates: { 'ecs-auto': 'inactive' } };

describe('EditorPanel', () => {
  it('renames the selected node', () => {
    let label = '';
    const { getByLabelText } = render(
      <EditorPanel node={node} edge={null} mode="ecs-auto" modes={ECS_MODES}
        onRename={(_, l) => (label = l)} onDescribe={() => {}} onSetType={() => {}}
        onDelete={() => {}} onSetNodeModeState={() => {}} onSetEdgeFluid={() => {}}
        onSetEdgeFlow={() => {}} onAddNode={() => {}} />,
    );
    fireEvent.change(getByLabelText(/label/i), { target: { value: 'Alpha' } });
    expect(label).toBe('Alpha');
  });

  it('sets the node state for the current mode', () => {
    let state = '';
    const { getByLabelText } = render(
      <EditorPanel node={node} edge={null} mode="ecs-auto" modes={ECS_MODES}
        onRename={() => {}} onDescribe={() => {}} onSetType={() => {}}
        onDelete={() => {}} onSetNodeModeState={(_, __, s) => (state = s)} onSetEdgeFluid={() => {}}
        onSetEdgeFlow={() => {}} onAddNode={() => {}} />,
    );
    fireEvent.change(getByLabelText(/state in/i), { target: { value: 'active' } });
    expect(state).toBe('active');
  });

  it('adds a component', () => {
    let added = false;
    const { getByRole } = render(
      <EditorPanel node={null} edge={null} mode="ecs-auto" modes={ECS_MODES}
        onRename={() => {}} onDescribe={() => {}} onSetType={() => {}}
        onDelete={() => {}} onSetNodeModeState={() => {}} onSetEdgeFluid={() => {}}
        onSetEdgeFlow={() => {}} onAddNode={() => (added = true)} />,
    );
    fireEvent.click(getByRole('button', { name: /add component/i }));
    expect(added).toBe(true);
  });
});
