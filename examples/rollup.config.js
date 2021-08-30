import html from '@rollup/plugin-html'
import resolve from '@rollup/plugin-node-resolve'
import { promises as fs } from 'fs'

const DIST = `${__dirname}/dist`

export default async function (commandOptions) {
	return [
		{
			input: `${__dirname}/src/index.js`,
			output: {
				format: 'iife',
				dir: DIST,
				entryFileNames: 'bundle.[hash].js',
				sourcemap: true,
			},
			plugins: [
				{
					name: 'clear-dist',
					buildStart: () => fs.rm(DIST, { recursive: true, force: true }),
				},
				resolve(),
				html({ title: 'Examples' }),
			],
			watch: { clearScreen: false },
		},
	]
}
