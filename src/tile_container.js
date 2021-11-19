/** @typedef {{img:HTMLImageElement, appearAt:number, drawIter:number}} Tile */

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
	let drawIter = 0

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {Tile}
	 */
	function makeTile(map, x, y, z) {
		const img = new Image()
		const tile = { img, appearAt: 0, drawIter: -1 }
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
	 * @param {boolean} needRecent
	 * @param {boolean} useOpacity
	 */
	function canFullyDrawTile(map, i, j, level, needRecent, useOpacity) {
		const tile = findTile(map, i, j, level, false)
		return (
			!!tile &&
			isLoaded(tile) &&
			// if tile not drawn recently, it will became transparent on next draw
			(!(useOpacity || needRecent) || tileDrawnRecently(tile)) &&
			(!useOpacity || getTileOpacity(tile) >= 1)
		)
	}

	/** @param {Tile} tile */
	function getTileOpacity(tile) {
		return (performance.now() - tile.appearAt) / 150
	}

	/** @param {Tile} tile */
	function tileDrawnRecently(tile) {
		return tile.drawIter >= drawIter - 1
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

		if (!tileDrawnRecently(tile)) tile.appearAt = performance.now() - 16 //making it "appear" a bit earlier, so now it won't be fully transparent
		tile.drawIter = drawIter

		const s = devicePixelRatio
		// rounding to real canvas pixels
		const rx = Math.round(x * s) / s
		const ry = Math.round(y * s) / s
		w = Math.round((x + w) * s) / s - rx
		h = Math.round((y + h) * s) / s - ry
		const alpha = withOpacity ? getTileOpacity(tile) : 1

		if (alpha < 1) rc.globalAlpha = alpha
		rc.drawImage(tile.img, sx, sy, sw, sh, rx, ry, w, h)
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
	 * @param {boolean} loadIfMissing
	 */
	function tryDrawTile(map, x, y, scale, i, j, level, loadIfMissing) {
		const tile = findTile(map, i, j, level, loadIfMissing)
		if (!tile || !isLoaded(tile)) return false
		const w = tileW
		drawTile(map, tile, true,
		         0,0, w,w,
		         x,y, w*scale,w*scale) //prettier-ignore
		return true
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} partN
	 * @param {number} partI
	 * @param {number} partJ
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 */
	function tryDrawPart(map, x, y, scale, partN, partI, partJ, i, j, level) {
		const tile = findTile(map, i, j, level, false)
		if (!tile || !isLoaded(tile)) return false
		const partW = tileW / partN
		drawTile(map, tile, false,
		         partI*partW,partJ*partW, partW,partW,
		         x,y, tileW*scale,tileW*scale) //prettier-ignore
		return true
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} qi
	 * @param {number} qj
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 */
	function tryDrawAsQuarter(map, x, y, scale, qi, qj, i, j, level) {
		const tile = findTile(map, i, j, level, false)
		if (!tile || !isLoaded(tile)) return false
		const w = (tileW / 2) * scale
		drawTile(map, tile, false,
		         0,0, tileW,tileW,
		         x+qi*w,y+qj*w, w,w) //prettier-ignore
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
	 */
	function drawUpperTileParts(map, x, y, scale, i, j, level) {
		let drawn = false
		for (let l = level - 1; l >= 0; l--) {
			const sub = level - l
			const n = 1 << sub
			drawn = tryDrawPart(map, x, y, scale, n, i%n, j%n, i>>sub, j>>sub, level - sub) //prettier-ignore
			if (drawn) break
		}
		return drawn
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
		if (!canFullyDrawTile(map, i, j, level, true, true)) {
			//prettier-ignore
			const canFillByQuaters =
				canFullyDrawTile(map, i*2,   j*2,   level+1, true, false) &&
				canFullyDrawTile(map, i*2,   j*2+1, level+1, true, false) &&
				canFullyDrawTile(map, i*2+1, j*2,   level+1, true, false) &&
				canFullyDrawTile(map, i*2+1, j*2+1, level+1, true, false)

			let drawn = false
			if (!canFillByQuaters) drawn = drawUpperTileParts(map, x, y, scale, i, j, level)

			if (!drawn) {
				drawTilePlaceholder(map, x, y, scale)

				tryDrawAsQuarter(map, x,y,scale, 0,0, i*2  ,j*2  , level+1) //prettier-ignore
				tryDrawAsQuarter(map, x,y,scale, 0,1, i*2  ,j*2+1, level+1) //prettier-ignore
				tryDrawAsQuarter(map, x,y,scale, 1,0, i*2+1,j*2  , level+1) //prettier-ignore
				tryDrawAsQuarter(map, x,y,scale, 1,1, i*2+1,j*2+1, level+1) //prettier-ignore
			}
		}

		return tryDrawTile(map, x, y, scale, i, j, level, shouldLoad)
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
		for (let i = 0; i < iCount; i++)
			for (let j = 0; j < jCount; j++) {
				const dx = xShift + i * tileW * scale
				const dy = yShift + j * tileW * scale
				drawOneTile(map, dx, dy, scale, iFrom + i, jFrom + j, level, shouldLoad)
			}
		drawIter++
	}

	this.getTileWidth = () => tileW

	this.clearCache = () => {
		cache.clear()
	}
}
