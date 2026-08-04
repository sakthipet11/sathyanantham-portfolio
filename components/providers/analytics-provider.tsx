'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@/lib/store';

interface AnalyticsContextProps {
  trackEvent: (eventType: string, details?: Record<string, any>) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextProps | null>(null);

function getBrowserName(userAgent: string): string {
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("SamsungBrowser")) return "Samsung Browser";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  if (userAgent.includes("Trident")) return "Internet Explorer";
  if (userAgent.includes("Edge") || userAgent.includes("Edg")) return "Microsoft Edge";
  if (userAgent.includes("Chrome")) return "Google Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown";
}

function getOSName(userAgent: string): string {
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS")) return "macOS";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  if (userAgent.includes("Linux")) return "Linux";
  return "Unknown";
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { sessionId, setSessionId } = useAppStore();

  const trackEvent = async (eventType: string, details: Record<string, any> = {}) => {
    const activeSessionId = sessionId || localStorage.getItem('sathya_session_id') || '';
    if (!activeSessionId) return;

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      
      await fetch(`${apiHost}/api/visitor/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          session_id: activeSessionId,
          event_type: eventType,
          details,
          browser: getBrowserName(userAgent),
          os: getOSName(userAgent),
          country: 'Localhost', // Server-side GeoIP can refine this if deployed
          city: 'Development'
        })
      });
    } catch (err) {
      console.warn("Telemetry log failed:", err);
    }
  };

  useEffect(() => {
    // Generate or retrieve session ID on client mount
    let storedId = localStorage.getItem('sathya_session_id');
    if (!storedId) {
      storedId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('sathya_session_id', storedId);
    }
    setSessionId(storedId);

    // Track initial page view event once sessionId is configured in state
    const triggerInitialView = async () => {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const userAgent = navigator.userAgent;
      
      try {
        await fetch(`${apiHost}/api/visitor/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: storedId,
            event_type: 'page_view',
            details: {
              url: window.location.href,
              screen_resolution: `${window.screen.width}x${window.screen.height}`,
              referrer: document.referrer
            },
            browser: getBrowserName(userAgent),
            os: getOSName(userAgent)
          })
        });
      } catch (err) {
        console.warn("Failed to submit page view telemetry:", err);
      }
    };

    triggerInitialView();
  }, [setSessionId]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
