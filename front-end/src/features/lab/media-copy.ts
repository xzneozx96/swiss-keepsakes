/**
 * Every merchant-facing string of the media library lab (N18), English only. Kept in one object
 * so the German column can be added beside it, as `pins-merchant-copy.ts` does.
 */
export const copy = {
  // Shell
  'nav.label': 'Store navigation',
  'nav.contentPages': 'Content pages',
  'nav.dashboard': 'Dashboard',
  'nav.today': 'Today',
  'nav.sales': 'Sales',
  'nav.traffic': 'Traffic',
  'nav.map': 'Map',
  'nav.operations': 'Operations',
  'nav.orders': 'Orders',
  'nav.handovers': 'Handovers',
  'nav.calendar': 'Calendar',
  'nav.products': 'Products',
  'nav.keepsakes': 'Keepsakes',
  'nav.inventory': 'Inventory',
  'nav.pickup': 'Pickup points',
  'nav.partners': 'Partners',
  'nav.content': 'Content',
  'nav.stories': 'Stories',
  'nav.places': 'Places',
  'nav.categories': 'Categories',
  'nav.tours': 'Tours',
  'nav.media': 'Media',
  'nav.comments': 'Comments',
  'nav.reviews': 'Reviews',
  'nav.inquiries': 'Inquiries',
  'nav.analytics': 'Analytics',
  'nav.settings': 'Settings',
  'nav.more': 'More',

  // Page
  'title': 'Media',
  'intro': 'Photos, recordings and tour PDFs used by your stories, places and tours.',
  'upload': 'Upload',
  'search.name': 'Search by name',
  'filter.kind': 'Kind',
  'filter.use': 'Use',
  'filter.status': 'Status',
  'kind.image': 'Photos',
  'kind.audio': 'Audio',
  'kind.pdf': 'PDFs',
  'use.unused': 'Unused',
  'use.drafts': 'Only in drafts',
  'use.published': 'On published pages',
  'status.processing': 'Processing',
  'status.ready': 'Ready',
  'status.retired': 'Retired',

  // List
  'used.none': 'Unused',
  'used.pages': '{count} pages',
  'used.page': '1 page',
  'used.published': '{count} published',
  'used.draftOnly': 'draft only',
  'alt.missing': 'No description',
  'row.actions': 'Actions for {name}',
  'row.open': 'Details',
  'row.replace': 'Replace',
  'row.retire': 'Retire',
  'row.retireUsed': 'Retire (used on {count} pages)',
  'row.retireUsedOne': 'Retire (used on 1 page)',
  'empty.all': 'No files yet. Upload photos, recordings or tour PDFs; several at once is fine.',
  'empty.filtered': 'No file matches. Try another word or clear the filters.',

  // Detail
  'detail.facts': 'Info',
  'detail.uploadedAs': 'Uploaded as',
  'detail.type': 'Type',
  'detail.fileSize': 'File size',
  'detail.dimensions': 'Dimensions',
  'detail.length': 'Duration',
  'detail.added': 'Added',
  'detail.version': 'Version',
  'detail.versionValue': 'v{n}',
  'detail.openPdf': 'Open PDF',
  'detail.processing': 'Building the sizes guests see. This takes a few seconds; you can leave the page.',
  'detail.retired': 'Retired. Pages can no longer choose it, and it cannot come back.',
  'name.label': 'Name',
  'name.help': 'Search finds files by this name. It starts as the uploaded file name.',
  'name.required': 'Give the file a name.',
  'details.save': 'Save name and description',
  'details.saved': 'Name and description saved.',
  'alt.title': 'Description',
  'alt.en': 'English',
  'alt.de': 'German',
  'alt.noteOnly': 'Says what the photo shows, for guests who use a screen reader. Every pin and story that shows this photo uses it.',
  'alt.noteOther': 'Says what the file is, for guests who use a screen reader or cannot play it.',

  // Where used
  'where.title': 'Where it is used',
  'where.none': 'No page uses this file.',
  'where.published': 'On published pages',
  'where.drafts': 'Only in drafts',
  'where.draftNote': 'Guests do not see these yet.',
  'where.open': 'Would open {name}.',
  'where.orderElsewhere': 'Order in the pin editor',
  'kindLabel.story': 'Story',
  'kindLabel.place': 'Place',
  'kindLabel.tour': 'Tour',
  'kindLabel.keepsake': 'Keepsake',
  'role.cover': 'cover',
  'role.photo': 'photo',
  'role.more': 'extra photo',
  'role.audio': 'recording',
  'role.pdf': 'tour PDF',

  // Replace
  'replace.title': 'Replace {name}?',
  'replace.bodyPages': 'Every page that uses it shows the new file: {published} published and {drafts} only in drafts ({pages} in all). Guests see the change on the published ones at once.',
  'replace.bodyNone': 'No page uses it yet, so nothing changes for guests.',
  'replace.pdf': 'A tour has exactly one PDF; the new file takes its place.',
  'replace.kind': 'Choose a file of the same kind ({kind}).',
  'replace.confirm': 'Choose new file',
  'replace.cancel': 'Cancel',
  'replace.refused': 'Not replaced: {name}, {reason}.',
  'replace.done': 'Version {n} is live on {pages} pages.',
  'replace.doneNone': 'Version {n} uploaded.',

  // Retire
  'retire.button': 'Retire',
  'retire.title': 'Retire {name}?',
  'retire.body': 'No page uses it. Retired files leave the library and the pickers, and cannot come back.',
  'retire.confirm': 'Retire file',
  'retire.cancel': 'Cancel',
  'retire.done': '{name} retired.',
  'retire.inUse': 'Used on {count} pages. Remove it from them, or replace it, before you can retire it.',
  'retire.inUseOne': 'Used on 1 page. Remove it from there, or replace it, before you can retire it.',
  'retire.processing': 'Wait until it is ready.',
  'retire.refusedTitle': 'Not retired',
  'retire.refusedBody': 'While you were deciding, it was added to the draft of “{name}” ({lang}). A file in use cannot be retired.',

  // Upload
  'upload.done': '{count} files uploaded. They show as processing until their sizes are built.',
  'upload.doneOne': '1 file uploaded. It shows as processing until its sizes are built.',
  'upload.refused': '{count} files refused: {list}.',
  'upload.refusedOne': '1 file refused: {list}.',
  'upload.reasonType': 'type not accepted (JPEG, PNG, WebP, MP3, M4A or PDF)',
  'upload.reasonSize': 'too large (max {max} MB)',

  // Selection bar
  'select.start': 'Select',
  'select.stop': 'Done',
  'select.count': '{count} selected',
  'select.retire': 'Retire {count}',
  'select.blocked': '{count} in use, kept',
  'select.clear': 'Clear selection',
  'select.toggle': 'Select {name}',
  'select.done': '{count} files retired. {kept} in use were kept.',
  'grid.unused': 'Unused',
} as const

export type CopyKey = keyof typeof copy

const PLACEHOLDER = /\{(\w+)\}/g

/** `mc('key', { name })`: the string with its placeholders filled. */
export function mc(key: CopyKey, vars?: Record<string, string | number>) {
  return copy[key].replace(PLACEHOLDER, (_, name: string) => String(vars?.[name] ?? `{${name}}`))
}
