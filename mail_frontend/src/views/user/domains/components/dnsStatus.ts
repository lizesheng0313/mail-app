export const dnsStatusKey = (status?: string) => {
  const value = String(status || '').toLowerCase()
  if (['valid', 'verified'].includes(value)) return 'valid'
  if (['not_found', 'missing'].includes(value)) return 'missing'
  if (value === 'mismatch') return 'mismatch'
  // Older verification responses use "invalid" for both mismatches and lookup errors.
  if (value === 'invalid') return 'unconfirmed'
  if (['error', 'failed', 'query_failed'].includes(value)) return 'queryFailed'
  if (value === 'wrong_host') return 'wrongHost'
  return 'pending'
}

export const dnsStatusClass = (status?: string) => {
  const key = dnsStatusKey(status)
  if (key === 'valid') return 'bg-green-50 text-green-700'
  if (key === 'missing' || key === 'unconfirmed') return 'bg-amber-50 text-amber-700'
  if (key === 'queryFailed' || key === 'pending') return 'bg-gray-100 text-gray-600'
  return 'bg-red-50 text-red-700'
}

export const dnsRecordKey = (record: any) => `${record.record_type}:${record.record_name}`
