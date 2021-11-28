/** @param {import('./map').LocMap} map */
function applyHashLocation(map) {
	const t = location.hash.substr(1).split('/')
	const lon = parseFloat(t[0])
	const lat = parseFloat(t[1])
	const level = parseFloat(t[2])
	if (isNaN(lon) || isNaN(lat) || isNaN(level)) return
	map.updateLocation(lon, lat, level)
}

/**
 * Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
 * Updates map position on `location.hash` change.
 * @class
 */
export function URLLayer() {
	let updateTimeout = -1
	/** @param {import('./map').LocMap} map */
	function updateURL(map) {
		updateTimeout = -1
		const lon = map.getLon().toFixed(9)
		const lat = map.getLat().toFixed(9)
		const z = (Math.log(map.getZoom()) / Math.LN2).toFixed(4)
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
