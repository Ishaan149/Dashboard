import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { isSafeMarkdownUrl, renderMarkdownPreview, renderProjectMarkdownPreview } from './brainDumpMarkdown'

const windowObject = new JSDOM('<!doctype html><html><body></body></html>').window

describe('Brain Dump Markdown preview', () => {
  it('renders the documented safe subset', () => {
    const html = renderMarkdownPreview('# Heading\n\n**Strong** and *emphasis* with `code`.\n\n- One\n- Two\n\n> Quote', windowObject)
    expect(html).toContain('<h1>Heading</h1>')
    expect(html).toContain('<strong>Strong</strong>')
    expect(html).toContain('<em>emphasis</em>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<blockquote>')
  })

  it('renders raw HTML and images as inert source text', () => {
    const html = renderMarkdownPreview('<img src=x onerror="alert(1)">\n\n![alt](https://example.com/image.png)', windowObject)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror="alert(1)"&gt;')
    expect(html).toContain('![alt](https://example.com/image.png)')
  })

  it('permits only http, https, and mailto links', () => {
    const html = renderMarkdownPreview('[web](https://example.com) [mail](mailto:test@example.com) [bad](javascript:alert(1)) [relative](/local)', windowObject)
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('href="mailto:test@example.com"')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('href="/local"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(isSafeMarkdownUrl('HTTP://example.com')).toBe(true)
    expect(isSafeMarkdownUrl('data:text/html,test')).toBe(false)
  })

  it('does not enable tables or task-list checkboxes', () => {
    const html = renderMarkdownPreview('| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done', windowObject)
    expect(html).not.toContain('<table')
    expect(html).not.toContain('<input')
    expect(html).toContain('[x] done')
  })
})


describe('Project Markdown preview', () => {
  it('renders disabled checklist marks only for project notes', () => {
    const source = '- [x] Done\n- [ ] Next'
    const host = windowObject.document.createElement('div')
    host.innerHTML = renderProjectMarkdownPreview(source, windowObject)
    const checks = [...host.querySelectorAll('input')]
    expect(checks).toHaveLength(2)
    expect(checks.every(check => check.type === 'checkbox' && check.disabled)).toBe(true)
    expect(checks.map(check => check.checked)).toEqual([true, false])
    expect(renderMarkdownPreview(source, windowObject)).not.toContain('<input')
  })

  it('keeps raw executable markup inert and restricts links in project notes', () => {
    const html = renderProjectMarkdownPreview('<input type=checkbox onclick="alert(1)">\n\n<script>alert(1)</script>\n\n![image](https://example.com/image.png)\n\n[safe](https://example.com) [mail](mailto:test@example.com) [bad](javascript:alert(1)) [data](data:text/html,boom) [relative](/local)', windowObject)
    const host = windowObject.document.createElement('div'); host.innerHTML = html
    expect(host.querySelectorAll('input, script, img, iframe, [onclick]')).toHaveLength(0)
    expect([...host.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['https://example.com', 'mailto:test@example.com'])
    expect([...host.querySelectorAll('a')].every(link => link.rel.includes('noopener') && link.rel.includes('noreferrer'))).toBe(true)
  })
})
