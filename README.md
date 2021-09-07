# LocMap

Simple modular tile map engine.

4.3 KiB after min+gizp, [more](#size).

[Example](https://3bl3gamer.github.io/loclog/examples/)

## Usage

```js
import {
    LocMap, ControlLayer, ControlHintLayer, LocationLayer, URLLayer,
    TileContainer, TileLayer, ProjectionMercator, oneOf, appendCredit,
} from '${mapSrcDir}'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(256, (x, y, z) =>
    `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body,
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
```

## Size

```
        bundled minfied min+gz
base      15.0     5.5    2.3  KiB
regular   32.2    11.0    4.3  KiB
full      37.4    13.4    5.3  KiB
```