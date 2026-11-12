"""Importa la plantilla Excel 50/30/20 a Supabase.

Uso:
    python gastito/scripts/import_excel_to_supabase.py "ruta/al/archivo.xlsx"

Variables opcionales:
    SUPABASE_URL, SUPABASE_KEY (por defecto usa el proyecto y la publishable key de Gastito)
"""

import os
import sys
from collections import defaultdict
from datetime import date, datetime

import openpyxl
import requests

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://phteuxphjoetxgkhgtnp.supabase.co"
)
SUPABASE_KEY = os.environ.get(
    "SUPABASE_KEY", "sb_publishable_cYH35YftF3NaXvkQAyMeFg_9jmtW8zb"
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}
DEFAULT_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "Plantilla_503020_GoogleSheets_con_patrimonio_ajustada_select.xlsm (3).xlsx",
)


def rest(method, table, params="", json=None, prefer=None):
    headers = dict(HEADERS)
    if prefer:
        headers["Prefer"] = prefer
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    response = requests.request(
        method, url, headers=headers, json=json, timeout=60
    )
    if response.status_code >= 300:
        raise RuntimeError(
            f"{method} {table} -> {response.status_code}: {response.text}"
        )
    if not response.content:
        return None
    return response.json()


def clear_table(table):
    try:
        rest("DELETE", table, "?id=not.is.null")
        print(f"  limpiada tabla {table}")
    except Exception as exc:  # noqa: BLE001
        print(f"  no se pudo limpiar {table}: {exc}")


def insert_batches(table, rows, size=100):
    for start in range(0, len(rows), size):
        batch = rows[start : start + size]
        rest("POST", table, json=batch, prefer="return=minimal")
    print(f"  {len(rows)} filas insertadas en {table}")


def as_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        text = value.strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(text[:10], fmt).date()
            except ValueError:
                continue
    return None


def as_number(value, default=0.0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(".", "").replace(",", "."))
    except ValueError:
        return default


def as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"si", "sí", "s", "true", "1"}


def as_text(value, default=""):
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def normalize_tipo(value):
    text = as_text(value, "Deseos")
    low = text.lower()
    if low.startswith("neces"):
        return "Necesidades"
    if low.startswith("ahorr"):
        return "Ahorro"
    return "Deseos"


def normalize_medio(value):
    text = as_text(value, "Efectivo")
    low = text.lower()
    if low.startswith("efect"):
        return "Efectivo"
    if low.startswith("transfer"):
        return "Transferencia"
    if low.startswith("cheq"):
        return "Cheque"
    if low.startswith("cr"):
        return "Tarjeta Crédito"
    if low.startswith("d"):
        return "Débito"
    return "Otro"


def normalize_fijo(value):
    return "Fijo" if as_text(value).lower().startswith("fij") else "Variable"


def exchange_rate(moneda, monto, monto_ars):
    if moneda == "ARS":
        return 1.0
    if monto and monto_ars:
        rate = monto_ars / monto
        if rate > 0:
            return round(rate, 4)
    return 1.0


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FILE
    print(f"Leyendo {path}")
    wb = openpyxl.load_workbook(path, data_only=True)

    print("Limpiando tablas...")
    for table in ("ingresos", "gastos", "patrimonio", "resumen_503020"):
        clear_table(table)

    # ---------------------------------------------------------------- Ingresos
    ingresos = []
    for row in wb["Ingresos"].iter_rows(min_row=2, values_only=True):
        fecha = as_date(row[0])
        if fecha is None:
            continue
        cliente = as_text(row[1], "Sin detalle")
        if cliente.lower().startswith("tip"):
            continue
        moneda = as_text(row[5], "ARS").upper()
        monto = as_number(row[4])
        monto_ars = as_number(row[7])
        ingresos.append(
            {
                "fecha": fecha.isoformat(),
                "cliente_fuente": cliente,
                "tipo": as_text(row[2], "Otro"),
                "proyecto": as_text(row[3]) or None,
                "monto": monto,
                "moneda": moneda,
                "tipo_cambio_ars": exchange_rate(moneda, monto, monto_ars),
                "cobrado": as_bool(row[8]),
                "mes_clave": fecha.strftime("%Y-%m"),
                "notas": as_text(row[10]),
                "impacta_resultados": as_bool(row[11]) if row[11] is not None else True,
            }
        )
    print("Insertando ingresos...")
    insert_batches("ingresos", ingresos)

    # ------------------------------------------------------------------ Gastos
    gastos = []
    for row in wb["Gastos"].iter_rows(min_row=2, values_only=True):
        fecha = as_date(row[0])
        if fecha is None:
            continue
        concepto = as_text(row[1], "Gasto")
        if concepto.lower().startswith("tip"):
            continue
        moneda = as_text(row[5], "ARS").upper()
        monto = as_number(row[4])
        monto_ars = as_number(row[7])
        gastos.append(
            {
                "fecha": fecha.isoformat(),
                "concepto": concepto,
                "categoria": as_text(row[2], "Otros"),
                "tipo_503020": normalize_tipo(row[3]),
                "monto": monto,
                "moneda": moneda,
                "tipo_cambio_ars": exchange_rate(moneda, monto, monto_ars),
                "medio_pago": normalize_medio(row[8]),
                "fijo_variable": normalize_fijo(row[9]),
                "mes_clave": fecha.strftime("%Y-%m"),
                "impacta_resultados": as_bool(row[11]) if row[11] is not None else True,
            }
        )
    print("Insertando gastos...")
    insert_batches("gastos", gastos)

    # -------------------------------------------------------------- Patrimonio
    patrimonio = []
    for row in wb["Patrimonio"].iter_rows(min_row=5, values_only=True):
        if row[0] is None and row[1] is None:
            break
        fecha = as_date(row[0])
        if fecha is None:
            continue
        ano = int(as_number(row[1], fecha.year))
        mes = int(as_number(row[2], fecha.month))
        patrimonio.append(
            {
                "mes_clave": fecha.strftime("%Y-%m"),
                "ano": ano,
                "mes_numero": mes,
                "patrimonio_inicial_ars": round(as_number(row[3]), 2),
                "ingresos_mes_ars": round(as_number(row[4]), 2),
                "gastos_mes_ars": round(as_number(row[5]), 2),
            }
        )
    print("Insertando patrimonio...")
    insert_batches("patrimonio", patrimonio)

    # ------------------------------------------------------------------ Resumen
    ingresos_por_mes = defaultdict(float)
    for item in ingresos:
        if item["cobrado"] and item["impacta_resultados"]:
            ingresos_por_mes[item["mes_clave"]] += item["monto"] * item[
                "tipo_cambio_ars"
            ]

    gastos_por_mes = defaultdict(lambda: defaultdict(float))
    for item in gastos:
        if item["impacta_resultados"]:
            gastos_por_mes[item["mes_clave"]][item["tipo_503020"]] += item[
                "monto"
            ] * item["tipo_cambio_ars"]

    resumen = []
    for item in patrimonio:
        clave = item["mes_clave"]
        base = ingresos_por_mes[clave]
        nec = gastos_por_mes[clave]["Necesidades"]
        des = gastos_por_mes[clave]["Deseos"]
        aho = gastos_por_mes[clave]["Ahorro"]

        def pct(gasto, asignado):
            return round((gasto / asignado) * 100, 2) if asignado else 0.0

        resumen.append(
            {
                "mes_clave": clave,
                "ano": item["ano"],
                "mes_numero": item["mes_numero"],
                "necesita_asignado": round(base * 0.5, 2),
                "deseo_asignado": round(base * 0.3, 2),
                "ahorro_asignado": round(base * 0.2, 2),
                "necesidad_gasto": round(nec, 2),
                "deseo_gasto": round(des, 2),
                "ahorro_gasto": round(aho, 2),
                "cumplimiento_nec_pct": pct(nec, base * 0.5),
                "cumplimiento_des_pct": pct(des, base * 0.3),
                "cumplimiento_ahorro_pct": pct(aho, base * 0.2),
            }
        )
    print("Insertando resumen 50/30/20...")
    insert_batches("resumen_503020", resumen)

    print("\nImportación completada:")
    print(f"  ingresos: {len(ingresos)}")
    print(f"  gastos: {len(gastos)}")
    print(f"  patrimonio: {len(patrimonio)}")
    print(f"  resumen: {len(resumen)}")


if __name__ == "__main__":
    main()
