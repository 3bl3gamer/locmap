#!/bin/node
import { readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import {
	Application,
	ArrayType,
	ConditionalType,
	IndexedAccessType,
	IntrinsicType,
	LiteralType,
	ReferenceType,
	ReflectionType,
	TSConfigReader,
	TypeOperatorType,
	UnionType,
	TupleType,
	NamedTupleMember,
	DeclarationReflection,
} from 'typedoc'
import { fileURLToPath } from 'url'
import { getRegularExampleSource, getSizesTable } from './sizes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const baseDir = `${__dirname}/..`

const classPriorities = [
	'LocMap',
	'TileLayer',
	'SmoothTileContainer',
	'ControlLayer',
	'PointerControlLayer',
	'KeyboardControlLayer',
].reverse()

const propPriorities = {
	LocMap: [
		'constructor',
		'register',
		'unregister',
		'updateLocation',
		'move',
		'moveSmooth',
		'applyMoveInertia',
		'zoom',
		'zoomSmooth',
		'applyZoomInteria',
	].reverse(),
}

const skipProperties = [
	{
		re: /Layer$/,
		props: ['register', 'unregister', 'update', 'redraw', 'onEvent'],
	},
	{
		re: /TileContainer$/,
		props: ['draw', 'clearCache', 'getTileWidth'],
	},
]

const GITHUB_ANCHOR_PREFIX = 'user-content-'

/** @param {import('typedoc/dist/lib/models/reflections/parameter.js').ParameterReflection[]} parameters */
function parametersToString(parameters) {
	return parameters
		.map((param, i) => {
			const isFirst = i === 0
			let name = param.name
			if (param.flags.isRest) name = '...' + name
			if (!isFirst) name = ', ' + name
			if (param.flags.isOptional) name += '?'
			name += ':' + typeToString(param.type)
			// if (param.defaultValue) name += '=' + param.defaultValue
			return name
		})
		.join('')
}

/**
 * @param {import('typedoc').SomeType | import('typedoc/dist/lib/models/types.js').Type | undefined} type
 * @param {import('typedoc/dist/lib/models/reflections/declaration').DeclarationReflection[]} children
 * @returns {string}
 */
function typeToString(type, children = []) {
	if (!type) return 'any'
	if (type instanceof ReferenceType)
		return (
			type.name +
			(type.typeArguments && type.typeArguments.length > 0
				? `<${type.typeArguments.map(x => typeToString(x, children)).join(', ')}>`
				: '')
		)
	if (type instanceof IntrinsicType) return type.name
	if (type instanceof ConditionalType)
		return (
			`${typeToString(type.checkType, children)} extends ${typeToString(type.extendsType, children)}` +
			` ? ${typeToString(type.trueType, children)} : ${typeToString(type.falseType, children)}`
		)
	if (type instanceof TypeOperatorType) return `${type.operator} ${typeToString(type.target, children)}`
	if (type instanceof IndexedAccessType)
		return `${typeToString(type.objectType, children)}[${typeToString(type.indexType, children)}]`
	if (type instanceof ReflectionType) {
		for (const signature of type.declaration.signatures ?? []) {
			if (signature.kindString === 'Call signature')
				return (
					`(${parametersToString(signature.parameters ?? [])})` +
					` => ${typeToString(signature.type, children)}`
				)
			else throw new Error('unexpected signature: ' + signature.kindString)
		}
		if (type.declaration.children) {
			children.push(...type.declaration.children)
			return (
				'{' +
				type.declaration.children.map(x => x.name + (x.flags.isOptional ? '?' : '')).join(', ') +
				'}'
			)
		}
	}
	if (type instanceof ArrayType) return `${typeToString(type.elementType, children)}[]`
	if (type instanceof UnionType) return type.types.map(x => typeToString(x, children)).join(' | ')
	if (type instanceof LiteralType)
		return typeof type.value === 'string' ? `'${type.value}'` : type.value + ''
	if (type instanceof TupleType)
		return '[' + type.elements.map(x => typeToString(x, children)).join(', ') + ']'
	if (type instanceof NamedTupleMember)
		return type.name + (type.isOptional ? '?' : '') + ':' + typeToString(type.element, children)
	throw new Error(`unexpected type: ${type} (${type.constructor.name})`)
}

/** @param {string} text */
function escapeTypeForMarkdown(text) {
	return text.replace(/([<>\[\]])/g, '\\$1')
}

/**
 * @param {{name:string, type?:import('typedoc').SomeType|import('typedoc/dist/lib/models/types.js').Type, comment?:import('typedoc').Comment, defaultValue?:string}} item
 * @returns {[string, import('typedoc/dist/lib/models/reflections/declaration').DeclarationReflection[]]}
 */
function getParamDoc(item) {
	const children = []
	const typeStr = escapeTypeForMarkdown(typeToString(item.type, children))
	return [
		`\`${item.name}\` *${typeStr}*` +
			`${getFullComment(' — ', item.comment)}` +
			`${item.defaultValue ? ` **Default**: \`${item.defaultValue}\`` : ''}`,
		children,
	]
}

/**
 * @param {string} prefix
 * @param {import('typedoc').Comment|undefined} comment
 */
function getFullComment(prefix, comment) {
	if (comment && comment.modifierTags.size > 0) {
		console.log(comment.modifierTags)
		throw new Error('tags')
	}
	let text = ''
	if (comment)
		text += comment.summary
			.map(x => {
				if (x.kind === 'text' || x.kind === 'code') return x.text
				if (x.kind === 'inline-tag') {
					if (x.tag === '@linkcode' && x.target instanceof DeclarationReflection)
						return `[\`${x.text}\`](#${GITHUB_ANCHOR_PREFIX}${x.target.name.toLocaleLowerCase()})`
				}
				console.log(x)
				throw new Error(`unexpected item kind '${x.kind}'`)
			})
			.join('')
	text = text.trimEnd()
	if (text.length > 0) {
		text = prefix + text
		if (!text.endsWith('.')) text += '.'
	}
	return text
}

/**
 * @param {(text:string) => unknown} write
 * @param {import('typedoc/dist/lib/models/reflections/declaration').DeclarationReflection} func
 */
function describeFunc(write, func) {
	const isConstructor = func.kindString === 'Constructor'

	let signatures
	if (isConstructor) {
		signatures = func.signatures
	} else if (func.kindString === 'Function') {
		signatures = func.signatures
	} else {
		if (!func.type) throw new Error('no type for: ' + func.name)
		if (!(func.type instanceof ReflectionType))
			throw new Error('type is not a reflection for: ' + func.name)
		signatures = func.type.declaration.signatures
	}
	if (!signatures) throw new Error('no signatures for: ' + func.name)
	if (signatures.length > 1) throw new Error('multiple signatures for: ' + func.name)
	const signature = signatures[0]

	const name = isConstructor ? func.parent?.name + '' : func.name
	const callname = (isConstructor ? 'new ' : '') + name

	const src = signature.sources?.[0]

	const headingLevel = isConstructor ? '###' : '####'
	const headingAnchor = `<a name="${GITHUB_ANCHOR_PREFIX}${name.toLocaleLowerCase()}"></a>`
	const headingName = `${callname}(${(signature.parameters ?? [])
		.map((x, i) => {
			const isFirst = i === 0
			let name = x.name
			if (x.flags.isRest) name = '...' + name
			if (!isFirst) name = ', ' + name
			// if (x.defaultValue) name += '=' + x.defaultValue
			if (x.flags.isOptional) name = `\\[${name}\\]`
			return name
		})
		.join('')})`

	write(`${headingLevel} ${headingAnchor}${headingName}${src ? ` [src](${src.url})` : ''}\n\n`)
	let hasContent = false

	for (const param of signature.typeParameters ?? []) {
		const [doc] = getParamDoc(param)
		write(` * ${doc}\n`)
		hasContent = true
	}

	for (const param of signature.parameters ?? []) {
		const [doc, children] = getParamDoc(param)
		write(` * ${doc}\n`)
		for (const child of children) write(`   * ${getParamDoc(child)[0]}\n`)
		hasContent = true
	}

	if (!isConstructor) {
		const children = []
		const retType = escapeTypeForMarkdown(typeToString(signature.type, children))
		if (retType !== 'void') {
			write(` * Returns: *${retType}*\n`)
			for (const child of children) write(`   * ${getParamDoc(child)[0]}\n`)
			hasContent = true
		}
	}

	const comment = getFullComment('', signature.comment)
	if (comment) {
		write((hasContent ? '\n' : '') + comment + '\n')
		hasContent = true
	}

	if (hasContent) write('\n')
}

/**
 * @param {string} text
 * @param {string} prefix
 * @param {string} separator
 * @param {string} chunk
 */
function reaplceReadmeBlock(text, prefix, separator, chunk) {
	const startMark = `<!-- ${prefix}_START -->`
	const endMark = `<!-- ${prefix}_END -->`
	const startIndex = text.indexOf(startMark)
	const endIndex = text.indexOf(endMark)
	if (startIndex === -1) throw new Error(`'${startMark}' not found'`)
	if (endIndex === -1) throw new Error(`'${endMark}' not found'`)
	return (
		text.slice(0, startIndex) +
		startMark +
		separator +
		'<!-- Generated, do not edit! -->' +
		separator +
		chunk.trimEnd() +
		separator +
		endMark +
		text.slice(endIndex + endMark.length)
	)
}

;(async () => {
	console.log('gathering API data...')

	const app = new Application()
	app.options.addReader(new TSConfigReader())

	app.bootstrap({
		entryPoints: [`${baseDir}/src`],
		readme: '/dev/null',
	})

	const project = app.convert()
	if (!project) throw new Error('not a project')
	if (!project.children) throw new Error('no children')

	let apiDoc = ''
	/** @param {string} text */
	const write = text => (apiDoc += text) //process.stdout.write(text)

	write('## API\n\n')

	const classWeight = cls => classPriorities.indexOf(cls.name) + 1
	project.children
		.filter(x => x.kindString === 'Class')
		.sort((a, b) => {
			return classWeight(b) - classWeight(a) || a.name.localeCompare(b.name)
		})
		.forEach(cls => {
			const children = cls.children ?? []
			if (propPriorities[cls.name]) {
				const priorities = propPriorities[cls.name]
				const weight = attr => priorities.indexOf(attr.name) + 1
				children.sort((a, b) => weight(b) - weight(a) || a.name.localeCompare(b.name))
			}
			for (const attr of cls.children ?? []) {
				let skip = false
				for (const { re, props } of skipProperties)
					if (re.test(cls.name) && props.includes(attr.name)) {
						skip = true
						break
					}
				if (!skip) describeFunc(write, attr)
			}

			write('\n')
		})

	write('### Functions\n\n')
	project.children
		.filter(x => x.kindString === 'Function')
		.forEach(func => {
			describeFunc(write, func)
		})

	console.log('gathering sizes data...')

	const sizeInfo = await getSizesTable()
	const regularBundleSize = (sizeInfo.sizes.regular.minGz / 1024).toFixed(1)
	const regularSource = '```js\n' + getRegularExampleSource('locmap') + '\n```'

	console.log('updating README...')

	let content = readFileSync(`${baseDir}/README.md`, 'utf-8')
	content = reaplceReadmeBlock(content, 'REGULAR_SIZE', '', regularBundleSize)
	content = reaplceReadmeBlock(content, 'REGULAR_EXAMPLE', '\n', regularSource)
	content = reaplceReadmeBlock(content, 'SIZE_TABLE', '\n', sizeInfo.table)
	content = reaplceReadmeBlock(content, 'API_BLOCK', '\n', apiDoc)
	content = content.trimEnd() + '\n'
	writeFileSync(`${baseDir}/README.md`, content)

	console.log('done.')
})().catch(console.error)
