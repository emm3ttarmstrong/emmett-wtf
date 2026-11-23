// Saving a prototype's subject as a PNG. Pass one of these to <ControlPanel exportImage={...}>.

function download(blob: Blob | null, name: string) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveCanvasAsPng(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => download(blob, name), "image/png");
}

// Renders the SVG as it looks now, on the page's background colour. `currentColor` and the background are read from
// the live theme, because a standalone image has no stylesheet.
export async function saveSvgAsPng(svg: SVGSVGElement, name: string, width = 2048) {
  const box = svg.viewBox.baseVal;
  const height = Math.round(width * (box.width ? box.height / box.width : svg.clientHeight / svg.clientWidth));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("class");
  clone.style.color = getComputedStyle(svg).color;

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = getComputedStyle(document.body).backgroundColor;
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  saveCanvasAsPng(canvas, name);
}
