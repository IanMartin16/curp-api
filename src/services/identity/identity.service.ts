import { validateCurp } from "./curp.validator";
import { validateRfc } from "./rfc.validator";
import { normalizeIdentityValue } from "./normalizer";
import { IdentityValidationResult } from "./identity.types";

export function validateIdentity(value: unknown): IdentityValidationResult {
  const normalized = normalizeIdentityValue(value);

  if (!normalized) {
    return {
      valid: false,
      status: "invalid",
      type: "unknown",
      normalized: "",
      summary: "Ingresa una CURP para validar.",
      errors: [
        {
          code: "EMPTY_VALUE",
          field: "value",
          message: "El valor no puede estar vacío.",
        },
      ],
      metadata: {
        source: "curpify",
        version: "1.5",
      },
    };
  }

  if (normalized.length === 18) {
    return validateCurp(normalized);
  }

  if (normalized.length === 12 || normalized.length === 13) {
    return validateRfc(normalized);
  }

  return {
    valid: false,
    status: "invalid",
    type: "unknown",
    normalized,
    summary: "No fue posible detectar si el valor corresponde a CURP o RFC.",
    errors: [
      {
        code: "UNKNOWN_TYPE",
        field: "value",
        message: "No fue posible detectar si el valor corresponde a CURP o RFC.",
      },
    ],
    metadata: {
      source: "curpify",
      version: "1.5",
    },
  };
}