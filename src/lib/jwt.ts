import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIE_NAME = "mq_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-in-production"
);

export interface SessionPayload extends JWTPayload {
  uid: string;
  nama: string;
  email: string;
  role: string;
}

export async function signToken(payload: {
  uid: string;
  nama: string;
  email: string;
  role: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
