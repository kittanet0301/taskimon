# Asset credits

## Dino Family (pet sprites)

- **Pack:** [Dino Family v1.5.0](https://demching.itch.io/dino-family) by [DemChing](https://demching.itch.io/)
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Commercial use:** Allowed (free)
- **Attribution required:** Yes — credit **DemChing** and **ScissorMarks** (original [Dino Characters](https://arks.itch.io/dino-characters) base)

### Suggested attribution (in-game or README)

> Pet sprites from [Dino Family](https://demching.itch.io/dino-family) by DemChing, based on [Dino Characters](https://arks.itch.io/dino-characters) by ScissorMarks. Used under CC BY 4.0.

### Local layout

```
assets/dino/{male|female}/{character}/{base|egg|ghost}/{animation}.png
```

- **Characters:** cole, doux, kira, kuro, loki, mono, mort, nico, olaf, sena, tard, vita
- **Frame height:** 24px (horizontal strips; slice per animation)
- **Egg:** move, crack, hatch
- **Base:** idle, move, hurt, bite, kick, dash, jump, avoid, scan, dead
- **Ghost:** idle, move

### TODO — incomplete male `base/` sprites

Copy missing files from the Dino Family pack into `assets/dino/male/{character}/base/` (need 10 clips each; these folders currently have only 5):

| Character | Missing (typical) |
|-----------|-------------------|
| doux | dash, hurt, idle, kick, move |
| mort | dash, hurt, idle, kick, move |
| tard | dash, hurt, idle, kick, move |
| vita | dash, hurt, idle, kick, move |

Until fixed, those male variants may show a colored circle fallback in-game.

## UI assets (`assets/ui/`)

Project UI art lives under `assets/ui/` (served as `/ui/...` in the app), including:

- `taskino-logo.png` — top bar / title branding
- HUD icons (nav, stats, collection, inventory, etc.)
- Item icons used by inventory and the home quickbar

Keep new UI PNGs in that folder and register required paths in `scripts/check-assets.mjs` when adding critical files.

## Fonts (not in `assets/`)

Loaded via Google Fonts in `src/styles.css`:

- **Mali** — Thai / primary UI
- **Press Start 2P** — pixel HUD labels, badges, quickbar quantities

