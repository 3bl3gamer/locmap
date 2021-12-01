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
	const levelDifference = -Math.log2(tileContainer.getTileWidth())
	const zoomDifference = 1 / tileContainer.getTileWidth()

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
		const level = map.getLevel() + levelDifference
		const tileGridSize = 1 << level
		const scale = (map.getZoom() * zoomDifference) / tileGridSize
		const blockSize = tileContainer.getTileWidth() * scale
		const mapXShift = map.getViewBoxXShift()
		const mapYShift = map.getViewBoxYShift()

		let xShift, iFrom
		if (mapXShift > 0) {
			xShift = -mapXShift % blockSize
			iFrom = (mapXShift / blockSize) | 0
		} else {
			xShift = -mapXShift
			iFrom = 0
		}
		let yShift, jFrom
		if (mapYShift > 0) {
			yShift = -mapYShift % blockSize
			jFrom = (mapYShift / blockSize) | 0
		} else {
			yShift = -mapYShift
			jFrom = 0
		}

		const iCount = Math.min(
			tileGridSize - iFrom,
			(((map.getViewBoxWidth() - xShift) / blockSize) | 0) + 1,
		)
		const jCount = Math.min(
			tileGridSize - jFrom,
			(((map.getViewBoxHeight() - yShift) / blockSize) | 0) + 1,
		)

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
				const isFast = timeDelta === 0 || Math.abs(Math.pow(delta, 1 / timeDelta) - 1) > 0.0005
				if (isFast) {
					// unpausing periodically in case of long slow zooming
					if (shouldLoadTiles || now - tileLoadPausedAt < 1000) pauseTileLoad(map, 80)
				}
			}
		},
	}
}
