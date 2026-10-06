import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { formatDisplayDate, formatDeadline } from './format'
import type { Requirement, Tender, UploadedPdf } from './types'

export interface PackageInput {
  tender: Tender
  bidder: string
  /** Requirements already sorted by order. */
  requirements: Requirement[]
  matches: Record<string, string>
  files: UploadedPdf[]
  notProvided: Requirement[]
}

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 56
const INK = rgb(0.1, 0.12, 0.16)
const MUTED = rgb(0.4, 0.43, 0.48)
const RULE = rgb(0.82, 0.84, 0.87)
const BRAND = rgb(0.05, 0.33, 0.36)

/** Standard PDF fonts only support WinAnsi; replace anything else so drawing never throws. */
export const toWinAnsi = (s: string) =>
  s.replace(/[\r\n\t]+/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

export const packageFileName = (tenderId: string) => `${tenderId.replace(/[\\/:*?"<>|]+/g, '-').trim()}_Package.pdf`

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = toWinAnsi(text).split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (let word of words) {
    while (font.widthOfTextAtSize(word, size) > maxWidth) {
      let cut = word.length - 1
      while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--
      if (line) {
        lines.push(line)
        line = ''
      }
      lines.push(word.slice(0, cut))
      word = word.slice(cut)
    }
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = candidate
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['-']
}

interface Row {
  no: string
  doc: string[]
  file: string[]
  pages: string
  height: number
}

const COLS = { no: MARGIN, doc: MARGIN + 28, file: MARGIN + 250, pages: A4[0] - MARGIN - 70 }
const ROW_SIZE = 9.5
const LINE_H = 12.5

export async function buildPackage(input: PackageInput): Promise<Uint8Array> {
  const { tender, bidder, requirements, matches, files, notProvided } = input
  const out = await PDFDocument.create()
  out.setTitle(toWinAnsi(`${tender.tender_id} - Tender Submission Package`))
  out.setProducer('TenderPack AI (browser)')
  out.setCreationDate(new Date())

  const regular = await out.embedFont(StandardFonts.Helvetica)
  const bold = await out.embedFont(StandardFonts.HelveticaBold)

  const included = requirements
    .filter((r) => matches[r.id])
    .map((r) => ({ requirement: r, file: files.find((f) => f.id === matches[r.id])! }))
    .filter((x) => x.file)

  // Layout pass: compute rows so we know how many cover pages are needed before numbering.
  const rows: Row[] = included.map(({ requirement, file }, i) => {
    const doc = wrap(requirement.name_en, regular, ROW_SIZE, COLS.file - COLS.doc - 10)
    const fileLines = wrap(file.name, regular, ROW_SIZE, COLS.pages - COLS.file - 10)
    return { no: String(i + 1), doc, file: fileLines, pages: '', height: Math.max(doc.length, fileLines.length) * LINE_H + 8 }
  })

  const firstPageTableTop = 470
  const otherPageTableTop = A4[1] - MARGIN - 40
  const tableBottom = MARGIN + 60
  const notProvidedHeight = notProvided.length ? 30 + notProvided.length * LINE_H : 0

  const pageBreaks: number[][] = [[]]
  let y = firstPageTableTop
  rows.forEach((row, i) => {
    if (y - row.height < tableBottom) {
      pageBreaks.push([])
      y = otherPageTableTop
    }
    pageBreaks[pageBreaks.length - 1].push(i)
    y -= row.height
  })
  if (y - notProvidedHeight < tableBottom && notProvidedHeight) pageBreaks.push([])
  const coverPages = pageBreaks.length

  let cursor = coverPages + 1
  included.forEach(({ file }, i) => {
    const start = cursor
    const end = cursor + file.pages - 1
    rows[i].pages = start === end ? `${start}` : `${start}-${end}`
    cursor = end + 1
  })

  // Draw cover pages.
  const drawTableHeader = (page: PDFPage, top: number) => {
    page.drawText('No.', { x: COLS.no, y: top, size: 8.5, font: bold, color: MUTED })
    page.drawText('DOCUMENT', { x: COLS.doc, y: top, size: 8.5, font: bold, color: MUTED })
    page.drawText('FILE', { x: COLS.file, y: top, size: 8.5, font: bold, color: MUTED })
    page.drawText('PAGES', { x: COLS.pages, y: top, size: 8.5, font: bold, color: MUTED })
    page.drawLine({ start: { x: MARGIN, y: top - 6 }, end: { x: A4[0] - MARGIN, y: top - 6 }, thickness: 0.8, color: INK })
    return top - 22
  }

  pageBreaks.forEach((rowIndexes, pageIndex) => {
    const page = out.addPage(A4)
    let top: number

    if (pageIndex === 0) {
      page.drawRectangle({ x: 0, y: A4[1] - 130, width: A4[0], height: 130, color: BRAND })
      page.drawText('TENDER SUBMISSION PACKAGE', { x: MARGIN, y: A4[1] - 70, size: 20, font: bold, color: rgb(1, 1, 1) })
      page.drawText('Cover sheet and index of enclosed documents', {
        x: MARGIN,
        y: A4[1] - 92,
        size: 10.5,
        font: regular,
        color: rgb(0.85, 0.93, 0.93),
      })

      const fields: [string, string][] = [
        ['Tender ID', tender.tender_id],
        ['Tender Title', tender.title],
        ['Procuring Entity', tender.procuring_entity],
        ['Bidder', bidder],
        ['Submission Deadline', formatDeadline(tender)],
        ['Package Date', formatDisplayDate(new Date())],
      ]
      let fy = A4[1] - 170
      for (const [label, value] of fields) {
        page.drawText(label.toUpperCase(), { x: MARGIN, y: fy, size: 8.5, font: bold, color: MUTED })
        const lines = wrap(value, label === 'Tender ID' ? bold : regular, 11, A4[0] - MARGIN * 2 - 150)
        lines.slice(0, 3).forEach((line, li) => {
          page.drawText(line, { x: MARGIN + 150, y: fy - li * 14, size: 11, font: label === 'Tender ID' ? bold : regular, color: INK })
        })
        fy -= Math.min(lines.length, 3) * 14 + 12
      }

      page.drawText(`Included Documents (${included.length})`, { x: MARGIN, y: firstPageTableTop + 40, size: 13, font: bold, color: INK })
      top = drawTableHeader(page, firstPageTableTop + 18)
    } else {
      page.drawText(`Included Documents (continued)`, { x: MARGIN, y: otherPageTableTop + 22, size: 13, font: bold, color: INK })
      top = drawTableHeader(page, otherPageTableTop)
    }

    if (pageIndex === 0 && rows.length === 0) {
      page.drawText('No documents included.', { x: COLS.doc, y: top, size: ROW_SIZE, font: regular, color: MUTED })
    }

    for (const i of rowIndexes) {
      const row = rows[i]
      page.drawText(row.no, { x: COLS.no, y: top, size: ROW_SIZE, font: regular, color: INK })
      row.doc.forEach((l, li) => page.drawText(l, { x: COLS.doc, y: top - li * LINE_H, size: ROW_SIZE, font: bold, color: INK }))
      row.file.forEach((l, li) => page.drawText(l, { x: COLS.file, y: top - li * LINE_H, size: ROW_SIZE, font: regular, color: MUTED }))
      page.drawText(row.pages, { x: COLS.pages, y: top, size: ROW_SIZE, font: regular, color: INK })
      const bottom = top - row.height + 10
      page.drawLine({ start: { x: MARGIN, y: bottom }, end: { x: A4[0] - MARGIN, y: bottom }, thickness: 0.4, color: RULE })
      top -= row.height
    }

    if (pageIndex === coverPages - 1 && notProvided.length) {
      let ny = top - 14
      page.drawText('Optional documents not provided', { x: MARGIN, y: ny, size: 10, font: bold, color: INK })
      ny -= 16
      for (const r of notProvided) {
        page.drawText(`- ${wrap(r.name_en, regular, ROW_SIZE, A4[0] - MARGIN * 2 - 20)[0]}`, {
          x: MARGIN + 6,
          y: ny,
          size: ROW_SIZE,
          font: regular,
          color: MUTED,
        })
        ny -= LINE_H
      }
    }
  })

  // Append every page of every matched document, in requirement order.
  for (const { file } of included) {
    const src = await PDFDocument.load(file.bytes, { ignoreEncryption: true, updateMetadata: false })
    const copied = await out.copyPages(src, src.getPageIndices())
    copied.forEach((p) => out.addPage(p))
  }

  // Footer on every page.
  const footerId = toWinAnsi(tender.tender_id)
  const allPages = out.getPages()
  const total = allPages.length
  allPages.forEach((page, i) => drawFooter(page, `${footerId} | Page ${i + 1} of ${total}`, regular))

  return out.save()
}

function drawFooter(page: PDFPage, text: string, font: PDFFont) {
  const size = 9
  const pad = 4
  const offset = 16
  const tw = font.widthOfTextAtSize(text, size)
  const box = page.getCropBox()
  const angle = ((page.getRotation().angle % 360) + 360) % 360

  // Position the footer at the visual bottom-centre, regardless of page rotation.
  let x: number
  let y: number
  switch (angle) {
    case 90:
      x = box.x + box.width - offset
      y = box.y + (box.height - tw) / 2
      break
    case 180:
      x = box.x + (box.width + tw) / 2
      y = box.y + box.height - offset
      break
    case 270:
      x = box.x + offset
      y = box.y + (box.height + tw) / 2
      break
    default:
      x = box.x + (box.width - tw) / 2
      y = box.y + offset
  }

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = x + -pad * cos - -(pad - 1) * sin
  const ry = y + -pad * sin + -(pad - 1) * cos

  page.drawRectangle({
    x: rx,
    y: ry,
    width: tw + pad * 2,
    height: size + pad * 1.5,
    color: rgb(1, 1, 1),
    opacity: 0.9,
    rotate: degrees(angle),
  })
  page.drawText(text, { x, y, size, font, color: INK, rotate: degrees(angle) })
}
