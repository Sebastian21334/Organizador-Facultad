import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PwaPlatformService, detectPwaPlatform } from './pwa-platform.service';

describe('Instalación por plataforma', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it('reconoce iPad con agente de escritorio y distingue Safari de Chrome iOS', () => {
    expect(
      detectPwaPlatform({ userAgent: 'Macintosh Safari', platform: 'MacIntel', maxTouchPoints: 5 }),
    ).toBe('ios-safari');
    expect(
      detectPwaPlatform({
        userAgent: 'iPhone CriOS Safari',
        platform: 'iPhone',
        maxTouchPoints: 1,
      }),
    ).toBe('ios-other');
    expect(
      detectPwaPlatform({ userAgent: 'Android Chrome', platform: 'Linux', maxTouchPoints: 1 }),
    ).toBe('android');
  });
  it('recuerda el cierre, permite reabrir y consume beforeinstallprompt solo al tocar Instalar', async () => {
    const service = TestBed.inject(PwaPlatformService);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(service.canInstall()).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    service.dismiss();
    expect(service.showPopup()).toBe(false);
    expect(localStorage.getItem('tempo-pwa-install-dismissed-v1')).toBe('1');
    service.openInstructions();
    expect(service.showPopup()).toBe(true);
    await service.install();
    expect(prompt).toHaveBeenCalledOnce();
    expect(service.canInstall()).toBe(false);
  });
  it('una app instalada no vuelve a mostrar la invitación', () => {
    const service = TestBed.inject(PwaPlatformService);
    service.openInstructions();
    window.dispatchEvent(new Event('appinstalled'));
    service.openInstructions();
    expect(service.installed()).toBe(true);
    expect(service.showPopup()).toBe(false);
  });
});
