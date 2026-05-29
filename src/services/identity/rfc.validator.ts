import {
  IdentityValidationError,
  IdentityValidationResult,
  PersonType,
} from "./identity.types";
import { buildIdentitySummary } from "./identity.summary";

const RFC_PHYSICAL_REGEX =
  /^[A-ZÑ&]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

const RFC_MORAL_REGEX =
  /^[A-ZÑ&]{3}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

/**
 * Tabla oficial usada comúnmente para calcular el dígito verificador del RFC.
 * Incluye espacio y Ñ.
 */
const RFC_CHECK_DIGIT_VALUES: Record<string, number> = {
  " ": 37,
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
  G: 16,
  H: 17,
  I: 18,
  J: 19,
  K: 20,
  L: 21,
  M: 22,
  N: 23,
  "&": 24,
  O: 25,
  P: 26,
  Q: 27,
  R: 28,
  S: 29,
  T: 30,
  U: 31,
  V: 32,
  W: 33,
  X: 34,
  Y: 35,
  Z: 36,
  Ñ: 38,
};

function detectPersonType(rfc: string): PersonType {
  if (rfc.length === 13) return "physical";
  if (rfc.length === 12) return "moral";
  return "unknown";
}

function isValidRfcDate(rfc: string, personType: PersonType): boolean {
  const offset = personType === "physical" ? 4 : 3;

  const year = Number(rfc.slice(offset, offset + 2));
  const month = Number(rfc.slice(offset + 2, offset + 4));
  const day = Number(rfc.slice(offset + 4, offset + 6));

  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;

  let fullYear = currentCentury + year;

  if (fullYear > currentYear) {
    fullYear -= 100;
  }

  const date = new Date(fullYear, month - 1, day);

  return (
    date.getFullYear() === fullYear &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function calculateRfcCheckDigit(rfc: string, personType: PersonType): string {
  /**
   * Para persona física son 13 caracteres.
   * Para persona moral son 12.
   *
   * El cálculo se hace sobre los caracteres previos al dígito verificador.
   * Persona física: primeros 12 caracteres.
   * Persona moral: primeros 11 caracteres.
   *
   * Para moral se antepone un espacio para completar la longitud base de cálculo.
   */
  let base = rfc.slice(0, -1);

  if (personType === "moral") {
    base = " " + base;
  }

  let sum = 0;

  for (let i = 0; i < base.length; i++) {
    const char = base.charAt(i);
    const value = RFC_CHECK_DIGIT_VALUES[char];

    if (value === undefined) {
      return "";
    }

    const factor = 13 - i;
    sum += value * factor;
  }

  const remainder = sum % 11;
  const checkValue = 11 - remainder;

  if (checkValue === 11) return "0";
  if (checkValue === 10) return "A";

  return String(checkValue);
}

export function validateRfc(normalized: string): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];
  const personType = detectPersonType(normalized);

  if (![12, 13].includes(normalized.length)) {
    errors.push({
      code: "INVALID_LENGTH",
      field: "rfc",
      message:
        "El RFC debe tener 12 caracteres para persona moral o 13 para persona física.",
    });
  }

  const regex =
    personType === "physical" ? RFC_PHYSICAL_REGEX : RFC_MORAL_REGEX;

  if (personType === "unknown" || !regex.test(normalized)) {
    errors.push({
      code: "INVALID_FORMAT",
      field: "rfc",
      message: "La estructura del RFC no es válida.",
    });
  }

  if (personType !== "unknown" && !isValidRfcDate(normalized, personType)) {
    errors.push({
      code: "INVALID_DATE",
      field: "birth_or_creation_date",
      message: "La fecha del RFC no es válida.",
    });
  }

  const hasBlockingErrors = errors.some((error) =>
    ["INVALID_LENGTH", "INVALID_FORMAT", "INVALID_DATE"].includes(error.code)
  );

  if (!hasBlockingErrors && personType !== "unknown") {
    const expectedDigit = calculateRfcCheckDigit(normalized, personType);
    const actualDigit = normalized.charAt(normalized.length - 1);

    if (expectedDigit && expectedDigit !== actualDigit) {
      errors.push({
        code: "INVALID_CHECK_DIGIT",
        field: "check_digit",
        message: "El dígito verificador del RFC no coincide.",
      });
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    status: valid ? "valid" : "invalid",
    type: "rfc",
    personType,
    normalized,
    summary: buildIdentitySummary({
      valid,
      type: "rfc",
      personType,
      errors,
    }),
    errors,
    metadata: {
      source: "curpify",
      version: "1.5",
    },
  };
}