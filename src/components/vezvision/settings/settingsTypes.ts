export type SaveResult<T> = { success: boolean; error?: string; data?: T }
export type WithSave = <T>(
  key: string,
  action: () => Promise<SaveResult<T>>,
  successMessage: string
) => Promise<SaveResult<T> | undefined>
