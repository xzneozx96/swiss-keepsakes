const TABLE = /<table[\s>]/i

/**
 * The body has no table. ProseMirror would glue the cells of a pasted table into one paragraph ("ABCD"), so each table
 * becomes one paragraph per row with the cell texts joined by a space, and empty rows are dropped. Other markup is
 * returned unchanged; the schema strips what it does not know.
 */
export function pastedHtml(html: string): string {
  if (!TABLE.test(html))
    return html

  const body = new DOMParser().parseFromString(html, 'text/html').body

  for (const table of body.querySelectorAll('table')) {
    if (table.parentElement?.closest('table'))
      continue

    const rows = Array.from(table.querySelectorAll('tr'), row => Array.from(row.querySelectorAll('th, td'), cell => cell.textContent.trim()).filter(text => text !== '').join(' '))
      .filter(text => text !== '')
    const paragraphs = rows.map((text) => {
      const paragraph = body.ownerDocument.createElement('p')

      paragraph.textContent = text

      return paragraph
    })

    table.replaceWith(...paragraphs)
  }

  return body.innerHTML
}
