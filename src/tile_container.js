/** @typedef {{img:HTMLImageElement, x:number, y:number, z:number, appearAt:number}} Tile */

/** @param {Tile} tile */
function isLoaded(tile) {
	return tile.img.complete && tile.img.naturalWidth > 0
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {string}
 */
function getTileKey(x, y, z) {
	return `${x}|${y}|${z}`
}

/**
 * @class
 * @param {number} tileW
 * @param {(x:number, y:number, z:number) => string} pathFunc
 */
export function TileContainer(tileW, pathFunc) {
	const cache = /** @type {Map<string,Tile>} */ (new Map())
	let lastDrawnTiles = /**@type {Set<Tile>}*/ (new Set())
	let curDrawnTiles = /**@type {Set<Tile>}*/ (new Set())
	const lastDrawnTilesArr = /**@type {Tile[]}*/ ([])

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {Tile}
	 */
	function makeTile(map, x, y, z) {
		const img = new Image()
		const tile = { img, x, y, z, appearAt: 0 }
		img.src = pathFunc(x, y, z)
		function onLoad() {
			map.requestRedraw()
		}
		img.onload = () => {
			if ('createImageBitmap' in window) {
				// trying no decode image in parallel thread,
				// if failed (beacuse of CORS for example) tryimg to show image anyway
				createImageBitmap(img).then(onLoad, onLoad)
			} else {
				onLoad()
			}
		}
		return tile
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} loadIfMissing
	 */
	function findTile(map, i, j, level, loadIfMissing) {
		const key = getTileKey(i, j, level)
		let tile = cache.get(key)
		if (!tile && loadIfMissing) {
			tile = makeTile(map, i, j, level)
			cache.set(key, tile)
		}
		return tile
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} useOpacity
	 */
	function canFullyDrawRecentTile(map, i, j, level, useOpacity) {
		const tile = findTile(map, i, j, level, false)
		return (
			!!tile &&
			isLoaded(tile) &&
			// if tile not drawn recently, it will became transparent on next draw
			tileDrawnRecently(tile) &&
			(!useOpacity || getTileOpacity(tile) >= 1)
		)
	}

	/** @param {Tile} tile */
	function getTileOpacity(tile) {
		return (performance.now() - tile.appearAt) / 150
	}

	/** @param {Tile} tile */
	function tileDrawnRecently(tile) {
		return lastDrawnTiles.has(tile)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {Tile} tile
	 * @param {boolean} withOpacity
	 * @param {number} sx
	 * @param {number} sy
	 * @param {number} sw
	 * @param {number} sh
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	function drawTile(map, tile, withOpacity, sx, sy, sw, sh, x, y, w, h) {
		const rc = map.get2dContext()
		if (!rc) return

		if (!tileDrawnRecently(tile)) {
			tile.appearAt = performance.now() - 16 //making it "appear" a bit earlier, so now tile won't be fully transparent
		}
		curDrawnTiles.add(tile)

		const s = devicePixelRatio
		// rounding to real canvas pixels
		const rx = Math.round(x * s) / s
		const ry = Math.round(y * s) / s
		w = Math.round((x + w) * s) / s - rx
		h = Math.round((y + h) * s) / s - ry
		const alpha = withOpacity ? getTileOpacity(tile) : 1

		if (alpha < 1) rc.globalAlpha = alpha
		rc.drawImage(tile.img, sx, sy, sw, sh, rx, ry, w, h)
		// rc.fillText(tile.x + '/' + tile.y, rx, ry + 12)
		if (alpha < 1) {
			rc.globalAlpha = 1
			map.requestRedraw()
		}
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {number} tileX
	 * @param {number} tileY
	 * @param {number} tileZ
	 * @param {boolean} loadIfMissing
	 * @param {boolean} useOpacity
	 * @returns {boolean}
	 */
	function tryDrawTile(map, x, y, scale, i, j, level, tileX, tileY, tileZ, loadIfMissing, useOpacity) {
		const tile = findTile(map, tileX, tileY, tileZ, loadIfMissing)
		return !!tile && tryDrawTileObj(map, tile, x, y, scale, i, j, level, useOpacity)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {Tile} tile
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} useOpacity
	 * @returns {boolean}
	 */
	function tryDrawTileObj(map, tile, x, y, scale, i, j, level, useOpacity) {
		if (!isLoaded(tile)) return false
		const dlevel = tile.z - level
		const dzoom = Math.pow(2, dlevel)
		const di = tile.x - i * dzoom
		const dj = tile.y - j * dzoom

		let sx, sy, sw, dw
		if (dlevel >= 0) {
			if (di < 0 || dj < 0 || di >= dzoom || dj >= dzoom) return false
			dw = (tileW * scale) / dzoom
			x += di * dw
			y += dj * dw
			sx = 0
			sy = 0
			sw = tileW
		} else {
			sw = tileW * dzoom
			sx = -di * tileW
			sy = -dj * tileW
			if (sx < 0 || sy < 0 || sx >= tileW || sy >= tileW) return false
			dw = tileW * scale
		}

		drawTile(map, tile, useOpacity,
		         sx,sy, sw,sw,
		         x,y, dw,dw) //prettier-ignore
		return true
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} shouldLoad
	 */
	function drawOneTile(map, x, y, scale, i, j, level, shouldLoad) {
		if (!canFullyDrawRecentTile(map, i, j, level, true)) {
			//prettier-ignore
			const canFillByQuaters =
				canFullyDrawRecentTile(map, i*2,   j*2,   level+1, false) &&
				canFullyDrawRecentTile(map, i*2,   j*2+1, level+1, false) &&
				canFullyDrawRecentTile(map, i*2+1, j*2,   level+1, false) &&
				canFullyDrawRecentTile(map, i*2+1, j*2+1, level+1, false)

			let upperTileDrawn = false
			if (!canFillByQuaters) {
				// drawing upper tiles parts
				for (let l = level - 1; l >= 0; l--) {
					const sub = level - l
					upperTileDrawn = tryDrawTile(map, x,y,scale, i,j,level, i>>sub,j>>sub,level-sub, false, false) //prettier-ignore
					if (upperTileDrawn) break
				}
			}

			if (!upperTileDrawn) {
				drawTilePlaceholder(map, x, y, scale)
				if (canFillByQuaters) {
					// drawing lower tiles as 2x2
					for (let di = 0; di <= 1; di++)
						for (let dj = 0; dj <= 1; dj++)
							tryDrawTile(map, x, y, scale, i, j, level, i*2+di, j*2+dj, level+1, false, false) //prettier-ignore
				}
			}

			// drawing additional (to 2x2) lower tiles from previous frames, useful for fast zoom-out animation
			for (let k = 0; k < lastDrawnTilesArr.length; k++) {
				const tile = lastDrawnTilesArr[k]
				// skipping layer+1 since it is handled by upper 2x2
				if (tile.z >= level + 2) tryDrawTileObj(map, tile, x, y, scale, i, j, level, true)
			}
		}

		tryDrawTile(map, x, y, scale, i, j, level, i, j, level, shouldLoad, true)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 */
	function drawTilePlaceholder(map, x, y, scale) {
		const rc = map.get2dContext()
		if (rc === null) return
		const w = tileW * scale
		const margin = 1.5
		rc.strokeStyle = '#eee'
		rc.strokeRect(x + margin, y + margin, w - margin * 2, w - margin * 2)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} xShift
	 * @param {number} yShift
	 * @param {number} scale
	 * @param {number} iFrom
	 * @param {number} jFrom
	 * @param {number} iCount
	 * @param {number} jCount
	 * @param {number} level
	 * @param {boolean} shouldLoad
	 */
	this.draw = (map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoad) => {
		curDrawnTiles.clear()
		lastDrawnTilesArr.length = 0
		lastDrawnTiles.forEach(x => lastDrawnTilesArr.push(x))

		for (let i = 0; i < iCount; i++)
			for (let j = 0; j < jCount; j++) {
				const dx = xShift + i * tileW * scale
				const dy = yShift + j * tileW * scale
				drawOneTile(map, dx, dy, scale, iFrom + i, jFrom + j, level, shouldLoad)
			}

		;[lastDrawnTiles, curDrawnTiles] = [curDrawnTiles, lastDrawnTiles]
	}

	this.getTileWidth = () => tileW

	this.clearCache = () => {
		cache.clear()
	}
}
