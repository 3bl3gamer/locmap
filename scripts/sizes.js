#!/bin/node
import { promises as fs, createReadStream } from 'fs'
import { spawn } from 'child_process'
import { pipeline } from 'stream'
import { createGzip } from 'zlib'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import * as path from 'path'
const pipe = promisify(pipeline)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const baseDir = `${__dirname}/..`
const mapSrcDir = `${baseDir}/src`

/**
 * @template T
 * @param {(tempDir:string) => T} func
 * @returns {Promise<T>}
 */
async function withTempDir(func) {
	const tempDir = await fs.mkdtemp(`${baseDir}/tmp_locmap_sizes_`)
	try {
		return await func(tempDir)
	} finally {
		await fs.rm(tempDir, { recursive: true })
	}
}

async function getSizes(indexSrc) {
	return await withTempDir(async tempDir => {
		const indexFPath = `${tempDir}/index.js`
		const bundleFPath = `${tempDir}/bundle.js`
		const bundleMinFPath = `${tempDir}/bundle.min.js`
		const configFPath = `${tempDir}/rollup.config.js`

		await fs.writeFile(indexFPath, indexSrc)

		await fs.writeFile(
			configFPath,
			`
import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
export default async function (commandOptions) {
	return [{
		input: '${indexFPath}',
		output: { format: 'es', file: '${bundleFPath}' },
		plugins: [resolve()],
	}, {
		input: '${indexFPath}',
		output: { format: 'es', file: '${bundleMinFPath}' },
		plugins: [resolve(), terser()],
	}]
}`,
		)

		await new Promise((resolve, reject) => {
			const child = spawn(
				`${baseDir}/node_modules/.bin/rollup`, //
				['--config', configFPath, '--silent'],
				{ stdio: 'inherit' },
			)
			child.on('exit', (code, signal) => {
				if (code !== null && code !== 0)
					reject(new Error('process finished with non-ok code ' + code))
				if (signal !== null) reject(new Error('process was killed with ' + signal))
				resolve(code)
			})
			child.on('error', reject)
		})

		const gzip = createGzip({ level: 5 })
		const source = createReadStream(bundleMinFPath)
		let bundleMinGzipSize = 0
		gzip.on('data', chunk => (bundleMinGzipSize += chunk.length))
		await pipe(source, gzip)

		const stat = await fs.stat(bundleFPath)
		const statMin = await fs.stat(bundleMinFPath)
		return { orig: stat.size, min: statMin.size, minGz: bundleMinGzipSize }
	})
}

export async function getSizesTable() {
	const baseSizes = await getSizes(`
import { LocMap, SmoothTileContainer, TileLayer, ProjectionMercator } from '${mapSrcDir}'
const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new SmoothTileContainer(256, (x, y, z) =>
	\`http://a.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`)
map.register(new TileLayer(tileContainer))`)

	const regularSizes = await getSizes(`
import { LocMap, ControlLayer, ControlHintLayer, SmoothTileContainer, TileLayer, ProjectionMercator, LocationLayer, URLLayer } from '${mapSrcDir}'
const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new SmoothTileContainer(256, (x, y, z) =>
	\`http://\${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body, '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')`)

	const fullSizes = await getSizes(`
import { LocMap, ControlLayer, controlHintKeyName, ControlHintLayer, SmoothTileContainer, TileLayer, ProjectionMercator, LocationLayer, URLLayer } from '${mapSrcDir}'
const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new SmoothTileContainer(256, (x, y, z) =>
	\`http://\${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
map.register(new ControlHintLayer(\`hold \${controlHintKeyName()} to zoom\`, 'use two fingers to drag'))
map.register(new LocationLayer())
map.register(new URLLayer())
appendCredit(document.body, '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')`)

	let text = ''
	text += `|         | bundled | minfied | min+gz |     |\n`
	text += `|:--------|--------:|--------:|-------:|:----|\n`
	for (const [name, sizes] of /**@type {[string, typeof baseSizes][]}*/ ([
		['base', baseSizes],
		['regular', regularSizes],
		['full', fullSizes],
	])) {
		text +=
			'| ' +
			name.padEnd(7) +
			` | ${(sizes.orig / 1024).toFixed(1).padStart(6)} ` +
			` | ${(sizes.min / 1024).toFixed(1).padStart(6)} ` +
			` | ${(sizes.minGz / 1024).toFixed(1).padStart(5)} ` +
			' | KiB |\n'
	}
	return { table: text, sizes: { regular: regularSizes } }
}

if (path.resolve(process.argv[1]) === path.resolve(__filename)) {
	getSizesTable()
		.then(({ table }) => process.stdout.write(table))
		.catch(console.error)
}
