import { mkdir, writeFile, rm, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const target = join(root, 'node_modules', 'ws')

async function main() {
  const res = await fetch('https://registry.npmjs.org/ws/latest')
  const info = await res.json()
  const version = info.version
  const tarball = info.dist.tarball
  const tgz = join(root, 'ws.tgz')
  const extractDir = join(root, '_ws_extract')

  console.log(`Downloading ws@${version}...`)
  const bin = await fetch(tarball)
  await writeFile(tgz, Buffer.from(await bin.arrayBuffer()))

  await rm(extractDir, { recursive: true, force: true })
  await mkdir(extractDir, { recursive: true })
  execSync(`"${process.env.SystemRoot ?? 'C:\\Windows'}\\System32\\tar.exe" -xzf "${tgz}" -C "${extractDir}"`, { stdio: 'inherit' })

  await rm(target, { recursive: true, force: true })
  await rename(join(extractDir, 'package'), target)
  await rm(extractDir, { recursive: true, force: true })
  await rm(tgz, { force: true })

  console.log('ws installed at', target)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
