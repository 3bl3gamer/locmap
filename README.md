Simple modular canvas-based tile map engine.

5.1 KiB after min+gizp, [more](#size).

[Example](https://3bl3gamer.github.io/locmap/examples/)

## Usage

```js
import {
    LocMap, ControlLayer, ControlHintLayer, LocationLayer, URLLayer,
    TileContainer, TileLayer, ProjectionMercator, oneOf, appendCredit,
} from 'locmap'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(256, (x, y, z) =>
    `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body,
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
window.onresize = map.resize
```

## Size

```
        bundled minfied min+gz
base      20.9     6.4    2.8  KiB
regular   39.2    12.3    5.1  KiB
full      44.6    14.9    6.1  KiB
```