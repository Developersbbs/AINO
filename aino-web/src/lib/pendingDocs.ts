let pendingFiles: File[] = []

export function setPendingDocs(files: File[]): void {
  pendingFiles = [...files]
}

export function getPendingDocs(): File[] {
  return pendingFiles
}

export function clearPendingDocs(): void {
  pendingFiles = []
}
