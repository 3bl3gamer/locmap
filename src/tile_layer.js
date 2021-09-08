/**
 * @class
 * @param {import('./tile_container').TileContainer} tileHost
 */
export function TileLayer(tileHost) {
	const levelDifference = -Math.log(tileHost.getTileWidth()) / Math.LN2
	const zoomDifference = 1 / tileHost.getTileWidth()

	let scale = 1
	let draw_x_shift
	let draw_y_shift
	let draw_i_from
	let draw_j_from
	let draw_i_numb
	let draw_j_numb
	/** @param {import('./map').LocMap} map */
	function updateDrawParams(map) {
		const level_grid_width = 1 << (map.getLevel() + levelDifference)
		scale = (map.getZoom() * zoomDifference) / level_grid_width
		const block_size = tileHost.getTileWidth() * scale
		const x_shift = -map.getProjConv().lon2x(map.getLon(), map.getZoom()) + map.getTopLeftXOffset()
		const y_shift = -map.getProjConv().lat2y(map.getLat(), map.getZoom()) + map.getTopLeftYOffset()

		if (x_shift < 0) {
			draw_x_shift = x_shift % block_size
			draw_i_from = (-x_shift / block_size) | 0
		} else {
			draw_x_shift = x_shift
			draw_i_from = 0
		}
		if (y_shift < 0) {
			draw_y_shift = y_shift % block_size
			draw_j_from = (-y_shift / block_size) | 0
		} else {
			draw_y_shift = y_shift
			draw_j_from = 0
		}

		draw_i_numb = Math.min(level_grid_width-draw_i_from, ((map.getWidth() -draw_x_shift)/block_size|0)+1) //prettier-ignore
		draw_j_numb = Math.min(level_grid_width-draw_j_from, ((map.getHeight()-draw_y_shift)/block_size|0)+1) //prettier-ignore
		//console.log(scale, draw_i_from, draw_j_from, draw_i_numb, draw_j_numb)
	}

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
			// console.log('paused')
			tileLoadPausedAt = performance.now()
			shouldLoadTiles = false
		}
		clearTimeout(tileLoadOffTimeout)
		tileLoadOffTimeout = window.setTimeout(() => {
			shouldLoadTiles = true
			map.requestRedraw()
			// console.log('unpaused')
		}, durationMS)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 */
	function drawOneTile(map, x, y, scale, i, j) {
		const level = map.getLevel() + levelDifference

		let drawn = tileHost.tryDrawTile(map, x, y, scale, i, j, level, shouldLoadTiles)
		if (drawn) return

		for (let sub = 1; sub <= 2; sub++) {
			const n = 1 << sub
			drawn = tileHost.tryDrawPart(map, x, y, scale, n, i%n, j%n, i>>sub, j>>sub, level - sub) //prettier-ignore
			if (drawn) return
		}

		tileHost.tryDrawAsQuarter(map, x,y,scale, 0,0, i*2  ,j*2  , level+1) //prettier-ignore
		tileHost.tryDrawAsQuarter(map, x,y,scale, 0,1, i*2  ,j*2+1, level+1) //prettier-ignore
		tileHost.tryDrawAsQuarter(map, x,y,scale, 1,0, i*2+1,j*2  , level+1) //prettier-ignore
		tileHost.tryDrawAsQuarter(map, x,y,scale, 1,1, i*2+1,j*2+1, level+1) //prettier-ignore
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		tileHost.clearCache()
	}

	/** @param {import('./map').LocMap} map */
	this.redraw = map => {
		const rc = map.get2dContext()
		if (rc === null) return
		rc.save()

		updateDrawParams(map)

		for (let i = 0; i < draw_i_numb; i++)
			for (let j = 0; j < draw_j_numb; j++) {
				const dx = draw_x_shift + i * tileHost.getTileWidth() * scale
				const dy = draw_y_shift + j * tileHost.getTileWidth() * scale
				drawOneTile(map, dx, dy, scale, draw_i_from + i, draw_j_from + j)
			}

		rc.restore()
	}

	/** @type {import('./map').MapEventHandlers} */
	this.onEvent = {
		mapZoom(map, { delta }) {
			const now = performance.now()
			if (now - lastZoomAt > 250) curZoomTotalDelta = 1 //new zoom action started
			lastZoomAt = now
			curZoomTotalDelta *= delta
			// if zoomed enough
			if (curZoomTotalDelta < 1 / 1.2 || curZoomTotalDelta > 1.2) {
				// unpausing periodically in case of long slow zooming
				if (shouldLoadTiles || now - tileLoadPausedAt < 1000) pauseTileLoad(map, 80)
			}
		},
	}
}
