let pendingUrl: string | null = null;

export const resetUrlStore = {
  set: (url: string) => { pendingUrl = url; },
  consume: (): string | null => {
    const url = pendingUrl;
    pendingUrl = null;
    return url;
  },
};
