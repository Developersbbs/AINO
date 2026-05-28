export interface PendingDoc {
  uri: string
  name: string
  mimeType: string
  size: number
}

let pendingDocs: PendingDoc[] = []

export function setPendingDocs(docs: PendingDoc[]): void {
  pendingDocs = [...docs]
}

export function getPendingDocs(): PendingDoc[] {
  return pendingDocs
}

export function clearPendingDocs(): void {
  pendingDocs = []
}
