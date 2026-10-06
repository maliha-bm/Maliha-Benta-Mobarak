import type { Requirement, Tender } from './types'

export type ParseResult =
  | { ok: true; tender: Tender; requirements: Requirement[] }
  | { ok: false; errors: string[] }

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function pickString(obj: Json, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

function pickBool(obj: Json, keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (!(key in obj)) continue
    const value = obj[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return ['true', 'yes', 'y', '1'].includes(value.trim().toLowerCase())
  }
  return undefined
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Normalises common date formats to YYYY-MM-DD. DD/MM/YYYY is assumed for slash dates. */
export function toDateOnly(input: string): string | null {
  const s = input.trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (iso) return validDate(+iso[1], +iso[2], +iso[3])
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s)
  if (dmy) return validDate(+dmy[3], +dmy[2], +dmy[1])
  const parsed = new Date(s)
  if (Number.isNaN(parsed.getTime())) return null
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

function validDate(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

export function parseRequirementsJson(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['This file is not valid JSON. Please check that it is the correct requirements.json file.'] }
  }
  if (!isObject(data)) return { ok: false, errors: ['The requirements file must contain a JSON object.'] }

  const errors: string[] = []
  const tenderSrc = isObject(data.tender) ? data.tender : data

  const tender_id = pickString(tenderSrc, ['tender_id', 'tenderId', 'id', 'reference'])
  const title = pickString(tenderSrc, ['title', 'title_en', 'tender_title', 'name'])
  const procuring_entity = pickString(tenderSrc, ['procuring_entity', 'procuringEntity', 'procuring_entity_en', 'entity'])
  const submission_deadline = pickString(tenderSrc, ['submission_deadline', 'submissionDeadline', 'deadline'])

  if (!tender_id) errors.push('Tender ID ("tender_id") is missing.')
  if (!title) errors.push('Tender title ("title") is missing.')
  if (!procuring_entity) errors.push('Procuring entity ("procuring_entity") is missing.')
  let deadlineDate: string | null = null
  if (!submission_deadline) errors.push('Submission deadline ("submission_deadline") is missing.')
  else {
    deadlineDate = toDateOnly(submission_deadline)
    if (!deadlineDate) errors.push(`Submission deadline "${submission_deadline}" is not a valid date (use YYYY-MM-DD).`)
  }

  const rawList = Array.isArray(data.requirements)
    ? data.requirements
    : isObject(data.tender) && Array.isArray(data.tender.requirements)
      ? data.tender.requirements
      : null

  const requirements: Requirement[] = []
  if (!rawList) errors.push('No "requirements" list was found in the file.')
  else if (rawList.length === 0) errors.push('The "requirements" list is empty.')
  else {
    const seen = new Set<string>()
    rawList.forEach((item, index) => {
      const label = `Requirement #${index + 1}`
      if (!isObject(item)) {
        errors.push(`${label} is not a valid object.`)
        return
      }
      const id = pickString(item, ['id', 'requirement_id', 'code']) ?? `REQ-${index + 1}`
      if (seen.has(id)) {
        errors.push(`${label} uses the ID "${id}" which appears more than once.`)
        return
      }
      seen.add(id)
      const name_en = pickString(item, ['name_en', 'name', 'title_en', 'title', 'label_en'])
      if (!name_en) {
        errors.push(`${label} ("${id}") has no English name ("name_en").`)
        return
      }
      const orderRaw = item.order ?? item.sequence ?? item.position
      const order = typeof orderRaw === 'number' ? orderRaw : Number(orderRaw)
      const mandatory = pickBool(item, ['mandatory', 'required', 'is_mandatory'])
      requirements.push({
        id,
        order: Number.isFinite(order) ? order : index + 1,
        name_en,
        name_bn: pickString(item, ['name_bn', 'title_bn', 'label_bn']) ?? name_en,
        expiry_required: pickBool(item, ['expiry_required', 'expiryRequired', 'requires_expiry', 'has_expiry']) ?? false,
        optional: pickBool(item, ['optional', 'is_optional']) ?? (mandatory === undefined ? false : !mandatory),
        description_en: pickString(item, ['description_en', 'description']),
        description_bn: pickString(item, ['description_bn']),
      })
    })
  }

  if (errors.length || !tender_id || !title || !procuring_entity || !submission_deadline || !deadlineDate) {
    return { ok: false, errors }
  }

  requirements.sort((a, b) => a.order - b.order)

  return {
    ok: true,
    tender: {
      tender_id,
      title,
      title_bn: pickString(tenderSrc, ['title_bn']),
      procuring_entity,
      procuring_entity_bn: pickString(tenderSrc, ['procuring_entity_bn']),
      submission_deadline,
      deadlineDate,
      bidder: pickString(isObject(data.bidder) ? data.bidder : tenderSrc, ['bidder', 'bidder_name', 'name']),
    },
    requirements,
  }
}
