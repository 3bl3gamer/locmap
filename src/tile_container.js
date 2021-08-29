/** @param {HTMLImageElement} img */
function isLoaded(img) {
	return img.naturalWidth > 0
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
 * @param {number} tileW
 * @param {(x:number, y:number, z:number) => string} pathFunc
 */
export function TileContainer(tileW, pathFunc) {
	const cache = /** @type {Map<string,HTMLImageElement>} */ (new Map())

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	function getTileImg(map, x, y, z) {
		const img = new Image()
		img.src = pathFunc(x, y, z)
		function onLoad() {
			map.requestRedraw()
		}
		img.onload = function () {
			if ('createImageBitmap' in window) {
				// trying no decode image in parallel thread,
				// if failed (beacuse of CORS for example) tryimg to show image anyway
				createImageBitmap(img).then(onLoad, onLoad)
			} else {
				onLoad()
			}
		}
		return img
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {HTMLImageElement} img
	 * @param {number} sx
	 * @param {number} sy
	 * @param {number} sw
	 * @param {number} sh
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	function drawTile(map, img, sx, sy, sw, sh, x, y, w, h) {
		const s = devicePixelRatio
		// rounding to real canvas pixels
		const rx = Math.round(x * s) / s
		const ry = Math.round(y * s) / s
		w = Math.round((x + w) * s) / s - rx
		h = Math.round((y + h) * s) / s - ry
		const rc = map.get2dContext()
		if (rc !== null) rc.drawImage(img, sx, sy, sw, sh, rx, ry, w, h)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} l
	 * @param {boolean} load_on_fail
	 */
	this.tryDrawTile = (map, x, y, scale, i, j, l, load_on_fail) => {
		//console.log("drawing tile", x,y,scale, i,j,l)
		const key = getTileKey(i, j, l)
		const img = cache.get(key)
		if (img === undefined) {
			if (load_on_fail) cache.set(key, getTileImg(map, i, j, l))
			return false
		} else {
			if (isLoaded(img)) {
				const w = tileW
				drawTile(map, img,
				         0,0, w,w,
				         x,y, w*scale,w*scale) //prettier-ignore
			}
			return isLoaded(img)
		}
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
	 * @param {number} l
	 */
	this.tryDrawQuarter = (map, x, y, scale, qi, qj, i, j, l) => {
		const key = getTileKey(i, j, l)
		const img = cache.get(key)
		if (!img || !isLoaded(img)) return false
		const w = tileW / 2
		drawTile(map, img,
		         qi*w,qj*w, w,w,
		         x,y, w*2*scale,w*2*scale) //prettier-ignore
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
	 * @param {number} l
	 */
	this.tryDrawAsQuarter = (map, x, y, scale, qi, qj, i, j, l) => {
		const key = getTileKey(i, j, l)
		const img = cache.get(key)
		if (!img || !isLoaded(img)) return false
		const w = (tileW / 2) * scale
		drawTile(map, img,
		         0,0, tileW,tileW,
		         x+qi*w,y+qj*w, w,w) //prettier-ignore
		return true
	}

	this.getTileWidth = () => tileW

	this.clearCache = () => {
		cache.clear()
	}
}
