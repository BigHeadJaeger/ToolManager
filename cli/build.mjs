import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outfile = path.join(__dirname, 'dist', 'cp-fetch.cjs')
const pakoPkg = require.resolve('pako')
const crc32Shim = path.join(__dirname, 'shims', 'crc32.ts')

const redirectPlugin = {
  name: 'node-cli-redirects',
  setup(build) {
    build.onResolve({ filter: /pako\.min\.js$/ }, () => ({ path: pakoPkg }))
    build.onResolve({ filter: /[\\/]Crc32(\.js)?$/ }, () => ({ path: crc32Shim }))
    build.onResolve({ filter: /^(\.\/)?Crc32(\.js)?$/ }, (args) => {
      if (args.importer && args.importer.replace(/\\/g, '/').includes('/libs/crypt/')) {
        return { path: crc32Shim }
      }
    })
  },
}

await esbuild.build({
  entryPoints: [path.join(__dirname, 'entry.ts')],
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
  plugins: [redirectPlugin],
  external: [],
  banner: {
    js: 'var window = typeof window !== "undefined" ? window : globalThis;',
  },
})

console.log('built', outfile)
