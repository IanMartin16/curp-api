import { Router } from "express";
import { validateCurpController } from "../services/curp.service";

const router = Router();

// Aplica el middleware SOLO a esta ruta (o a todas las del router)
router.post("/validate", validateCurpController);

export default router;

function normalizeCurp(input: string) {
  return (input || "").trim().toUpperCase();
}

// Catálogo simple (puedes extenderlo)
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;

// Dígito verificador CURP (muy recomendado)
function curpChecksumOk(curp18: string) {
  if (curp18.length !== 18) return false;

  const dic = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  const chars = curp18.slice(0, 17).split("");

  let sum = 0;
  for (let i = 0; i < chars.length; i++) {
    const v = dic.indexOf(chars[i]);
    if (v < 0) return false;
    sum += v * (18 - (i + 1)); // pesos 18..2
  }

  const digit = (10 - (sum % 10)) % 10;
  const last = curp18[17];
  return String(digit) === last;
}

router.post("/validate", async (req, res) => {
  const requestId = (req as any).requestId || crypto.randomUUID(); // si ya tienes requestLogger mejor

  try {
    const input = String(req.body?.curp || "");
    const normalized = normalizeCurp(input);

    if (!normalized) {
      return res.status(400).json({
        ok: false,
        error: "Missing curp",
        meta: { requestId },
      });
    }

    // 1) formato
    if (!CURP_REGEX.test(normalized)) {
      return res.status(200).json({
        ok: true,
        curp: input,
        normalized,
        isValid: false,
        reason: "INVALID_FORMAT",
        data: null,
        meta: { requestId },
      });
    }

    // 2) checksum
    if (!curpChecksumOk(normalized)) {
      return res.status(200).json({
        ok: true,
        curp: input,
        normalized,
        isValid: false,
        reason: "INVALID_CHECKSUM",
        data: null,
        meta: { requestId },
      });
    }

    // 3) parse data
    const data = parseCurpData(normalized);
    if (!data) {
      return res.status(200).json({
        ok: true,
        curp: input,
        normalized,
        isValid: false,
        reason: "INVALID_DATE",
        data: null,
        meta: { requestId },
      });
    }

    // ✅ OK final
    return res.status(200).json({
      ok: true,
      curp: normalized,
      normalized,
      isValid: true,
      reason: null,
      data,
      meta: { requestId },
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        error: e?.message || "Error",
        meta: { requestId },
      });
    }
  });


function parseCurpData(curp: string) {
  // yyMMdd
  const yy = Number(curp.slice(4, 6));
  const mm = Number(curp.slice(6, 8));
  const dd = Number(curp.slice(8, 10));
  const gender = curp.slice(10, 11);  // H/M
  const state = curp.slice(11, 13);   // DF, NL, etc

  // OJO: siglo no es confiable solo con 2 dígitos; tú decides.
  // Por ahora: asume 1900+yy si yy>=0
  const year = 1900 + yy;

  // validación básica de fecha
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  return { year, month: mm, day: dd, gender, state };
}
