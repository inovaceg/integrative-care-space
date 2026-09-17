import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType = "page_view" | "whatsapp_click" | "appointment_click" | "contact_form_submitted";

const visitorStorageKey = "anonymous_analytics_visitor_id";

function createVisitorId() {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : null;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoApi) cryptoApi.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getVisitorId() {
  try {
    const storedId = window.localStorage.getItem(visitorStorageKey);
    if (storedId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storedId)) return storedId;
    const visitorId = createVisitorId();
    window.localStorage.setItem(visitorStorageKey, visitorId);
    return visitorId;
  } catch {
    return createVisitorId();
  }
}

function getDeviceType(userAgent: string) {
  if (/ipad|tablet|playbook|silk/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) return "tablet";
  if (/android|iphone|ipod|mobile|windows phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

function getBrowser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\//i.test(userAgent)) return "Opera";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/chrome\//i.test(userAgent) && !/chromium/i.test(userAgent)) return "Chrome";
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return "Safari";
  return "Outro";
}

function getReferrerOrigin() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).origin.slice(0, 300);
  } catch {
    return null;
  }
}

function cleanPagePath(pagePath: string) {
  return pagePath.split("?")[0]?.split("#")[0]?.slice(0, 300) || "/";
}

export function trackAnalyticsEvent(eventType: AnalyticsEventType, pagePath = window.location.pathname) {
  if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) return;

  const userAgent = navigator.userAgent;
  void supabase.from("analytics_events").insert({
    event_type: eventType,
    page_path: cleanPagePath(pagePath),
    referrer_origin: getReferrerOrigin(),
    device_type: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    country: null,
    state: null,
    city: null,
    visitor_id: getVisitorId(),
  });
}

export function trackAnalyticsEvents(eventTypes: AnalyticsEventType[], pagePath = window.location.pathname) {
  eventTypes.forEach((eventType) => trackAnalyticsEvent(eventType, pagePath));
}
