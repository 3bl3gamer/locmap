/**
 * @template T
 * @param  {...T} args
 * @returns {T}
 */
export function oneOf<T>(...args: T[]): T;
/**
 * @param {HTMLElement} wrap
 * @param {string} html
 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT]
 */
export function appendCredit(wrap: HTMLElement, html: string, style?: Partial<CSSStyleDeclaration> | undefined): void;
export namespace CREDIT_BOTTOM_RIGHT {
    const position: string;
    const right: string;
    const bottom: string;
    const font: string;
    const background: string;
    const padding: string;
    const opacity: string;
}
