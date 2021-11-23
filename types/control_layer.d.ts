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
/**
 * @class
 * @param {object} [opts]
 * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
 *   It's a workaround for mobile Safari 14 (at least) bug where <canvas> performance
 *   significantly drops after changing parent `tabIndex` attribute.
 */
export function KeyboardControlLayer(opts?: {
    outlineFix?: string | null | undefined;
} | undefined): void;
export class KeyboardControlLayer {
    /**
     * @class
     * @param {object} [opts]
     * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
     *   It's a workaround for mobile Safari 14 (at least) bug where <canvas> performance
     *   significantly drops after changing parent `tabIndex` attribute.
     */
    constructor(opts?: {
        outlineFix?: string | null | undefined;
    } | undefined);
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
}
/**
 * @class
 * @param {Parameters<typeof MouseControlLayer>[0]} [mouseOpts]
 * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
 */
export function ControlLayer(mouseOpts?: Parameters<typeof MouseControlLayer>[0], kbdOpts?: Parameters<typeof KeyboardControlLayer>[0]): void;
export class ControlLayer {
    /**
     * @class
     * @param {Parameters<typeof MouseControlLayer>[0]} [mouseOpts]
     * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
     */
    constructor(mouseOpts?: Parameters<typeof MouseControlLayer>[0], kbdOpts?: Parameters<typeof KeyboardControlLayer>[0]);
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
