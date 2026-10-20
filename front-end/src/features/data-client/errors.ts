/**
 * A write the client refused because the data would no longer fit in the browser's storage.
 * Only the demo client throws it today; a screen shows it next to its save button.
 */
export class StorageFullError extends Error {
  constructor() {
    super('The data would not fit in this browser\'s storage')
    this.name = 'StorageFullError'
  }
}
