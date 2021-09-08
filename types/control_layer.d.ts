/**
 * @class
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function ControlLayer(opts?: {
    doNotInterfere?: boolean | undefined;
} | undefined): void;
export class ControlLayer {
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
