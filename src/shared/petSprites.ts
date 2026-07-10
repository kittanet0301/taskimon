import type { PetData } from './types'
import type { DinoCharacter } from './dinoCharacters'
import { dinoAssetBase } from './dinoCharacters'
import type { Stage } from './types'
import {
  CREATURE_FRAME_SIZE,
  CREATURE_PIXEL_SCALE,
  creatureDisplaySize,
  DEFAULT_CREATURE_SPECIES,
  creatureAssetBase,
  creatureRenderStage,
  isCreatureSpecies,
  type CreatureSpecies
} from './creatureCharacters'
import { creatureMaxFrameSize } from './creatureFrameManifest'
import {
  DINO_FRAMES_PER_SPRITE_FRAME,
  DINO_HATCH_FRAMES_PER_SPRITE_FRAME,
  DINO_HATCH_POST_DELAY_TICKS,
  hatchWaitMsForFrameCount
} from './dinoTiming'

export const DINO_FRAME_SIZE = 24

export type DinoSpriteFolder = 'base' | 'egg' | 'ghost'
export type PetSpriteFolder = DinoSpriteFolder | 'baby' | 'adult'

const imageCache = new Map<string, HTMLImageElement | Promise<HTMLImageElement>>()

export function frameSizeForSpecies(species: string): number {
  return isCreatureSpecies(species) ? CREATURE_FRAME_SIZE : DINO_FRAME_SIZE
}

export function frameSizeFromStrip(img: HTMLImageElement, species: string): number {
  if (isCreatureSpecies(species) && img.height > 0) {
    return img.height
  }
  return frameSizeForSpecies(species)
}

export function frameSizeForPet(pet: Pick<PetData, 'character' | 'stage'>): number {
  if (isCreatureSpecies(pet.character)) {
    return creatureMaxFrameSize(pet.character, creatureRenderStage(pet.stage))
  }
  return DINO_FRAME_SIZE
}

export function frameCountFromImage(img: HTMLImageElement, species: string): number {
  const frameSize = frameSizeFromStrip(img, species)
  return Math.max(1, Math.floor(img.width / frameSize))
}

/** Dino Family egg hatch strips are 4 frames; creature strips are up to 6. */
export function expectedHatchFrameCount(species: string): number {
  return isCreatureSpecies(species) ? 6 : 4
}

/** UI wait: hatch animation + post-hatch hold on final frame. */
export function hatchAnimMsForSpecies(species: string): number {
  return hatchWaitMsForFrameCount(expectedHatchFrameCount(species))
}

/** Wait until hatch RAF completes; falls back to timing if the callback never fires. */
export function waitForHatchAnimation(
  species: string,
  onSubscribe: (notifyComplete: () => void) => void
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    onSubscribe(finish)
    window.setTimeout(finish, hatchAnimMsForSpecies(species) + 250)
  })
}

/** Hatch plays once (no loop); other clips loop normally. */
export function spriteFrameIndexForClip(
  clip: string,
  tick: number,
  img: HTMLImageElement,
  species: string
): number {
  const frameCount = frameCountFromImage(img, species)
  if (clip === 'hatch') {
    const index = Math.floor(tick / DINO_HATCH_FRAMES_PER_SPRITE_FRAME)
    return Math.min(index, frameCount - 1)
  }
  const index = Math.floor(tick / DINO_FRAMES_PER_SPRITE_FRAME)
  return ((index % frameCount) + frameCount) % frameCount
}

/** True once hatch playback and post-hatch hold have finished (RAF-synced). */
export function isHatchAnimationComplete(
  tick: number,
  frameCount: number,
  ticksPerFrame: number = DINO_HATCH_FRAMES_PER_SPRITE_FRAME,
  postDelayTicks: number = DINO_HATCH_POST_DELAY_TICKS
): boolean {
  return tick >= frameCount * ticksPerFrame + postDelayTicks
}

/** Integer scale only — pixel art must land on whole pixels. */
export function pixelScaleForPet(pet: Pick<PetData, 'character' | 'stage'>): number {
  if (isCreatureSpecies(pet.character)) return CREATURE_PIXEL_SCALE
  return pet.stage === 'baby' ? 3 : 4
}

export function pixelScaleForStage(stage: Stage, species?: string): number {
  if (species && isCreatureSpecies(species)) return CREATURE_PIXEL_SCALE
  return stage === 'baby' ? 3 : 4
}

/** Scale to fit a custom canvas without clipping (dashboard). */
export function pixelScaleForCanvas(
  pet: Pick<PetData, 'character' | 'stage'>,
  canvasSize: number
): number {
  const frameSize = frameSizeForPet(pet)
  if (isCreatureSpecies(pet.character)) {
    return creatureDisplaySize(pet.stage) / frameSize
  }
  return Math.max(1, Math.min(Math.floor(canvasSize / frameSize), pixelScaleForPet(pet)))
}

const CREATURE_BOB_PADDING = 8

/** Canvas must equal draw size (+ bob room) so scaled sprites are not clipped. */
export function resolveSpriteRenderSize(
  pet: Pick<PetData, 'character' | 'stage'>,
  requestedSize?: number
): { canvasSize: number; pixelScale: number; drawSize: number } {
  const frameSize = frameSizeForPet(pet)
  if (isCreatureSpecies(pet.character)) {
    const drawSize = requestedSize ?? creatureDisplaySize(pet.stage)
    const bobPad = CREATURE_BOB_PADDING
    return {
      canvasSize: drawSize + bobPad,
      pixelScale: drawSize / frameSize,
      drawSize
    }
  }
  if (requestedSize == null) {
    const pixelScale = pixelScaleForPet(pet)
    const drawSize = pixelScale * frameSize
    return { canvasSize: drawSize, pixelScale, drawSize }
  }
  const pixelScale = pixelScaleForCanvas(pet, requestedSize)
  const drawSize = pixelScale * frameSize
  return { canvasSize: drawSize, pixelScale, drawSize }
}

export function displaySizeForPet(pet: Pick<PetData, 'character' | 'stage'>): number {
  if (isCreatureSpecies(pet.character)) return creatureDisplaySize(pet.stage)
  return pixelScaleForPet(pet) * frameSizeForPet(pet)
}

/** On-screen sprite size in the chat lobby — adult is 2× baby/egg. */
export const LOBBY_SPRITE_BABY = 80
export const LOBBY_SPRITE_ADULT = LOBBY_SPRITE_BABY * 2

export function lobbyDisplaySizeForPet(pet: Pick<PetData, 'character' | 'stage'>): number {
  return pet.stage === 'adult' ? LOBBY_SPRITE_ADULT : LOBBY_SPRITE_BABY
}

/** Dino Jump minigame — baby/egg height matches hitbox; adult is 2×. */
export const MINIGAME_JUMP_SPRITE_BABY = 48
export const MINIGAME_JUMP_SPRITE_ADULT = MINIGAME_JUMP_SPRITE_BABY * 2

export function minigameJumpDisplaySizeForPet(pet: Pick<PetData, 'character' | 'stage'>): number {
  return pet.stage === 'adult' ? MINIGAME_JUMP_SPRITE_ADULT : MINIGAME_JUMP_SPRITE_BABY
}

export function displaySizeFromPixelScale(pixelScale: number, species?: string, stage?: Stage): number {
  if (species && isCreatureSpecies(species)) {
    if (stage) return creatureDisplaySize(stage)
    return pixelScale * creatureMaxFrameSize(species, 'baby')
  }
  return pixelScale * DINO_FRAME_SIZE
}

export function petSpriteUrl(
  pet: Pick<PetData, 'character' | 'gender' | 'stage'>,
  folder: PetSpriteFolder,
  clip: string
): string {
  if (isCreatureSpecies(pet.character)) {
    const stageFolder = folder === 'egg' ? 'egg' : creatureRenderStage(pet.stage)
    return creatureAssetBase(pet.character, stageFolder, clip)
  }
  const dinoFolder = folder === 'baby' || folder === 'adult' ? 'base' : folder
  return dinoAssetBase(pet.gender, pet.character as DinoCharacter, dinoFolder as DinoSpriteFolder, clip)
}

export function dinoSpriteUrl(
  gender: PetData['gender'],
  character: DinoCharacter,
  folder: DinoSpriteFolder,
  clip: string
): string {
  return dinoAssetBase(gender, character, folder, clip)
}

export function setupCrispCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight?: number,
  cssSized = true
): CanvasRenderingContext2D {
  const logicalH = logicalHeight ?? logicalWidth
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(logicalWidth * dpr)
  canvas.height = Math.round(logicalH * dpr)
  if (cssSized) {
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalH}px`
  } else {
    canvas.style.width = ''
    canvas.style.height = ''
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
  return ctx
}

export function loadPetSprite(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url)
  if (cached instanceof HTMLImageElement) return Promise.resolve(cached)
  if (cached) return cached

  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`))
    img.src = url
  })
  imageCache.set(url, loading)
  return loading
}

export const loadDinoSprite = loadPetSprite

export function preloadPetSprites(urls: string[]): Promise<void> {
  return Promise.all(urls.map(loadPetSprite)).then(() => undefined)
}

export const preloadDinoSprites = preloadPetSprites

export function drawPetSpriteFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frameIndex: number,
  species: string,
  options: {
    x: number
    y: number
    pixelScale: number
    drawSize?: number
    flipX?: boolean
  }
): void {
  const frameSize = frameSizeFromStrip(img, species)
  const frameCount = frameCountFromImage(img, species)
  const frame = ((frameIndex % frameCount) + frameCount) % frameCount
  const size = options.drawSize ?? Math.round(options.pixelScale * frameSize)
  const scale = size / frameSize
  const dx = Math.round(options.x - size / 2)
  const dy = Math.round(options.y - size / 2)
  const sx = frame * frameSize

  ctx.imageSmoothingEnabled = false

  if (options.flipX) {
    ctx.save()
    ctx.translate(dx + size, dy)
    ctx.scale(-scale, scale)
    ctx.drawImage(img, sx, 0, frameSize, frameSize, 0, 0, frameSize, frameSize)
    ctx.restore()
  } else {
    ctx.drawImage(img, sx, 0, frameSize, frameSize, dx, dy, size, size)
  }
}

export function drawDinoSpriteFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frameIndex: number,
  options: {
    x: number
    y: number
    pixelScale: number
    flipX?: boolean
    species?: string
  }
): void {
  drawPetSpriteFrame(ctx, img, frameIndex, options.species ?? DEFAULT_CREATURE_SPECIES, options)
}

export function isCreaturePet(pet: Pick<PetData, 'character'>): pet is PetData & { character: CreatureSpecies } {
  return isCreatureSpecies(pet.character)
}

export { creatureDisplaySize, CREATURE_DISPLAY_SIZE } from './creatureCharacters'
