# ADR-0007 – Object Storage: Amazon S3 over Alternatives

**Status:** Accepted

## Context
We need private file storage with browser uploads, CDN delivery, and least-privilege access. Prefer widely understood tooling and examples.

## Decision
Use **Amazon S3** (private bucket) with **presigned PUT** uploads; pair with **CloudFront** CDN.

## Options Considered
- **S3 (chosen):** Industry standard, excellent SDKs, IAM, lifecycle policies, and broad examples; integrates cleanly with CloudFront (OAC).
- Cloudflare R2 + CDN: Strong offering; less ubiquitous IAM examples for presign + OAC-like patterns.
- Supabase Storage: Good DX, but we already chose S3/CDN and don’t need the rest of the platform.
- GCS/Azure Blob: Also solid; S3 is more commonly recognized by interviewers.

## Consequences
+ Proven security model (IAM), **direct-to-S3** uploads, and straightforward CDN integration.
− AWS consoles/IAM can be verbose; we’ll document minimal IAM policies.
