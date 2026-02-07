/**
 * Convert a PDF file to an array of PNG images (one per page) for OCR/extraction.
 * Uses pdfjs-dist; call from browser only (needs canvas).
 * @param {File} file - PDF file
 * @returns {Promise<Array<{ data: string, mimeType: string }>>} base64 PNGs
 */
export async function pdfToPngImages(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('File must be a PDF')
  }
  const pdfjsLib = await import('pdfjs-dist')
  if (pdfjsLib.GlobalWorkerOptions?.workerSrc == null) {
    try {
      const workerUrl = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).href
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs'
    }
  }
  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = doc.numPages
  const out = []
  const scale = 2
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise
    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
    out.push({ data: base64, mimeType: 'image/png' })
  }
  return out
}
