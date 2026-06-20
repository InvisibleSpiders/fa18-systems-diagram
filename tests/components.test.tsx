import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { InfoPanel } from '../src/components/InfoPanel';
import { ModeSelector } from '../src/components/ModeSelector';
import { Silhouette } from '../src/components/Silhouette';
import { ECS_MODES } from '../src/data/modes';
import App from '../src/App';
import type { SystemNode } from '../src/model';

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

  it('reports a dot placement click in edit mode', () => {
    const n: SystemNode = { id: 'a', label: 'A', type: 'tank', pos: [0, 0], silhouette: {}, description: 'x', modeStates: {} };
    let placed: { view: string; pos: [number, number] } | null = null;
    const { container } = render(
      <Silhouette node={n} editMode onPlaceDot={(view, pos) => (placed = { view, pos })} />,
    );
    fireEvent.click(container.querySelector('svg')!);
    expect((placed as { view: string } | null)?.view).toBe('top');
  });
});

describe('App', () => {
  it('defaults to ECS tab and switches to Fuel', () => {
    const { getByRole, getAllByRole } = render(<App />);
    fireEvent.click(getByRole('button', { name: /^fuel$/i }));
    expect(getAllByRole('button').some((b) => /normal feed/i.test(b.textContent ?? ''))).toBe(true);
  });

  it('shows the editor toolbar and toggles edit mode', () => {
    const { getByRole } = render(<App />);
    fireEvent.click(getByRole('button', { name: /^edit$/i }));
    expect(getByRole('button', { name: /editing/i })).toBeTruthy();
  });
});
