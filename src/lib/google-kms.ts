import crypto from "crypto";
import { crc32c } from "@aws-crypto/crc32c";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

import { canonicalStringify } from "@/lib/canonical-json";

const SIGNATURE_ALGORITHM = "ECDSA_P256_SHA256";

let client: KeyManagementServiceClient | null = null;

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getCryptoKeyName() {
  const value = requiredEnvironment("GOOGLE_CLOUD_KMS_KEY_NAME");
  if (
    !/^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+$/.test(
      value,
    )
  ) {
    throw new Error("GOOGLE_CLOUD_KMS_KEY_NAME must be a full CryptoKey resource name");
  }
  return value;
}

function getClient() {
  if (client) return client;

  const projectNumber = process.env.GOOGLE_CLOUD_PROJECT_NUMBER?.trim();
  const poolId = process.env.GOOGLE_CLOUD_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const providerId =
    process.env.GOOGLE_CLOUD_WORKLOAD_IDENTITY_PROVIDER_ID?.trim();
  const serviceAccountEmail =
    process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL?.trim();
  const hasAnyWorkloadIdentityConfig = Boolean(
    projectNumber || poolId || providerId || serviceAccountEmail,
  );
  const hasWorkloadIdentityConfig = Boolean(
    projectNumber && poolId && providerId && serviceAccountEmail,
  );
  const isVercelRuntime =
    process.env.VERCEL === "1" || Boolean(process.env.VERCEL_OIDC_TOKEN);

  if (
    isVercelRuntime &&
    hasAnyWorkloadIdentityConfig &&
    !hasWorkloadIdentityConfig
  ) {
    throw new Error("Google Cloud workload identity configuration is incomplete");
  }

  if (isVercelRuntime && hasWorkloadIdentityConfig) {
    const providerResource = `projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
    const oidcAudience = `https://iam.googleapis.com/${providerResource}`;
    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience: `//iam.googleapis.com/${providerResource}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      subject_token_supplier: {
        getSubjectToken: () => getVercelOidcToken({ audience: oidcAudience }),
      },
    });
    if (!authClient) {
      throw new Error("Failed to initialize Google Cloud workload identity");
    }
    client = new KeyManagementServiceClient({
      authClient,
      projectId: requiredEnvironment("GOOGLE_CLOUD_PROJECT_ID"),
    });
    return client;
  }

  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON?.trim();
  if (!credentialsJson) {
    client = new KeyManagementServiceClient();
    return client;
  }

  let credentials: { client_email?: string; private_key?: string };
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS_JSON must contain valid JSON");
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS_JSON is missing service account credentials");
  }

  client = new KeyManagementServiceClient({
    credentials,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID?.trim(),
  });
  return client;
}

function sha256Bytes(value: Uint8Array | string) {
  return crypto.createHash("sha256").update(value).digest();
}

function assertTrustedKeyVersion(keyVersion: string) {
  const keyName = getCryptoKeyName();
  if (!keyVersion.startsWith(`${keyName}/cryptoKeyVersions/`)) {
    throw new Error("Verification receipt references an untrusted KMS key");
  }
}

async function getPublicKey(keyVersion: string) {
  assertTrustedKeyVersion(keyVersion);
  const [response] = await getClient().getPublicKey({ name: keyVersion });
  if (!response.pem) throw new Error("Google Cloud KMS did not return a public key");
  if (response.name !== keyVersion) throw new Error("Google Cloud KMS returned the wrong key version");
  if (response.algorithm !== 12 && response.algorithm !== "EC_SIGN_P256_SHA256") {
    throw new Error("Google Cloud KMS key must use EC_SIGN_P256_SHA256");
  }
  const publicKeyChecksum = Number(response.pemCrc32c?.value);
  if (
    !Number.isFinite(publicKeyChecksum) ||
    crc32c(Buffer.from(response.pem)) !== publicKeyChecksum
  ) {
    throw new Error("Google Cloud KMS public key checksum verification failed");
  }
  return response.pem;
}

export async function signCanonicalManifest(manifest: unknown) {
  const canonicalManifest = canonicalStringify(manifest);
  const digest = sha256Bytes(canonicalManifest);
  const kms = getClient();
  const [key] = await kms.getCryptoKey({ name: getCryptoKeyName() });
  const keyVersion = key.primary?.name;
  if (!keyVersion) throw new Error("Google Cloud KMS key has no primary version");

  const [response] = await kms.asymmetricSign({
    name: keyVersion,
    digest: { sha256: digest },
    digestCrc32c: { value: crc32c(digest) },
  });
  if (!response.signature) throw new Error("Google Cloud KMS did not return a signature");
  if (!response.verifiedDigestCrc32c) {
    throw new Error("Google Cloud KMS rejected the manifest digest checksum");
  }

  const signature =
    typeof response.signature === "string"
      ? Buffer.from(response.signature, "base64")
      : Buffer.from(response.signature as Uint8Array);
  const signatureChecksum = Number(response.signatureCrc32c?.value);
  if (!Number.isFinite(signatureChecksum) || crc32c(signature) !== signatureChecksum) {
    throw new Error("Google Cloud KMS signature checksum verification failed");
  }
  const publicKey = await getPublicKey(keyVersion);
  const verified = crypto.verify(
    "sha256",
    Buffer.from(canonicalManifest),
    publicKey,
    signature,
  );
  if (!verified) throw new Error("Google Cloud KMS signature verification failed");

  return {
    canonicalManifest,
    manifestHash: digest.toString("hex"),
    signature: signature.toString("base64"),
    signatureAlgorithm: SIGNATURE_ALGORITHM,
    keyVersion,
    publicKeyFingerprint: sha256Bytes(publicKey).toString("hex"),
  };
}

export async function verifyCanonicalManifestSignature(input: {
  canonicalManifest: string;
  manifestHash: string;
  signature: string;
  signatureAlgorithm: string;
  keyVersion: string;
  publicKeyFingerprint: string;
}) {
  if (input.signatureAlgorithm !== SIGNATURE_ALGORITHM) return false;
  if (sha256Bytes(input.canonicalManifest).toString("hex") !== input.manifestHash) {
    return false;
  }

  const publicKey = await getPublicKey(input.keyVersion);
  if (sha256Bytes(publicKey).toString("hex") !== input.publicKeyFingerprint) {
    return false;
  }

  return crypto.verify(
    "sha256",
    Buffer.from(input.canonicalManifest),
    publicKey,
    Buffer.from(input.signature, "base64"),
  );
}

export { SIGNATURE_ALGORITHM };
