/** Only extract supported filenames. Requests always go through our authenticated API. */
export const getWorkflowScreenshotFilename = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  try {
    const pathname = new URL(value, 'https://workflow.invalid').pathname
    const match = pathname.match(/^\/(?:uploads\/automation_screenshots|mail-api\/v1\/workflows\/screenshots)\/([^/]+)$/)
    if (!match) return ''
    const filename = decodeURIComponent(match[1])
    return /^screenshot_[1-9][0-9]*_(?:[a-f0-9]{8}|[a-f0-9]{32})\.png$/.test(filename) ? filename : ''
  } catch {
    return ''
  }
}
