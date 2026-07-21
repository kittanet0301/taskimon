import { CLIP_GRID, clipGrid } from './creature-manifest.mjs'
import {
  MEGA_SHEET_CELL,
  MEGA_SHEET_LAYOUT,
  clipBlockSize,
  megaSheetCanvasSize
} from './mega-sheet-layout.mjs'

const ACTION_PROMPTS = {
  idle:
    'Four subtle idle frames: (1) mouth closed neutral, (2) mouth slightly open, (3) eyes blink closed, (4) neutral return — canonical standing baby pose. Minimal body motion. Frame 4 is the master identity reference.',
  move: 'Four walk cycle frames facing left: natural quadruped walk, consistent stride, feet on shared ground line.',
  hurt: 'Four hurt reaction frames: flinch, eyes squeezed, body recoils but stays facing left.',
  bite: 'Four attack/bite frames: lean forward, mouth opens wider each beat, short lunge without crossing cell edges.',
  jump: 'Four jump frames: crouch, takeoff, apex, land. Feet return to same baseline on last frame.',
  move_egg: 'Four egg idle/wobble frames: intact egg in nest, subtle rocking only.',
  move_egg_6:
    'Six egg idle/wobble frames: intact egg in nest, subtle rocking and nest detail variations. Same egg identity throughout all six cells.',
  hatch:
    'Six hatch frames left to right top row then bottom: (1) whole egg, (2) eye peeks, (3) head and claw out, (4) sitting in broken shell, (5) stepping out, (6) baby stands beside shell remains. Frame 6 baby MUST match baby master reference exactly.'
}

/** Per-species stage identity rules. Keys match CREATURE_SPECIES. */
export const SPECIES_STAGE_RULES = {
  'ember-sail': {
    displayName: 'Ember Sail',
    egg: [
      'Volcanic egg or hatching sequence for Ember Sail species.',
      'Dark charcoal rocky shell with orange lava vein cracks.',
      'Egg sits in jagged dark rock nest with faint orange glow at base.',
      'Subject must occupy ~75–85% of each cell height, centered on nest baseline.'
    ],
    baby: [
      'Baby Ember Sail — chibi proportions, large head, short limbs.',
      'Small glowing orange dorsal plates/spikes along the back (compact, not huge).',
      'Dark charcoal rocky skin with orange lava cracks, big orange eyes.',
      'Match the BABY design from the species board reference.',
      'Subject must occupy ~50–55% of each cell height; feet on shared ground line.'
    ],
    adult: [
      'Adult Ember Sail — evolved form clearly larger and longer than baby (~35-45% taller silhouette).',
      'Massive jagged glowing dorsal SAIL on the back (volcanic glass / molten ridges).',
      'Longer snout with visible teeth, heavier limbs, same lava-rock palette.',
      'Match the ADULT design from the species board reference.',
      'CRITICAL: entire body, tail tip, and dorsal sail must fit FULLY inside each cell with generous green margin on all sides — never touch or cross cell edges.',
      'Subject occupies ~50–60% of cell width and ~55–65% of cell height only; feet on shared ground line.'
    ]
  },
  garden: {
    displayName: 'Garden',
    egg: [
      'Leafy garden egg for Garden species.',
      'Cream/off-white shell with green vine and leaf patterns growing on the surface.',
      'Egg sits in a nest of thick green leaves with small white flowers (yellow centers).',
      'Subject must occupy ~75–85% of each cell height, centered on nest baseline.'
    ],
    baby: [
      'Baby Garden — chibi sauropod proportions, large head, long neck, short limbs.',
      'Green body with darker leaf-shaped markings, cream underbelly and neck front.',
      'Small green leaf plates along the back with tiny white flowers; leaf/flower cluster on head.',
      'Match the BABY design from the species board reference.',
      'Subject must occupy ~50–55% of each cell height; feet on shared ground line.'
    ],
    adult: [
      'Adult Garden — evolved form clearly larger and longer than baby (~35-45% taller silhouette).',
      'Longer neck and tail, larger leaf plates along the back (stegosaurus-like leaf plates), more white flowers.',
      'Same green/cream leaf palette as baby; heavier limbs.',
      'Match the ADULT design from the species board reference.',
      'CRITICAL BACKGROUND: solid flat chroma-key magenta #FF00FF only — never cream, beige, white paper, card, frame, or nested square behind the subject.',
      'CRITICAL TAIL FIT: draw a COMPACT curled/tucked tail that ends in a pointed tip fully inside the cell — never stretch the tail to the right edge, never truncate or flat-cut the tip.',
      'CRITICAL: entire body, long neck, pointed tail tip, and leaf plates must fit FULLY inside each cell with thick magenta margin on ALL sides (especially RIGHT and TOP) — never touch or cross cell edges.',
      'Subject occupies only ~40–48% of cell width and ~45–55% of cell height; leave ≥12% magenta padding on the right for the tail tip; feet on shared ground line.'
    ]
  }  ,
  'blaze-crest': {
    displayName: 'Blaze Crest',
    egg: [
      'Volcanic fire egg for Blaze Crest species.',
      'Warm grey-brown rocky shell with bright orange-yellow magma cracks.',
      'Egg sits in dark ash-stone nest with ember glow.',
      'Subject must occupy ~75–85% of each cell height, centered on nest baseline.'
    ],
    baby: [
      'Baby Blaze Crest — chibi quadruped, large head, short limbs.',
      'Warm terracotta-red rocky body, cream-orange glowing underbelly.',
      'Translucent orange-yellow flame-shaped crest plates along the back; small flame tuft on head.',
      'Match the BABY design from the species board reference.',
      'Subject must occupy ~50–55% of each cell height; feet on shared ground line.'
    ],
    adult: [
      'Adult Blaze Crest — evolved form clearly larger than baby (~35-45% taller silhouette).',
      'Taller flame crest plates, more magma veins, heavier limbs, same terracotta/flame palette.',
      'Match the ADULT design from the species board reference.',
      'CRITICAL: entire body and flame crest must fit FULLY inside each cell with generous magenta margin — never touch or cross cell edges.',
      'Subject occupies ~50–60% of cell width and ~55–65% of cell height only; feet on shared ground line.'
    ]
  }
}

const GRID_LAYOUT_RULES = {
  '2x2':
    'CRITICAL LAYOUT: exactly 2 rows and 2 columns — NOT a single horizontal strip of 4. ' +
    'Reading order left-to-right, top-to-bottom: top-left=frame 1, top-right=frame 2, bottom-left=frame 3, bottom-right=frame 4. ' +
    'Visual grid: [1][2] on top row, [3][4] on bottom row.',
  '2x3':
    'CRITICAL LAYOUT: exactly 2 rows and 3 columns — NOT a single row of 6. ' +
    'Reading order left-to-right, top-to-bottom: top row frames 1-2-3, bottom row frames 4-5-6. ' +
    'Visual grid: [1][2][3] on top row, [4][5][6] on bottom row.'
}

const BASE_RULES_GREEN = [
  'Solid flat chroma-key green #00FF00 background only in gaps between cells.',
  'Clean crisp pixel-art game creature sprite, 128px cell output target.',
  'Hard pixel edges only — no motion blur, no soft anti-aliasing, no depth-of-field, no painterly softness.',
  'Identical rendering sharpness, pixel density, and edge crispness in every cell of this sheet.',
  'Side view facing LEFT in every cell unless noted.',
  'Full subject centered in each cell; nothing crosses cell edges.',
  'Consistent character scale and feet baseline across all cells in this sheet.',
  'No text, labels, grid lines, borders, numbers, digits, frame indices, or watermarks of any kind.'
]

const BASE_RULES_MAGENTA = [
  'Solid flat chroma-key magenta #FF00FF background only in gaps between cells.',
  'Clean crisp pixel-art game creature sprite, 128px cell output target.',
  'Hard pixel edges only — no motion blur, no soft anti-aliasing, no depth-of-field, no painterly softness.',
  'Identical rendering sharpness, pixel density, and edge crispness in every cell of this sheet.',
  'Side view facing LEFT in every cell unless noted.',
  'Full subject centered in each cell; nothing crosses cell edges.',
  'Consistent character scale and feet baseline across all cells in this sheet.',
  'No text, labels, grid lines, borders, numbers, digits, frame indices, or watermarks of any kind.'
]

function baseRulesFor(species) {
  return species === 'garden' ? BASE_RULES_MAGENTA : BASE_RULES_GREEN
}

function chromaBgPhrase(species) {
  return species === 'garden'
    ? 'Solid flat chroma-key magenta #FF00FF background ONLY (full square background).'
    : 'Solid flat chroma-key green #00FF00 background ONLY (full square background).'
}

function gridPixels(rows, cols) {
  const cell = 512
  return { width: cols * cell, height: rows * cell, cell }
}

function speciesRules(species) {
  const rules = SPECIES_STAGE_RULES[species]
  if (!rules) throw new Error(`Unknown species for prompts: ${species}`)
  return rules
}

function displayName(species) {
  return speciesRules(species).displayName
}

function stageRulesFor(species, stage) {
  const rules = speciesRules(species)
  return rules[stage] ?? rules.baby
}

/** Single master-adult portrait evolved from master-baby (not a sprite sheet). */
export function buildMasterAdultPrompt(species = 'ember-sail') {
  const name = displayName(species)
  const stageRules = stageRulesFor(species, 'adult').join(' ')
  return [
    'Single pixel-art game creature sprite — ONE character only, NOT a sprite sheet.',
    `Adult ${name} evolved from the attached master-baby reference.`,
    'Side view facing LEFT, canonical standing idle pose, mouth closed neutral, feet on ground line.',
    'Centered in frame with generous padding on all sides.',
    stageRules,
    'Evolve the baby into adult while keeping the same palette, eye color, and pixel density as master-baby.',
    chromaBgPhrase(species),
    'Clean crisp pixel-art game creature sprite. Hard pixel edges only — no motion blur, no soft anti-aliasing.',
    'Side view facing LEFT. No text, labels, grid lines, borders, numbers, digits, or watermarks.'
  ].join(' ')
}

export function buildGenPrompt(stage, clip, species = 'ember-sail') {
  const grid = clipGrid(stage, clip)
  if (!grid) throw new Error(`Unknown clip: ${stage}/${clip}`)

  const { rows, cols } = grid
  const { width, height, cell } = gridPixels(rows, cols)
  let actionKey = clip
  if (stage === 'egg' && clip === 'move' && grid.frames === 6) actionKey = 'move_egg_6'
  else if (stage === 'egg' && clip === 'move') actionKey = 'move_egg'
  const action = ACTION_PROMPTS[actionKey] ?? ACTION_PROMPTS.idle
  const stageRules = stageRulesFor(species, stage)
  const name = displayName(species)

  const layoutKey = `${rows}x${cols}`
  const layoutRule = GRID_LAYOUT_RULES[layoutKey] ?? ''

  return [
    `${name} creature sprite sheet — ${stage} stage, ${clip} animation.`,
    `${rows}x${cols} sprite sheet (${grid.frames} cells), total image ${width}x${height}px, each cell ${cell}x${cell}px.`,
    layoutRule,
    ...baseRulesFor(species),
    ...stageRules,
    `Action: ${action}`,
    stage === 'adult' && clip === 'idle'
      ? 'Use the attached master-adult and species board for exact adult identity and proportions.'
      : 'Use the attached species board and stage master reference for exact identity and proportions.'
  ].join(' ')
}

export function referencesForStage(stage, clip, paths) {
  const refs = [paths.speciesBoard]
  if (stage === 'baby' && clip === 'idle') {
    return refs.filter(Boolean)
  }
  if (stage === 'adult' && clip === 'idle') {
    if (paths.masterAdult) refs.unshift(paths.masterAdult)
    return refs.filter(Boolean)
  }
  if (stage === 'baby' && paths.masterBaby) refs.unshift(paths.masterBaby)
  if (stage === 'adult' && paths.masterAdult) refs.unshift(paths.masterAdult)
  if (stage === 'egg') {
    if (paths.masterBaby) refs.unshift(paths.masterBaby)
  }
  return refs.filter(Boolean)
}

export function buildGenPlanEntry(species, stage, clip, paths) {
  const grid = clipGrid(stage, clip)
  const { width, height } = gridPixels(grid.rows, grid.cols)
  return {
    species,
    stage,
    clip,
    grid: `${grid.rows}x${grid.cols}`,
    frames: grid.frames,
    outputSize: `${width}x${height}`,
    prompt: buildGenPrompt(stage, clip, species),
    references: referencesForStage(stage, clip, paths),
    saveRawTo: paths.saveRawTo,
    notes: 'Generate with Cursor GenerateImage. Attach all listed references.'
  }
}

function actionPromptFor(stage, clip) {
  const actionKey = stage === 'egg' && clip === 'move' ? 'move_egg' : clip
  return ACTION_PROMPTS[actionKey] ?? ACTION_PROMPTS.idle
}

function describeClipBlock(entry, species) {
  const { stage, clip, x, y, rows, cols } = entry
  const { width, height } = clipBlockSize(entry)
  const action = actionPromptFor(stage, clip)
  const stageRules = stageRulesFor(species, stage).join(' ')
  return [
    `BLOCK at pixel (${x},${y}) size ${width}x${height}px = ${rows}x${cols} grid of ${MEGA_SHEET_CELL}px cells.`,
    `${stage}/${clip}: ${stageRules}`,
    `Action: ${action}`
  ].join(' ')
}

export function buildMegaSheetPrompt(species = 'ember-sail') {
  const { width, height } = megaSheetCanvasSize()
  const blockDescriptions = MEGA_SHEET_LAYOUT.map((entry) => describeClipBlock(entry, species))

  return [
    `${species} creature MEGA animation atlas — single combined sprite sheet.`,
    `Total canvas ${width}x${height}px.`,
    `Every animation cell is ${MEGA_SHEET_CELL}x${MEGA_SHEET_CELL}px.`,
    species === 'garden'
      ? 'Solid flat chroma-key magenta #FF00FF background in all gaps between cells and blocks.'
      : 'Solid flat chroma-key green #00FF00 background in all gaps between cells and blocks.',
    'Clean crisp pixel-art game creature sprites — hard edges, no blur, identical sharpness in every cell.',
    'Side view facing LEFT in every cell.',
    'Full subject centered in each cell; nothing crosses cell edges.',
    'Consistent character identity and scale within each block; feet on shared baseline per block.',
    'No text, labels, grid lines, borders, or decorative frames between blocks.',
    'Use the attached species board reference for exact egg, baby, and adult identity.',
    'Layout — place each block at exact pixel origin (top-left of block):',
    ...blockDescriptions
  ].join(' ')
}
