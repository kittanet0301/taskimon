import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pyScript = join(__dirname, 'stitch_sprite_strip.py')

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/stitch-sprite-strip.mjs --input-dir <dir> --output <file> --prefix <name> [--frame-size 128]`)
  process.exit(args.length === 0 ? 1 : 0)
}

const result = spawnSync('python', [pyScript, ...args], { stdio: 'inherit' })
process.exit(result.status ?? 1)
