import { useRef } from 'react';

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onTidy: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

export function Toolbar({ editMode, onToggleEdit, onTidy, onExport, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="toolbar">
      <button className={editMode ? 'tool active' : 'tool'} onClick={onToggleEdit}>
        {editMode ? 'Editing' : 'Edit'}
      </button>
      <button className="tool" onClick={onTidy}>Tidy</button>
      <button className="tool" onClick={onExport}>Export</button>
      <button className="tool" onClick={() => fileRef.current?.click()}>Import</button>
      <button className="tool" onClick={onReset}>Reset</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
