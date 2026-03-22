/** Ecwid storefront script globals (dynamic / SPA embed). */
declare global {
  interface Window {
    ecwid_script_defer?: boolean;
    ecwid_dynamic_widgets?: boolean;
    _xnext_initialization_scripts?: Array<{
      widgetType: string;
      id: string;
      arg: string[];
    }>;
    Ecwid?: {
      destroy?: () => void;
      init?: () => void;
    };
    ecwid_onBodyDone?: () => void;
  }
}

export {};
