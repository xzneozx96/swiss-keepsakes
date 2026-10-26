/** The `head` of a private route: asks search engines to skip the page. */
export function noIndexHead() {
  return { meta: [{ name: 'robots', content: 'noindex' }] }
}
