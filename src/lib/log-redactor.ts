const SENSITIVE_KEY = /(cookie|token|li_at|secret)/i;

export function redactSensitive(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value instanceof Error) {
    return { name: value.name, message: redactSensitiveText(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactSensitive(entryValue, entryKey),
      ])
    );
  }
  return typeof value === "string" ? redactSensitiveText(value) : value;
}

function redactSensitiveText(value: string) {
  return value.replace(
    /((?:cookie|token|li_at|secret|code)\s*[=:]\s*)([^&\s,;]+)/gi,
    "$1[REDACTED]"
  );
}