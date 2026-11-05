export async function letterheadPreviewJpeg() {
  const preview = document.querySelector('svg[aria-label="Papel timbrado A4 do Dr. Frederick"]')!;
  const svg = preview.cloneNode(true) as SVGSVGElement;
  svg.setAttribute('width', '1190');
  svg.setAttribute('height', '1684');
  const source = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);
  const canvas = document.createElement('canvas');
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const encoded = canvas.toDataURL('image/jpeg', 0.96).split(',')[1];
  const data = atob(encoded);
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) bytes[i] = data.charCodeAt(i);
  return { bytes, width: canvas.width, height: canvas.height };
}
