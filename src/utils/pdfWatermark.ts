import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib"

/**
 * Checks if a given buffer contains a valid PDF signature (%PDF-)
 */
export const isPdfBuffer = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 5) return false
  return buffer.slice(0, 5).toString("ascii").startsWith("%PDF-")
}

/**
 * Automatically applies a professional semi-transparent watermark and header/footer branding
 * to all pages of an uploaded PDF buffer.
 *
 * @param pdfBuffer - Raw Buffer of the PDF file
 * @param watermarkText - Main watermark string (e.g. "IGNOU-POWER")
 * @returns Watermarked PDF Buffer (or original buffer if not a PDF or if processing fails)
 */
export const addWatermarkToPdf = async (
  pdfBuffer: Buffer,
  watermarkText: string = "IGNOU-POWER"
): Promise<Buffer> => {
  try {
    if (!isPdfBuffer(pdfBuffer)) {
      return pdfBuffer
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const subFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()

    for (const page of pages) {
      const { width, height } = page.getSize()

      // 1. Center Large Diagonal Watermark
      const fontSize = Math.min(width, height) / 8
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize)
      const textHeight = font.heightAtSize(fontSize)

      const rad = (45 * Math.PI) / 180
      const x = (width - (textWidth * Math.cos(rad) - textHeight * Math.sin(rad))) / 2 - 20
      const y = (height - (textWidth * Math.sin(rad) + textHeight * Math.cos(rad))) / 2 + 40

      page.drawText(watermarkText, {
        x: Math.max(30, x),
        y: Math.max(30, y),
        size: fontSize,
        font,
        color: rgb(0.65, 0.65, 0.65),
        opacity: 0.18,
        rotate: degrees(45),
      })

      // 2. Subtle Footer Branding
      const footerText = "IGNOU-POWER • www.ignoupower.com • Educational Material"
      const footerFontSize = 8.5
      const footerTextWidth = subFont.widthOfTextAtSize(footerText, footerFontSize)
      page.drawText(footerText, {
        x: (width - footerTextWidth) / 2,
        y: 14,
        size: footerFontSize,
        font: subFont,
        color: rgb(0.45, 0.45, 0.45),
        opacity: 0.45,
      })

      // 3. Subtle Header Branding
      const headerText = "IGNOU-POWER"
      const headerFontSize = 8
      const headerTextWidth = subFont.widthOfTextAtSize(headerText, headerFontSize)
      page.drawText(headerText, {
        x: (width - headerTextWidth) / 2,
        y: height - 16,
        size: headerFontSize,
        font: subFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.35,
      })
    }

    const modifiedPdfBytes = await pdfDoc.save()
    return Buffer.from(modifiedPdfBytes)
  } catch (error) {
    console.warn("Could not apply watermark to PDF, returning original:", error)
    return pdfBuffer
  }
}
