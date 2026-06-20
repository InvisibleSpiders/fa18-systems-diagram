import type { Mode } from '../model';

export const MODES: Mode[] = [
  // ECS
  { id: 'ecs-ground',   label: 'Ground Ops',        system: 'ecs', description: 'Engine/APU bleed air provides ground cooling and pressurization on deck.' },
  { id: 'ecs-auto',     label: 'Normal AUTO',       system: 'ecs', description: 'Automatic temperature and cabin pressure scheduling in flight.' },
  { id: 'ecs-manual',   label: 'MANUAL Temp',       system: 'ecs', description: 'Crew manually commands the temperature mixing valve, bypassing auto schedule.' },
  { id: 'ecs-ram',      label: 'RAM Air',           system: 'ecs', description: 'Emergency mode: bleed air shut off, ram air provides ventilation and cooling.' },
  { id: 'ecs-antiice',  label: 'Anti-Ice / Defog',  system: 'ecs', description: 'Bleed air heats windshield, pitot, and inlets; defog flow to canopy.' },
  { id: 'ecs-avionics', label: 'Avionics / Radar',  system: 'ecs', description: 'Conditioned air cools avionics; PAO liquid loop cools the radar.' },
  // Fuel
  { id: 'fuel-feed',     label: 'Normal Feed',        system: 'fuel', description: 'Feed tanks 2 & 3 supply the engines via boost pumps.' },
  { id: 'fuel-transfer', label: 'Internal Transfer',  system: 'fuel', description: 'Transfer tanks 1 & 4 and wing tanks replenish feed tanks 2 & 3.' },
  { id: 'fuel-external', label: 'External Transfer',  system: 'fuel', description: 'Centerline and wing 330 gal tanks transfer inward, bleed-air pressurized.' },
  { id: 'fuel-ar',       label: 'Aerial Refuel',      system: 'fuel', description: 'Starboard nose probe receives fuel; refuel/transfer valves distribute it.' },
  { id: 'fuel-ground',   label: 'Ground Refuel',      system: 'fuel', description: 'Single-point pressure refueling fills all tanks from one receptacle.' },
  { id: 'fuel-dump',     label: 'Fuel Dump',          system: 'fuel', description: 'Dump valves route fuel overboard through the dump masts.' },
  { id: 'fuel-bingo',    label: 'Bingo / Low State',  system: 'fuel', description: 'Low-level and bingo sensors trigger warning at preset quantity.' },
];

export const ECS_MODES = MODES.filter((m) => m.system === 'ecs');
export const FUEL_MODES = MODES.filter((m) => m.system === 'fuel');
