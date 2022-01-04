/**
 * @typedef {object} TileContainer
 * @prop {() => unknown} clearCache
 * @prop {() => number} getTileWidth
 * @prop {(map:import('./map').LocMap,
 *   xShift:number, yShift:number, scale:number,
 *   iFrom:number, jFrom:number, iCount:number, jCount:number, level:number,
 *   shouldLoad: boolean) => unknown} draw
 */

/**
 * Loads and draw tiles using {@linkcode TileContainer}.
 * Disables tile load while zooming.
 * @class
 * @param {TileContainer} tileContainer tile cache/drawer, for example {@linkcode SmoothTileContainer}
 */
export function TileLayer(tileContainer) {
	let shouldLoadTiles = true
	let lastZoomAt = 0
	let curZoomTotalDelta = 1
	let tileLoadOffTimeout = -1
	let tileLoadPausedAt = 0
	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} durationMS
	 */
	function pauseTileLoad(map, durationMS) {
		if (shouldLoadTiles) {
			tileLoadPausedAt = performance.now()
			shouldLoadTiles = false
		}
		clearTimeout(tileLoadOffTimeout)
		tileLoadOffTimeout = window.setTimeout(() => {
			shouldLoadTiles = true
			map.requestRedraw()
		}, durationMS)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		tileContainer.clearCache()
	}

	/** @param {import('./map').LocMap} map */
	this.redraw = map => {
		const tileW = tileContainer.getTileWidth()
		//extra level shift (not 0.5), or on half-level zoom text on tiles may be too small
		const level = Math.floor(Math.log2(map.getZoom() / tileW) + 0.4)
		const tileGridSize = 2 ** level
		const scale = map.getZoom() / tileW / tileGridSize
		const blockSize = tileW * scale
		const [mapXShift, mapYShift] = map.getViewBoxShift()
		const [mapViewWidth, mapViewHeight] = map.getViewBoxSize()

		const iFrom = Math.floor(mapXShift / blockSize)
		const xShift = -mapXShift + iFrom * blockSize

		const jFrom = Math.floor(mapYShift / blockSize)
		const yShift = -mapYShift + jFrom * blockSize

		const iCount = (((mapViewWidth - xShift) / blockSize) | 0) + 1
		const jCount = (((mapViewHeight - yShift) / blockSize) | 0) + 1

		tileContainer.draw(map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoadTiles)
	}

	/** @type {import('./map').MapEventHandlers} */
	this.onEvent = {
		mapZoom(map, { delta }) {
			const now = performance.now()
			const timeDelta = now - lastZoomAt
			if (timeDelta > 250) curZoomTotalDelta = 1 //new zoom action started
			lastZoomAt = now
			curZoomTotalDelta *= delta

			// if zoomed enough
			if (curZoomTotalDelta < 1 / 1.2 || curZoomTotalDelta > 1.2) {
				// if fast enough
				const isFast = timeDelta === 0 || Math.abs(delta ** (1 / timeDelta) - 1) > 0.0005
				if (isFast) {
					// unpausing periodically in case of long slow zooming
					if (shouldLoadTiles || now - tileLoadPausedAt > 1000) pauseTileLoad(map, 80)
				}
			}
		},
	}
}
