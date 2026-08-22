"use client";

/* 生成一个仿真二维码 SVG（仅原型展示用，移植自原型 buildQrSvg） */
export function FakeQr({ seed, size = 200 }: { seed: string; size?: number }) {
  const n = 25;
  const cell = 8;
  const raw = n * cell;
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 100000;
  function rnd() {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  }
  const rects: string[] = [];
  const mod = (x: number, y: number) =>
    rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`);
  const finder = (ox: number, oy: number) => {
    rects.push(`<rect x="${ox * cell}" y="${oy * cell}" width="${7 * cell}" height="${7 * cell}"/>`);
    rects.push(
      `<rect x="${(ox + 1) * cell}" y="${(oy + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="#fff"/>`,
    );
    rects.push(`<rect x="${(ox + 2) * cell}" y="${(oy + 2) * cell}" width="${3 * cell}" height="${3 * cell}"/>`);
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (inFinder) continue;
      if (rnd() > 0.5) mod(x, y);
    }
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);

  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${raw}" height="${raw}" viewBox="0 0 ${raw} ${raw}"><rect width="${raw}" height="${raw}" fill="#fff"/><g fill="#111">${rects.join(
    "",
  )}</g></svg>`;

  return (
    <div
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-xl border border-border bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
