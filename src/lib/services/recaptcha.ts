// Google reCAPTCHA v2 service

export interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export class RecaptchaService {
  private readonly secretKey: string;
  private readonly siteKey: string;

  constructor(siteKey: string, secretKey: string) {
    this.siteKey = siteKey;
    this.secretKey = secretKey;
  }

  /**
   * Verify reCAPTCHA response on server side
   */
  async verify(token: string, remoteIp?: string): Promise<RecaptchaResponse> {
    const url = 'https://www.google.com/recaptcha/api/siteverify';
    
    const formData = new FormData();
    formData.append('secret', this.secretKey);
    formData.append('response', token);
    
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('reCAPTCHA verification failed:', error);
      return {
        success: false,
        'error-codes': ['network-error']
      };
    }
  }

  /**
   * Get site key for client side
   */
  getSiteKey(): string {
    return this.siteKey;
  }
}

// Client-side reCAPTCHA utilities
export interface RecaptchaInstance {
  ready: (callback: () => void) => void;
  render: (container: string | HTMLElement, parameters: RecaptchaRenderParameters) => number;
  getResponse: (widgetId?: number) => string;
  reset: (widgetId?: number) => void;
  execute: (widgetId?: number) => void;
}

export interface RecaptchaRenderParameters {
  sitekey: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact' | 'invisible';
  tabindex?: number;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

declare global {
  interface Window {
    grecaptcha: RecaptchaInstance;
    onRecaptchaLoad?: () => void;
  }
}

/**
 * Load reCAPTCHA script dynamically
 */
export function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA can only be loaded in browser environment'));
      return;
    }

    // Check if already loaded
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    
    document.head.appendChild(script);
  });
}

/**
 * Execute reCAPTCHA and get response token
 */
export function executeRecaptcha(siteKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.grecaptcha) {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    window.grecaptcha.ready(() => {
      try {
        const widgetId = window.grecaptcha.render('recaptcha-container', {
          sitekey: siteKey,
          callback: (token: string) => {
            resolve(token);
          },
          'expired-callback': () => {
            reject(new Error('reCAPTCHA expired'));
          },
          'error-callback': () => {
            reject(new Error('reCAPTCHA error'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Get reCAPTCHA response token
 */
export function getRecaptchaResponse(widgetId?: number): string {
  if (typeof window === 'undefined' || !window.grecaptcha) {
    throw new Error('reCAPTCHA not loaded');
  }
  
  return window.grecaptcha.getResponse(widgetId);
}

/**
 * Reset reCAPTCHA
 */
export function resetRecaptcha(widgetId?: number): void {
  if (typeof window !== 'undefined' && window.grecaptcha) {
    window.grecaptcha.reset(widgetId);
  }
}