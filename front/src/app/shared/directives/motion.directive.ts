import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

// Targets visual blocks, never the router's containers or the inert product preview.
const BLOQUES = [
  '[data-motion]', '.title-bar', '.card', '.materia-card', '.tareas-item',
  '.filtros-bar', '.estado-tabs', '.tareas-vacio', '.tarea-edicion',
  '.recordatorio-aviso', '.inicio-welcome', '.stat-card', '.academic-progress-card',
  '.inicio-dashboard-inner > section:not(.inicio-stats)', '.tarea-row',
  '.calendar-heading', '.calendar-toolbar', '.calendar-grid', '.month-tasks', '.upcoming-card',
  'app-tarea-manual-form', 'app-error',
  '.landing .hero-copy > *', '.landing .product', '.landing .benefits > p',
  '.landing .section-title', '.landing .steps > article', '.landing .feature-copy',
  '.landing .feature-list > article', '.landing .final > *',
  'app-contacto section', 'app-login section', 'app-register section',
  'app-forgot-password section', 'app-reset-password section', 'app-verify-email section',
].join(',');

@Directive({ selector: '[appMotion]' })
export class MotionDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Browser-only: server rendering leaves all content visible.
    afterNextRender(() => {
      if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return;
      const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
      const vistos = new WeakSet<HTMLElement>();
      const pendientes = new Set<HTMLElement>();
      const visibles = new IntersectionObserver((entradas) => {
        let orden = 0;
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const elemento = entrada.target as HTMLElement;
          visibles.unobserve(elemento);
          pendientes.delete(elemento);
          if (!preferencia.matches) {
            elemento.style.setProperty('--motion-delay', `${Math.min(orden++, 4) * 55}ms`);
            elemento.classList.add('tempo-motion-enter');
          }
        }
      }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

      const registrar = (nodo: Element) => {
        const candidatos = nodo.matches(BLOQUES) ? [nodo, ...nodo.querySelectorAll(BLOQUES)] : nodo.querySelectorAll(BLOQUES);
        for (const candidato of candidatos) {
          if (!(candidato instanceof HTMLElement) || vistos.has(candidato)) continue;
          vistos.add(candidato);
          // Avoid layered transitions and keep the preview a faithful static view.
          if (preferencia.matches || candidato.closest('[inert]') || candidato.parentElement?.closest(BLOQUES)) continue;
          pendientes.add(candidato);
          visibles.observe(candidato);
        }
      };
      const cambios = new MutationObserver((registros) => {
        for (const registro of registros) {
          for (const nodo of registro.addedNodes) if (nodo instanceof Element) registrar(nodo);
        }
        // Detached/filtered rows must not be retained by the observer.
        for (const elemento of pendientes) {
          if (!this.host.contains(elemento)) {
            visibles.unobserve(elemento);
            pendientes.delete(elemento);
          }
        }
      });
      const detenerMovimiento = () => {
        if (!preferencia.matches) return;
        visibles.disconnect();
        pendientes.clear();
        this.host.querySelectorAll('.tempo-motion-enter').forEach((elemento) => elemento.classList.remove('tempo-motion-enter'));
      };
      registrar(this.host);
      cambios.observe(this.host, { childList: true, subtree: true });
      preferencia.addEventListener('change', detenerMovimiento);
      this.destroyRef.onDestroy(() => {
        visibles.disconnect();
        cambios.disconnect();
        pendientes.clear();
        preferencia.removeEventListener('change', detenerMovimiento);
      });
    });
  }
}
