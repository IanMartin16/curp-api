"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCurp = validateCurp;
const ESTADOS = [
    "AS", "BC", "BS", "CC", "CL", "CM", "CS", "CH", "DF", "DG", "GT", "GR", "HG", "JC", "MC", "MN", "MS", "NT", "NL",
    "OC", "PL", "QT", "QR", "SP", "SL", "SR", "TC", "TL", "TS", "VZ", "YN", "ZS", "NE"
];
// Palabras no permitidas en las 4 primeras letras
const PALABRAS_OFENSIVAS = [
    "BACA", "BAKA", "BUEI", "BUEY", "CACA", "CACO", "CAGA", "CAGO", "CAKA", "CAKO",
    "COGE", "COJA", "COJE", "COJI", "COJO", "COLA", "CULO", "FALO", "FETO", "GETA",
    "GUEI", "GUEY", "JETA", "JOTO", "KACA", "KACO", "KAGA", "KAGO", "KAKA", "KAKO",
    "KOGE", "KOJA", "KOJE", "KOJI", "KOJO", "KOLA", "KULO", "LILO", "LOCA", "LOCO",
    "MAME", "MAMO", "MEAR", "MEAS", "MEON", "MIAR", "MION", "MOCO", "MULA", "MULO",
    "NACA", "NACO", "PEDA", "PEDO", "PENE", "PIPI", "PITO", "POPO", "PUTA", "PUTO",
    "QULO", "RATA"
];
// 👉 pon esto en true si algún día quieres que el dígito verificador sea obligatorio
const VALIDAR_DIGITO_VERIFICADOR = false;
// Mapeo carácter → valor numérico
function charToValue(ch) {
    if (ch >= "0" && ch <= "9") {
        return ch.charCodeAt(0) - "0".charCodeAt(0);
    }
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const idx = alphabet.indexOf(ch);
    return idx === -1 ? 0 : 10 + idx;
}
// Cálculo del dígito verificador oficial
function calcularDigitoVerificador(curp17) {
    let suma = 0;
    for (let i = 0; i < 17; i++) {
        const valor = charToValue(curp17[i]);
        const factor = 18 - (i + 1);
        suma += valor * factor;
    }
    const resto = suma % 10;
    const digito = (10 - resto) % 10;
    return digito;
}
function validateCurp(curp) {
    const reasons = [];
    const curpNorm = curp.toUpperCase().trim();
    let year = 0;
    let month = 0;
    let day = 0;
    let gender = "H";
    let state = "";
    // 1) Longitud
    if (curpNorm.length !== 18) {
        reasons.push("La CURP debe tener exactamente 18 caracteres.");
    }
    // 2) Regex de estructura
    const regex = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TL|TS|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
    if (!regex.test(curpNorm)) {
        reasons.push("El formato general de la CURP no es válido.");
    }
    // Solo seguimos con validaciones avanzadas si la estructura base pasa
    if (regex.test(curpNorm)) {
        // 3) Fecha de nacimiento
        const fecha = curpNorm.slice(4, 10); // AAMMDD
        const aa = parseInt(fecha.slice(0, 2), 10);
        const mm = parseInt(fecha.slice(2, 4), 10);
        const dd = parseInt(fecha.slice(4, 6), 10);
        year = aa <= 25 ? 2000 + aa : 1900 + aa;
        month = mm;
        day = dd;
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year ||
            date.getMonth() + 1 !== month ||
            date.getDate() !== day) {
            reasons.push("La fecha de nacimiento incluida en la CURP no es válida.");
        }
        // 4) Sexo
        gender = curpNorm[10];
        if (!["H", "M"].includes(gender)) {
            reasons.push("El indicador de sexo en la CURP no es válido.");
        }
        // 5) Estado
        state = curpNorm.slice(11, 13);
        if (!ESTADOS.includes(state)) {
            reasons.push("El código de estado en la CURP no es válido.");
        }
        // 6) Palabras ofensivas
        const primeras4 = curpNorm.slice(0, 4);
        if (PALABRAS_OFENSIVAS.includes(primeras4)) {
            reasons.push("Las primeras cuatro letras forman una palabra no permitida en una CURP oficial.");
        }
        // 7) Dígito verificador (solo si activamos el modo estricto)
        if (VALIDAR_DIGITO_VERIFICADOR) {
            const curp17 = curpNorm.slice(0, 17);
            const digitoReal = curpNorm[17];
            const digitoCalculado = calcularDigitoVerificador(curp17);
            if (digitoReal !== String(digitoCalculado)) {
                reasons.push(`El dígito verificador de la CURP no es válido. Se esperaba ${digitoCalculado}.`);
            }
        }
    }
    const isValid = reasons.length === 0;
    return {
        isValid,
        normalized: curpNorm,
        reasons,
        data: isValid
            ? {
                year,
                month,
                day,
                gender,
                state,
            }
            : null,
    };
}
//# sourceMappingURL=curp-validator.js.map