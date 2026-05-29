import {
  IdentityType,
  IdentityValidationError,
  PersonType,
} from "./identity.types";

export function buildIdentitySummary(params: {
  valid: boolean;
  type: IdentityType;
  personType?: PersonType;
  errors: IdentityValidationError[];
}): string {
  const { valid, type, personType, errors } = params;

  if (valid) {
    if (type === "curp") return "La CURP es válida.";
    if (type === "rfc") {
      if (personType === "physical") return "El RFC de persona física es válido.";
      if (personType === "moral") return "El RFC de persona moral es válido.";
      return "El RFC es válido.";
    }

    return "El valor es válido.";
  }

  const firstError = errors[0];

  if (!firstError) {
    return "El valor no es válido.";
  }

  if (type === "curp") {
    switch (firstError.code) {
      case "INVALID_LENGTH":
        return "La CURP debe tener 18 caracteres.";
      case "INVALID_FORMAT":
        return "La estructura de la CURP no es válida.";
      case "INVALID_DATE":
        return "La fecha de nacimiento de la CURP no es válida.";
      case "INVALID_STATE":
        return "La entidad federativa de la CURP no es válida.";
      case "INVALID_GENDER":
        return "El sexo de la CURP debe ser H o M.";
      case "INVALID_CHECK_DIGIT":
        return "La CURP tiene un dígito verificador incorrecto.";
      default:
        return "La CURP no es válida.";
    }
  }

  if (type === "rfc") {
    switch (firstError.code) {
      case "INVALID_LENGTH":
        return "El RFC debe tener 12 o 13 caracteres.";
      case "INVALID_FORMAT":
        return "La estructura del RFC no es válida.";
      case "INVALID_DATE":
        return "La fecha del RFC no es válida.";
      case "INVALID_CHECK_DIGIT":
        return "El RFC tiene un dígito verificador incorrecto.";
      default:
        return "El RFC no es válido.";
    }
  }

  switch (firstError.code) {
    case "EMPTY_VALUE":
      return "Ingresa una CURP o RFC para validar.";
    case "UNKNOWN_TYPE":
      return "No fue posible detectar si el valor corresponde a CURP o RFC.";
    default:
      return "El valor no es válido.";
  }
}