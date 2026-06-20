# F/A-18A/B Hornet — ECS & Fuel Interactive Schematic

Interactive, animated schematic diagrams of the early F/A-18A/B Hornet Environmental
Control System (ECS) and Fuel system. Click components to read their function; switch
modes of operation to see flow change.

## Accuracy

Built from publicly available / open-source information only. **No controlled
documentation is used.** Early A/B configuration: LOX breathing (no OBOGS); fuel
tanks 2 & 3 are feed tanks, tanks 1 & 4 are transfer tanks.

The airframe silhouette outline is currently a **placeholder** — see
`src/airframe/SOURCE.md` for the steps to replace it with a precise outline traced
from a license-verified 3-view. Internal component dot positions are approximate.

## Develop

    npm install
    npm run dev
    npm test

## Build

    npm run build

## Deploy

Push to GitHub and import the repo in Vercel (framework auto-detected as Vite),
or run `vercel`.

## Editing the model

- `src/data/ecs.ts`, `src/data/fuel.ts` — components and flow lines
- `src/data/modes.ts` — modes of operation
- `src/airframe/*` — airframe outline paths and dot coordinates

`npm test` enforces data integrity (no dangling edges, valid mode ids, no orphans).

## Fluid color legend

| Fluid | Color |
|---|---|
| Hot bleed air | orange-red |
| Regulated bleed | amber |
| Conditioned air | blue |
| Ram air | cyan |
| Fuel | green |
| Fuel vapor / sensing | pale green (dashed) |
| PAO coolant | purple |
