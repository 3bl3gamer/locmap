/**
 * Loads and draw tiles via {@linkcode TileContainer}.
 * Disables tile load while zooming.
 * @class
 * @param {import('./tile_container').TileContainer} tileHost
 */
export function TileLayer(tileHost) {
	const levelDifference = -Math.log2(tileHost.getTileWidth())
	const zoomDifference = 1 / tileHost.getTileWidth()

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
		tileHost.clearCache()
	}

	/** @param {import('./map').LocMap} map */
	this.redraw = map => {
		const level = map.getLevel() + levelDifference
		const tileGridSize = 1 << level
		const scale = (map.getZoom() * zoomDifference) / tileGridSize
		const blockSize = tileHost.getTileWidth() * scale
		const mapXShift = map.getTopLeftXShift()
		const mapYShift = map.getTopLeftYShift()

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

		const iCount = Math.min(tileGridSize - iFrom, (((map.getWidth() - xShift) / blockSize) | 0) + 1)
		const jCount = Math.min(tileGridSize - jFrom, (((map.getHeight() - yShift) / blockSize) | 0) + 1)

		tileHost.draw(map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoadTiles)
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
