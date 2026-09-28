/**
 * Constantes de nivel superior de un script de Blender, leídas sin ejecutarlo:
 * el mismo subconjunto que `tools/barcos/guia_colores.py` (`script_constants`,
 * `resolve`, `to_hex`). Cadenas, números (también negativos), tuplas, listas,
 * diccionarios con claves literales y nombres ya definidos antes en el archivo.
 * Una asignación con cualquier otra cosa (llamadas, operaciones…) se ignora.
 *
 * Así la paleta de cada barco sale de su script y no se copia (docs/barcos).
 */

export type PyValue = string | number | PyValue[] | { [key: string]: PyValue };

type Token =
  | { t: 'str'; v: string }
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'op'; v: string };

class Unsupported extends Error {}

const OPEN = '([{';
const CLOSE = ')]}';

/** Tokens de una expresión que puede ocupar varias líneas; `null` si no se sabe leer. */
function tokenize(src: string): Token[] | null {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      if (src.startsWith(c.repeat(3), i)) return null;
      let j = i + 1;
      let v = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') {
          const n = src[j + 1];
          v += n === 'n' ? '\n' : n === 't' ? '\t' : (n ?? '');
          j += 2;
        } else {
          if (src[j] === '\n') return null;
          v += src[j];
          j++;
        }
      }
      if (j >= src.length) return null;
      out.push({ t: 'str', v });
      i = j + 1;
      continue;
    }
    const num = /^(?:\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?|\.\d[\d_]*(?:[eE][+-]?\d+)?)/.exec(
      src.slice(i),
    );
    if (num) {
      out.push({ t: 'num', v: Number(num[0].replace(/_/g, '')) });
      i += num[0].length;
      continue;
    }
    const name = /^[A-Za-z_]\w*/.exec(src.slice(i));
    if (name) {
      // Prefijos de cadena (f"", r"", b""…): no se leen.
      if (src[i + name[0].length] === '"' || src[i + name[0].length] === "'") return null;
      out.push({ t: 'name', v: name[0] });
      i += name[0].length;
      continue;
    }
    out.push({ t: 'op', v: c });
    i++;
  }
  return out;
}

function parseExpr(tokens: Token[], env: Map<string, PyValue>): PyValue {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => {
    const t = tokens[pos++];
    if (!t) throw new Unsupported();
    return t;
  };
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;

  const seq = (close: string): PyValue[] => {
    const items: PyValue[] = [];
    while (!isOp(close)) {
      items.push(value());
      if (isOp(',')) next();
      else if (!isOp(close)) throw new Unsupported();
    }
    next();
    return items;
  };

  const value = (): PyValue => {
    const t = next();
    if (t.t === 'str') {
      // Cadenas contiguas se concatenan, como en Python.
      let v = t.v;
      while (peek()?.t === 'str') v += (next() as { v: string }).v;
      return v;
    }
    if (t.t === 'num') return t.v;
    if (t.t === 'name') {
      const v = env.get(t.v);
      if (v === undefined) throw new Unsupported();
      return v;
    }
    if (t.v === '-') {
      const v = value();
      if (typeof v !== 'number') throw new Unsupported();
      return -v;
    }
    if (t.v === '(') {
      const items = seq(')');
      return items;
    }
    if (t.v === '[') return seq(']');
    if (t.v === '{') {
      const obj: { [key: string]: PyValue } = {};
      while (!isOp('}')) {
        const k = next();
        if (k.t !== 'str' && k.t !== 'num') throw new Unsupported();
        if (!isOp(':')) throw new Unsupported();
        next();
        obj[String(k.v)] = value();
        if (isOp(',')) next();
        else if (!isOp('}')) throw new Unsupported();
      }
      next();
      return obj;
    }
    throw new Unsupported();
  };

  const v = value();
  // Una tupla sin paréntesis: `A = 1, 2`.
  if (isOp(',')) {
    const items = [v];
    while (isOp(',')) {
      next();
      if (pos >= tokens.length) break;
      items.push(value());
    }
    if (pos !== tokens.length) throw new Unsupported();
    return items;
  }
  if (pos !== tokens.length) throw new Unsupported();
  return v;
}

/** Profundidad de corchetes al final de `line`, ignorando cadenas y comentarios. */
function depthAfter(line: string, depth: number): number {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '#') break;
    if (c === '"' || c === "'") quote = c;
    else if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth--;
  }
  return depth;
}

/** Las constantes de nivel superior de un script de Python, en orden. */
export function scriptConstants(source: string): Map<string, PyValue> {
  const env = new Map<string, PyValue>();
  const lines = source.split('\n');
  let inTriple: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Docstrings y cadenas triples: lo de dentro no son asignaciones.
    const triples = [...line.matchAll(/"""|'''/g)].map((m) => m[0]);
    if (inTriple) {
      if (triples.includes(inTriple)) inTriple = null;
      continue;
    }
    if (triples.length % 2 === 1) {
      inTriple = triples[0]!;
      continue;
    }
    const m = /^([A-Za-z_]\w*)\s*=(?!=)(.*)$/.exec(line);
    if (!m) continue;
    let expr = m[2]!;
    let depth = depthAfter(expr, 0);
    while (depth > 0 && i + 1 < lines.length) {
      i++;
      expr += '\n' + lines[i]!;
      depth = depthAfter(lines[i]!, depth);
    }
    const tokens = tokenize(expr);
    if (!tokens || tokens.length === 0) continue;
    try {
      env.set(m[1]!, parseExpr(tokens, env));
    } catch (err) {
      if (!(err instanceof Unsupported)) throw err;
      // Como en Python con `ast`: lo que no es literal simplemente no cuenta.
      env.delete(m[1]!);
    }
  }
  return env;
}

/** Sigue una referencia `["PAL", "hull"]` o `["PAPER", 0]`; lanza si no existe. */
export function resolveRef(env: Map<string, PyValue>, ref: readonly (string | number)[]): PyValue {
  const [head, ...rest] = ref;
  let v: PyValue | undefined = env.get(String(head));
  if (v === undefined) throw new Error(`referencia rota: ${ref.join('.')}`);
  for (const key of rest) {
    if (Array.isArray(v) && typeof key === 'number' && key >= 0 && key < v.length) v = v[key]!;
    else if (v && typeof v === 'object' && !Array.isArray(v) && String(key) in v)
      v = v[String(key)]!;
    else throw new Error(`referencia rota: ${ref.join('.')}`);
  }
  return v;
}

/** `#RRGGBB` en sRGB. Un número suelto es un gris sRGB en 0..1 (como `to_hex`). */
export function toHex(value: PyValue): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  if (typeof value === 'number' && value >= 0 && value <= 1) {
    // `round` de Python redondea los empates al par.
    const x = value * 255;
    const g = Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : Math.round(x);
    const h = g.toString(16).toUpperCase().padStart(2, '0');
    return `#${h}${h}${h}`;
  }
  throw new Error(`no es un color: ${JSON.stringify(value)}`);
}
