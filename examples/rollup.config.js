import html from '@rollup/plugin-html'
import resolve from '@rollup/plugin-node-resolve'

export default async function (commandOptions) {
	return [
		{
			input: `${__dirname}/src/index.js`,
			output: {
				format: 'iife',
				dir: `${__dirname}/dist`,
				entryFileNames: 'bundle.[hash].js',
				sourcemap: true,
			},
			plugins: [resolve(), html({ title: 'Examples' })],
			watch: { clearScreen: false },
		},
	]
}
