import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outfile = path.join(__dirname, 'dist', 'json-xlsx.cjs')

await esbuild.build({
  entryPoints: [path.join(__dirname, 'json-xlsx-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile,
  sourcemap: true,
  logLevel: 'info',
  alias: {
    '@': path.join(__dirname, '..', 'src'),
  },
})

console.log('built', outfile)
