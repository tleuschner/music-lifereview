export interface DeleteUploadSession {
  execute(token: string): Promise<{ deleted: boolean }>;
}
