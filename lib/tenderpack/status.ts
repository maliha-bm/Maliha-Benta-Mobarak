import { BLOCKING_STATUSES, type ExpiryDates, type Matches, type Requirement, type Status } from './types'

/**
 * Expiry dates and the deadline are both YYYY-MM-DD, so string comparison is a
 * correct calendar comparison. A document expiring ON the deadline day is OK.
 */
export function getRequirementStatus(
  requirement: Requirement,
  matchedFileId: string | undefined,
  expiryDate: string | undefined,
  deadlineDate: string,
): Status {
  if (!matchedFileId) return requirement.optional ? 'Not provided' : 'Missing'
  if (!requirement.expiry_required) return 'OK'
  if (!expiryDate) return 'Expiry date needed'
  if (expiryDate < deadlineDate) return 'Expired'
  return 'OK'
}

export const isBlocking = (status: Status) => BLOCKING_STATUSES.includes(status)

export function getAllStatuses(
  requirements: Requirement[],
  matches: Matches,
  expiry: ExpiryDates,
  deadlineDate: string,
): Record<string, Status> {
  const result: Record<string, Status> = {}
  for (const req of requirements) {
    result[req.id] = getRequirementStatus(req, matches[req.id], expiry[req.id], deadlineDate)
  }
  return result
}
