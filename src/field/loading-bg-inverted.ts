export function ensureInvertedLoadingBg(scene: Phaser.Scene): string {
  const key = "loading_bg_inverted";
  if (scene.textures.exists(key)) return key;

  const src = scene.textures.get("loading_bg").getSourceImage() as HTMLImageElement;
  const w = src.naturalWidth, h = src.naturalHeight;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();

  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(imgData, 0, 0);
  tex.refresh();
  return key;
}