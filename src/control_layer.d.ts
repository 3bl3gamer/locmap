/** @typedef {{type: 'use_two_fingers'|'use_control_to_zoom'}} HintData */
/**
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function ControlLayer(opts?: {
    doNotInterfere?: boolean;
}): void;
export class ControlLayer {
    /** @typedef {{type: 'use_two_fingers'|'use_control_to_zoom'}} HintData */
    /**
     * @param {{doNotInterfere?:boolean}} [opts]
     */
    constructor(opts?: {
        doNotInterfere?: boolean;
    });
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
}
/**
 * @param {string} controlText
 * @param {string} twoFingersText
 * @param {{styles:Record<string,string>}} [opts ]
 */
export function ControlHintLayer(controlText: string, twoFingersText: string, opts?: {
    styles: Record<string, string>;
}): void;
export class ControlHintLayer {
    /**
     * @param {string} controlText
     * @param {string} twoFingersText
     * @param {{styles:Record<string,string>}} [opts ]
     */
    constructor(controlText: string, twoFingersText: string, opts?: {
        styles: Record<string, string>;
    });
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    onEvent: {
        mapMove: () => void;
        mapZoom: () => void;
        /**
         * @param {import('./map').LocMap} map
         * @param {HintData} e
         */
        controlHint(map: import('./map').LocMap, e: HintData): void;
    };
}
export type HintData = {
    type: 'use_two_fingers' | 'use_control_to_zoom';
};
