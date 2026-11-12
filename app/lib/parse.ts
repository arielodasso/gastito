import type { Tipo503020 } from "./finance";

export interface ParsedMovement {
  tipo: "ingreso" | "gasto";
  concepto: string;
  monto: number;
  moneda: string;
  medio_pago?: string;
  tipo_503020?: Tipo503020;
  fecha: string;
  notas: string;
}

function parseAmount(raw: string): number {
  let value = raw.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (!value) return 0;

  const hasDot = value.includes(".");
  const hasComma = value.includes(",");

  if (hasDot && hasComma) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    value = value.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function cleanConcept(text: string, amountRaw: string): string {
  let concept = text;
  if (amountRaw) concept = concept.replace(amountRaw, " ");
  concept = concept
    .replace(
      /^(gasti|gasté|gaste|pagué|pague|compré|compre|salió|salio|cobra|cobré|cobre|ingres[ao]|ingresó|ingreso|recibí|recibi|me\s+pagó|me\s+pago|venció|vencio|pagará|pagara)\b/gi,
      " "
    )
    .replace(
      /\b(en|con|por|de|desde)\s+(efectivo|tarjeta|transferencia|débito|debito|crédito|credito|cheque|mercado\s*pago|modo)\b/gi,
      " "
    )
    .replace(
      /\b(efectivo|tarjeta|transferencia|débito|debito|crédito|credito|cheque|mercado\s*pago|modo)\b/gi,
      " "
    )
    .replace(/\b(por|para)\s+/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
    .trim();

  if (!concept) return "Movimiento";
  return concept.charAt(0).toUpperCase() + concept.slice(1);
}

function detectPayment(text: string): string | undefined {
  const low = text.toLowerCase();
  if (/efectivo/.test(low)) return "Efectivo";
  if (/transferencia|mercado\s*pago|\bmodo\b/.test(low)) return "Transferencia";
  if (/crédito|credito/.test(low)) return "Tarjeta Crédito";
  if (/débito|debito|tarjeta/.test(low)) return "Débito";
  if (/cheque/.test(low)) return "Cheque";
  return undefined;
}

function detectTipo(text: string): Tipo503020 {
  const low = text.toLowerCase();
  if (/ahorro|inversi[oó]n|invert[ií]|ahorr[eé]/.test(low)) return "Ahorro";
  if (
    /alquiler|expensas|servicio|internet|luz|gas|agua|nafta|transporte|super|almac[eé]n|comida|salud|farmacia|obra social|monotributo|impuesto|celular|psic[oó]log/.test(
      low
    )
  ) {
    return "Necesidades";
  }
  if (/delivery|salida|restaurant|restaurante|bar|cine|ocio|ropa|juego|regalo|caf[eé]/.test(low)) {
    return "Deseos";
  }
  return "Deseos";
}

export function parseMovement(text: string, fecha?: string): ParsedMovement {
  const clean = text.trim();
  const income = /^(cobra|cobr[eé]|cobre|ingres[ao]|ingres[oó]|recib[ií]|recibi|me\s+pag[oó]|me\s+transfiri[oó]|entr[oó]|venci[oó]|pagar[áa])\b/i.test(
    clean
  );

  const amountMatch = clean.match(
    /\$?\s*(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/
  );
  const amountRaw = amountMatch ? amountMatch[0] : "";
  const monto = parseAmount(amountRaw);

  const low = clean.toLowerCase();
  let moneda = "ARS";
  if (/\busd\b|d[oó]lar|u\$s/.test(low)) moneda = "USD";
  else if (/\beur\b|euro/.test(low)) moneda = "EUR";

  return {
    tipo: income ? "ingreso" : "gasto",
    concepto: cleanConcept(clean, amountRaw),
    monto,
    moneda,
    medio_pago: income ? undefined : detectPayment(clean),
    tipo_503020: income ? undefined : detectTipo(clean),
    fecha: fecha || new Date().toISOString().slice(0, 10),
    notas: "",
  };
}
