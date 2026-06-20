import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Edge } from '../src/components/Edge';
import { Node } from '../src/components/Node';
import { Schematic } from '../src/components/Schematic';
import { InfoPanel } from '../src/components/InfoPanel';
import { ModeSelector } from '../src/components/ModeSelector';
import { Silhouette } from '../src/components/Silhouette';
import { ECS_MODES } from '../src/data/modes';
import App from '../src/App';
import type { SystemEdge, SystemNode, SystemData } from '../src/model';

const edge: SystemEdge = {
  id: 'e1', from: 'a', to: 'b', fluid: 'fuel',
  waypoints: [[0, 0], [10, 0], [10, 10]],
  modeFlow: { 'fuel-feed': { active: true, rate: 'high' }, 'fuel-dump': { active: false } },
};

describe('Edge', () => {
  it('renders a polyline with the fluid color class', () => {
    const { container } = render(
      <svg><Edge edge={edge} mode="fuel-feed" selected={false} onSelect={() => {}} fromPos={[0, 0]} toPos={[10, 10]} /></svg>,
    );
    const poly = container.querySelector('polyline')!;
    expect(poly).toBeTruthy();
    expect(poly.getAttribute('class')).toContain('fluid-fuel');
  });

  it('marks the edge inactive when the mode has no active flow', () => {
    const { container } = render(
      <svg><Edge edge={edge} mode="fuel-dump" selected={false} onSelect={() => {}} fromPos={[0, 0]} toPos={[10, 10]} /></svg>,
    );
    expect(container.querySelector('polyline')!.getAttribute('class')).toContain('edge-inactive');
  });
});

const node: SystemNode = {
  id: 'tank2', label: 'Tank 2 (Feed)', type: 'tank', pos: [50, 60], silhouette: {},
  description: 'Feed tank', modeStates: { 'fuel-feed': 'active', 'fuel-ground': 'inactive' },
};

describe('Node', () => {
  it('renders label and is active in feed mode', () => {
    const { container, getByText } = render(
      <svg><Node node={node} mode="fuel-feed" selected={false} onSelect={() => {}} /></svg>,
    );
    expect(getByText('Tank 2 (Feed)')).toBeTruthy();
    expect(container.querySelector('g')!.getAttribute('class')).toContain('node-active');
  });

  it('is dimmed when inactive', () => {
    const { container } = render(
      <svg><Node node={node} mode="fuel-ground" selected={false} onSelect={() => {}} /></svg>,
    );
    expect(container.querySelector('g')!.getAttribute('class')).toContain('node-inactive');
  });
});

const sys: SystemData = {
  nodes: [
    { id: 'a', label: 'A', type: 'tank', pos: [50, 50], silhouette: {}, description: 'x', modeStates: { 'fuel-feed': 'active' } },
    { id: 'b', label: 'B', type: 'engine', pos: [200, 50], silhouette: {}, description: 'y', modeStates: { 'fuel-feed': 'active' } },
  ],
  edges: [{ id: 'e', from: 'a', to: 'b', fluid: 'fuel', waypoints: [], modeFlow: { 'fuel-feed': { active: true } } }],
};

describe('Schematic', () => {
  it('renders one node group per node and one polyline per edge', () => {
    const { container } = render(
      <Schematic data={sys} mode="fuel-feed" selectedId={null} onSelect={() => {}} />,
    );
    expect(container.querySelectorAll('[data-node-id]').length).toBe(2);
    expect(container.querySelectorAll('[data-edge-id]').length).toBe(1);
  });
});

describe('InfoPanel', () => {
  it('shows the selected node label, description, and current-mode role', () => {
    const n: SystemNode = { id: 'a', label: 'Tank 2', type: 'tank', pos: [0, 0], silhouette: {}, description: 'Forward feed tank.', modeStates: { 'fuel-feed': 'active' } };
    const { getByText } = render(<InfoPanel node={n} edge={null} mode="fuel-feed" />);
    expect(getByText('Tank 2')).toBeTruthy();
    expect(getByText('Forward feed tank.')).toBeTruthy();
    expect(getByText(/active/i)).toBeTruthy();
  });

  it('prompts when nothing is selected', () => {
    const { getByText } = render(<InfoPanel node={null} edge={null} mode="fuel-feed" />);
    expect(getByText(/select a component/i)).toBeTruthy();
  });
});

describe('ModeSelector', () => {
  it('renders a button per mode and reports clicks', () => {
    let picked = '';
    const { getByText, container } = render(
      <ModeSelector modes={ECS_MODES} active="ecs-auto" onPick={(id) => (picked = id)} />,
    );
    expect(container.querySelectorAll('button').length).toBe(ECS_MODES.length);
    fireEvent.click(getByText('RAM Air'));
    expect(picked).toBe('ecs-ram');
  });
});

describe('Silhouette', () => {
  it('renders three views and a dot for the selected node where positions exist', () => {
    const n: SystemNode = { id: 'a', label: 'A', type: 'tank', pos: [0, 0],
      silhouette: { top: [500, 430], sideL: [470, 250] }, description: 'x', modeStates: {} };
    const { container } = render(<Silhouette node={n} />);
    expect(container.querySelectorAll('svg').length).toBe(3);
    expect(container.querySelectorAll('.loc-dot').length).toBe(2);
  });

  it('renders the airframe with no dots when nothing selected', () => {
    const { container } = render(<Silhouette node={null} />);
    expect(container.querySelectorAll('.loc-dot').length).toBe(0);
  });
});

describe('App', () => {
  it('defaults to ECS tab and switches to Fuel', () => {
    const { getByRole, getAllByRole } = render(<App />);
    const fuelTab = getByRole('button', { name: /^fuel$/i });
    fireEvent.click(fuelTab);
    expect(getAllByRole('button').some((b) => /normal feed/i.test(b.textContent ?? ''))).toBe(true);
  });
});
