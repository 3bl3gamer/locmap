/**
 * Chooses and returns random argument.
 * @template T
 * @param  {...T} args
 * @returns {T}
 */
export function oneOf<T>(...args: T[]): T;
/**
 * Shortcut for appending some HTML at the right-bottom of another element.
 * @param {HTMLElement} wrap parent element, usually `map.getWrap()`
 * @param {string} html content as HTML (won't be escaped)
 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT] custom style object
 */
export function appendCredit(wrap: HTMLElement, html: string, style?: Partial<CSSStyleDeclaration> | undefined): void;
/**
 * @param {number} a
 * @param {number} b
 * @param {number} x
 */
export function clamp(a: number, b: number, x: number): number;
/**
 * @param {HTMLElement} elem
 * @param {Partial<CSSStyleDeclaration>} style
 */
export function applyStyles(elem: HTMLElement, style: Partial<CSSStyleDeclaration>): void;
/** @type {Partial<CSSStyleDeclaration>} */
export const CREDIT_BOTTOM_RIGHT: Partial<CSSStyleDeclaration>;
