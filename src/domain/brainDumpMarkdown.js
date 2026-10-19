import createDOMPurify from 'dompurify'
import { Marked, Renderer } from 'marked'

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'em', 'strong', 'code', 'pre', 'ol', 'ul', 'li',
  'blockquote', 'hr', 'a', 'br',
]

const ALLOWED_ATTRIBUTES = ['href', 'rel', 'target']
const SAFE_LINK = /^(?:https?:|mailto:)/i

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function isSafeMarkdownUrl(value) {
  const href = String(value ?? '').trim()
  if (!SAFE_LINK.test(href)) return false
  try {
    const protocol = new URL(href).protocol.toLowerCase()
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
  } catch {
    return false
  }
}

function createSafeMarkdown(taskLists = false) {
  const renderer = new Renderer()
  renderer.html = token => escapeHtml(token.raw ?? token.text)
  renderer.image = token => escapeHtml(token.raw ?? `![${token.text ?? ''}](${token.href ?? ''})`)
  renderer.link = function renderSafeLink(token) {
    const label = this.parser.parseInline(token.tokens)
    if (!isSafeMarkdownUrl(token.href)) return label
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
    return `<a href="${escapeHtml(token.href)}" target="_blank" rel="noreferrer noopener"${title}>${label}</a>`
  }
  if (taskLists) renderer.checkbox = ({ checked }) => `<input type="checkbox" disabled${checked ? ' checked' : ''}> `
  return new Marked({ async: false, breaks: false, gfm: taskLists, renderer })
}

const markdown = createSafeMarkdown()
const projectMarkdown = createSafeMarkdown(true)

export function parseMarkdownSource(source) {
  return markdown.parse(String(source ?? ''))
}

function sanitizeHtml(html, windowObject, taskLists = false) {
  if (!windowObject?.document) throw new Error('A DOM window is required to sanitize Markdown preview HTML')
  const purifier = createDOMPurify(windowObject)
  return purifier.sanitize(String(html ?? ''), {
    ALLOWED_TAGS: taskLists ? [...ALLOWED_TAGS, 'input'] : ALLOWED_TAGS,
    ALLOWED_ATTR: taskLists ? [...ALLOWED_ATTRIBUTES, 'type', 'disabled', 'checked'] : ALLOWED_ATTRIBUTES,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

export function sanitizeMarkdownHtml(html, windowObject = globalThis.window) {
  return sanitizeHtml(html, windowObject)
}

export function renderProjectMarkdownPreview(source, windowObject = globalThis.window) {
  return sanitizeHtml(projectMarkdown.parse(String(source ?? '')), windowObject, true)
}

export function renderMarkdownPreview(source, windowObject = globalThis.window) {
  return sanitizeMarkdownHtml(parseMarkdownSource(source), windowObject)
}
