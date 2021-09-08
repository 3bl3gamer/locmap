import {
	LocMap,
	ControlLayer,
	ControlHintLayer,
	TileContainer,
	TileLayer,
	ProjectionMercator,
	LocationLayer,
	URLLayer,
	oneOf,
	appendCredit,
} from '../../src'

document.documentElement.style.height = '100%'
document.body.style.position = 'relative'
document.body.style.width = '100%'
document.body.style.height = '100%'
document.body.style.margin = '0'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(
	256,
	(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
)
map.register(new TileLayer(tileContainer))
let controlLayer = new ControlLayer()
map.register(controlLayer)
map.register(new ControlHintLayer('hold Ctrl to zoom', 'use two fingers to drag'))
map.register(new LocationLayer())
map.register(new URLLayer())
map.resize()
const credit = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
appendCredit(map.getWrap(), credit)
window.onresize = map.resize

const uiWrap = document.createElement('div')
uiWrap.style.position = 'absolute'
uiWrap.style.top = '0'
uiWrap.style.right = '0'
uiWrap.style.padding = '5px'
uiWrap.style.backgroundColor = 'rgba(255,255,255,0.8)'
uiWrap.innerHTML = `
<label>
	<input class="ctrl-checkbox" type="checkbox"/>
	do not interfere with regular page interaction<br>
	<span style="color:gray">(require Ctrl for wheel-zoom and two fingers for touch-drag)</span>
</label>`
document.body.appendChild(uiWrap)

const $ = selector => uiWrap.querySelector(selector)
$('.ctrl-checkbox').onchange = function () {
	map.unregister(controlLayer)
	controlLayer = new ControlLayer({ doNotInterfere: this.checked })
	map.register(controlLayer)
}
