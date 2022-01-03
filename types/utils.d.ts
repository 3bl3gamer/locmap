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
/** @type {Partial<CSSStyleDeclaration>} */
export const CREDIT_BOTTOM_RIGHT: Partial<CSSStyleDeclaration>;
export const floor: (x: number) => number;
