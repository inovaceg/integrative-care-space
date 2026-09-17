import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType = "page_view" | "whatsapp_click" | "appointment_click" | "contact_form_submitted";

const visitorStorageKey = "anonymous_analytics_visitor_id";
const locationStorageKey = "anonymous_analytics_approximate_location_v1";
const locationTimeoutMs = 3000;
const locationFieldMaxLength = 100;

type ApproximateLocation = {
  country: string | null;
  state: string | null;
  city: string | null;
};

const emptyLocation: ApproximateLocation = { country: null, state: null, city: null };
let locationRequest: Promise<ApproximateLocation> | null = null;

function sanitizeLocationField(value: unknown) {
  if (typeof value !== "string") return null;
  const sanitized = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, locationFieldMaxLength);
  return sanitized || null;
}

function sanitizeLocation(value: { country?: unknown; state?: unknown; city?: unknown }): ApproximateLocation {
  return {
    country: sanitizeLocationField(value.country),
    state: sanitizeLocationField(value.state),
    city: sanitizeLocationField(value.city),
  };
}

function readCachedLocation() {
  try {
    const cached = window.sessionStorage.getItem(locationStorageKey);
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached);
    if (!parsed || typeof parsed !== "object") return null;
    const location = sanitizeLocation(parsed as { country?: unknown; state?: unknown; city?: unknown });
    return location.country || location.state || location.city ? location : null;
  } catch {
    return null;
  }
}

function cacheLocation(location: ApproximateLocation) {
  try {
    window.sessionStorage.setItem(locationStorageKey, JSON.stringify(location));
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

async function fetchApproximateLocation(): Promise<ApproximateLocation> {
  let timeout: number | undefined;
  try {
    const controller = new AbortController();
    timeout = window.setTimeout(() => controller.abort(), locationTimeoutMs);
    const response = await fetch("https://ipapi.co/json/?cors=true", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return emptyLocation;

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return emptyLocation;
    const responseData = data as { city?: unknown; region?: unknown; country_name?: unknown };
    return sanitizeLocation({
      city: responseData.city,
      state: responseData.region,
      country: responseData.country_name,
    });
  } catch {
    return emptyLocation;
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

function getApproximateLocation() {
  const cachedLocation = readCachedLocation();
  if (cachedLocation) return Promise.resolve(cachedLocation);
  if (locationRequest) return locationRequest;

  const request = fetchApproximateLocation().then((location) => {
    if (location.country || location.state || location.city) cacheLocation(location);
    return location;
  });
  locationRequest = request;
  void request.then(
    () => {
      if (locationRequest === request) locationRequest = null;
    },
    () => {
      if (locationRequest === request) locationRequest = null;
    },
  );
  return request;
}

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
  void getApproximateLocation().then((location) => supabase.from("analytics_events").insert({
    event_type: eventType,
    page_path: cleanPagePath(pagePath),
    referrer_origin: getReferrerOrigin(),
    device_type: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    country: location.country,
    state: location.state,
    city: location.city,
    visitor_id: getVisitorId(),
  })).then(({ error }) => {
    if (error) console.error("[analytics] Failed to insert analytics event.");
  }, () => {
    console.error("[analytics] Failed to insert analytics event.");
  });
}

export function trackAnalyticsEvents(eventTypes: AnalyticsEventType[], pagePath = window.location.pathname) {
  eventTypes.forEach((eventType) => trackAnalyticsEvent(eventType, pagePath));
}
