module.exports = {
	env: {
		es6: true,
		node: false,
		browser: true,
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
	},
	extends: ['prettier'],
	rules: {
		'no-unused-vars': ['warn', { vars: 'all', args: 'none' }],
		'no-constant-condition': ['error', { checkLoops: false }],
		eqeqeq: ['warn', 'always'],
	},
}
