export type IdentityType = "curp" | "rfc" | "unknown";

export type PersonType = "physical" | "moral" | "unknown";

export type IdentityValidationStatus = "valid" | "invalid";

export type IdentityErrorCode =
  | "EMPTY_VALUE"
  | "INVALID_LENGTH"
  | "INVALID_FORMAT"
  | "INVALID_DATE"
  | "INVALID_STATE"
  | "INVALID_GENDER"
  | "INVALID_CHECK_DIGIT"
  | "UNKNOWN_TYPE";

export interface IdentityValidationError {
  code: IdentityErrorCode;
  field: string;
  message: string;
}

export interface IdentityValidationMetadata {
  source: "curpify";
  version: "1.5";
}

export interface IdentityValidationResult {
  valid: boolean;
  status: IdentityValidationStatus;
  type: IdentityType;
  normalized: string;
  personType?: PersonType;
  summary: string;
  errors: IdentityValidationError[];
  metadata: IdentityValidationMetadata;
}