// Draws the brand once and renders it into the app icon, the web icons and the iOS launch image, and
// writes the layers the web loader shows. Run: node scripts/brand/render-icons.mjs
// The orb is clear glass on purpose: it is empty until the user fills it with their training.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const BLACK = "#050506";
const COACHES = ["#5b8c85", "#e2a03a", "#c45c2a", "#6b6fd6", "#d9363e", "#e0409f"];
const BOX = 640; // orb layer size in launch-image pixels; the launch image is 2732 square
const SPLASH = 2732;
const C = BOX / 2;

// Clouded black: soft smoke from fractal noise, kept dark with a steep curve and a vignette.
const cloudSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768">
<filter id="f" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves="5" seed="11" stitchTiles="stitch"/>
<feColorMatrix type="saturate" values="0"/>
<feComponentTransfer><feFuncR type="gamma" amplitude=".32" exponent="3.2"/><feFuncG type="gamma" amplitude=".32" exponent="3.2"/><feFuncB type="gamma" amplitude=".35" exponent="3.2" offset=".004"/><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
</filter>
<radialGradient id="v" cx=".5" cy=".5" r=".72"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
<rect width="768" height="768" filter="url(#f)"/><rect width="768" height="768" fill="url(#v)"/></svg>`;
const cloud = await sharp(Buffer.from(cloudSvg)).jpeg({ quality: 72 }).toBuffer();
writeFileSync("public/brand/cloud.jpg", cloud);

const arc = (r, from, to) => {
  const p = (deg) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)].map((n) => n.toFixed(1)).join(" ");
  return `M${p(from)} A${r} ${r} 0 0 1 ${p(to)}`;
};

// The six coaches as one ring; the web loader spins it.
const ringBody = (() => {
  const arcs = COACHES.map((color, i) => `<path d="${arc(257, i * 60 + 6, i * 60 + 54)}" stroke="${color}"/>`).join("");
  return `<defs><filter id="ring-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter></defs>`
    + `<g fill="none" stroke-width="19" stroke-linecap="round" opacity=".75" filter="url(#ring-blur)">${arcs}</g>`
    + `<g fill="none" stroke-width="19" stroke-linecap="round">${arcs}</g>`;
})();

// A clear glass sphere: almost no fill, a bright rim where glass bends light, a window highlight,
// a pin of light, and light pooling at the bottom where it passes through.
const orbBody = `<defs>
<filter id="orb-haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="orb-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="orb-pin" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
<radialGradient id="orb-rim" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".03"/><stop offset=".72" stop-color="#fff" stop-opacity=".04"/><stop offset=".93" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".42"/></radialGradient>
<radialGradient id="orb-pool" cx=".5" cy=".86" r=".42"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="orb-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>
</defs>
<circle cx="${C}" cy="${C}" r="190" fill="#fff" opacity=".05" filter="url(#orb-haze)"/>
<circle cx="${C}" cy="${C}" r="180" fill="url(#orb-rim)"/>
<ellipse cx="${C + 8}" cy="${C + 112}" rx="122" ry="52" fill="url(#orb-pool)"/>
<circle cx="${C}" cy="${C}" r="179" fill="none" stroke="url(#orb-edge)" stroke-width="2.5"/>
<ellipse cx="${C - 66}" cy="${C - 84}" rx="68" ry="34" transform="rotate(-34 ${C - 66} ${C - 84})" fill="#fff" opacity=".5" filter="url(#orb-soft)"/>
<circle cx="${C - 104}" cy="${C - 92}" r="9" fill="#fff" opacity=".9" filter="url(#orb-pin)"/>`;

const layer = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" overflow="visible">${body}</svg>`;
writeFileSync("public/brand/orb.svg", layer(orbBody));
writeFileSync("public/brand/ring.svg", layer(ringBody));

const marks = (size, scale) => {
  const at = (size - BOX * scale) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><g transform="translate(${at} ${at}) scale(${scale})">${ringBody}${orbBody}</g></svg>`);
};
const render = async (size, scale, file, out = size) => {
  const base = await sharp(cloud).resize(size, size).toBuffer();
  const full = await sharp(base).composite([{ input: marks(size, scale) }]).png().toBuffer(); // sharp resizes before compositing
  await sharp(full).resize(out, out).flatten({ background: BLACK }).png().toFile(file);
};

await render(1024, 1.2, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
await render(1024, 1.2, "public/icons/icon-512.png", 512);
await render(1024, 1.2, "public/icons/icon-192.png", 192);
// Launch image: the same cloud and orb the web loader draws, at the same size and place.
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await render(SPLASH, 1, `ios/App/App/Assets.xcassets/Splash.imageset/${name}`);
}
console.log("Rendered cloud, icon, web icons and launch image.");
