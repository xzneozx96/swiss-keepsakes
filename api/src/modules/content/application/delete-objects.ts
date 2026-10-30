import type { Bucket, ObjectStorage } from '../ports.ts'

// Removes every object under `prefix`, the deletes running together: they are independent, and a folder holds a
// handful of objects (the original and at most four variants). A missing key is not an error, so a repeat is safe.
export async function deleteFolder(storage: ObjectStorage, bucket: Bucket, prefix: string): Promise<void> {
  await Promise.all((await storage.list(bucket, prefix)).map(({ key }) => storage.delete(bucket, key)))
}
