import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type PwaNavigator = Navigator & { standalone?: boolean };
export type PwaPlatform = 'android' | 'ios-safari' | 'ios-other' | 'other';

export function detectPwaPlatform(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>,
): PwaPlatform {
  const ios =
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  if (ios)
    return /Safari/.test(nav.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(nav.userAgent)
      ? 'ios-safari'
      : 'ios-other';
  return /Android/.test(nav.userAgent) ? 'android' : 'other';
}

@Injectable({ providedIn: 'root' })
export class PwaPlatformService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);
  private readonly deferredPrompt = signal<InstallPromptEvent | null>(null);
  private readonly manuallyOpened = signal(false);
  readonly platform: PwaPlatform = this.window ? detectPwaPlatform(this.window.navigator) : 'other';
  readonly installed = signal(this.isStandalone());
  readonly canInstall = computed(() => !this.installed() && !!this.deferredPrompt());
  readonly error = signal('');
  // Instalar es una acción opcional: la primera visita nunca interrumpe el flujo.
  readonly showPopup = computed(() => !this.installed() && this.manuallyOpened());

  constructor() {
    const win = this.window;
    if (!win) return;
    const media = win.matchMedia?.('(display-mode: standalone)');
    const updateInstalled = () => this.installed.set(this.isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      this.deferredPrompt.set(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      this.installed.set(true);
      this.deferredPrompt.set(null);
      this.dismiss();
    };
    win.addEventListener('beforeinstallprompt', onPrompt);
    win.addEventListener('appinstalled', onInstalled);
    win.addEventListener('pageshow', updateInstalled);
    media?.addEventListener('change', updateInstalled);
    this.destroyRef.onDestroy(() => {
      win.removeEventListener('beforeinstallprompt', onPrompt);
      win.removeEventListener('appinstalled', onInstalled);
      win.removeEventListener('pageshow', updateInstalled);
      media?.removeEventListener('change', updateInstalled);
    });
  }

  openInstructions(): void {
    this.manuallyOpened.set(true);
  }
  dismiss(): void {
    this.manuallyOpened.set(false);
  }
  async install(): Promise<void> {
    const event = this.deferredPrompt();
    if (!event) return;
    this.error.set('');
    try {
      await event.prompt();
      await event.userChoice;
      this.dismiss();
    } catch {
      this.error.set('No pudimos abrir la instalación. Probá desde el menú del navegador.');
    } finally {
      this.deferredPrompt.set(null);
    }
  }
  private isStandalone(): boolean {
    return !!(
      this.window?.matchMedia?.('(display-mode: standalone)').matches ||
      (this.window?.navigator as PwaNavigator | undefined)?.standalone
    );
  }
}
