/**
 * Chooses and returns random argument.
 * @template T
 * @param  {...T} args
 * @returns {T}
 */
export function oneOf(...args) {
	return args[(args.length * Math.random()) | 0]
}

/** @type {Partial<CSSStyleDeclaration>} */
export const CREDIT_BOTTOM_RIGHT = {
	position: 'absolute',
	right: '0',
	bottom: '0',
	font: '11px/1.5 sans-serif',
	background: 'white',
	padding: '0 5px',
	opacity: '0.75',
}

/**
 * Shortcut for appending some HTML at the right-bottom of another element.
 * @param {HTMLElement} wrap parent element, usually `map.getWrap()`
 * @param {string} html content as HTML (won't be escaped)
 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT] custom style object
 */
export function appendCredit(wrap, html, style = CREDIT_BOTTOM_RIGHT) {
	const elem = document.createElement('div')
	elem.className = 'map-credit'
	elem.innerHTML = html
	applyStyles(elem, style)
	wrap.appendChild(elem)
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} x
 */
export function clamp(a, b, x) {
	return Math.max(a, Math.min(b, x))
}

/**
 * @param {HTMLElement} elem
 * @param {Partial<CSSStyleDeclaration>} style
 */
export function applyStyles(elem, style) {
	for (const name in style) elem.style[name] = /**@type {string}*/ (style[name])
}
