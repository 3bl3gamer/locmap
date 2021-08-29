import {
	LocMap,
	ControlLayer,
	ControlHintLayer,
	TileContainer,
	TileLayer,
	ProjectionMercator,
	LocationLayer,
	URLLayer,
} from '../../src'

document.body.style.width = '100vw'
document.body.style.height = '100vh'
document.body.style.margin = '0'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(
	256,
	(x, y, z) => `http://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
)
map.register(new TileLayer(tileContainer))
let controlLayer = new ControlLayer(map)
map.register(controlLayer)
map.register(new ControlHintLayer('hold Ctrl to zoom', 'use two fingers to drag'))
map.register(new LocationLayer())
map.register(new URLLayer())
map.resize()
window.onresize = () => map.resize()

const uiWrap = document.createElement('div')
uiWrap.style.position = 'absolute'
uiWrap.style.top = '0'
uiWrap.style.right = '0'
uiWrap.style.padding = '5px'
uiWrap.style.backgroundColor = 'rgba(255,255,255,0.8)'
uiWrap.innerHTML = `
<label><input class="ctrl-checkbox" type="checkbox"/> require Ctrl</label>`
document.body.appendChild(uiWrap)

const $ = selector => uiWrap.querySelector(selector)
$('.ctrl-checkbox').onchange = function () {
	map.unregister(controlLayer)
	controlLayer = new ControlLayer(map, { requireModKey: this.checked })
	map.register(controlLayer)
}
