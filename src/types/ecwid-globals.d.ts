/**
 * Ecwid global type declarations.
 * Covers `xProductBrowser` and the `Ecwid` namespace injected by
 * `https://app.ecwid.com/script.js`.
 */

interface EcwidProductBrowserWidget {
  widgetType: string;
  id: string;
  arg: string[];
}

interface EcwidStatic {
  /** Destroy / unmount the currently rendered Ecwid widget. */
  destroy(): void;
  /** Re-initialize after destroy. */
  init(): void;
  /** Current store ID. */
  store_id?: number;
  /** Fired once Ecwid is fully loaded. */
  OnAPILoaded: {
    add(handler: () => void): void;
  };
  OnPageLoaded: {
    add(handler: (page: { type: string }) => void): void;
  };
}

declare global {
  /**
   * Ecwid product browser initializer injected by script.js.
   * Accepts variadic string args (`"key=value"` pairs).
   */
  function xProductBrowser(...args: string[]): void;

  /** Ecwid global namespace. */
  const Ecwid: EcwidStatic | undefined;

  interface Window {
    xProductBrowser: typeof xProductBrowser;
    Ecwid: EcwidStatic | undefined;
  }
}

export type { EcwidProductBrowserWidget };
