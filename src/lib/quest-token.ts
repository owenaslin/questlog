import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Stateless HMAC-SHA256 token used to bind canonical XP-affecting quest
// fields between `/api/quests/evaluate` (or `/api/discover`) and
// `/api/quests/save`. The token format is intentionally tiny and JWT-free
// — no header segment, no `alg` field — so the verifier hardcodes SHA-256
// and there is no alg-confusion footgun.
//
// Wire format:  base64url(JSON.stringify(payload)) + "." + base64url(hmac)

export const QUEST_TOKEN_TTL_SECONDS = 3600;
export const QUEST_TOKEN_VERSION = 1 as const;

export type QuestTokenSource = "ai" | "user";

export interface QuestTokenPayload {
  v: typeof QUEST_TOKEN_VERSION;
  uid: string;
  src: QuestTokenSource;
  typ: "main" | "side";
  dur: number;
  dif: 1 | 2 | 3 | 4 | 5;
  cat: string;
  th: string;
  iat: number;
  exp: number;
  jti: string;
}

export type QuestTokenErrorCode =
  | "missing"
  | "malformed"
  | "bad_signature"
  | "expired"
  | "user_mismatch"
  | "source_mismatch"
  | "content_mismatch"
  | "version_mismatch";

export class QuestTokenError extends Error {
  constructor(public readonly code: QuestTokenErrorCode, message: string) {
    super(message);
    this.name = "QuestTokenError";
  }
}

export interface IssueQuestTokenInput {
  uid: string;
  src: QuestTokenSource;
  typ: "main" | "side";
  dur: number;
  dif: 1 | 2 | 3 | 4 | 5;
  cat: string;
  title: string;
  description: string;
}

export interface VerifyQuestTokenContext {
  expectedUserId: string;
  expectedSource?: QuestTokenSource;
  title: string;
  description: string;
}

let cachedSecret: Buffer | null = null;

function getSecret(): Buffer {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.QUEST_SIGNING_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "QUEST_SIGNING_SECRET environment variable must be set to a value of at least 32 characters."
    );
  }
  cachedSecret = Buffer.from(raw, "utf8");
  return cachedSecret;
}

export function titleHash(title: string, description: string): string {
  return createHash("sha256").update(`${title}\n${description}`, "utf8").digest("hex").slice(0, 16);
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function sign(payloadBytes: Buffer): Buffer {
  return createHmac("sha256", getSecret()).update(payloadBytes).digest();
}

export function issueQuestToken(input: IssueQuestTokenInput): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: QuestTokenPayload = {
    v: QUEST_TOKEN_VERSION,
    uid: input.uid,
    src: input.src,
    typ: input.typ,
    dur: input.dur,
    dif: input.dif,
    cat: input.cat,
    th: titleHash(input.title, input.description),
    iat: now,
    exp: now + QUEST_TOKEN_TTL_SECONDS,
    jti: randomBytes(16).toString("hex"),
  };
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const sigBytes = sign(payloadBytes);
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sigBytes)}`;
}

export function verifyQuestToken(
  token: string | null | undefined,
  ctx: VerifyQuestTokenContext
): QuestTokenPayload {
  if (!token) {
    throw new QuestTokenError("missing", "Quest token is required.");
  }

  const dot = token.indexOf(".");
  if (dot < 1 || dot === token.length - 1) {
    throw new QuestTokenError("malformed", "Quest token is malformed.");
  }

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let payloadBytes: Buffer;
  let sigBytes: Buffer;
  try {
    payloadBytes = b64urlDecode(payloadB64);
    sigBytes = b64urlDecode(sigB64);
  } catch {
    throw new QuestTokenError("malformed", "Quest token is malformed.");
  }

  const expectedSig = sign(payloadBytes);
  if (sigBytes.length !== expectedSig.length || !timingSafeEqual(sigBytes, expectedSig)) {
    throw new QuestTokenError("bad_signature", "Quest token signature is invalid.");
  }

  let payload: QuestTokenPayload;
  try {
    payload = JSON.parse(payloadBytes.toString("utf8")) as QuestTokenPayload;
  } catch {
    throw new QuestTokenError("malformed", "Quest token payload is malformed.");
  }

  if (payload.v !== QUEST_TOKEN_VERSION) {
    throw new QuestTokenError("version_mismatch", "Quest token version is no longer supported.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || now >= payload.exp) {
    throw new QuestTokenError("expired", "Quest token has expired.");
  }

  if (payload.uid !== ctx.expectedUserId) {
    throw new QuestTokenError("user_mismatch", "Quest token does not belong to this user.");
  }

  if (ctx.expectedSource && payload.src !== ctx.expectedSource) {
    throw new QuestTokenError("source_mismatch", "Quest token source does not match the submitted quest.");
  }

  if (payload.th !== titleHash(ctx.title, ctx.description)) {
    throw new QuestTokenError("content_mismatch", "Quest title or description changed since evaluation.");
  }

  return payload;
}
