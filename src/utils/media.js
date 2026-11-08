export function mediaUrl(source) {
  if (!source) return '';
  if (/^(data:|https?:|file:)/i.test(source)) return source;
  return window.electronAPI?.pathToMediaURL ? window.electronAPI.pathToMediaURL(source) : source;
}
