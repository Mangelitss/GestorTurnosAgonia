// =============================================================
//  ICONO DEL PASO (SVG)
//  Cruz con sudario, candelabros con velas que titilan, monte de
//  claveles, canasto dorado, faldón morado y pies de costaleros.
// =============================================================

export function svgPaso() {
  let semilla = 11; const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const vela = (x, y, s, retraso) => `
    <ellipse cx="${x}" cy="${y}" rx="${4.2 * s}" ry="${1.5 * s}" fill="url(#oroV)"/>
    <rect x="${x - 1.9 * s}" y="${y - 15 * s}" width="${3.8 * s}" height="${15 * s}" rx="${.8 * s}" fill="url(#cera)"/>
    <circle cx="${x}" cy="${y - 20 * s}" r="${8 * s}" fill="url(#halo)"/>
    <ellipse class="llama" style="animation-delay:${retraso}s" cx="${x}" cy="${y - 19.5 * s}" rx="${2.3 * s}" ry="${4.8 * s}" fill="url(#llama)"/>`;
  const candelabro = (cx, base, alto, s) => {
    const top = base - alto, ya = top + 26 * s;
    let o = `<rect x="${cx - 1.7 * s}" y="${top}" width="${3.4 * s}" height="${alto}" fill="url(#oroH)"/>`;
    for (let k = 1; k <= 3; k++) o += `<ellipse cx="${cx}" cy="${top + alto * k / 4 + 4}" rx="${3.6 * s}" ry="${2 * s}" fill="url(#oroV)"/>`;
    o += `<path d="M${cx} ${ya + 9 * s} Q${cx - 13 * s} ${ya + 9 * s} ${cx - 13 * s} ${ya}" stroke="url(#oroH)" stroke-width="${2.2 * s}" fill="none"/>`;
    o += `<path d="M${cx} ${ya + 9 * s} Q${cx + 13 * s} ${ya + 9 * s} ${cx + 13 * s} ${ya}" stroke="url(#oroH)" stroke-width="${2.2 * s}" fill="none"/>`;
    o += vela(cx - 13 * s, ya, s, -rnd()) + vela(cx + 13 * s, ya, s, -rnd()) + vela(cx, top, s, -rnd());
    return o;
  };
  // Monte de claveles rojos al pie de la cruz
  const flores = [];
  for (let k = 0; k < 95; k++) {
    const x = 50 + rnd() * 120, alto = 24 * Math.sin(Math.PI * (x - 50) / 120);
    const y = 147 - rnd() * alto;
    flores.push({ x, y, r: 2.6 + rnd() * 2.2, c: ["#c0162f", "#e02443", "#9c0f26", "#d41c3a"][Math.floor(rnd() * 4)] });
  }
  flores.sort((a, b) => a.y - b.y);
  const svgFlores = flores.map((f) => `<circle cx="${f.x.toFixed(1)}" cy="${f.y.toFixed(1)}" r="${f.r.toFixed(1)}" fill="${f.c}" stroke="#5e0815" stroke-width=".6"/>`).join("")
    + [58, 74, 92, 128, 146, 162].map((x) => `<ellipse cx="${x}" cy="${146 - rnd() * 4}" rx="4" ry="1.6" fill="#2f5a2a" transform="rotate(${rnd() * 60 - 30} ${x} 146)"/>`).join("");
  // Tallas del canasto
  let tallas = "";
  for (let k = 0; k < 8; k++) {
    const x = 32 + k * 21 + (k >= 4 ? 12 : 0);
    tallas += `<path d="M${x} 171 c-5 -7 4 -14 9 -8 c3 4 -2 7 -4 4 M${x + 9} 171 c5 -7 -4 -14 -9 -8" stroke="#6e4a12" stroke-width="1.3" fill="none"/>`;
    tallas += `<circle cx="${x + 4.5}" cy="${158}" r="1.8" fill="#fff1b8"/>`;
  }
  // Faldón con ondas y flecos
  let falda = "M27 184 L193 184 L195 221";
  for (let x = 195; x > 25; x -= 14) falda += ` Q${x - 7} 226 ${x - 14} 221`;
  falda += " Z";
  let flecos = "";
  for (let x = 28; x <= 192; x += 2.6) flecos += `<line x1="${x.toFixed(1)}" y1="219" x2="${x.toFixed(1)}" y2="${225 + Math.sin(x) * 1.2}" stroke="#e2b84f" stroke-width=".9"/>`;
  let pliegues = "";
  for (let x = 40; x < 190; x += 16) pliegues += `<path d="M${x} 186 Q${x + 3} 203 ${x} 220" stroke="#ffffff" stroke-opacity=".09" stroke-width="3" fill="none"/>`;
  let pies = "";
  for (let k = 0; k < 7; k++) { const x = 42 + k * 23; pies += `<ellipse cx="${x - 3}" cy="230" rx="3.4" ry="2" fill="#efe7d6" stroke="#4a4038" stroke-width=".6"/><ellipse cx="${x + 4}" cy="231" rx="3.4" ry="2" fill="#efe7d6" stroke="#4a4038" stroke-width=".6"/>`; }
  let rafaga = "";
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r1 = 24, r2 = k % 2 ? 50 : 62; rafaga += `<line x1="${110 + Math.cos(a) * r1}" y1="${58 + Math.sin(a) * r1}" x2="${110 + Math.cos(a) * r2}" y2="${58 + Math.sin(a) * r2}" stroke="#f6dc8f" stroke-opacity=".5" stroke-width="${k % 2 ? 1 : 1.8}"/>`; }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 236" aria-label="Paso procesional">
  <defs>
    <linearGradient id="oroV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#f2c75c"/><stop offset=".75" stop-color="#b8862b"/><stop offset="1" stop-color="#7a5418"/></linearGradient>
    <linearGradient id="oroH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6420"/><stop offset=".5" stop-color="#ffe9a6"/><stop offset="1" stop-color="#8a6420"/></linearGradient>
    <linearGradient id="madera" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b170a"/><stop offset=".5" stop-color="#6a3f1d"/><stop offset="1" stop-color="#2b170a"/></linearGradient>
    <linearGradient id="terciopelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a35a6"/><stop offset=".55" stop-color="#43145f"/><stop offset="1" stop-color="#250a33"/></linearGradient>
    <linearGradient id="cera" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9ccb0"/><stop offset=".5" stop-color="#fffaf0"/><stop offset="1" stop-color="#cfc0a2"/></linearGradient>
    <radialGradient id="llama" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fffdf0"/><stop offset=".45" stop-color="#ffd35c"/><stop offset=".85" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#ffd780" stop-opacity=".75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <radialGradient id="resplandor"><stop offset="0" stop-color="#ffe7a3" stop-opacity=".6"/><stop offset=".6" stop-color="#e2b84f" stop-opacity=".15"/><stop offset="1" stop-color="#e2b84f" stop-opacity="0"/></radialGradient>
  </defs>
  <!-- Resplandor tras la cruz -->
  <circle cx="110" cy="58" r="66" fill="url(#resplandor)"/>${rafaga}
  <!-- Cruz con cantoneras doradas -->
  <rect x="105" y="12" width="10" height="132" fill="url(#madera)" stroke="#e2b84f" stroke-width=".7"/>
  <rect x="68" y="42" width="84" height="9" fill="url(#madera)" stroke="#e2b84f" stroke-width=".7"/>
  <rect x="103" y="7" width="14" height="7" rx="1.5" fill="url(#oroV)"/>
  <rect x="63" y="40.5" width="7" height="12" rx="1.5" fill="url(#oroV)"/><rect x="150" y="40.5" width="7" height="12" rx="1.5" fill="url(#oroV)"/>
  <rect x="98" y="22" width="24" height="10" rx="1" fill="#f5ecd2" stroke="#b8862b" stroke-width=".8"/>
  <text x="110" y="29.6" font-family="Georgia,serif" font-size="7" font-weight="700" text-anchor="middle" fill="#6b1420">INRI</text>
  <!-- Sudario -->
  <path d="M71 44 Q110 38 149 44 L149 51 Q110 46 71 51 Z" fill="#f6f1e7"/>
  <path d="M75 49 C71 66 79 86 89 96 C86 82 90 66 99 51 Z" fill="#f2ece0" stroke="#cbbfa8" stroke-width=".7"/>
  <path d="M121 49 C135 62 142 86 137 110 C131 96 123 76 116 51 Z" fill="#f2ece0" stroke="#cbbfa8" stroke-width=".7"/>
  <path d="M80 58 C80 72 84 82 88 90 M126 58 C132 72 135 86 135 100" stroke="#cbbfa8" stroke-width=".8" fill="none"/>
  <!-- Corona de espinas -->
  <ellipse cx="110" cy="66" rx="9" ry="4.5" fill="none" stroke="#4a3216" stroke-width="2.2"/>
  <ellipse cx="110" cy="66" rx="9" ry="4.5" fill="none" stroke="#7b5a2c" stroke-width=".8" stroke-dasharray="1.5 2"/>
  <!-- Candelabros interiores -->
  ${candelabro(60, 146, 64, .78)}${candelabro(160, 146, 64, .78)}
  <!-- Monte de claveles -->
  ${svgFlores}
  <!-- Candelabros de esquina -->
  ${candelabro(28, 148, 92, 1)}${candelabro(192, 148, 92, 1)}
  <!-- Canasto tallado y dorado -->
  <rect x="16" y="144" width="188" height="6" rx="1.5" fill="url(#oroH)"/>
  <path d="M20 150 L200 150 L191 178 L29 178 Z" fill="url(#oroV)" stroke="#6e4a12" stroke-width=".8"/>
  ${tallas}
  <ellipse cx="110" cy="164" rx="15" ry="11" fill="#3a1253" stroke="#fff1b8" stroke-width="1.6"/>
  <path d="M110 157 v14 M104 162 h12" stroke="#f2c75c" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="27" y="178" width="166" height="6" fill="#5a3a10"/>
  ${Array.from({ length: 14 }, (_, k) => `<rect x="${32 + k * 11.6}" y="179.5" width="6" height="3" rx="1" fill="#1b0c06"/>`).join("")}
  <!-- Faldón de terciopelo morado con bordado -->
  <path d="${falda}" fill="url(#terciopelo)"/>
  ${pliegues}
  <path d="M30 210 Q50 203 70 210 T110 210 T150 210 T190 210" stroke="#e2b84f" stroke-width="1.6" fill="none"/>
  <path d="M30 189 L190 189" stroke="#e2b84f" stroke-width="1" stroke-dasharray="3 2"/>
  <ellipse cx="110" cy="200" rx="10" ry="7" fill="none" stroke="#e2b84f" stroke-width="1.2"/>
  ${flecos}
  <!-- Pies de los costaleros asomando bajo el faldón -->
  ${pies}
</svg>`;
}
