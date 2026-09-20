/**
 * Helpers
 */
const escapeTest = /[&<>"']/;
const escapeReplace = new RegExp(escapeTest.source, 'g');
const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
const escapeReplacements: { [index: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
const getEscapeReplacement = (ch: string) => escapeReplacements[ch] ?? ch;

export const escape = (html: string, encode?: boolean) => {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replaceAll(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replaceAll(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }

  return html;
};

const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi;

export const unescape = (html: string) => {
  // explicitly match decimal, hex, and named HTML entities
  return html.replaceAll(unescapeTest, (_match: string, n: string) => {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(Number.parseInt(n.slice(2), 16))
        : String.fromCharCode(+n.slice(1));
    }
    return '';
  });
};

const caret = /(^|[^[])\^/g;

export const edit = (regex: string | RegExp, opt?: string) => {
  let source = typeof regex === 'string' ? regex : regex.source;
  opt ||= '';
  const obj = {
    replace: (name: string | RegExp, val: string | RegExp) => {
      let valSource = typeof val === 'string' ? val : val.source;
      valSource = valSource.replaceAll(caret, '$1');
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => {
      return new RegExp(source, opt);
    }
  };
  return obj;
};

export const cleanUrl = (href: string) => {
  try {
    href = encodeURI(href).replaceAll('%25', '%');
  } catch {
    return null;
  }
  return href;
};

export const noopTest = /a^/;

export const codePoints = (value: string) => Array.from(value);

export const splitCells = (tableRow: string, count?: number) => {
  // ensure that every cell-delimiting pipe has a space
  // before it to distinguish it from an escaped pipe
  const row = tableRow.replaceAll('|', (_match: string, offset: number, str: string) => {
      let escaped = false;
      let curr = offset;
      while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
      if (escaped) {
        // odd number of slashes means | is escaped
        // so we leave it alone
        return '|';
      }
      // add space before unescaped |
      return ' |';
    }),
    cells = row.split(/ \|/);
  let i = 0;

  // First/last cell in a row cannot be empty if it has no leading/trailing pipe
  if (!cells[0]?.trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells.at(-1)?.trim()) {
    cells.pop();
  }

  if (count) {
    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count) cells.push('');
    }
  }

  for (; i < cells.length; i++) {
    // leading or trailing whitespace is ignored per the gfm spec
    cells[i] = cells[i]?.trim().replaceAll('\\|', '|') ?? '';
  }
  return cells;
};

/**
 * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
 * /c*$/ is vulnerable to REDOS.
 *
 * @param str
 * @param c
 * @param invert Remove suffix of non-c chars instead. Default falsey.
 */
export const rtrim = (str: string, c: string, invert?: boolean) => {
  const l = str.length;
  if (l === 0) {
    return '';
  }

  // Length of suffix matching the invert condition.
  let suffLen = 0;

  // Step left until we fail to match the invert condition.
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }

  return str.slice(0, l - suffLen);
};

export const findClosingBracket = (str: string, b: string) => {
  const close = b[1];
  const open = b[0];
  if (!close || !open || !str.includes(close)) {
    return -1;
  }

  let level = 0;
  for (let i = 0; i < str.length; i++) {
    switch (str[i]) {
      case '\\': {
        i++;

        break;
      }
      case open: {
        level++;

        break;
      }
      case close: {
        level--;
        if (level < 0) {
          return i;
        }

        break;
      }
      // No default
    }
  }
  return -1;
};
