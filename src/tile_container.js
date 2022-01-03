/**
 * @template T
 * @typedef {{img:T, x:number, y:number, z:number, appearAt:number, lastDrawIter:number}} Tile
 */
/** @typedef {Tile<null>} LoadingTile */
/** @typedef {Tile<HTMLImageElement>} ReadyTile */
/** @typedef {Tile<HTMLImageElement|null>} AnyTile */

/** @typedef {(x:number, y:number, z:number, onLoad:(img:HTMLImageElement) => unknown) => unknown} TileImgLoadFunc */
/** @typedef {(x:number, y:number, z:number) => string} TilePathFunc */
/** @typedef {(map:import('./map').LocMap, x:number, y:number, tileW:number, scale:number) => unknown} TilePlaceholderDrawFunc */

/**
 * @param {AnyTile} tile
 * @returns {tile is ReadyTile}
 */
function isLoaded(tile) {
	return !!tile.img && tile.img.complete && tile.img.naturalWidth > 0
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
 * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
 * @class
 * @param {number} tileW tile display size
 * @param {TileImgLoadFunc} tileLoadFunc tile path func, for example:
 *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
 *
 *   May return `null` to skip tile loading.
 * @param {TilePlaceholderDrawFunc} [tilePlaceholderDrawFunc]
 *   draws placeholder when tile is not ready or has failed to load
 *   (for example, {@linkcode drawRectTilePlaceholder})
 */
export function SmoothTileContainer(tileW, tileLoadFunc, tilePlaceholderDrawFunc) {
	const cache = /** @type {Map<string,AnyTile>} */ (new Map())

	let lastDrawnTiles = /**@type {Set<ReadyTile>}*/ (new Set())
	const lastDrawnUnderLevelTilesArr = /**@type {ReadyTile[]}*/ ([])

	/** @type {[iFrom:number, jFrom:number, iCount:number, jCount:number, level:number]} */
	let prevTileRegion = [0, 0, 0, 0, 0]

	let drawIter = 0

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {AnyTile}
	 */
	function makeTile(map, x, y, z) {
		const tile = /**@type {AnyTile}*/ ({
			img: null,
			x,
			y,
			z,
			appearAt: 0,
			// writing here last iter (instead of 0), so if tile load will abort/fail,
			// this tile won't be the "oldest" one in the cache and won't be quickly removed
			lastDrawIter: drawIter,
		})
		tileLoadFunc(x, y, z, img => {
			tile.img = img
			map.requestRedraw()
		})
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

	/** @param {AnyTile} tile */
	function getTileOpacity(tile) {
		return (performance.now() - tile.appearAt) / 150
	}

	/** @param {AnyTile} tile */
	function tileDrawnRecently(tile) {
		return tile.lastDrawIter >= drawIter - 1
	}

	/** @param {AnyTile} tile */
	function tileWasOutsideOnCurLevel(tile) {
		const [iFrom, jFrom, iCount, jCount, level] = prevTileRegion
		const { x, y, z } = tile
		return z === level && (x < iFrom || x >= iFrom + iCount || y < jFrom || y >= jFrom + jCount)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {ReadyTile} tile
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
			// Preventing fade-in animation for loaded tiles which appeared on sides while moving the map.
			// This works only for tiles on current level but is simplier and is enough for most cases.
			if (tileWasOutsideOnCurLevel(tile)) tile.appearAt = 0
			// making it "appear" a bit earlier, so now tile won't be fully transparent
			else tile.appearAt = performance.now() - 16
		}
		tile.lastDrawIter = drawIter
		lastDrawnTiles.add(tile)

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
	 * @param {AnyTile} tile
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
		const dzoom = 2 ** dlevel
		const di = tile.x - i * dzoom
		const dj = tile.y - j * dzoom
		const natW = tile.img.naturalWidth

		let sx, sy, sw, dw
		if (dlevel >= 0) {
			if (di < 0 || dj < 0 || di >= dzoom || dj >= dzoom) return false
			dw = (tileW * scale) / dzoom
			x += di * dw
			y += dj * dw
			sx = 0
			sy = 0
			sw = natW
		} else {
			sw = natW * dzoom
			sx = -di * natW
			sy = -dj * natW
			if (sx < 0 || sy < 0 || sx >= natW || sy >= natW) return false
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
				const topLevel = Math.max(level - 5, Math.log2(map.getZoomRange()[0] / tileW) - 1)
				for (let l = level - 1; l >= topLevel; l--) {
					const sub = level - l
					upperTileDrawn = tryDrawTile(map, x,y,scale, i,j,level, i>>sub,j>>sub,level-sub, false, false) //prettier-ignore
					if (upperTileDrawn) break
				}
			}

			let lowerTilesDrawn = false
			if (!upperTileDrawn) {
				tilePlaceholderDrawFunc?.(map, x, y, tileW, scale)
				if (canFillByQuaters) {
					// drawing lower tiles as 2x2
					for (let di = 0; di <= 1; di++)
						for (let dj = 0; dj <= 1; dj++)
							tryDrawTile(map, x, y, scale, i, j, level, i*2+di, j*2+dj, level+1, false, false) //prettier-ignore
					lowerTilesDrawn = true
				}
			}

			// drawing additional (to 2x2) lower tiles from previous frames, useful for fast zoom-out animation.
			for (let k = 0; k < lastDrawnUnderLevelTilesArr.length; k++) {
				const tile = lastDrawnUnderLevelTilesArr[k]
				// skipping layer+1 if it was handled by upper 2x2
				if (!lowerTilesDrawn || tile.z >= level + 2)
					tryDrawTileObj(map, tile, x, y, scale, i, j, level, true)
			}
		}

		tryDrawTile(map, x, y, scale, i, j, level, i, j, level, shouldLoad, true)
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
		// view size in tiles
		const tileViewSize = ((map.getViewBoxWidth() * map.getViewBoxHeight()) / tileW / tileW) | 0

		// refilling recent tiles array
		lastDrawnUnderLevelTilesArr.length = 0
		lastDrawnTiles.forEach(
			x =>
				x.z >= level + 1 &&
				lastDrawnUnderLevelTilesArr.length < tileViewSize * 2 && //limiting max lower tile count, just in case
				lastDrawnUnderLevelTilesArr.push(x),
		)
		lastDrawnTiles.clear()
		drawIter++

		// start loading some center tiles first, sometimes useful on slow connections
		if (shouldLoad)
			for (let i = (iCount / 3) | 0; i < (iCount * 2) / 3; i++)
				for (let j = (jCount / 3) | 0; j < (jCount * 2) / 3; j++) {
					findTile(map, iFrom + i, jFrom + j, level, true)
				}

		// drawing tiles
		for (let i = 0; i < iCount; i++)
			for (let j = 0; j < jCount; j++) {
				const x = xShift + i * tileW * scale
				const y = yShift + j * tileW * scale
				drawOneTile(map, x, y, scale, iFrom + i, jFrom + j, level, shouldLoad)
			}

		// limiting cache size
		const cacheMaxSize = (10 * tileViewSize) | 0
		for (let attempt = 0; attempt < 4 && cache.size > cacheMaxSize; attempt++) {
			let oldestIter = drawIter - 1 //must not affect recently drawn tiles
			cache.forEach(tile => (oldestIter = Math.min(oldestIter, tile.lastDrawIter)))
			cache.forEach((tile, key) => {
				if (tile.lastDrawIter === oldestIter) {
					cache.delete(key)
					lastDrawnTiles.delete(/**@type {ReadyTile}*/ (tile))
				}
			})
		}

		prevTileRegion = [iFrom, jFrom, iCount, jCount, level]
	}

	this.getTileWidth = () => tileW

	this.clearCache = () => {
		cache.forEach(x => x.img && (x.img.src = ''))
		cache.clear()
		lastDrawnTiles.clear()
		lastDrawnUnderLevelTilesArr.length = 0
	}
}

/**
 * @param {TilePathFunc} pathFunc
 * @returns {TileImgLoadFunc}
 */
export function loadTileImage(pathFunc) {
	return (x, y, z, onLoad) => {
		const img = new Image()
		img.src = pathFunc(x, y, z)
		const onImgLoad = () => onLoad(img)
		img.onload = () => {
			if ('createImageBitmap' in window) {
				// trying no decode image in parallel thread,
				// if failed (beacuse of CORS for example) tryimg to show image anyway
				createImageBitmap(img).then(onImgLoad, onImgLoad) //TODO
			} else {
				onImgLoad()
			}
		}
	}
}

/**
 * @param {TileImgLoadFunc} tileFunc
 * @returns {TileImgLoadFunc}
 */
export function clampEarthTiles(tileFunc) {
	return (x, y, z, onLoad) => {
		const w = 2 ** z
		if (z < 0 || x < 0 || x >= w || y < 0 || y >= w) return
		tileFunc(x, y, z, onLoad)
	}
}

/**
 * @param {import('./map').LocMap} map
 * @param {number} x
 * @param {number} y
 * @param {number} tileW
 * @param {number} scale
 */
export function drawRectTilePlaceholder(map, x, y, tileW, scale) {
	const rc = map.get2dContext()
	if (rc === null) return
	const w = tileW * scale
	const margin = 1.5
	rc.strokeStyle = '#8883'
	rc.strokeRect(x + margin, y + margin, w - margin * 2, w - margin * 2)
}
