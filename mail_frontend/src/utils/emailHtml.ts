import DOMPurify from 'dompurify'

const SUPPORTED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SUPPORTED_IMAGE_PROTOCOLS = [/^https?:/i, /^cid:/i, /^data:image\/(?:png|jpeg|jpg|gif|webp);/i]

const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'div', 'em',
  'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre',
  's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'u', 'ul', 'style'
]

const ALLOWED_ATTR = [
  'align', 'alt', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'class', 'colspan',
  'height', 'href', 'rel', 'rowspan', 'src', 'style', 'target', 'title', 'valign', 'width'
]

const ALLOWED_STYLE_PROPERTIES = new Set([
  'background', 'background-color', 'border', 'border-bottom', 'border-bottom-color',
  'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color',
  'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-right',
  'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing',
  'border-style', 'border-top', 'border-top-color', 'border-top-style', 'border-top-width',
  'border-width', 'color', 'display', 'font', 'font-family', 'font-size', 'font-style',
  'font-weight', 'height', 'letter-spacing', 'line-height', 'list-style', 'list-style-type',
  'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-width',
  'min-width', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'text-align', 'text-decoration', 'text-indent', 'text-transform', 'vertical-align',
  'white-space', 'width', 'word-break', 'word-spacing', 'word-wrap'
])

const UNSAFE_STYLE_VALUE_PATTERN = /url\s*\(|expression\s*\(|javascript:|data:|behavior\s*:|@import|image-set\s*\(|-moz-binding/i

const EMAIL_SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS: [
    'audio', 'base', 'canvas', 'embed', 'form', 'iframe', 'input', 'link', 'map', 'meta',
    'object', 'script', 'select', 'svg', 'textarea', 'video'
  ],
  FORBID_ATTR: ['srcset'],
  ALLOW_DATA_ATTR: false
}

let hooksInstalled = false

export const resolveExternalUrl = (rawUrl?: string | null, baseUrl?: string) => {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.startsWith('#') || /^(javascript|data|about):/i.test(trimmed)) return null

  try {
    const parsed = new URL(trimmed, baseUrl || window.location.href)
    if (!SUPPORTED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

const replaceEmbeddedFrames = (doc: Document) => {
  const embeddedFrames = doc.querySelectorAll('iframe[src]')
  embeddedFrames.forEach((frame) => {
    frame.remove()
  })
}

const decorateExternalLinks = (doc: Document) => {
  const links = doc.querySelectorAll('a[href]')
  links.forEach((link) => {
    const resolvedUrl = resolveExternalUrl(link.getAttribute('href'), doc.baseURI)
    if (!resolvedUrl) {
      link.removeAttribute('href')
      return
    }

    link.setAttribute('href', resolvedUrl)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  })
}

const sanitizeStyleValue = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (UNSAFE_STYLE_VALUE_PATTERN.test(normalized)) return ''
  return normalized
}

const sanitizeInlineStyle = (styleValue?: string | null) => {
  const rawStyle = String(styleValue || '').trim()
  if (!rawStyle) return ''

  const safeDeclarations: string[] = []
  rawStyle.split(';').forEach((declaration) => {
    const separatorIndex = declaration.indexOf(':')
    if (separatorIndex <= 0) return

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizeStyleValue(declaration.slice(separatorIndex + 1))
    if (!ALLOWED_STYLE_PROPERTIES.has(property) || !value) return

    safeDeclarations.push(`${property}: ${value}`)
  })

  return safeDeclarations.join('; ')
}

const sanitizeStyleTagContent = (cssText?: string | null) => {
  const rawCss = String(cssText || '').trim()
  if (!rawCss) return ''

  let sanitizedCss = ''
  const cssRulePattern = /([^{}]+)\{([^{}]*)\}/g

  rawCss.replace(cssRulePattern, (_, selector: string, declarations: string) => {
    const normalizedSelector = selector.trim()
    if (!normalizedSelector || normalizedSelector.startsWith('@')) return ''

    const safeDeclarations = sanitizeInlineStyle(declarations)
    if (!safeDeclarations) return ''

    sanitizedCss += `${normalizedSelector} { ${safeDeclarations}; }\n`
    return ''
  })

  return sanitizedCss.trim()
}

const sanitizeStyleNodes = (doc: Document) => {
  const styleNodes = doc.querySelectorAll('style')
  styleNodes.forEach((styleNode) => {
    const sanitizedCss = sanitizeStyleTagContent(styleNode.textContent)
    if (!sanitizedCss) {
      styleNode.remove()
      return
    }

    styleNode.textContent = sanitizedCss
  })
}

const sanitizeImageSources = (doc: Document) => {
  const images = doc.querySelectorAll('img[src]')
  images.forEach((image) => {
    const src = image.getAttribute('src')?.trim() || ''
    if (!SUPPORTED_IMAGE_PROTOCOLS.some((pattern) => pattern.test(src))) {
      image.removeAttribute('src')
    }
  })
}

const installHooks = () => {
  if (hooksInstalled) return

  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    const attrName = data.attrName.toLowerCase()

    if (attrName === 'style') {
      const safeStyle = sanitizeInlineStyle(data.attrValue)
      data.attrValue = safeStyle
      data.keepAttr = Boolean(safeStyle)
      return
    }

    if (attrName === 'href') {
      const resolvedUrl = resolveExternalUrl(data.attrValue)
      data.attrValue = resolvedUrl || ''
      data.keepAttr = Boolean(resolvedUrl)
      return
    }

    if (attrName === 'src') {
      const value = String(data.attrValue || '').trim()
      data.keepAttr = SUPPORTED_IMAGE_PROTOCOLS.some((pattern) => pattern.test(value))
      return
    }

    if (attrName === 'target') {
      data.attrValue = '_blank'
      data.keepAttr = true
      return
    }

    if (attrName === 'rel') {
      data.attrValue = 'noopener noreferrer'
      data.keepAttr = true
    }
  })

  hooksInstalled = true
}

export const sanitizeEmailHtml = (rawHtml?: string | null) => {
  const html = String(rawHtml || '').trim()
  if (!html) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  replaceEmbeddedFrames(doc)
  decorateExternalLinks(doc)
  sanitizeImageSources(doc)
  sanitizeStyleNodes(doc)

  const headStyles = Array.from(doc.head.querySelectorAll('style'))
    .map((style) => style.outerHTML)
    .join('')
  const bodyHtml = doc.body.innerHTML

  installHooks()

  return DOMPurify.sanitize(`${headStyles}${bodyHtml}`, EMAIL_SANITIZE_CONFIG)
}
