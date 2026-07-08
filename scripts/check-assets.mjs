import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsRoot = join(__dirname, '..', 'assets')

const CHARACTERS = [
  'cole',
  'doux',
  'kira',
  'kuro',
  'loki',
  'mono',
  'mort',
  'nico',
  'olaf',
  'sena',
  'tard',
  'vita'
]
const GENDERS = ['male', 'female']
const EGG_CLIPS = ['move', 'crack', 'hatch']
const BASE_CLIPS = ['idle', 'move', 'hurt', 'bite', 'kick', 'dash', 'jump', 'avoid', 'scan', 'dead']
const GHOST_CLIPS = ['idle', 'move']

const REQUIRED_FILES = [
  'ui/taskino-logo.png',
  'dino/male/doux/egg/move.png'
]

function assetPath(relativePath) {
  return join(assetsRoot, relativePath)
}

function checkExists(relativePath) {
  return existsSync(assetPath(relativePath))
}

function collectSpritePaths() {
  const paths = []
  for (const gender of GENDERS) {
    for (const character of CHARACTERS) {
      for (const clip of EGG_CLIPS) {
        paths.push(`dino/${gender}/${character}/egg/${clip}.png`)
      }
      for (const clip of BASE_CLIPS) {
        paths.push(`dino/${gender}/${character}/base/${clip}.png`)
      }
      for (const clip of GHOST_CLIPS) {
        paths.push(`dino/${gender}/${character}/ghost/${clip}.png`)
      }
    }
  }
  return paths
}

function main() {
  const missingRequired = REQUIRED_FILES.filter((path) => !checkExists(path))
  const spritePaths = collectSpritePaths()
  const missingSprites = spritePaths.filter((path) => !checkExists(path))
  const presentSprites = spritePaths.length - missingSprites.length
  const coverage = spritePaths.length === 0 ? 0 : Math.round((presentSprites / spritePaths.length) * 100)

  console.log('Taskino asset check')
  console.log(`Assets root: ${assetsRoot}`)
  console.log('')

  if (missingRequired.length === 0) {
    console.log('Required files: OK')
  } else {
    console.log('Required files: MISSING')
    for (const path of missingRequired) {
      console.log(`  - ${path}`)
    }
  }

  console.log(`Sprite coverage: ${presentSprites}/${spritePaths.length} (${coverage}%)`)

  if (missingSprites.length > 0) {
    console.log('')
    console.log('Missing sprite files (first 20):')
    for (const path of missingSprites.slice(0, 20)) {
      console.log(`  - ${path}`)
    }
    if (missingSprites.length > 20) {
      console.log(`  ... and ${missingSprites.length - 20} more`)
    }
    console.log('')
    console.log('Download the Dino Family pack: https://demching.itch.io/dino-family')
    console.log('See assets/CREDITS.md for the expected folder layout.')
  } else {
    console.log('All expected sprite files are present.')
  }

  if (missingRequired.length > 0) {
    process.exit(1)
  }
}

main()
