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

  it('keeps table syntax as text', () => {
    const html = renderMarkdownPreview('| A | B |\n| - | - |\n| 1 | 2 |', windowObject)
    expect(html).not.toContain('<table')
    expect(html).toContain('| 1 | 2 |')
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
    const noteHtml = renderMarkdownPreview(source, windowObject)
    expect(noteHtml).not.toContain('<input')
    expect(noteHtml).toContain('[x] Done')
  })
})

describe('Markdown preview safety', () => {
  it('accepts uppercase HTTP and rejects data URLs before sanitizing', () => {
    expect(isSafeMarkdownUrl('HTTP://example.com')).toBe(true)
    expect(isSafeMarkdownUrl('data:text/html,test')).toBe(false)
  })

  it.each([
    ['Brain Dump', renderMarkdownPreview],
    ['Projects', renderProjectMarkdownPreview],
  ])('renders inert markup and permits only safe links in %s', (_name, renderPreview) => {
    const rawImage = '<img src=x onerror="alert(1)">'
    const markdownImage = '![alt](https://example.com/image.png)'
    const source = [
      rawImage,
      '<input type=checkbox onclick="alert(1)">',
      '<script>alert(1)</script>',
      markdownImage,
      '[HTTP](HTTP://example.com) [HTTPS](https://example.com) [mail](mailto:test@example.com)',
      '[bad](javascript:alert(1)) [data](data:text/html,boom) [relative](/local)',
    ].join('\n\n')
    const host = windowObject.document.createElement('div')
    host.innerHTML = renderPreview(source, windowObject)

    expect(host.querySelectorAll('input, script, img, iframe, [onclick]')).toHaveLength(0)
    expect(host.textContent).toContain(rawImage)
    expect(host.textContent).toContain(markdownImage)
    expect(host.innerHTML).not.toContain('javascript:')

    const links = [...host.querySelectorAll('a')]
    expect(links.map(link => link.getAttribute('href'))).toEqual(['HTTP://example.com', 'https://example.com', 'mailto:test@example.com'])
    expect(links.every(link => link.relList.contains('noopener') && link.relList.contains('noreferrer'))).toBe(true)
  })
})
