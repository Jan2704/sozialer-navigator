import crypto from 'node:crypto';

const ADMIN_PASSWORD = import.meta.env.ADMIN_DASHBOARD_PASSWORD || process.env.ADMIN_DASHBOARD_PASSWORD;
const SESSION_SECRET = import.meta.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD;

export const ADMIN_COOKIE_NAME = 'admin_session';

function timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export function isAdminAuthConfigured(): boolean {
    return !!ADMIN_PASSWORD;
}

export function checkAdminPassword(input: FormDataEntryValue | null): boolean {
    if (!ADMIN_PASSWORD || typeof input !== 'string' || !input) return false;
    return timingSafeEqual(input, ADMIN_PASSWORD);
}

function sessionToken(): string {
    return crypto.createHmac('sha256', SESSION_SECRET as string).update('admin-session-v1').digest('hex');
}

export function issueSessionCookie(cookies: import('astro').AstroCookies) {
    cookies.set(ADMIN_COOKIE_NAME, sessionToken(), {
        path: '/admin',
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
    });
}

export function hasValidSessionCookie(cookies: import('astro').AstroCookies): boolean {
    if (!ADMIN_PASSWORD) return false;
    const cookie = cookies.get(ADMIN_COOKIE_NAME);
    if (!cookie || !cookie.value) return false;
    return timingSafeEqual(cookie.value, sessionToken());
}
