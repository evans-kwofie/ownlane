/**
 * RFC 4180 CSV. Values are always quoted and a leading =, +, - or @ is
 * prefixed with a quote, so a spreadsheet opens a message as text rather than
 * evaluating it as a formula.
 */
export function toCsv(rows: Array<Record<string, string | null>>, columns: string[]) {
  const lines = [columns.map(cell).join(',')];
  for (const row of rows) lines.push(columns.map((column) => cell(row[column])).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function csvRow(row: Record<string, string | null>, columns: string[]) {
  return `${columns.map((column) => cell(row[column])).join(',')}\r\n`;
}

export function csvHeader(columns: string[]) {
  return `\uFEFF${columns.map(cell).join(',')}\r\n`;
}

function cell(value: string | null | undefined) {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
