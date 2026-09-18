/** qrious ships no types; this covers the small surface we use. */
declare module 'qrious' {
  export default class QRious {
    constructor(options: {
      element?: HTMLCanvasElement;
      value: string;
      size?: number;
      background?: string;
      foreground?: string;
      level?: 'L' | 'M' | 'Q' | 'H';
    });
    toDataURL(mime?: string): string;
  }
}
