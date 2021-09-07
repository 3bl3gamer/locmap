#!/bin/node
const { promises: fs, createReadStream } = require('fs')
const os = require('os')
const cp = require('child_process')
const { pipeline } = require('stream')
const { createGzip } = require('zlib')
const { promisify } = require('util')
const pipe = promisify(pipeline)

const baseDir = `${__dirname}/..`
const mapSrcDir = `${baseDir}/src`

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
		const bundleMinGzipFPath = `${tempDir}/bundle.min.js.gz`
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
			const child = cp.spawn(
				`${baseDir}/node_modules/.bin/rollup`, //
				['--config', configFPath],
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

;(async () => {
	const baseSizes = await getSizes(`
import { LocMap, TileContainer, TileLayer, ProjectionMercator } from '${mapSrcDir}'
const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(256, (x, y, z) =>
	\`http://a.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`)
map.register(new TileLayer(tileContainer))`)

	const regularSizes = await getSizes(`
import { LocMap, ControlLayer, ControlHintLayer, TileContainer, TileLayer, ProjectionMercator, LocationLayer, URLLayer } from '${mapSrcDir}'
const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(256, (x, y, z) =>
	\`http://\${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body, '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')`)

	const fullSizes = await getSizes(`
import { LocMap, ControlLayer, ControlHintLayer, TileContainer, TileLayer, ProjectionMercator, LocationLayer, URLLayer } from '${mapSrcDir}'
const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(256, (x, y, z) =>
	\`http://\${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/\${z}/\${x}/\${y}.png\`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
map.register(new ControlHintLayer('hold Ctrl to zoom', 'use two fingers to drag'))
map.register(new LocationLayer())
map.register(new URLLayer())
appendCredit(document.body, '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')`)

	console.log(`${' '.repeat(7)} bundled minfied min+gz`)
	for (const [name, sizes] of [
		['base', baseSizes],
		['regular', regularSizes],
		['full', fullSizes],
	]) {
		console.log(
			name.padEnd(7) +
				` ${(sizes.orig / 1024).toFixed(1).padStart(6)} ` +
				` ${(sizes.min / 1024).toFixed(1).padStart(6)} ` +
				` ${(sizes.minGz / 1024).toFixed(1).padStart(5)} ` +
				' KiB',
		)
	}
})()
