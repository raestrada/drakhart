const STORAGE_KEY = 'drakhart_muted';
const elements = new Set<HTMLAudioElement>();

export const AudioMute = {
  get muted(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  },

  toggle(): boolean {
    const next = !this.muted;
    localStorage.setItem(STORAGE_KEY, String(next));

    const ctx = (window as any).sharedAudioContext as AudioContext | undefined;
    if (ctx) {
      if (next) ctx.suspend();
      else ctx.resume();
    }

    elements.forEach(el => { el.muted = next; });

    return next;
  },

  register(el: HTMLAudioElement): void {
    if (this.muted) el.muted = true;
    elements.add(el);
    el.addEventListener('pause', () => { elements.delete(el); }, { once: true });
  },
};
