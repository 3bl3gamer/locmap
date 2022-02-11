/**
 * Enables mouse and touch input: gragging, wheel- and pinch-zooming.
 * @class
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function PointerControlLayer(opts?: {
    doNotInterfere?: boolean | undefined;
} | undefined): void;
export class PointerControlLayer {
    /**
     * Enables mouse and touch input: gragging, wheel- and pinch-zooming.
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
 * Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
 * Makes map element focusable.
 * @class
 * @param {object} [opts]
 * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
 *   It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
 *   drops significantly after changing parent `tabIndex` attribute.
 *   'none' (default) seems fixing the issue.
 */
export function KeyboardControlLayer(opts?: {
    outlineFix?: string | null | undefined;
} | undefined): void;
export class KeyboardControlLayer {
    /**
     * Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
     * Makes map element focusable.
     * @class
     * @param {object} [opts]
     * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
     *   It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
     *   drops significantly after changing parent `tabIndex` attribute.
     *   'none' (default) seems fixing the issue.
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
 * Layer for pointer (mouse/touch) and keyboard input.
 * See {@linkcode PointerControlLayer} and {@linkcode KeyboardControlLayer}.
 * @class
 * @param {Parameters<typeof PointerControlLayer>[0]} [mouseOpts]
 * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
 */
export function ControlLayer(mouseOpts?: Parameters<typeof PointerControlLayer>[0], kbdOpts?: Parameters<typeof KeyboardControlLayer>[0]): void;
export class ControlLayer {
    /**
     * Layer for pointer (mouse/touch) and keyboard input.
     * See {@linkcode PointerControlLayer} and {@linkcode KeyboardControlLayer}.
     * @class
     * @param {Parameters<typeof PointerControlLayer>[0]} [mouseOpts]
     * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
     */
    constructor(mouseOpts?: Parameters<typeof PointerControlLayer>[0], kbdOpts?: Parameters<typeof KeyboardControlLayer>[0]);
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
}
/**
 * Should be used with `doNotInterfere:true` set on {@linkcode MouseControlLayer} or {@linkcode ControlLayer}.
 * Shows a text over the map when user input is ignored.
 * @class
 * @param {string} controlText text to be shown when `Ctrl`/`⌘` key is required to zoom.
 *   For example: `` `hold ${controlHintKeyName()} to zoom` ``.
 * @param {string} twoFingersText text to be shown when two fingers are required to drag.
 *   For example: `'use two fingers to drag'`.
 * @param {{styles:Record<string,string>}} [opts] text box style overrides
 */
export function ControlHintLayer(controlText: string, twoFingersText: string, opts?: {
    styles: Record<string, string>;
} | undefined): void;
export class ControlHintLayer {
    /**
     * Should be used with `doNotInterfere:true` set on {@linkcode MouseControlLayer} or {@linkcode ControlLayer}.
     * Shows a text over the map when user input is ignored.
     * @class
     * @param {string} controlText text to be shown when `Ctrl`/`⌘` key is required to zoom.
     *   For example: `` `hold ${controlHintKeyName()} to zoom` ``.
     * @param {string} twoFingersText text to be shown when two fingers are required to drag.
     *   For example: `'use two fingers to drag'`.
     * @param {{styles:Record<string,string>}} [opts] text box style overrides
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
/**
 * Returns `⌘` on MacOS/iOS and `Ctrl` on other platforms.
 * Useful for {@linkcode ControlHintLayer}.
 */
export function controlHintKeyName(): "⌘" | "Ctrl";
/**
 * "default timing in Windows is 500ms" https://stackoverflow.com/a/29917394
 */
export const DBL_CLICK_MAX_DELAY: 500;
