/** 端末内パスキー（WebAuthn platform authenticator）。サーバ検証なし・端末ゲート用。 */

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isWebAuthnPlatformAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === "function" &&
      window.isSecureContext,
  );
}

export async function registerPlatformPasskey(): Promise<string> {
  if (!isWebAuthnPlatformAvailable()) {
    throw new Error("この端末／ブラウザでは生体認証を使えない");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const rpId = window.location.hostname;

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "企業理念リレー", id: rpId },
      user: {
        id: userId,
        name: "vdr-local",
        displayName: "企業理念リレー",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("パスキー登録がキャンセルされた");
  return bufferToBase64url(cred.rawId);
}

export async function assertPlatformPasskey(
  credentialIdBase64url: string,
): Promise<void> {
  if (!isWebAuthnPlatformAvailable()) {
    throw new Error("この端末／ブラウザでは生体認証を使えない");
  }
  if (!credentialIdBase64url.trim()) {
    throw new Error("パスキーが未登録");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialId = base64urlToBuffer(credentialIdBase64url);
  const rpId = window.location.hostname;

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId,
      allowCredentials: [
        {
          type: "public-key",
          id: credentialId,
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("生体認証がキャンセルされた");
  const returnedId = bufferToBase64url(assertion.rawId);
  if (returnedId !== credentialIdBase64url) {
    throw new Error("登録と違うパスキーが返った");
  }
}
