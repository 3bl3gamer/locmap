/**
 * @template T
 * @param  {...T} args
 * @returns {T}
 */
export function oneOf(...args) {
	return args[(args.length * Math.random()) | 0]
}

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
 * @param {HTMLElement} wrap
 * @param {string} html
 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT]
 */
export function appendCredit(wrap, html, style = CREDIT_BOTTOM_RIGHT) {
	const elem = document.createElement('div')
	elem.className = 'map-credit'
	elem.innerHTML = html
	for (const name in style) elem.style[name] = /**@type {string}*/ (style[name])
	wrap.appendChild(elem)
}
