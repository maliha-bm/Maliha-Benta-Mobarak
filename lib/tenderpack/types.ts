export type Lang = 'en' | 'bn'

export interface Tender {
  tender_id: string
  title: string
  title_bn?: string
  procuring_entity: string
  procuring_entity_bn?: string
  submission_deadline: string
  /** Deadline normalised to YYYY-MM-DD for expiry comparisons. */
  deadlineDate: string
  bidder?: string
}

export interface Requirement {
  id: string
  order: number
  name_en: string
  name_bn: string
  expiry_required: boolean
  optional: boolean
  description_en?: string
  description_bn?: string
}

export interface UploadedPdf {
  id: string
  name: string
  size: number
  pages: number
  hash: string
  bytes: Uint8Array
}

export type Status = 'Missing' | 'Expiry date needed' | 'Expired' | 'Not provided' | 'OK'

export const BLOCKING_STATUSES: readonly Status[] = ['Missing', 'Expiry date needed', 'Expired']

/** requirementId -> fileId */
export type Matches = Record<string, string>
/** requirementId -> YYYY-MM-DD */
export type ExpiryDates = Record<string, string>
