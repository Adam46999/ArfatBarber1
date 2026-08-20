/* eslint-env node */

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const PROOF_PREFIX = "barber-device:v1";

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getVerificationSecret() {
  return safeText(
    process.env.BARBER_DEVICE_VERIFICATION_SECRET,
  );
}

export function buildBarberDeviceProof({
  documentId,
  token,
  secret,
}) {
  const safeDocumentId = safeText(documentId);
  const safeToken = safeText(token);
  const safeSecret = safeText(secret);

  if (!safeDocumentId || !safeToken || !safeSecret) {
    return null;
  }

  return createHmac("sha256", safeSecret)
    .update(
      [
        PROOF_PREFIX,
        safeDocumentId,
        safeToken,
      ].join(":"),
      "utf8",
    )
    .digest("hex");
}

export function verifyBarberDevice({
  documentId,
  token,
  proof,
  secret = getVerificationSecret(),
}) {
  const safeDocumentId = safeText(documentId);
  const safeToken = safeText(token);
  const safeProof = safeText(proof);
  const safeSecret = safeText(secret);

  if (
    !safeDocumentId ||
    !safeToken ||
    !safeProof ||
    !safeSecret
  ) {
    return false;
  }

  if (safeDocumentId !== safeToken) {
    return false;
  }

  const expectedProof = buildBarberDeviceProof({
    documentId: safeDocumentId,
    token: safeToken,
    secret: safeSecret,
  });

  if (!expectedProof) {
    return false;
  }

  if (
    safeProof.length !== expectedProof.length ||
    !/^[a-f0-9]{64}$/i.test(safeProof)
  ) {
    return false;
  }

  const actualBuffer = Buffer.from(
    safeProof.toLowerCase(),
    "hex",
  );

  const expectedBuffer = Buffer.from(
    expectedProof.toLowerCase(),
    "hex",
  );

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    actualBuffer,
    expectedBuffer,
  );
}

export default verifyBarberDevice;