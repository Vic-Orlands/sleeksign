# SleekSign document verification

SleekSign seals finalized PDFs with an application-level integrity receipt. This is not a CA-issued PAdES certificate and does not claim Adobe Approved Trust List status.

## Trust model

1. SleekSign renders completed fields into the original PDF.
2. A verification URL and ID are placed subtly along the bottom of every existing page. No certificate page is added.
3. The exact finalized PDF bytes are hashed with SHA-256.
4. A canonical manifest binds the PDF hash to the source hash, document and artifact identifiers, finalization time, and sealed audit-chain root.
5. Google Cloud KMS signs the manifest digest with an `EC_SIGN_P256_SHA256` key. The private key never enters the application.
6. The public checker requires both the verification ID and the PDF. It verifies the uploaded file hash, canonical manifest, Google KMS signature, key identity, and sealed audit chain.
7. Public results disclose authenticity only. The full chain of custody remains behind workspace document authorization.

Finalization fails if KMS, the audit-chain check, object storage, or receipt persistence fails. There is no unsigned or local-key fallback.

## Google Cloud KMS setup

Enable Cloud KMS and create one software-protected asymmetric signing key:

```sh
gcloud services enable cloudkms.googleapis.com
gcloud kms keyrings create sleeksign --location=global
gcloud kms keys create document-signing \
  --location=global \
  --keyring=sleeksign \
  --purpose=asymmetric-signing \
  --default-algorithm=ec-sign-p256-sha256 \
  --protection-level=software
```

Grant the production service identity only the signer/verifier role on this key:

```sh
gcloud kms keys add-iam-policy-binding document-signing \
  --location=global \
  --keyring=sleeksign \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudkms.signerVerifier"
```

The application discovers the current primary key version, so also grant the
Cloud KMS Viewer role on this specific key:

```sh
gcloud kms keys add-iam-policy-binding document-signing \
  --location=global \
  --keyring=sleeksign \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudkms.viewer"
```

## Vercel workload identity

Production uses Vercel OIDC and Google Workload Identity Federation. Do not
create a service-account JSON key.

In Vercel, open the project, go to **Settings → Security**, enable Secure
backend access with OIDC federation, and select the recommended Team issuer
mode.

Create a production-only Google provider. Replace `VERCEL_TEAM_SLUG` and
`VERCEL_PROJECT_NAME` with the values shown by Vercel:

```sh
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com \
  --project=PROJECT_ID

gcloud iam workload-identity-pools create vercel-sleeksign \
  --location=global \
  --display-name="Vercel SleekSign" \
  --project=PROJECT_ID

gcloud iam workload-identity-pools providers create-oidc vercel \
  --location=global \
  --workload-identity-pool=vercel-sleeksign \
  --display-name="Vercel production" \
  --issuer-uri="https://oidc.vercel.com/VERCEL_TEAM_SLUG" \
  --attribute-mapping="google.subject=assertion.sub,attribute.owner=assertion.owner,attribute.project=assertion.project,attribute.environment=assertion.environment" \
  --attribute-condition="assertion.owner=='VERCEL_TEAM_SLUG' && assertion.project=='VERCEL_PROJECT_NAME' && assertion.environment=='production'" \
  --project=PROJECT_ID
```

Allow only the production Vercel subject to impersonate the signing service
account:

```sh
gcloud iam service-accounts add-iam-policy-binding \
  SERVICE_ACCOUNT_EMAIL \
  --member="principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-sleeksign/subject/owner:VERCEL_TEAM_SLUG:project:VERCEL_PROJECT_NAME:environment:production" \
  --role="roles/iam.workloadIdentityUser" \
  --project=PROJECT_ID
```

Configure these deployment secrets and variables:

```txt
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KMS_KEY_NAME=projects/PROJECT_ID/locations/global/keyRings/sleeksign/cryptoKeys/document-signing
GOOGLE_CLOUD_PROJECT_NUMBER=your-project-number
GOOGLE_CLOUD_WORKLOAD_IDENTITY_POOL_ID=vercel-sleeksign
GOOGLE_CLOUD_WORKLOAD_IDENTITY_PROVIDER_ID=vercel
GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL=sleeksign-kms@PROJECT_ID.iam.gserviceaccount.com
```

Do not configure `GOOGLE_CLOUD_CREDENTIALS_JSON` in Vercel. Local development
can use Google Application Default Credentials instead.

## Rotation

Create and promote a new primary version on the same CryptoKey. New receipts use the primary version automatically. Existing receipts retain their exact key-version resource name and continue verification against that historical public key. Do not destroy old key versions while receipts signed by them must remain verifiable.

## Deployment

Apply `drizzle/0004_married_leo.sql` before enabling finalization in production. The migration intentionally removes the obsolete certificate and evidence-snapshot columns because there are no production documents to preserve.
