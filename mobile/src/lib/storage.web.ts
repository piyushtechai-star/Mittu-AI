// Web build (used for testing every screen before a native build): browser storage.
export const tokenStore = {
  get: async () => globalThis.localStorage?.getItem('mittuai.token') ?? null,
  set: async (v: string) => globalThis.localStorage?.setItem('mittuai.token', v),
  clear: async () => globalThis.localStorage?.removeItem('mittuai.token'),
};
