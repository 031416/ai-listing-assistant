
import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferredPrompt: any = null;
  installPromptVisible: WritableSignal<boolean> = signal(false);

  init() {
    this.registerServiceWorker();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.installPromptVisible.set(true);
    });
  }

  private registerServiceWorker() {
    const serviceWorkerJS = `
        const CACHE_NAME = 'ai-listing-assistant-v6';
        const ASSETS_TO_CACHE = ['/', 'https://cdn.tailwindcss.com'];
        self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS_TO_CACHE))); });
        self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
    `;
    const swBlob = new Blob([serviceWorkerJS], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(swBlob);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(swUrl)
        .then(reg => console.log('SW registered!', reg))
        .catch(err => console.log('SW registration failed:', err));
    }
  }

  async triggerInstallPrompt() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      if (outcome === 'accepted') {
        this.installPromptVisible.set(false);
      }
    }
  }
}
