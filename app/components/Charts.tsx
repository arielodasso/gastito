import type { MesResumen } from "@/app/lib/finance";
import { compactMoney, monthShort } from "@/app/lib/format";

interface ChartProps {
  rows: MesResumen[];
}

function pathFor(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middle = (previous.x + current.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

export function PatrimonioChart({ rows }: ChartProps) {
  if (rows.length === 0) {
    return <div className="empty">Todavía no hay datos para graficar.</div>;
  }

  const width = 680;
  const height = 240;
  const padding = { top: 22, right: 14, bottom: 34, left: 12 };
  const values = rows.map((row) => row.final);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const baseline = padding.top + innerH;

  const points = rows.map((row, index) => ({
    x:
      padding.left +
      (rows.length === 1 ? innerW / 2 : (index * innerW) / (rows.length - 1)),
    y: padding.top + innerH - ((row.final - min) / span) * innerH,
  }));

  const line = pathFor(points);
  const area = `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  const gridValues = [max, (max + min) / 2, min];
  const labelEvery = rows.length > 8 ? 2 : 1;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Evolución del patrimonio"
    >
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f26654" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f26654" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fa9c5b" />
          <stop offset="100%" stopColor="#f26654" />
        </linearGradient>
      </defs>

      {gridValues.map((value, index) => {
        const y = padding.top + (innerH * index) / (gridValues.length - 1);
        return (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#eef0f4"
              strokeDasharray="4 6"
            />
            <text
              x={width - padding.right}
              y={y - 6}
              textAnchor="end"
              fontSize="10.5"
              fontWeight="800"
              fill="#a1a6b4"
            >
              {compactMoney(value)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#areaGradient)" />
      <path
        d={line}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((point, index) => (
        <g key={rows[index].clave}>
          <circle
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 5 : 3}
            fill="#fff"
            stroke="#f26654"
            strokeWidth="2.4"
          >
            <title>
              {monthShort(rows[index].clave)}: {compactMoney(rows[index].final)}
            </title>
          </circle>
          {index % labelEvery === 0 ? (
            <text
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="900"
              fill="#a1a6b4"
            >
              {monthShort(rows[index].clave)}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function FlujoBars({ rows }: ChartProps) {
  const recent = rows.slice(-7);
  if (recent.length === 0) {
    return <div className="empty">Todavía no hay movimientos.</div>;
  }
  const max = Math.max(
    ...recent.map((row) => Math.max(row.ingresos, row.gastos)),
    1
  );

  return (
    <div>
      <div className="bars-grid">
        {recent.map((row) => {
          const inHeight = Math.max((row.ingresos / max) * 100, row.ingresos > 0 ? 2 : 0);
          const outHeight = Math.max((row.gastos / max) * 100, row.gastos > 0 ? 2 : 0);
          return (
            <div className="bar-group" key={row.clave}>
              <div className="bar-pair">
                <i
                  className="in"
                  style={{ height: `${inHeight}%` }}
                  title={`Ingresos ${compactMoney(row.ingresos)}`}
                />
                <i
                  className="out"
                  style={{ height: `${outHeight}%` }}
                  title={`Gastos ${compactMoney(row.gastos)}`}
                />
              </div>
              <span className="bar-label">{monthShort(row.clave)}</span>
            </div>
          );
        })}
      </div>
      <div className="legend" style={{ marginTop: 12 }}>
        <span>
          <i style={{ background: "#8fe6c9" }} /> Ingresos
        </span>
        <span>
          <i style={{ background: "var(--brand-gradient)" }} /> Gastos
        </span>
      </div>
    </div>
  );
}
