'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { RecaptchaInstance } from '@/lib/services/recaptcha';

interface ReCaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

export function ReCaptcha({ 
  siteKey, 
  onVerify, 
  onExpire, 
  onError,
  theme = 'light',
  size = 'normal'
}: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isRenderedRef = useRef(false);

  const renderRecaptcha = useCallback(() => {
    if (!containerRef.current || isRenderedRef.current) return;
    
    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': onError
      });
      isRenderedRef.current = true;
    } catch (error) {
      console.error('Failed to render reCAPTCHA:', error);
    }
  }, [siteKey, theme, size, onVerify, onExpire, onError]);

  useEffect(() => {
    // Check if grecaptcha is already loaded
    if (typeof window.grecaptcha !== 'undefined') {
      window.grecaptcha.ready(renderRecaptcha);
      return;
    }

    // Load reCAPTCHA script
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;

    window.onRecaptchaLoad = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(renderRecaptcha);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src*="recaptcha"]');
      if (existingScript) {
        existingScript.remove();
      }
      delete window.onRecaptchaLoad;
    };
  }, [renderRecaptcha]);

  const reset = useCallback(() => {
    if (widgetIdRef.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  }, []);

  const getResponse = useCallback(() => {
    if (widgetIdRef.current !== null && window.grecaptcha) {
      return window.grecaptcha.getResponse(widgetIdRef.current);
    }
    return '';
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center"
    />
  );
}

export function useReCaptcha() {
  const reset = useCallback(() => {
    if (window.grecaptcha) {
      window.grecaptcha.reset();
    }
  }, []);

  const getResponse = useCallback(() => {
    if (window.grecaptcha) {
      return window.grecaptcha.getResponse();
    }
    return '';
  }, []);

  return { reset, getResponse };
}