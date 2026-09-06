import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY;
const apiKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY;
const projectId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID;
const messagingSenderId = appId ? String(appId).split(':')[1] ?? '' : '';

export type PushResult =
  | { status: 'registered'; token: string }
  | { status: 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied' | 'error'; message?: string };

export function isPushConfigured(): boolean {
  return Boolean(apiKey && projectId && appId && vapidKey && messagingSenderId);
}

export async function enablePush(): Promise<PushResult> {
  if (!isPushConfigured()) {
    return { status: 'not-configured', message: 'Notificações ainda não configuradas no projeto.' };
  }

  if (!('Notification' in window) || !(await isSupported())) {
    return { status: 'unsupported', message: 'Este dispositivo/navegador não suporta notificações push.' };
  }

  if (window.top !== window.self) {
    return { status: 'open-in-new-tab', message: 'Abra o app em uma aba própria para permitir notificações.' };
  }

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied', message: 'Permissão de notificação negada.' };
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp({ apiKey, projectId, appId, messagingSenderId });
    const query = new URLSearchParams({ apiKey, projectId, appId, messagingSenderId }).toString();
    const swRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });

    if (!token) {
      return { status: 'denied', message: 'Não foi possível obter o token do dispositivo.' };
    }

    return { status: 'registered', token };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', message };
  }
}

export async function registrarTokenNoServidor(matricula: string, token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/public/gm/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'dispositivos.registrar', matricula, token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data?.success);
  } catch (err) {
    console.warn('[Push] Erro ao registrar token:', err);
    return false;
  }
}
