import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Toolbar } from '../src/components/Toolbar';

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
