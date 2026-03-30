import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

// Ensure stale service workers do not keep serving outdated app bundles.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    })
    .catch(() => {
      // no-op
    });
}

// Keep session alive in all environments (web, PWA, mobile, tablet)
// Refresh auth token when app becomes visible (user returns to app tab/window)
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      // Silently handle errors - user will be prompted to log in if needed
      console.debug('Session refresh on visibility change failed:', error);
    }
  }
});

// Also refresh on window focus (helps across browsers and tabs)
window.addEventListener('focus', async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.refreshSession();
    }
  } catch (error) {
    // Silently handle errors - user will be prompted to log in if needed
    console.debug('Session refresh on focus failed:', error);
  }
});

// Handle page/app resume for mobile web apps
if (document.addEventListener) {
  document.addEventListener('resume', async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.debug('Session refresh on resume failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
