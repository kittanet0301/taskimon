import { existsSync, readFileSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { CREATURE_SPECIES, STAGE_CLIPS, clipGrid } from './creature-manifest.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsRoot = join(__dirname, '..', 'assets')

const DEFAULT_FRAME_SIZE = 128

const FRAME_COUNTS = {
  move: 4,
  hatch: 6,
  idle: 4,
  hurt: 4,
  bite: 4,
  jump: 4
}

function assetPath(relativePath) {
  return join(assetsRoot, relativePath)
}

function checkExists(relativePath) {
  return existsSync(assetPath(relativePath))
}

function probeImageSize(filePath) {
  const result = spawnSync(
    'python',
    [
      '-c',
      'from PIL import Image; import sys; im=Image.open(sys.argv[1]); print(im.width, im.height)',
      filePath
    ],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) return null
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number)
  if (!width || !height) return null
  return { width, height }
}

function loadFrameManifest() {
  const manifestPath = assetPath('creatures/frame-manifest.json')
  if (!existsSync(manifestPath)) return null
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

function expectedFrameSize(manifest, species, stage, clip) {
  return manifest?.[species]?.[stage]?.[clip]?.frameSize ?? DEFAULT_FRAME_SIZE
}

function expectedFrameCount(manifest, species, stage, clip) {
  return manifest?.[species]?.[stage]?.[clip]?.frames ?? clipGrid(stage, clip).frames
}

function collectCreaturePaths() {
  const paths = []
  for (const species of CREATURE_SPECIES) {
    for (const [stage, clips] of Object.entries(STAGE_CLIPS)) {
      for (const clip of clips) {
        paths.push({ species, stage, clip, relative: `creatures/${species}/${stage}/${clip}.png` })
      }
    }
  }
  return paths
}

function main() {
  const manifest = loadFrameManifest()
  const jobs = collectCreaturePaths()
  const missingSprites = jobs.filter((job) => !checkExists(job.relative))
  const presentSprites = jobs.length - missingSprites.length
  const coverage = jobs.length === 0 ? 0 : Math.round((presentSprites / jobs.length) * 100)

  console.log('Taskino creature asset check')
  console.log(`Assets root: ${assetsRoot}`)
  console.log(`Creature coverage: ${presentSprites}/${jobs.length} (${coverage}%)`)
  if (manifest) {
    console.log('Using adaptive frame-manifest.json')
  } else {
    console.log(`No frame-manifest.json — falling back to ${DEFAULT_FRAME_SIZE}px frames`)
  }

  if (missingSprites.length > 0) {
    console.log('')
    console.log('Missing creature sprite files:')
    for (const job of missingSprites) {
      console.log(`  - ${job.relative}`)
    }
    process.exit(1)
  }

  const dimensionErrors = []
  for (const job of jobs) {
    const filePath = assetPath(job.relative)
    const stat = statSync(filePath)
    if (stat.size === 0) {
      dimensionErrors.push(`${job.relative}: empty file`)
      continue
    }

    const size = probeImageSize(filePath)
    if (!size) {
      dimensionErrors.push(`${job.relative}: could not read image dimensions`)
      continue
    }

    const frameSize = expectedFrameSize(manifest, job.species, job.stage, job.clip)
    const expectedFrames = expectedFrameCount(manifest, job.species, job.stage, job.clip)
    const expectedWidth = frameSize * expectedFrames

    if (size.height !== frameSize) {
      dimensionErrors.push(
        `${job.relative}: height ${size.height}px (expected ${frameSize}px)`
      )
    }
    if (size.width !== expectedWidth) {
      dimensionErrors.push(
        `${job.relative}: width ${size.width}px (expected ${expectedWidth}px = ${expectedFrames} frames @ ${frameSize}px)`
      )
    }
  }

  if (dimensionErrors.length > 0) {
    console.log('')
    console.log('Dimension mismatches:')
    for (const err of dimensionErrors) {
      console.log(`  - ${err}`)
    }
    process.exit(1)
  }

  console.log(`All ${jobs.length} creature strips: present, adaptive frame sizes OK.`)
}

main()
