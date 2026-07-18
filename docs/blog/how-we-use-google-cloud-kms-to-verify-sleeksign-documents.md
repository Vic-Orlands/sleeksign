# How we use Google Cloud KMS to verify SleekSign documents

When we started thinking seriously about document integrity in SleekSign, the first idea was the familiar one: add a certificate page to the end of every signed PDF.

It looked official, but it was mostly visual. Anybody with a PDF editor could recreate a convincing certificate page. A polished page can reassure a person, but it cannot prove that the rest of the document is the exact file SleekSign finalized.

We needed something cryptographic.

The result is an application-level verification system built around SHA-256 hashes, a tamper-evident audit chain, and an asymmetric signing key held by Google Cloud KMS. Every page carries a quiet verification ID and URL. The real proof lives in the signed receipt behind that ID.

This article explains what a KMS is, how AWS KMS and Google Cloud KMS compare, why we chose Google for SleekSign, how our verification flow works, and the exact setup we used with Google Cloud and Vercel.

## What a KMS actually does

A Key Management Service manages cryptographic keys for an application.

The important part is not simply that it can generate a key. A good KMS also controls who can use that key, records key operations, supports key versions and rotation, and keeps private key material away from application code.

Without a KMS, a small application might generate a private key, paste it into an environment variable, and use it to sign data. That works until the environment variable leaks, a developer downloads it, a log accidentally prints it, or nobody remembers how the key should be rotated.

With asymmetric KMS signing, the private key stays inside the cloud provider. The application sends a digest to the KMS and asks it to sign. The KMS returns a signature. Verification can then happen with the corresponding public key.

That distinction matters for SleekSign: compromising the application database should not reveal the private signing key.

## AWS KMS and Google Cloud KMS

AWS KMS and Google Cloud KMS solve the same broad problem. Both support asymmetric signing, IAM-based access control, managed key versions, audit logging, and public-key retrieval. Both can keep private key material inside the service.

[AWS describes its KMS keys as being protected by FIPS 140-3 Security Level 3 validated HSMs](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html). Its asymmetric keys support signing and verification with RSA, elliptic-curve, and newer post-quantum options. An application can call AWS KMS to sign and then verify through KMS or download the public key and verify locally.

[Google Cloud KMS supports software, HSM, and external protection levels](https://docs.cloud.google.com/kms/docs/key-management-service). It also supports asymmetric signing and lets an application retrieve a public key for local verification. We chose an `EC_SIGN_P256_SHA256` software key, which gives us ECDSA over the P-256 curve with SHA-256.

The biggest practical differences for our case were ecosystem fit, default protection level, IAM model, and cost.

At the time of writing:

- [AWS charges $1 per month for each customer-managed KMS key](https://aws.amazon.com/kms/pricing/). Its own file-signing example prices one ECC P-256 key and 100,000 signing requests at $2.50 per month.
- [Google prices a software-protected active key version at $0.06 per month](https://cloud.google.com/kms/pricing), with cryptographic operations billed separately. Google Cloud billing still has to be enabled; Cloud KMS is not simply free because usage is low.
- AWS KMS keys use HSM protection by default. Our Google key uses the software protection level. Google Cloud HSM is available if SleekSign later needs that stronger protection level, but it costs more.

Those numbers can change, so check the linked pricing pages before designing around them.

## Why SleekSign went with Google Cloud KMS

This was not a verdict that Google Cloud KMS is universally better than AWS KMS.

AWS would have handled the cryptography well. In an AWS-native application using Lambda, IAM roles, CloudTrail, and S3, AWS KMS would probably be the obvious choice.

SleekSign was different:

1. We did not already have an AWS account or workload.
2. We already had a Google Cloud project and understood Google IAM and KMS.
3. SleekSign runs on Vercel, so either cloud required an external workload identity setup.
4. Vercel OIDC works cleanly with Google Workload Identity Federation.
5. The baseline cost of one Google software key version is friendlier for an indie product in development.
6. Google Cloud's key, key-ring, and key-version model mapped neatly to the receipt format we wanted.

The best cloud here was the one we could configure carefully, understand, and maintain without introducing another large cloud account solely for one key.

## What SleekSign signs

SleekSign does not send an entire PDF to Google Cloud KMS.

When the final signer completes a document, SleekSign:

1. Renders completed fields into the original PDF.
2. Adds a subtle SleekSign verification URL and ID to every existing page.
3. Hashes the exact finalized PDF bytes with SHA-256.
4. Builds a canonical manifest.
5. Hashes that canonical manifest.
6. Sends the manifest digest to Google Cloud KMS for signing.
7. Stores the signed receipt, the exact KMS key-version name, and the finalized PDF.

The manifest binds together the facts we care about:

```json
{
  "schema": "https://sleeksign.app/schemas/document-verification/v1",
  "version": 1,
  "verificationId": "ss_...",
  "workspaceId": "...",
  "artifact": {
    "type": "packet",
    "id": "..."
  },
  "document": {
    "id": "...",
    "sourceSha256": "...",
    "finalizedSha256": "..."
  },
  "audit": {
    "chainKey": "...",
    "eventCount": 12,
    "rootSha256": "..."
  },
  "finalizedAt": "2026-07-18T12:00:00.000Z"
}
```

Canonical JSON is important. Ordinary JSON can represent the same data with different whitespace or key ordering. SleekSign serializes the manifest deterministically before hashing and signing it.

The receipt also records the full KMS version resource:

```txt
projects/PROJECT_ID/locations/global/keyRings/sleeksign/cryptoKeys/document-signing/cryptoKeyVersions/1
```

We do not merely store “the current key.” That would break old receipts after rotation. Each receipt remembers the exact version that signed it.

## What happens during verification

The public checker asks for both the verification ID and the PDF.

The ID is only a locator. It is not proof by itself.

SleekSign then:

1. Loads the stored receipt.
2. Rebuilds and canonicalizes the manifest.
3. Confirms that the receipt fields still match the manifest.
4. Fetches the public key for the recorded KMS key version.
5. Checks the public-key fingerprint.
6. Verifies the ECDSA signature locally.
7. Hashes the uploaded PDF and compares it with the finalized PDF hash.
8. Recomputes the sealed audit chain and compares its root hash and event count.

If one byte in the uploaded PDF changes, its SHA-256 hash changes and verification fails.

The public result only answers whether the file is authentic. Detailed signer identities, timestamps, IP information, and chain-of-custody events remain behind workspace authorization.

This is deliberately not a CA-issued PAdES signature, an Adobe Approved Trust List certificate, or a claim that Adobe Reader will display a trusted green checkmark. It is SleekSign's own cryptographic verification system.

## The failure policy matters

There is no unsigned fallback.

If KMS signing fails, the audit chain is invalid, object storage fails, or the receipt cannot be persisted, finalization fails. SleekSign does not quietly produce an “almost verified” document.

That can feel strict, but a security property becomes confusing very quickly when some finalized files are signed and others only look signed.

## Practical setup: Google Cloud KMS, Vercel, and no JSON key

Run the Google Cloud commands below in Google Cloud Shell, or in a local terminal with the current `gcloud` CLI installed.

You need a Google Cloud project with billing enabled and an account that can enable APIs, create service accounts, administer Cloud KMS, and configure Workload Identity Federation.

### 1. Define the setup values

Replace the first three values with your own project and Vercel details:

```sh
export PROJECT_ID="your-google-project-id"
export VERCEL_TEAM_SLUG="your-vercel-team-slug"
export VERCEL_PROJECT_NAME="your-vercel-project-name"

export KMS_LOCATION="global"
export KMS_KEYRING="sleeksign"
export KMS_KEY="document-signing"
export SERVICE_ACCOUNT_NAME="sleeksign-kms"
export WORKLOAD_POOL_ID="vercel-sleeksign"
export WORKLOAD_PROVIDER_ID="vercel"

gcloud config set project "$PROJECT_ID"
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

Before doing anything else, confirm that Cloud Shell is using the account and project you expect:

```sh
gcloud auth list
gcloud config list account project
gcloud projects describe "$PROJECT_ID" \
  --format="table(projectId,projectNumber,name)"
```

### 2. Enable the required APIs

```sh
gcloud services enable \
  cloudkms.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project="$PROJECT_ID"
```

Cloud KMS handles the signing key. IAM manages the service account and workload identity pool. IAM Service Account Credentials creates short-lived impersonated credentials. Security Token Service exchanges Vercel's OIDC token for a Google federated token.

### 3. Create the key ring and asymmetric signing key

```sh
gcloud kms keyrings create "$KMS_KEYRING" \
  --location="$KMS_LOCATION" \
  --project="$PROJECT_ID"

gcloud kms keys create "$KMS_KEY" \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --purpose="asymmetric-signing" \
  --default-algorithm="ec-sign-p256-sha256" \
  --protection-level="software" \
  --project="$PROJECT_ID"
```

The [official `gcloud kms keys create` reference](https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create) documents the same asymmetric-signing purpose and P-256 algorithm.

The `global` location is a deliberate choice for this setup. If your data-residency or latency requirements call for a regional key, choose that location at the beginning and use it consistently in every command and environment variable.

### 4. Create the runtime service account

```sh
gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
  --display-name="SleekSign document signer" \
  --description="Signs SleekSign verification manifests using Cloud KMS" \
  --project="$PROJECT_ID"
```

Now grant that identity access on the single signing key, not across the entire project:

```sh
gcloud kms keys add-iam-policy-binding "$KMS_KEY" \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/cloudkms.signerVerifier" \
  --project="$PROJECT_ID"

gcloud kms keys add-iam-policy-binding "$KMS_KEY" \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/cloudkms.viewer" \
  --project="$PROJECT_ID"
```

SleekSign uses `signerVerifier` to request a signature. It uses the viewer role to discover the key's current primary version and retrieve public-key metadata.

### 5. Enable Vercel OIDC

In Vercel:

1. Open the SleekSign project.
2. Go to **Settings → Security**.
3. Find **Secure backend access with OIDC federation**.
4. Select the **Team** issuer mode.
5. Save.

[Vercel recommends the team issuer](https://vercel.com/docs/oidc) and issues short-lived tokens instead of asking us to store a permanent Google credential in Vercel.

For a production deployment, Vercel's subject follows this shape:

```txt
owner:TEAM_SLUG:project:PROJECT_NAME:environment:production
```

The [Vercel OIDC reference](https://vercel.com/docs/oidc/reference) documents the `owner`, `project`, and `environment` claims used below.

### 6. Create the Google workload identity pool and provider

```sh
gcloud iam workload-identity-pools create "$WORKLOAD_POOL_ID" \
  --location="global" \
  --display-name="Vercel SleekSign" \
  --project="$PROJECT_ID"

gcloud iam workload-identity-pools providers create-oidc "$WORKLOAD_PROVIDER_ID" \
  --location="global" \
  --workload-identity-pool="$WORKLOAD_POOL_ID" \
  --display-name="Vercel production" \
  --issuer-uri="https://oidc.vercel.com/${VERCEL_TEAM_SLUG}" \
  --attribute-mapping="google.subject=assertion.sub,attribute.owner=assertion.owner,attribute.project=assertion.project,attribute.environment=assertion.environment" \
  --attribute-condition="assertion.owner=='${VERCEL_TEAM_SLUG}' && assertion.project=='${VERCEL_PROJECT_NAME}' && assertion.environment=='production'" \
  --project="$PROJECT_ID"
```

The condition is important. It stops another Vercel project—or even a preview deployment of the same project—from becoming the production signing identity.

[Google recommends limiting federated access with attributes and conditions](https://docs.cloud.google.com/iam/docs/workload-identity-federation) rather than granting the entire identity pool access.

### 7. Allow only the production Vercel subject to impersonate the service account

```sh
gcloud iam service-accounts add-iam-policy-binding \
  "$SERVICE_ACCOUNT_EMAIL" \
  --member="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_POOL_ID}/subject/owner:${VERCEL_TEAM_SLUG}:project:${VERCEL_PROJECT_NAME}:environment:production" \
  --role="roles/iam.workloadIdentityUser" \
  --project="$PROJECT_ID"
```

Notice that this principal uses the numeric project number, not the project ID. Google requires the project number in Workload Identity Federation principal identifiers.

The full authentication path is now:

```txt
Vercel function
  → short-lived Vercel OIDC token
  → Google Security Token Service
  → federated Google identity
  → temporary service-account impersonation token
  → Cloud KMS
```

No service-account JSON key is created or stored.

### 8. Configure the Vercel production environment

Add these values to the **Production** environment in Vercel:

```txt
GOOGLE_CLOUD_PROJECT_ID=your-google-project-id
GOOGLE_CLOUD_KMS_KEY_NAME=projects/PROJECT_ID/locations/global/keyRings/sleeksign/cryptoKeys/document-signing
GOOGLE_CLOUD_PROJECT_NUMBER=your-project-number
GOOGLE_CLOUD_WORKLOAD_IDENTITY_POOL_ID=vercel-sleeksign
GOOGLE_CLOUD_WORKLOAD_IDENTITY_PROVIDER_ID=vercel
GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL=sleeksign-kms@PROJECT_ID.iam.gserviceaccount.com
```

Do not put `GOOGLE_CLOUD_CREDENTIALS_JSON` in Vercel. The point of this setup is to avoid a permanent credential.

After adding the values, redeploy production so the function receives the updated environment.

### 9. Inspect the setup

These commands are useful when you want to see what exists instead of guessing:

```sh
gcloud iam service-accounts list \
  --project="$PROJECT_ID"

gcloud iam workload-identity-pools list \
  --location="global" \
  --project="$PROJECT_ID"

gcloud iam workload-identity-pools providers list \
  --location="global" \
  --workload-identity-pool="$WORKLOAD_POOL_ID" \
  --project="$PROJECT_ID"

gcloud kms keyrings list \
  --location="$KMS_LOCATION" \
  --project="$PROJECT_ID"

gcloud kms keys list \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --project="$PROJECT_ID"

gcloud kms keys versions list \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --key="$KMS_KEY" \
  --project="$PROJECT_ID"
```

Inspect the key and service-account policies too:

```sh
gcloud kms keys get-iam-policy "$KMS_KEY" \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --project="$PROJECT_ID"

gcloud iam service-accounts get-iam-policy \
  "$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID"
```

You can confirm that the first asymmetric public key is retrievable:

```sh
gcloud kms keys versions get-public-key 1 \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --key="$KMS_KEY" \
  --public-key-format="pem" \
  --project="$PROJECT_ID"
```

### 10. Local development

For local work, the Google client library can use Application Default Credentials:

```sh
gcloud auth application-default login
gcloud auth application-default set-quota-project "$PROJECT_ID"
```

The local identity still needs permission to use the development key. Prefer a separate development key and tightly scoped permissions rather than giving a personal account access to the production signer.

Production should continue to use Vercel OIDC and Workload Identity Federation.

## A little TypeScript from the signing path

The core flow is intentionally small:

```ts
const canonicalManifest = canonicalStringify(manifest);
const digest = createHash("sha256").update(canonicalManifest).digest();

const [response] = await kms.asymmetricSign({
  name: keyVersion,
  digest: { sha256: digest },
  digestCrc32c: { value: crc32c(digest) },
});
```

SleekSign also validates Google's CRC32C request and response checksums, retrieves the public key, fingerprints it, and immediately verifies the returned signature before accepting the receipt.

The private key is never returned by Google Cloud KMS.

## Rotation without breaking old documents

To rotate, create another version and then make it primary:

```sh
gcloud kms keys versions create \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --key="$KMS_KEY" \
  --project="$PROJECT_ID"

gcloud kms keys versions list \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --key="$KMS_KEY" \
  --project="$PROJECT_ID"

gcloud kms keys set-primary-version "$KMS_KEY" \
  --version="NEW_VERSION_NUMBER" \
  --location="$KMS_LOCATION" \
  --keyring="$KMS_KEYRING" \
  --project="$PROJECT_ID"
```

New receipts automatically use the new primary version. Old receipts still point to their original version and remain verifiable.

Do not destroy an old version while documents signed by it must remain verifiable.

## Troubleshooting the setup

If Cloud Shell reports an identity-related error, start with:

```sh
gcloud auth list
gcloud config list account project
```

Make sure the active Google account actually has access to the selected project. An open Cloud Console tab does not guarantee that `gcloud` is using the account you intended.

For `NOT_FOUND`, check the project, location, key ring, key, pool, and provider IDs. `global` must be used consistently if that is where the resource was created.

For `PERMISSION_DENIED`, inspect both sides of the relationship:

- The service account needs KMS permissions on the key.
- The Vercel subject needs `roles/iam.workloadIdentityUser` on the service account.
- The provider condition must exactly match the Vercel team slug, project name, and `production` environment.

For token-exchange errors after a configuration change, confirm that Vercel is using Team issuer mode and redeploy the production application.

## What this gives us—and what it does not

This design gives SleekSign a strong answer to a narrow but important question:

> Is this the exact PDF SleekSign finalized, and does its stored chain of custody still match the receipt signed by our protected key?

It does not magically prove that every signer was who they claimed to be. Identity assurance still depends on the signing workflow, OTP verification, account controls, and evidence collected during the session.

It also does not replace a regulated certificate authority when a customer specifically requires a standards-based qualified or Adobe-trusted PDF signature.

For SleekSign's current stage, that boundary is healthy. We get cryptographic integrity, key isolation, rotation, and a private audit trail without pretending that a decorative certificate page—or our own brand name—is the source of trust.
