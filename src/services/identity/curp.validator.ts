import {
  IdentityValidationError,
  IdentityValidationResult,
} from "./identity.types";
import { buildIdentitySummary } from "./identity.summary";

const VALID_STATES = new Set([
  "AS", "BC", "BS", "CC", "CL", "CM", "CS", "CH", "DF", "DG",
  "GT", "GR", "HG", "JC", "MC", "MN", "MS", "NT", "NL", "OC",
  "PL", "QT", "QR", "SP", "SL", "SR", "TC", "TS", "TL", "VZ",
  "YN", "ZS", "NE",
]);

const CURP_REGEX =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;

const CURP_DICTIONARY = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

function isValidDateFromCurp(curp: string): boolean {
  const year = Number(curp.slice(4, 6));
  const month = Number(curp.slice(6, 8));
  const day = Number(curp.slice(8, 10));

  const homoclave = curp.charAt(16);
  const fullYear = /\d/.test(homoclave) ? 1900 + year : 2000 + year;

  const date = new Date(fullYear, month - 1, day);

  return (
    date.getFullYear() === fullYear &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function calculateCurpCheckDigit(curp: string): string {
  const base = curp.slice(0, 17);
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    const char = base.charAt(i);
    const value = CURP_DICTIONARY.indexOf(char);

    if (value === -1) return "";

    sum += value * (18 - i);
  }

  const digit = 10 - (sum % 10);
  return digit === 10 ? "0" : String(digit);
}

export function validateCurp(normalized: string): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (normalized.length !== 18) {
    errors.push({
      code: "INVALID_LENGTH",
      field: "curp",
      message: "La CURP debe tener 18 caracteres.",
    });
  }

  if (normalized.length >= 11) {
    const gender = normalized.charAt(10);
    if (!["H", "M"].includes(gender)) {
      errors.push({
        code: "INVALID_GENDER",
        field: "gender",
        message: "El sexo de la CURP debe ser H o M.",
      });
    }
  }

  if (normalized.length >= 13) {
    const state = normalized.slice(11, 13);
    if (!VALID_STATES.has(state)) {
      errors.push({
        code: "INVALID_STATE",
        field: "state",
        message: "La entidad federativa de la CURP no es válida.",
      });
    }
  }

  if (normalized.length >= 10 && !isValidDateFromCurp(normalized)) {
    errors.push({
      code: "INVALID_DATE",
      field: "birth_date",
      message: "La fecha de nacimiento de la CURP no es válida.",
    });
  }

  if (!CURP_REGEX.test(normalized)) {
    errors.push({
      code: "INVALID_FORMAT",
      field: "curp",
      message: "La estructura de la CURP no es válida.",
    });
  }

  const hasBlockingErrors = errors.some((error) =>
    [
      "INVALID_LENGTH",
      "INVALID_FORMAT",
      "INVALID_DATE",
      "INVALID_STATE",
      "INVALID_GENDER",
    ].includes(error.code)
  );

  if (normalized.length === 18 && !hasBlockingErrors) {
    const expectedDigit = calculateCurpCheckDigit(normalized);
    const actualDigit = normalized.charAt(17);

    if (expectedDigit && expectedDigit !== actualDigit) {
      errors.push({
        code: "INVALID_CHECK_DIGIT",
        field: "check_digit",
        message: "El dígito verificador de la CURP no coincide.",
      });
    }
  }
  
  const valid = errors.length === 0;

  return {
    valid,
    status: valid ? "valid" : "invalid",
    type: "curp",
    normalized,
    summary: buildIdentitySummary({
      valid,
      type: "curp",
      errors,
    }),
    errors,
    metadata: {
      source: "curpify",
      version: "1.5",
    },
  };
  
}