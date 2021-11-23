/**
 * @class
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function MouseControlLayer(opts?: {
    doNotInterfere?: boolean | undefined;
} | undefined): void;
export class MouseControlLayer {
    /**
     * @class
     * @param {{doNotInterfere?:boolean}} [opts]
     */
    constructor(opts?: {
        doNotInterfere?: boolean | undefined;
    } | undefined);
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
}
export function KeyboardControlLayer(): void;
export class KeyboardControlLayer {
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
}
/**
 * @class
 * @param {{doNotInterfere?:boolean}} [mouseOpts]
 */
export function ControlLayer(mouseOpts?: {
    doNotInterfere?: boolean | undefined;
} | undefined): void;
export class ControlLayer {
    /**
     * @class
     * @param {{doNotInterfere?:boolean}} [mouseOpts]
     */
    constructor(mouseOpts?: {
        doNotInterfere?: boolean | undefined;
    } | undefined);
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
}
/**
 * @class
 * @param {string} controlText
 * @param {string} twoFingersText
 * @param {{styles:Record<string,string>}} [opts ]
 */
export function ControlHintLayer(controlText: string, twoFingersText: string, opts?: {
    styles: Record<string, string>;
} | undefined): void;
export class ControlHintLayer {
    /**
     * @class
     * @param {string} controlText
     * @param {string} twoFingersText
     * @param {{styles:Record<string,string>}} [opts ]
     */
    constructor(controlText: string, twoFingersText: string, opts?: {
        styles: Record<string, string>;
    } | undefined);
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @type {import('./map').MapEventHandlers} */
    onEvent: import('./map').MapEventHandlers;
}
export function controlHintKeyName(): "⌘" | "Ctrl";
/**
 * "default timing in Windows is 500ms" https://stackoverflow.com/a/29917394
 */
export const DBL_CLICK_MAX_DELAY: 500;
