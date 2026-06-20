import type { Mode } from '../model';

interface Props {
  modes: Mode[];
  active: string;
  onPick: (id: string) => void;
}

export function ModeSelector({ modes, active, onPick }: Props) {
  return (
    <div className="mode-selector">
      {modes.map((m) => (
        <button
          key={m.id}
          className={m.id === active ? 'mode active' : 'mode'}
          onClick={() => onPick(m.id)}
          title={m.description}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
