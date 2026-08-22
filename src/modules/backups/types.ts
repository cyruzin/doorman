export interface Backup {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
}

export interface BackupFilter {
  from?: string;
  to?: string;
}
