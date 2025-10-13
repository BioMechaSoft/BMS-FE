export function saveBlobFromResponse(response) {
  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
  const disposition = response.headers['content-disposition'] || '';
  let filename = 'download.bin';
  const match = disposition.match(/filename=\"?([^\";]+)\"?/);
  if (match && match[1]) filename = match[1].replace(/\"/g, '');
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
