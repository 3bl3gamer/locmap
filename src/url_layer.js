export function URLLayer() {
	/** @param {import('./map').LocMap} map */
	function lookInURL(map) {
		if (location.hash.length < 3) return
		const t = location.hash.substr(1).split('/')
		const lon = parseFloat(t[0])
		const lat = parseFloat(t[1])
		const level = parseFloat(t[2])
		map.updateLocation(lon, lat, level)
	}

	let updateTimeout = -1
	/** @param {import('./map').LocMap} map */
	function updateURL(map) {
		updateTimeout = -1
		const lon = map.getLon().toFixed(9)
		const lat = map.getLat().toFixed(9)
		const z = (Math.log(map.getZoom()) / Math.LN2).toFixed(4)
		location.hash = `#${lon}/${lat}/${z}`
	}

	this.register = lookInURL

	/** @param {import('./map').LocMap} map */
	this.update = map => {
		clearTimeout(updateTimeout)
		updateTimeout = window.setTimeout(() => updateURL(map), 500)
	}
}
