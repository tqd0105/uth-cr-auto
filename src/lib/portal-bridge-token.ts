import crypto from 'crypto';

interface BridgeTokenPayload {
  userSession: string;
  exp: number;
}

function getBridgeSecret(): string {
  return process.env.SESSION_SECRET
    || process.env.ADMIN_PASSWORD
    || 'dev-portal-bridge-secret';
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signPayload(payload: string): string {
  return base64Url(crypto.createHmac('sha256', getBridgeSecret()).update(payload).digest());
}

export function createPortalBridgeToken(userSession: string, ttlSeconds = 15 * 60): string {
  const payload: BridgeTokenPayload = {
    userSession,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyPortalBridgeToken(token: string): BridgeTokenPayload | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as BridgeTokenPayload;
    if (!payload.userSession || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
