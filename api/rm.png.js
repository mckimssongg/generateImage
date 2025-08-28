import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { put } from "@vercel/blob";

// Registro de fuentes del sistema para asegurar render de texto
const FONT_STACK = '"Arial","DejaVu Sans","Liberation Sans","Helvetica","Segoe UI",sans-serif';
const MONO_STACK = '"Consolas","DejaVu Sans Mono","Liberation Mono",monospace';
(() => {
  try {
    // Lista de fuentes comunes por SO
    const candidates = [
      // Windows
      "C:/Windows/Fonts/arial.ttf",
      "C:/Windows/Fonts/segoeui.ttf",
      // Linux
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
      // macOS
      "/System/Library/Fonts/Supplemental/Arial.ttf",
      "/System/Library/Fonts/Supplemental/Helvetica.ttf"
    ];
    for (const p of candidates) {
      try {
  if (GlobalFonts.registerFromPath(p)) {
          break;
        }
      } catch {}
    }
  } catch {}
})();

export default async function handler(req, res) {
  try {
  const W = parseInt(req.query.w || "600", 10);
  const HQuery = req.query.h ? parseInt(String(req.query.h), 10) : undefined;
    const save = String(req.query.save || "0") === "1";

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");

    const r = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const numChars = r(3, 5);
    const ids = Array.from({ length: numChars }, () => r(1, 826));
    const data = await fetch(`https://rickandmortyapi.com/api/character/${ids.join(",")}`).then(r => r.json());
    const chars = Array.isArray(data) ? data : [data];

    // Layout: 3 columnas por fila, filas dinámicas.
    const gap = 10; // margen y separaciones
    const cols = 3;
    const cardW = Math.floor((W - gap * (cols + 1)) / cols);
    const imgH = 120; // alto del área de imagen
    const footerPad = 50; // alto del área de texto debajo de la imagen
    const cardH = imgH + footerPad; // alto total de cada tarjeta
    const rows = Math.max(1, Math.ceil(numChars / cols));

    const headerH = 32; // alto reservado para el título
    const footerH = 22; // alto reservado para el sello de tiempo
    const gridTop = headerH + 6; // inicio del grid
    const gridH = rows * cardH + (rows - 1) * gap;
    const calcH = gridTop + gridH + gap + footerH; // alto total calculado
    const H = HQuery && Number.isFinite(HQuery) ? HQuery : calcH;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, H);

  // Título
  ctx.fillStyle = "#ffffff"; ctx.font = `bold 18px ${FONT_STACK}`; ctx.textBaseline = "top";
    ctx.fillText("Cumpleañeros de hoy", 10, 10);

    // Fecha de hoy en formato local
    const today = new Date().toLocaleDateString("es-ES");

    // Tarjetas
    for (let i = 0; i < numChars; i++) {
      const c = chars[i];
      const col = i % cols; const row = Math.floor(i / cols);
      const x = gap + col * (cardW + gap);
      const y = gridTop + row * (cardH + gap);

      // Tarjeta con esquinas redondeadas
      ctx.fillStyle = "#101826"; roundRect(ctx, x - 1, y - 1, cardW + 2, cardH + 2, 10); ctx.fill();

      // Imagen
      try {
        const img = await loadImage(c.image);
        ctx.drawImage(img, x, y, cardW, imgH);
      } catch {}

      // Área de texto (ligero overlay para legibilidad)
      ctx.fillStyle = "#0b0e14"; ctx.globalAlpha = 0.85;
      roundRect(ctx, x, y + imgH, cardW, footerPad, 10); ctx.fill();
      ctx.globalAlpha = 1;

      // Nombre
  ctx.fillStyle = "#ffffff"; ctx.font = `14px ${FONT_STACK}`; ctx.textBaseline = "top";
      ctx.fillText(trunc(c.name, Math.floor(cardW / 7)), x + 8, y + imgH + 8);

      // Fecha de cumpleaños (hoy)
  ctx.fillStyle = "#9fe870"; ctx.font = `12px ${MONO_STACK}`; ctx.textBaseline = "top";
      ctx.fillText("Cumpleaños: " + today, x + 8, y + imgH + 28);
    }

    // Sello de generación
  ctx.fillStyle = "#95a1b2"; ctx.font = `11px ${MONO_STACK}`; ctx.textBaseline = "alphabetic";
    ctx.fillText("Generado: " + new Date().toISOString(), 10, H - 8);

    const png = canvas.toBuffer("image/png");

    if (save) {
      await put("rm-live.png", png, { access: "public", addRandomSuffix: false, contentType: "image/png" });
    }

    res.end(png);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
function trunc(s, m) { return s.length > m ? s.slice(0, m - 1) + "…" : s;
}
