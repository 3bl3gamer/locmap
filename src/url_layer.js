/** @param {import('./map').LocMap} map */
function applyHashLocation(map) {
	const t = location.hash.substr(1).split('/')
	const lon = parseFloat(t[0])
	const lat = parseFloat(t[1])
	const level = parseFloat(t[2])
	if (isNaN(lon) || isNaN(lat) || isNaN(level)) return
	map.updateLocation(lon, lat, 2 ** level)
}

/**
 * Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
 * Updates map position on `location.hash` change.
 * @class
 * @param {number} [lonLatPrec] location precision
 * @param {number} [levelPrec] level precision
 */
export function URLLayer(lonLatPrec = 9, levelPrec = 4) {
	let updateTimeout = -1
	/** @param {import('./map').LocMap} map */
	function updateURL(map) {
		updateTimeout = -1
		const lon = map.getLon().toFixed(lonLatPrec)
		const lat = map.getLat().toFixed(lonLatPrec)
		const z = Math.log2(map.getZoom()).toFixed(levelPrec)
		history.replaceState({}, '', `#${lon}/${lat}/${z}`)
	}

	/** @type {() => unknown} */
	let onHashChange

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		applyHashLocation(map)
		onHashChange = () => applyHashLocation(map)
		addEventListener('hashchange', onHashChange)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		clearTimeout(updateTimeout)
		removeEventListener('hashchange', onHashChange)
	}

	/** @param {import('./map').LocMap} map */
	this.update = map => {
		clearTimeout(updateTimeout)
		updateTimeout = window.setTimeout(() => updateURL(map), 500)
	}
}
