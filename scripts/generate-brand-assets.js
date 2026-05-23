const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets');

const colors = {
  background: '#EEF8DD',
  cream: '#FFF8DC',
  dino: '#BDEB95',
  dinoLight: '#D6F4B9',
  outline: '#6EA154',
  belly: '#FFF0AE',
  cheek: '#F5A89C',
  eye: '#304735',
  leaf: '#83D46B',
  sky: '#DDF3FF',
  petal: '#FFC0D2',
};

const hexToRgba = (hex, alpha = 1) => {
  const value = hex.replace('#', '');
  const bigint = Number.parseInt(value, 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
    Math.round(alpha * 255),
  ];
};

const blendPixel = (data, width, x, y, color) => {
  if (x < 0 || y < 0 || x >= width) {
    return;
  }

  const index = (y * width + x) * 4;
  if (index < 0 || index >= data.length) {
    return;
  }

  const sourceAlpha = color[3] / 255;
  const targetAlpha = data[index + 3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outAlpha <= 0) {
    return;
  }

  data[index] = Math.round((color[0] * sourceAlpha + data[index] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 1] = Math.round((color[1] * sourceAlpha + data[index + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 2] = Math.round((color[2] * sourceAlpha + data[index + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  data[index + 3] = Math.round(outAlpha * 255);
};

const createSurface = (width, height, background = null) => {
  const data = Buffer.alloc(width * height * 4);

  if (background) {
    const color = hexToRgba(background);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
    }
  }

  return { width, height, data };
};

const fillEllipse = (surface, cx, cy, rx, ry, fill, alpha = 1) => {
  const color = hexToRgba(fill, alpha);
  const minX = Math.floor(cx - rx - 1);
  const maxX = Math.ceil(cx + rx + 1);
  const minY = Math.floor(cy - ry - 1);
  const maxY = Math.ceil(cy + ry + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const coverage = Math.max(0, Math.min(1, (1 - distance) * Math.min(rx, ry)));
      if (coverage > 0) {
        blendPixel(surface.data, surface.width, x, y, [color[0], color[1], color[2], Math.round(color[3] * coverage)]);
      }
    }
  }
};

const roundedRectCoverage = (px, py, x, y, width, height, radius) => {
  const qx = Math.abs(px - (x + width / 2)) - width / 2 + radius;
  const qy = Math.abs(py - (y + height / 2)) - height / 2 + radius;
  const outside = Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2);
  const inside = Math.min(Math.max(qx, qy), 0);
  const distance = outside + inside - radius;
  return Math.max(0, Math.min(1, 0.75 - distance));
};

const fillRoundedRect = (surface, x, y, width, height, radius, fill, alpha = 1) => {
  const color = hexToRgba(fill, alpha);
  const minX = Math.floor(x - 1);
  const maxX = Math.ceil(x + width + 1);
  const minY = Math.floor(y - 1);
  const maxY = Math.ceil(y + height + 1);

  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let xx = minX; xx <= maxX; xx += 1) {
      const coverage = roundedRectCoverage(xx + 0.5, yy + 0.5, x, y, width, height, radius);
      if (coverage > 0) {
        blendPixel(surface.data, surface.width, xx, yy, [color[0], color[1], color[2], Math.round(color[3] * coverage)]);
      }
    }
  }
};

const pointInPolygon = (x, y, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
};

const fillPolygon = (surface, points, fill, alpha = 1) => {
  const color = hexToRgba(fill, alpha);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let coverage = 0;
      for (const ox of [0.25, 0.75]) {
        for (const oy of [0.25, 0.75]) {
          coverage += pointInPolygon(x + ox, y + oy, points) ? 0.25 : 0;
        }
      }
      if (coverage > 0) {
        blendPixel(surface.data, surface.width, x, y, [color[0], color[1], color[2], Math.round(color[3] * coverage)]);
      }
    }
  }
};

const strokeDots = (surface, points, radius, fill) => {
  points.forEach(([x, y]) => fillEllipse(surface, x, y, radius, radius, fill));
};

const strokeArc = (surface, cx, cy, rx, ry, start, end, radius, fill) => {
  const points = [];
  const steps = 64;
  for (let i = 0; i <= steps; i += 1) {
    const t = start + ((end - start) * i) / steps;
    points.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  strokeDots(surface, points, radius, fill);
};

const drawFlower = (surface, cx, cy, scale) => {
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5;
    fillEllipse(
      surface,
      cx + Math.cos(angle) * scale * 16,
      cy + Math.sin(angle) * scale * 16,
      scale * 15,
      scale * 23,
      colors.petal,
      0.95,
    );
  }
  fillEllipse(surface, cx, cy, scale * 15, scale * 15, '#FFD86B');
};

const drawDino = (surface, cx, cy, scale, options = {}) => {
  const outline = options.noOutline ? null : colors.outline;
  const headRx = scale * 180;
  const headRy = scale * 150;

  if (outline) {
    fillEllipse(surface, cx, cy - scale * 52, headRx + scale * 14, headRy + scale * 14, outline);
  }
  fillEllipse(surface, cx, cy - scale * 52, headRx, headRy, colors.dino);

  if (outline) {
    fillEllipse(surface, cx - scale * 98, cy - scale * 126, scale * 45, scale * 33, outline);
    fillEllipse(surface, cx + scale * 98, cy - scale * 126, scale * 45, scale * 33, outline);
  }
  fillEllipse(surface, cx - scale * 98, cy - scale * 126, scale * 37, scale * 25, colors.dino);
  fillEllipse(surface, cx + scale * 98, cy - scale * 126, scale * 37, scale * 25, colors.dino);

  const spikes = [
    [cx + scale * 96, cy - scale * 188, cx + scale * 122, cy - scale * 250, cx + scale * 152, cy - scale * 178],
    [cx + scale * 145, cy - scale * 144, cx + scale * 198, cy - scale * 190, cx + scale * 198, cy - scale * 110],
    [cx + scale * 160, cy - scale * 82, cx + scale * 230, cy - scale * 88, cx + scale * 185, cy - scale * 30],
  ];

  spikes.forEach(([x1, y1, x2, y2, x3, y3]) => {
    if (outline) {
      fillPolygon(surface, [[x1 - scale * 8, y1], [x2, y2 - scale * 10], [x3 + scale * 8, y3]], outline);
    }
    fillPolygon(surface, [[x1, y1], [x2, y2], [x3, y3]], colors.leaf);
  });

  fillEllipse(surface, cx - scale * 72, cy - scale * 46, scale * 17, scale * 22, colors.eye);
  fillEllipse(surface, cx + scale * 72, cy - scale * 46, scale * 17, scale * 22, colors.eye);
  fillEllipse(surface, cx - scale * 116, cy + scale * 16, scale * 31, scale * 21, colors.cheek, 0.72);
  fillEllipse(surface, cx + scale * 116, cy + scale * 16, scale * 31, scale * 21, colors.cheek, 0.72);
  fillEllipse(surface, cx - scale * 58, cy - scale * 103, scale * 31, scale * 20, colors.dinoLight, 0.78);
  fillEllipse(surface, cx + scale * 24, cy - scale * 118, scale * 20, scale * 13, colors.dinoLight, 0.72);
  strokeArc(surface, cx, cy + scale * 12, scale * 45, scale * 32, 0.18, Math.PI - 0.18, scale * 6, colors.eye);

  if (outline) {
    fillEllipse(surface, cx, cy + scale * 188, scale * 133, scale * 101, outline);
  }
  fillEllipse(surface, cx, cy + scale * 184, scale * 119, scale * 89, colors.dino);
  fillEllipse(surface, cx, cy + scale * 202, scale * 58, scale * 58, colors.belly);

  if (outline) {
    fillEllipse(surface, cx - scale * 110, cy + scale * 174, scale * 35, scale * 21, outline);
    fillEllipse(surface, cx + scale * 110, cy + scale * 174, scale * 35, scale * 21, outline);
  }
  fillEllipse(surface, cx - scale * 110, cy + scale * 174, scale * 26, scale * 14, colors.dino);
  fillEllipse(surface, cx + scale * 110, cy + scale * 174, scale * 26, scale * 14, colors.dino);

  drawFlower(surface, cx - scale * 126, cy - scale * 156, scale * 0.74);
};

const pngChunk = (type, data) => {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return chunk;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const writePng = (fileName, surface) => {
  const raw = Buffer.alloc((surface.width * 4 + 1) * surface.height);
  for (let y = 0; y < surface.height; y += 1) {
    const rowStart = y * (surface.width * 4 + 1);
    raw[rowStart] = 0;
    surface.data.copy(raw, rowStart + 1, y * surface.width * 4, (y + 1) * surface.width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(surface.width, 0);
  ihdr.writeUInt32BE(surface.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(path.join(OUT_DIR, fileName), png);
};

const drawBrandIcon = () => {
  const surface = createSurface(1024, 1024, colors.background);
  fillEllipse(surface, 180, 178, 170, 116, '#D9F4BF', 0.95);
  fillEllipse(surface, 820, 184, 148, 96, '#FFF4BD', 0.7);
  fillEllipse(surface, 850, 824, 180, 120, '#D7F5FF', 0.66);
  fillRoundedRect(surface, 122, 118, 780, 788, 210, colors.cream, 0.82);
  fillRoundedRect(surface, 152, 148, 720, 728, 180, '#F8FFE9', 0.78);
  fillEllipse(surface, 512, 808, 258, 55, '#BFDCA8', 0.35);
  drawDino(surface, 512, 470, 1.15);
  return surface;
};

const drawAdaptiveIcon = () => {
  const surface = createSurface(1024, 1024);
  fillEllipse(surface, 512, 520, 360, 360, colors.cream, 0.92);
  fillEllipse(surface, 512, 804, 258, 55, '#BFDCA8', 0.24);
  drawDino(surface, 512, 486, 1.06);
  return surface;
};

const drawSplashIcon = () => {
  const surface = createSurface(1024, 1024);
  fillEllipse(surface, 512, 542, 292, 262, colors.cream, 0.88);
  fillEllipse(surface, 386, 350, 74, 44, colors.sky, 0.65);
  fillEllipse(surface, 650, 348, 52, 34, '#FFF4BD', 0.72);
  fillEllipse(surface, 512, 742, 226, 46, '#BFDCA8', 0.26);
  drawDino(surface, 512, 486, 0.94);
  return surface;
};

const drawFavicon = () => {
  const surface = createSurface(128, 128, colors.background);
  fillRoundedRect(surface, 8, 8, 112, 112, 30, colors.cream, 0.88);
  drawDino(surface, 64, 61, 0.14, { noOutline: true });
  return surface;
};

writePng('icon.png', drawBrandIcon());
writePng('adaptive-icon.png', drawAdaptiveIcon());
writePng('splash-icon.png', drawSplashIcon());
writePng('favicon.png', drawFavicon());

console.log('Generated Dino Calm brand assets.');
