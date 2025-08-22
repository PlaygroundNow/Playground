"use strict";
(() => {
  // ../tailwindcss/package.json
  var version = "4.1.7";

  // ../tailwindcss/src/css-parser.ts
  var BACKSLASH = 92;
  var SLASH = 47;
  var ASTERISK = 42;
  var DOUBLE_QUOTE = 34;
  var SINGLE_QUOTE = 39;
  var COLON = 58;
  var SEMICOLON = 59;
  var LINE_BREAK = 10;
  var CARRIAGE_RETURN = 13;
  var SPACE = 32;
  var TAB = 9;
  var OPEN_CURLY = 123;
  var CLOSE_CURLY = 125;
  var OPEN_PAREN = 40;
  var CLOSE_PAREN = 41;
  var OPEN_BRACKET = 91;
  var CLOSE_BRACKET = 93;
  var DASH = 45;
  var AT_SIGN = 64;
  var EXCLAMATION_MARK = 33;

  function parse(input, opts) {
    let source = opts?.from ? { file: opts.from, code: input } : null;
    if (input[0] === "\uFEFF") input = " " + input.slice(1);
    let ast = [];
    let licenseComments = [];
    let stack = [];
    let parent = null;
    let node = null;
    let buffer = "";
    let closingBracketStack3 = "";
    let bufferStart = 0;
    let peekChar;
    for (let i = 0; i < input.length; i++) {
      let currentChar = input.charCodeAt(i);
      if (currentChar === CARRIAGE_RETURN) {
        peekChar = input.charCodeAt(i + 1);
        if (peekChar === LINE_BREAK) continue;
      }
      if (currentChar === BACKSLASH) {
        if (buffer === "") bufferStart = i;
        buffer += input.slice(i, i + 2);
        i += 1;
      } else if (currentChar === SLASH && input.charCodeAt(i + 1) === ASTERISK) {
        let start = i;
        for (let j = i + 2; j < input.length; j++) {
          peekChar = input.charCodeAt(j);
          if (peekChar === BACKSLASH) {
            j += 1;
          } else if (peekChar === ASTERISK && input.charCodeAt(j + 1) === SLASH) {
            i = j + 1;
            break;
          }
        }
        let commentString = input.slice(start, i + 1);
        if (commentString.charCodeAt(2) === EXCLAMATION_MARK) {
          let node2 = comment(commentString.slice(2, -2));
          licenseComments.push(node2);
          if (source) {
            node2.src = [source, start, i + 1];
            node2.dst = [source, start, i + 1];
          }
        }
      } else if (currentChar === SINGLE_QUOTE || currentChar === DOUBLE_QUOTE) {
        let start = i;
        for (let j = i + 1; j < input.length; j++) {
          peekChar = input.charCodeAt(j);
          if (peekChar === BACKSLASH) {
            j += 1;
          } else if (peekChar === currentChar) {
            i = j;
            break;
          } else if (
            peekChar === SEMICOLON &&
            (input.charCodeAt(j + 1) === LINE_BREAK ||
              (input.charCodeAt(j + 1) === CARRIAGE_RETURN && input.charCodeAt(j + 2) === LINE_BREAK))
          ) {
            throw new Error(`Unterminated string: ${input.slice(start, j + 1) + String.fromCharCode(currentChar)}`);
          } else if (
            peekChar === LINE_BREAK ||
            (peekChar === CARRIAGE_RETURN && input.charCodeAt(j + 1) === LINE_BREAK)
          ) {
            throw new Error(`Unterminated string: ${input.slice(start, j) + String.fromCharCode(currentChar)}`);
          }
        }
        buffer += input.slice(start, i + 1);
      } else if (
        (currentChar === SPACE || currentChar === LINE_BREAK || currentChar === TAB) &&
        (peekChar = input.charCodeAt(i + 1)) &&
        (peekChar === SPACE ||
          peekChar === LINE_BREAK ||
          peekChar === TAB ||
          (peekChar === CARRIAGE_RETURN && (peekChar = input.charCodeAt(i + 2)) && peekChar == LINE_BREAK))
      ) {
        continue;
      } else if (currentChar === LINE_BREAK) {
        if (buffer.length === 0) continue;
        peekChar = buffer.charCodeAt(buffer.length - 1);
        if (peekChar !== SPACE && peekChar !== LINE_BREAK && peekChar !== TAB) {
          buffer += " ";
        }
      } else if (currentChar === DASH && input.charCodeAt(i + 1) === DASH && buffer.length === 0) {
        let closingBracketStack4 = "";
        let start = i;
        let colonIdx = -1;
        for (let j = i + 2; j < input.length; j++) {
          peekChar = input.charCodeAt(j);
          if (peekChar === BACKSLASH) {
            j += 1;
          } else if (peekChar === SLASH && input.charCodeAt(j + 1) === ASTERISK) {
            for (let k = j + 2; k < input.length; k++) {
              peekChar = input.charCodeAt(k);
              if (peekChar === BACKSLASH) {
                k += 1;
              } else if (peekChar === ASTERISK && input.charCodeAt(k + 1) === SLASH) {
                j = k + 1;
                break;
              }
            }
          } else if (colonIdx === -1 && peekChar === COLON) {
            colonIdx = buffer.length + j - start;
          } else if (peekChar === SEMICOLON && closingBracketStack4.length === 0) {
            buffer += input.slice(start, j);
            i = j;
            break;
          } else if (peekChar === OPEN_PAREN) {
            closingBracketStack4 += ")";
          } else if (peekChar === OPEN_BRACKET) {
            closingBracketStack4 += "]";
          } else if (peekChar === OPEN_CURLY) {
            closingBracketStack4 += "}";
          } else if ((peekChar === CLOSE_CURLY || input.length - 1 === j) && closingBracketStack4.length === 0) {
            i = j - 1;
            buffer += input.slice(start, j);
            break;
          } else if (peekChar === CLOSE_PAREN || peekChar === CLOSE_BRACKET || peekChar === CLOSE_CURLY) {
            if (closingBracketStack4.length > 0 && input[j] === closingBracketStack4[closingBracketStack4.length - 1]) {
              closingBracketStack4 = closingBracketStack4.slice(0, -1);
            }
          }
        }
        let declaration = parseDeclaration(buffer, colonIdx);
        if (!declaration) throw new Error(`Invalid custom property, expected a value`);
        if (source) {
          declaration.src = [source, start, i];
          declaration.dst = [source, start, i];
        }
        if (parent) {
          parent.nodes.push(declaration);
        } else {
          ast.push(declaration);
        }
        buffer = "";
      } else if (currentChar === SEMICOLON && buffer.charCodeAt(0) === AT_SIGN) {
        node = parseAtRule(buffer);
        if (source) {
          node.src = [source, bufferStart, i];
          node.dst = [source, bufferStart, i];
        }
        if (parent) {
          parent.nodes.push(node);
        } else {
          ast.push(node);
        }
        buffer = "";
        node = null;
      } else if (currentChar === SEMICOLON && closingBracketStack3[closingBracketStack3.length - 1] !== ")") {
        let declaration = parseDeclaration(buffer);
        if (!declaration) {
          if (buffer.length === 0) throw new Error("Unexpected semicolon");
          throw new Error(`Invalid declaration: \`${buffer.trim()}\``);
        }
        if (source) {
          declaration.src = [source, bufferStart, i];
          declaration.dst = [source, bufferStart, i];
        }
        if (parent) {
          parent.nodes.push(declaration);
        } else {
          ast.push(declaration);
        }
        buffer = "";
      } else if (currentChar === OPEN_CURLY && closingBracketStack3[closingBracketStack3.length - 1] !== ")") {
        closingBracketStack3 += "}";
        node = rule(buffer.trim());
        if (source) {
          node.src = [source, bufferStart, i];
          node.dst = [source, bufferStart, i];
        }
        if (parent) {
          parent.nodes.push(node);
        }
        stack.push(parent);
        parent = node;
        buffer = "";
        node = null;
      } else if (currentChar === CLOSE_CURLY && closingBracketStack3[closingBracketStack3.length - 1] !== ")") {
        if (closingBracketStack3 === "") {
          throw new Error("Missing opening {");
        }
        closingBracketStack3 = closingBracketStack3.slice(0, -1);
        if (buffer.length > 0) {
          if (buffer.charCodeAt(0) === AT_SIGN) {
            node = parseAtRule(buffer);
            if (source) {
              node.src = [source, bufferStart, i];
              node.dst = [source, bufferStart, i];
            }
            if (parent) {
              parent.nodes.push(node);
            } else {
              ast.push(node);
            }
            buffer = "";
            node = null;
          } else {
            let colonIdx = buffer.indexOf(":");
            if (parent) {
              let node2 = parseDeclaration(buffer, colonIdx);
              if (!node2) throw new Error(`Invalid declaration: \`${buffer.trim()}\``);
              if (source) {
                node2.src = [source, bufferStart, i];
                node2.dst = [source, bufferStart, i];
              }
              parent.nodes.push(node2);
            }
          }
        }
        let grandParent = stack.pop() ?? null;
        if (grandParent === null && parent) {
          ast.push(parent);
        }
        parent = grandParent;
        buffer = "";
        node = null;
      } else if (currentChar === OPEN_PAREN) {
        closingBracketStack3 += ")";
        buffer += "(";
      } else if (currentChar === CLOSE_PAREN) {
        if (closingBracketStack3[closingBracketStack3.length - 1] !== ")") {
          throw new Error("Missing opening (");
        }
        closingBracketStack3 = closingBracketStack3.slice(0, -1);
        buffer += ")";
      } else {
        if (buffer.length === 0 && (currentChar === SPACE || currentChar === LINE_BREAK || currentChar === TAB)) {
          continue;
        }
        if (buffer === "") bufferStart = i;
        buffer += String.fromCharCode(currentChar);
      }
    }
    if (buffer.charCodeAt(0) === AT_SIGN) {
      let node2 = parseAtRule(buffer);
      if (source) {
        node2.src = [source, bufferStart, input.length];
        node2.dst = [source, bufferStart, input.length];
      }
      ast.push(node2);
    }
    if (closingBracketStack3.length > 0 && parent) {
      if (parent.kind === "rule") {
        throw new Error(`Missing closing } at ${parent.selector}`);
      }
      if (parent.kind === "at-rule") {
        throw new Error(`Missing closing } at ${parent.name} ${parent.params}`);
      }
    }
    if (licenseComments.length > 0) {
      return licenseComments.concat(ast);
    }
    return ast;
  }

  function parseAtRule(buffer, nodes = []) {
    let name = buffer;
    let params = "";
    for (let i = 5; i < buffer.length; i++) {
      let currentChar = buffer.charCodeAt(i);
      if (currentChar === SPACE || currentChar === OPEN_PAREN) {
        name = buffer.slice(0, i);
        params = buffer.slice(i);
        break;
      }
    }
    return atRule(name.trim(), params.trim(), nodes);
  }
  function parseDeclaration(buffer, colonIdx = buffer.indexOf(":")) {
    if (colonIdx === -1) return null;
    let importantIdx = buffer.indexOf("!important", colonIdx + 1);
    return decl(
      buffer.slice(0, colonIdx).trim(),
      buffer.slice(colonIdx + 1, importantIdx === -1 ? buffer.length : importantIdx).trim(),
      importantIdx !== -1
    );
  }

  // ../tailwindcss/src/utils/escape.ts
  function escape(value2) {
    if (arguments.length === 0) {
      throw new TypeError("`CSS.escape` requires an argument.");
    }
    let string = String(value2);
    let length = string.length;
    let index = -1;
    let codeUnit;
    let result = "";
    let firstCodeUnit = string.charCodeAt(0);
    if (
      // If the character is the first character and is a `-` (U+002D), and
      // there is no second character, […]
      length === 1 &&
      firstCodeUnit === 45
    ) {
      return "\\" + string;
    }
    while (++index < length) {
      codeUnit = string.charCodeAt(index);
      if (codeUnit === 0) {
        result += "\uFFFD";
        continue;
      }
      if (
        // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
        // U+007F, […]
        (codeUnit >= 1 && codeUnit <= 31) ||
        codeUnit === 127 || // If the character is the first character and is in the range [0-9]
        // (U+0030 to U+0039), […]
        (index === 0 && codeUnit >= 48 && codeUnit <= 57) || // If the character is the second character and is in the range [0-9]
        // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
        (index === 1 && codeUnit >= 48 && codeUnit <= 57 && firstCodeUnit === 45)
      ) {
        result += "\\" + codeUnit.toString(16) + " ";
        continue;
      }
      if (
        codeUnit >= 128 ||
        codeUnit === 45 ||
        codeUnit === 95 ||
        (codeUnit >= 48 && codeUnit <= 57) ||
        (codeUnit >= 65 && codeUnit <= 90) ||
        (codeUnit >= 97 && codeUnit <= 122)
      ) {
        result += string.charAt(index);
        continue;
      }
      result += "\\" + string.charAt(index);
    }
    return result;
  }
  function unescape(escaped) {
    return escaped.replace(/\\([\dA-Fa-f]{1,6}[\t\n\f\r ]?|[\S\s])/g, (match) => {
      return match.length > 2 ? String.fromCodePoint(Number.parseInt(match.slice(1).trim(), 16)) : match[1];
    });
  }

  // ../tailwindcss/src/theme.ts
  var ignoredThemeKeyMap = /* @__PURE__ */ new Map([
    ["--font", ["--font-weight", "--font-size"]],
    ["--inset", ["--inset-shadow", "--inset-ring"]],
    [
      "--text",
      [
        "--text-color",
        "--text-decoration-color",
        "--text-decoration-thickness",
        "--text-indent",
        "--text-shadow",
        "--text-underline-offset",
      ],
    ],
  ]);
  function isIgnoredThemeKey(themeKey, namespace) {
    return (ignoredThemeKeyMap.get(namespace) ?? []).some(
      (ignoredThemeKey) => themeKey === ignoredThemeKey || themeKey.startsWith(`${ignoredThemeKey}-`)
    );
  }
  var Theme = class {
    constructor(values = /* @__PURE__ */ new Map(), keyframes = /* @__PURE__ */ new Set([])) {
      this.values = values;
      this.keyframes = keyframes;
    }
    prefix = null;
    add(key, value2, options = 0 /* NONE */, src) {
      if (key.endsWith("-*")) {
        if (value2 !== "initial") {
          throw new Error(`Invalid theme value \`${value2}\` for namespace \`${key}\``);
        }
        if (key === "--*") {
          this.values.clear();
        } else {
          this.clearNamespace(
            key.slice(0, -2),
            // `--${key}-*: initial;` should clear _all_ theme values
            0 /* NONE */
          );
        }
      }
      if (options & 4 /* DEFAULT */) {
        let existing = this.values.get(key);
        if (existing && !((existing.options & 4) /* DEFAULT */)) return;
      }
      if (value2 === "initial") {
        this.values.delete(key);
      } else {
        this.values.set(key, { value: value2, options, src });
      }
    }
    keysInNamespaces(themeKeys) {
      let keys = [];
      for (let namespace of themeKeys) {
        let prefix = `${namespace}-`;
        for (let key of this.values.keys()) {
          if (!key.startsWith(prefix)) continue;
          if (key.indexOf("--", 2) !== -1) continue;
          if (isIgnoredThemeKey(key, namespace)) {
            continue;
          }
          keys.push(key.slice(prefix.length));
        }
      }
      return keys;
    }
    get(themeKeys) {
      for (let key of themeKeys) {
        let value2 = this.values.get(key);
        if (value2) {
          return value2.value;
        }
      }
      return null;
    }
    hasDefault(key) {
      return (this.getOptions(key) & 4) /* DEFAULT */ === 4 /* DEFAULT */;
    }
    getOptions(key) {
      key = unescape(this.#unprefixKey(key));
      return this.values.get(key)?.options ?? 0 /* NONE */;
    }
    entries() {
      if (!this.prefix) return this.values.entries();
      return Array.from(this.values, (entry) => {
        entry[0] = this.prefixKey(entry[0]);
        return entry;
      });
    }
    prefixKey(key) {
      if (!this.prefix) return key;
      return `--${this.prefix}-${key.slice(2)}`;
    }
    #unprefixKey(key) {
      if (!this.prefix) return key;
      return `--${key.slice(3 + this.prefix.length)}`;
    }
    clearNamespace(namespace, clearOptions) {
      let ignored = ignoredThemeKeyMap.get(namespace) ?? [];
      outer: for (let key of this.values.keys()) {
        if (key.startsWith(namespace)) {
          if (clearOptions !== 0 /* NONE */) {
            let options = this.getOptions(key);
            if ((options & clearOptions) !== clearOptions) {
              continue;
            }
          }
          for (let ignoredNamespace of ignored) {
            if (key.startsWith(ignoredNamespace)) continue outer;
          }
          this.values.delete(key);
        }
      }
    }
    #resolveKey(candidateValue, themeKeys) {
      for (let namespace of themeKeys) {
        let themeKey = candidateValue !== null ? `${namespace}-${candidateValue}` : namespace;
        if (!this.values.has(themeKey)) {
          if (candidateValue !== null && candidateValue.includes(".")) {
            themeKey = `${namespace}-${candidateValue.replaceAll(".", "_")}`;
            if (!this.values.has(themeKey)) continue;
          } else {
            continue;
          }
        }
        if (isIgnoredThemeKey(themeKey, namespace)) continue;
        return themeKey;
      }
      return null;
    }
    #var(themeKey) {
      let value2 = this.values.get(themeKey);
      if (!value2) {
        return null;
      }
      let fallback = null;
      if (value2.options & 2 /* REFERENCE */) {
        fallback = value2.value;
      }
      return `var(${escape(this.prefixKey(themeKey))}${fallback ? `, ${fallback}` : ""})`;
    }
    markUsedVariable(themeKey) {
      let key = unescape(this.#unprefixKey(themeKey));
      let value2 = this.values.get(key);
      if (!value2) return false;
      let isUsed = value2.options & 16; /* USED */
      value2.options |= 16 /* USED */;
      return !isUsed;
    }
    resolve(candidateValue, themeKeys, options = 0 /* NONE */) {
      let themeKey = this.#resolveKey(candidateValue, themeKeys);
      if (!themeKey) return null;
      let value2 = this.values.get(themeKey);
      if ((options | value2.options) & 1 /* INLINE */) {
        return value2.value;
      }
      return this.#var(themeKey);
    }
    resolveValue(candidateValue, themeKeys) {
      let themeKey = this.#resolveKey(candidateValue, themeKeys);
      if (!themeKey) return null;
      return this.values.get(themeKey).value;
    }
    resolveWith(candidateValue, themeKeys, nestedKeys = []) {
      let themeKey = this.#resolveKey(candidateValue, themeKeys);
      if (!themeKey) return null;
      let extra = {};
      for (let name of nestedKeys) {
        let nestedKey = `${themeKey}${name}`;
        let nestedValue = this.values.get(nestedKey);
        if (!nestedValue) continue;
        if (nestedValue.options & 1 /* INLINE */) {
          extra[name] = nestedValue.value;
        } else {
          extra[name] = this.#var(nestedKey);
        }
      }
      let value2 = this.values.get(themeKey);
      if (value2.options & 1 /* INLINE */) {
        return [value2.value, extra];
      }
      return [this.#var(themeKey), extra];
    }
    namespace(namespace) {
      let values = /* @__PURE__ */ new Map();
      let prefix = `${namespace}-`;
      for (let [key, value2] of this.values) {
        if (key === namespace) {
          values.set(null, value2.value);
        } else if (key.startsWith(`${prefix}-`)) {
          values.set(key.slice(namespace.length), value2.value);
        } else if (key.startsWith(prefix)) {
          values.set(key.slice(prefix.length), value2.value);
        }
      }
      return values;
    }
    addKeyframes(value2) {
      this.keyframes.add(value2);
    }
    getKeyframes() {
      return Array.from(this.keyframes);
    }
  };

  // ../tailwindcss/src/utils/default-map.ts
  var DefaultMap = class extends Map {
    constructor(factory) {
      super();
      this.factory = factory;
    }
    get(key) {
      let value2 = super.get(key);
      if (value2 === void 0) {
        value2 = this.factory(key, this);
        this.set(key, value2);
      }
      return value2;
    }
  };

  // ../tailwindcss/src/value-parser.ts
  function word(value2) {
    return {
      kind: "word",
      value: value2,
    };
  }
  function fun(value2, nodes) {
    return {
      kind: "function",
      value: value2,
      nodes,
    };
  }
  function separator(value2) {
    return {
      kind: "separator",
      value: value2,
    };
  }
  function walk(ast, visit, parent = null) {
    for (let i = 0; i < ast.length; i++) {
      let node = ast[i];
      let replacedNode = false;
      let replacedNodeOffset = 0;
      let status =
        visit(node, {
          parent,
          replaceWith(newNode) {
            if (replacedNode) return;
            replacedNode = true;
            if (Array.isArray(newNode)) {
              if (newNode.length === 0) {
                ast.splice(i, 1);
                replacedNodeOffset = 0;
              } else if (newNode.length === 1) {
                ast[i] = newNode[0];
                replacedNodeOffset = 1;
              } else {
                ast.splice(i, 1, ...newNode);
                replacedNodeOffset = newNode.length;
              }
            } else {
              ast[i] = newNode;
            }
          },
        }) ?? 0; /* Continue */
      if (replacedNode) {
        if (status === 0 /* Continue */) {
          i--;
        } else {
          i += replacedNodeOffset - 1;
        }
        continue;
      }
      if (status === 2 /* Stop */) return 2 /* Stop */;
      if (status === 1 /* Skip */) continue;
      if (node.kind === "function") {
        if (walk(node.nodes, visit, node) === 2 /* Stop */) {
          return 2 /* Stop */;
        }
      }
    }
  }
  function toCss(ast) {
    let css2 = "";
    for (const node of ast) {
      switch (node.kind) {
        case "word":
        case "separator": {
          css2 += node.value;
          break;
        }
        case "function": {
          css2 += node.value + "(" + toCss(node.nodes) + ")";
        }
      }
    }
    return css2;
  }
  var BACKSLASH2 = 92;
  var CLOSE_PAREN2 = 41;
  var COLON2 = 58;
  var COMMA = 44;
  var DOUBLE_QUOTE2 = 34;
  var EQUALS = 61;
  var GREATER_THAN = 62;
  var LESS_THAN = 60;
  var NEWLINE = 10;
  var OPEN_PAREN2 = 40;
  var SINGLE_QUOTE2 = 39;
  var SLASH2 = 47;
  var SPACE2 = 32;
  var TAB2 = 9;
  function parse2(input) {
    input = input.replaceAll("\r\n", "\n");
    let ast = [];
    let stack = [];
    let parent = null;
    let buffer = "";
    let peekChar;
    for (let i = 0; i < input.length; i++) {
      let currentChar = input.charCodeAt(i);
      switch (currentChar) {
        // Current character is a `\` therefore the next character is escaped,
        // consume it together with the next character and continue.
        case BACKSLASH2: {
          buffer += input[i] + input[i + 1];
          i++;
          break;
        }
        // Space and commas are bundled into separators
        //
        // E.g.:
        //
        // ```css
        // foo(bar, baz)
        //        ^^
        // ```
        case COLON2:
        case COMMA:
        case EQUALS:
        case GREATER_THAN:
        case LESS_THAN:
        case NEWLINE:
        case SLASH2:
        case SPACE2:
        case TAB2: {
          if (buffer.length > 0) {
            let node2 = word(buffer);
            if (parent) {
              parent.nodes.push(node2);
            } else {
              ast.push(node2);
            }
            buffer = "";
          }
          let start = i;
          let end = i + 1;
          for (; end < input.length; end++) {
            peekChar = input.charCodeAt(end);
            if (
              peekChar !== COLON2 &&
              peekChar !== COMMA &&
              peekChar !== EQUALS &&
              peekChar !== GREATER_THAN &&
              peekChar !== LESS_THAN &&
              peekChar !== NEWLINE &&
              peekChar !== SLASH2 &&
              peekChar !== SPACE2 &&
              peekChar !== TAB2
            ) {
              break;
            }
          }
          i = end - 1;
          let node = separator(input.slice(start, end));
          if (parent) {
            parent.nodes.push(node);
          } else {
            ast.push(node);
          }
          break;
        }
        // Start of a string.
        case SINGLE_QUOTE2:
        case DOUBLE_QUOTE2: {
          let start = i;
          for (let j = i + 1; j < input.length; j++) {
            peekChar = input.charCodeAt(j);
            if (peekChar === BACKSLASH2) {
              j += 1;
            } else if (peekChar === currentChar) {
              i = j;
              break;
            }
          }
          buffer += input.slice(start, i + 1);
          break;
        }
        // Start of a function call.
        //
        // E.g.:
        //
        // ```css
        // foo(bar, baz)
        //    ^
        // ```
        case OPEN_PAREN2: {
          let node = fun(buffer, []);
          buffer = "";
          if (parent) {
            parent.nodes.push(node);
          } else {
            ast.push(node);
          }
          stack.push(node);
          parent = node;
          break;
        }
        // End of a function call.
        //
        // E.g.:
        //
        // ```css
        // foo(bar, baz)
        //             ^
        // ```
        case CLOSE_PAREN2: {
          let tail = stack.pop();
          if (buffer.length > 0) {
            let node = word(buffer);
            tail.nodes.push(node);
            buffer = "";
          }
          if (stack.length > 0) {
            parent = stack[stack.length - 1];
          } else {
            parent = null;
          }
          break;
        }
        // Everything else will be collected in the buffer
        default: {
          buffer += String.fromCharCode(currentChar);
        }
      }
    }
    if (buffer.length > 0) {
      ast.push(word(buffer));
    }
    return ast;
  }

  // ../tailwindcss/src/utils/variables.ts
  function extractUsedVariables(raw) {
    let variables = [];
    walk(parse2(raw), (node) => {
      if (node.kind !== "function" || node.value !== "var") return;
      walk(node.nodes, (child) => {
        if (child.kind !== "word" || child.value[0] !== "-" || child.value[1] !== "-") return;
        variables.push(child.value);
      });
      return 1 /* Skip */;
    });
    return variables;
  }

  // ../tailwindcss/src/ast.ts
  var AT_SIGN2 = 64;
  function styleRule(selector2, nodes = []) {
    return {
      kind: "rule",
      selector: selector2,
      nodes,
    };
  }
  function atRule(name, params = "", nodes = []) {
    return {
      kind: "at-rule",
      name,
      params,
      nodes,
    };
  }
  function rule(selector2, nodes = []) {
    if (selector2.charCodeAt(0) === AT_SIGN2) {
      return parseAtRule(selector2, nodes);
    }
    return styleRule(selector2, nodes);
  }
  function decl(property2, value2, important = false) {
    return {
      kind: "declaration",
      property: property2,
      value: value2,
      important,
    };
  }
  function comment(value2) {
    return {
      kind: "comment",
      value: value2,
    };
  }
  function context(context2, nodes) {
    return {
      kind: "context",
      context: context2,
      nodes,
    };
  }
  function atRoot(nodes) {
    return {
      kind: "at-root",
      nodes,
    };
  }
  function walk2(ast, visit, path = [], context2 = {}) {
    for (let i = 0; i < ast.length; i++) {
      let node = ast[i];
      let parent = path[path.length - 1] ?? null;
      if (node.kind === "context") {
        if (walk2(node.nodes, visit, path, { ...context2, ...node.context }) === 2 /* Stop */) {
          return 2 /* Stop */;
        }
        continue;
      }
      path.push(node);
      let replacedNode = false;
      let replacedNodeOffset = 0;
      let status =
        visit(node, {
          parent,
          context: context2,
          path,
          replaceWith(newNode) {
            if (replacedNode) return;
            replacedNode = true;
            if (Array.isArray(newNode)) {
              if (newNode.length === 0) {
                ast.splice(i, 1);
                replacedNodeOffset = 0;
              } else if (newNode.length === 1) {
                ast[i] = newNode[0];
                replacedNodeOffset = 1;
              } else {
                ast.splice(i, 1, ...newNode);
                replacedNodeOffset = newNode.length;
              }
            } else {
              ast[i] = newNode;
              replacedNodeOffset = 1;
            }
          },
        }) ?? 0; /* Continue */
      path.pop();
      if (replacedNode) {
        if (status === 0 /* Continue */) {
          i--;
        } else {
          i += replacedNodeOffset - 1;
        }
        continue;
      }
      if (status === 2 /* Stop */) return 2 /* Stop */;
      if (status === 1 /* Skip */) continue;
      if ("nodes" in node) {
        path.push(node);
        let result = walk2(node.nodes, visit, path, context2);
        path.pop();
        if (result === 2 /* Stop */) {
          return 2 /* Stop */;
        }
      }
    }
  }
  function walkDepth(ast, visit, path = [], context2 = {}) {
    for (let i = 0; i < ast.length; i++) {
      let node = ast[i];
      let parent = path[path.length - 1] ?? null;
      if (node.kind === "rule" || node.kind === "at-rule") {
        path.push(node);
        walkDepth(node.nodes, visit, path, context2);
        path.pop();
      } else if (node.kind === "context") {
        walkDepth(node.nodes, visit, path, { ...context2, ...node.context });
        continue;
      }
      path.push(node);
      visit(node, {
        parent,
        context: context2,
        path,
        replaceWith(newNode) {
          if (Array.isArray(newNode)) {
            if (newNode.length === 0) {
              ast.splice(i, 1);
            } else if (newNode.length === 1) {
              ast[i] = newNode[0];
            } else {
              ast.splice(i, 1, ...newNode);
            }
          } else {
            ast[i] = newNode;
          }
          i += newNode.length - 1;
        },
      });
      path.pop();
    }
  }
  function optimizeAst(ast, designSystem, polyfills = 3 /* All */) {
    let atRoots = [];
    let seenAtProperties = /* @__PURE__ */ new Set();
    let cssThemeVariables = new DefaultMap(() => /* @__PURE__ */ new Set());
    let colorMixDeclarations = new DefaultMap(() => /* @__PURE__ */ new Set());
    let keyframes = /* @__PURE__ */ new Set();
    let usedKeyframeNames = /* @__PURE__ */ new Set();
    let propertyFallbacksRoot = [];
    let propertyFallbacksUniversal = [];
    let variableDependencies = new DefaultMap(() => /* @__PURE__ */ new Set());
    function transform(node, parent, context2 = {}, depth = 0) {
      if (node.kind === "declaration") {
        if (node.property === "--tw-sort" || node.value === void 0 || node.value === null) {
          return;
        }
        if (context2.theme && node.property[0] === "-" && node.property[1] === "-") {
          if (node.value === "initial") {
            node.value = void 0;
            return;
          }
          if (!context2.keyframes) {
            cssThemeVariables.get(parent).add(node);
          }
        }
        if (node.value.includes("var(")) {
          if (context2.theme && node.property[0] === "-" && node.property[1] === "-") {
            for (let variable of extractUsedVariables(node.value)) {
              variableDependencies.get(variable).add(node.property);
            }
          } else {
            designSystem.trackUsedVariables(node.value);
          }
        }
        if (node.property === "animation") {
          for (let keyframeName of extractKeyframeNames(node.value)) usedKeyframeNames.add(keyframeName);
        }
        if (polyfills & 2 /* ColorMix */ && node.value.includes("color-mix(")) {
          colorMixDeclarations.get(parent).add(node);
        }
        parent.push(node);
      } else if (node.kind === "rule") {
        if (node.selector === "&") {
          for (let child of node.nodes) {
            let nodes = [];
            transform(child, nodes, context2, depth + 1);
            if (nodes.length > 0) {
              parent.push(...nodes);
            }
          }
        } else {
          let copy = { ...node, nodes: [] };
          for (let child of node.nodes) {
            transform(child, copy.nodes, context2, depth + 1);
          }
          if (copy.nodes.length > 0) {
            parent.push(copy);
          }
        }
      } else if (node.kind === "at-rule" && node.name === "@property" && depth === 0) {
        if (seenAtProperties.has(node.params)) {
          return;
        }
        if (polyfills & 1 /* AtProperty */) {
          let property2 = node.params;
          let initialValue = null;
          let inherits = false;
          for (let prop of node.nodes) {
            if (prop.kind !== "declaration") continue;
            if (prop.property === "initial-value") {
              initialValue = prop.value;
            } else if (prop.property === "inherits") {
              inherits = prop.value === "true";
            }
          }
          let fallback = decl(property2, initialValue ?? "initial");
          fallback.src = node.src;
          if (inherits) {
            propertyFallbacksRoot.push(fallback);
          } else {
            propertyFallbacksUniversal.push(fallback);
          }
        }
        seenAtProperties.add(node.params);
        let copy = { ...node, nodes: [] };
        for (let child of node.nodes) {
          transform(child, copy.nodes, context2, depth + 1);
        }
        parent.push(copy);
      } else if (node.kind === "at-rule") {
        if (node.name === "@keyframes") {
          context2 = { ...context2, keyframes: true };
        }
        let copy = { ...node, nodes: [] };
        for (let child of node.nodes) {
          transform(child, copy.nodes, context2, depth + 1);
        }
        if (node.name === "@keyframes" && context2.theme) {
          keyframes.add(copy);
        }
        if (
          copy.nodes.length > 0 ||
          copy.name === "@layer" ||
          copy.name === "@charset" ||
          copy.name === "@custom-media" ||
          copy.name === "@namespace" ||
          copy.name === "@import"
        ) {
          parent.push(copy);
        }
      } else if (node.kind === "at-root") {
        for (let child of node.nodes) {
          let newParent = [];
          transform(child, newParent, context2, 0);
          for (let child2 of newParent) {
            atRoots.push(child2);
          }
        }
      } else if (node.kind === "context") {
        if (node.context.reference) {
          return;
        } else {
          for (let child of node.nodes) {
            transform(child, parent, { ...context2, ...node.context }, depth);
          }
        }
      } else if (node.kind === "comment") {
        parent.push(node);
      } else {
        node;
      }
    }
    let newAst = [];
    for (let node of ast) {
      transform(node, newAst, {}, 0);
    }
    next: for (let [parent, declarations] of cssThemeVariables) {
      for (let declaration of declarations) {
        let variableUsed = isVariableUsed(declaration.property, designSystem.theme, variableDependencies);
        if (variableUsed) {
          if (declaration.property.startsWith(designSystem.theme.prefixKey("--animate-"))) {
            for (let keyframeName of extractKeyframeNames(declaration.value)) usedKeyframeNames.add(keyframeName);
          }
          continue;
        }
        let idx = parent.indexOf(declaration);
        parent.splice(idx, 1);
        if (parent.length === 0) {
          let path = findNode(newAst, (node) => node.kind === "rule" && node.nodes === parent);
          if (!path || path.length === 0) continue next;
          path.unshift({
            kind: "at-root",
            nodes: newAst,
          });
          do {
            let nodeToRemove = path.pop();
            if (!nodeToRemove) break;
            let removeFrom = path[path.length - 1];
            if (!removeFrom) break;
            if (removeFrom.kind !== "at-root" && removeFrom.kind !== "at-rule") break;
            let idx2 = removeFrom.nodes.indexOf(nodeToRemove);
            if (idx2 === -1) break;
            removeFrom.nodes.splice(idx2, 1);
          } while (true);
          continue next;
        }
      }
    }
    for (let keyframe of keyframes) {
      if (!usedKeyframeNames.has(keyframe.params)) {
        let idx = atRoots.indexOf(keyframe);
        atRoots.splice(idx, 1);
      }
    }
    newAst = newAst.concat(atRoots);
    if (polyfills & 2 /* ColorMix */) {
      for (let [parent, declarations] of colorMixDeclarations) {
        for (let declaration of declarations) {
          let idx = parent.indexOf(declaration);
          if (idx === -1 || declaration.value == null) continue;
          let ast2 = parse2(declaration.value);
          let requiresPolyfill = false;
          walk(ast2, (node, { replaceWith }) => {
            if (node.kind !== "function" || node.value !== "color-mix") return;
            let containsUnresolvableVars = false;
            let containsCurrentcolor = false;
            walk(node.nodes, (node2, { replaceWith: replaceWith2 }) => {
              if (node2.kind == "word" && node2.value.toLowerCase() === "currentcolor") {
                containsCurrentcolor = true;
                requiresPolyfill = true;
                return;
              }
              let varNode = node2;
              let inlinedColor = null;
              let seenVariables = /* @__PURE__ */ new Set();
              do {
                if (varNode.kind !== "function" || varNode.value !== "var") return;
                let firstChild = varNode.nodes[0];
                if (!firstChild || firstChild.kind !== "word") return;
                let variableName = firstChild.value;
                if (seenVariables.has(variableName)) {
                  containsUnresolvableVars = true;
                  return;
                }
                seenVariables.add(variableName);
                requiresPolyfill = true;
                inlinedColor = designSystem.theme.resolveValue(null, [firstChild.value]);
                if (!inlinedColor) {
                  containsUnresolvableVars = true;
                  return;
                }
                if (inlinedColor.toLowerCase() === "currentcolor") {
                  containsCurrentcolor = true;
                  return;
                }
                if (inlinedColor.startsWith("var(")) {
                  let subAst = parse2(inlinedColor);
                  varNode = subAst[0];
                } else {
                  varNode = null;
                }
              } while (varNode);
              replaceWith2({ kind: "word", value: inlinedColor });
            });
            if (containsUnresolvableVars || containsCurrentcolor) {
              let separatorIndex = node.nodes.findIndex(
                (node2) => node2.kind === "separator" && node2.value.trim().includes(",")
              );
              if (separatorIndex === -1) return;
              let firstColorValue = node.nodes.length > separatorIndex ? node.nodes[separatorIndex + 1] : null;
              if (!firstColorValue) return;
              replaceWith(firstColorValue);
            } else if (requiresPolyfill) {
              let colorspace = node.nodes[2];
              if (
                colorspace.kind === "word" &&
                (colorspace.value === "oklab" ||
                  colorspace.value === "oklch" ||
                  colorspace.value === "lab" ||
                  colorspace.value === "lch")
              ) {
                colorspace.value = "srgb";
              }
            }
          });
          if (!requiresPolyfill) continue;
          let fallback = {
            ...declaration,
            value: toCss(ast2),
          };
          let colorMixQuery = rule("@supports (color: color-mix(in lab, red, red))", [declaration]);
          colorMixQuery.src = declaration.src;
          parent.splice(idx, 1, fallback, colorMixQuery);
        }
      }
    }
    if (polyfills & 1 /* AtProperty */) {
      let fallbackAst = [];
      if (propertyFallbacksRoot.length > 0) {
        let wrapper = rule(":root, :host", propertyFallbacksRoot);
        wrapper.src = propertyFallbacksRoot[0].src;
        fallbackAst.push(wrapper);
      }
      if (propertyFallbacksUniversal.length > 0) {
        let wrapper = rule("*, ::before, ::after, ::backdrop", propertyFallbacksUniversal);
        wrapper.src = propertyFallbacksUniversal[0].src;
        fallbackAst.push(wrapper);
      }
      if (fallbackAst.length > 0) {
        let firstValidNodeIndex = newAst.findIndex((node) => {
          if (node.kind === "comment") return false;
          if (node.kind === "at-rule") {
            if (node.name === "@charset") return false;
            if (node.name === "@import") return false;
          }
          return true;
        });
        let layerPropertiesStatement = atRule("@layer", "properties", []);
        layerPropertiesStatement.src = fallbackAst[0].src;
        newAst.splice(firstValidNodeIndex < 0 ? newAst.length : firstValidNodeIndex, 0, layerPropertiesStatement);
        let block = rule("@layer properties", [
          atRule(
            "@supports",
            // We can't write a supports query for `@property` directly so we have to test for
            // features that are added around the same time in Mozilla and Safari.
            "((-webkit-hyphens: none) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color:rgb(from red r g b))))",
            fallbackAst
          ),
        ]);
        block.src = fallbackAst[0].src;
        block.nodes[0].src = fallbackAst[0].src;
        newAst.push(block);
      }
    }
    return newAst;
  }
  function toCss2(ast, track) {
    let pos = 0;
    let source = {
      file: null,
      code: "",
    };
    function stringify(node, depth = 0) {
      let css3 = "";
      let indent = "  ".repeat(depth);
      if (node.kind === "declaration") {
        css3 += `${indent}${node.property}: ${node.value}${node.important ? " !important" : ""};
`;
        if (track) {
          pos += indent.length;
          let start = pos;
          pos += node.property.length;
          pos += 2;
          pos += node.value?.length ?? 0;
          if (node.important) {
            pos += 11;
          }
          let end = pos;
          pos += 2;
          node.dst = [source, start, end];
        }
      } else if (node.kind === "rule") {
        css3 += `${indent}${node.selector} {
`;
        if (track) {
          pos += indent.length;
          let start = pos;
          pos += node.selector.length;
          pos += 1;
          let end = pos;
          node.dst = [source, start, end];
          pos += 2;
        }
        for (let child of node.nodes) {
          css3 += stringify(child, depth + 1);
        }
        css3 += `${indent}}
`;
        if (track) {
          pos += indent.length;
          pos += 2;
        }
      } else if (node.kind === "at-rule") {
        if (node.nodes.length === 0) {
          let css4 = `${indent}${node.name} ${node.params};
`;
          if (track) {
            pos += indent.length;
            let start = pos;
            pos += node.name.length;
            pos += 1;
            pos += node.params.length;
            let end = pos;
            pos += 2;
            node.dst = [source, start, end];
          }
          return css4;
        }
        css3 += `${indent}${node.name}${node.params ? ` ${node.params} ` : " "}{
`;
        if (track) {
          pos += indent.length;
          let start = pos;
          pos += node.name.length;
          if (node.params) {
            pos += 1;
            pos += node.params.length;
          }
          pos += 1;
          let end = pos;
          node.dst = [source, start, end];
          pos += 2;
        }
        for (let child of node.nodes) {
          css3 += stringify(child, depth + 1);
        }
        css3 += `${indent}}
`;
        if (track) {
          pos += indent.length;
          pos += 2;
        }
      } else if (node.kind === "comment") {
        css3 += `${indent}/*${node.value}*/
`;
        if (track) {
          pos += indent.length;
          let start = pos;
          pos += 2 + node.value.length + 2;
          let end = pos;
          node.dst = [source, start, end];
          pos += 1;
        }
      } else if (node.kind === "context" || node.kind === "at-root") {
        return "";
      } else {
        node;
      }
      return css3;
    }
    let css2 = "";
    for (let node of ast) {
      css2 += stringify(node, 0);
    }
    source.code = css2;
    return css2;
  }
  function findNode(ast, fn) {
    let foundPath = [];
    walk2(ast, (node, { path }) => {
      if (fn(node)) {
        foundPath = [...path];
        return 2 /* Stop */;
      }
    });
    return foundPath;
  }
  function isVariableUsed(variable, theme2, variableDependencies, alreadySeenVariables = /* @__PURE__ */ new Set()) {
    if (alreadySeenVariables.has(variable)) {
      return true;
    } else {
      alreadySeenVariables.add(variable);
    }
    let options = theme2.getOptions(variable);
    if (options & (8 /* STATIC */ | 16) /* USED */) {
      return true;
    } else {
      let dependencies = variableDependencies.get(variable) ?? [];
      for (let dependency of dependencies) {
        if (isVariableUsed(dependency, theme2, variableDependencies, alreadySeenVariables)) {
          return true;
        }
      }
    }
    return false;
  }
  function extractKeyframeNames(value2) {
    return value2.split(/[\s,]+/);
  }

  // ../tailwindcss/src/utils/math-operators.ts
  var MATH_FUNCTIONS = [
    "calc",
    "min",
    "max",
    "clamp",
    "mod",
    "rem",
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "atan2",
    "pow",
    "sqrt",
    "hypot",
    "log",
    "exp",
    "round",
  ];
  var KNOWN_DASHED_FUNCTIONS = ["anchor-size"];
  var DASHED_FUNCTIONS_REGEX = new RegExp(`(${KNOWN_DASHED_FUNCTIONS.join("|")})\\(`, "g");
  function hasMathFn(input) {
    return input.indexOf("(") !== -1 && MATH_FUNCTIONS.some((fn) => input.includes(`${fn}(`));
  }
  function addWhitespaceAroundMathOperators(input) {
    if (!MATH_FUNCTIONS.some((fn) => input.includes(fn))) {
      return input;
    }
    let hasKnownFunctions = false;
    if (KNOWN_DASHED_FUNCTIONS.some((fn) => input.includes(fn))) {
      DASHED_FUNCTIONS_REGEX.lastIndex = 0;
      input = input.replace(DASHED_FUNCTIONS_REGEX, (_, fn) => {
        hasKnownFunctions = true;
        return `$${KNOWN_DASHED_FUNCTIONS.indexOf(fn)}$(`;
      });
    }
    let result = "";
    let formattable = [];
    for (let i = 0; i < input.length; i++) {
      let char = input[i];
      if (char === "(") {
        result += char;
        let start = i;
        for (let j = i - 1; j >= 0; j--) {
          let inner = input.charCodeAt(j);
          if (inner >= 48 && inner <= 57) {
            start = j;
          } else if (inner >= 97 && inner <= 122) {
            start = j;
          } else {
            break;
          }
        }
        let fn = input.slice(start, i);
        if (MATH_FUNCTIONS.includes(fn)) {
          formattable.unshift(true);
          continue;
        } else if (formattable[0] && fn === "") {
          formattable.unshift(true);
          continue;
        }
        formattable.unshift(false);
        continue;
      } else if (char === ")") {
        result += char;
        formattable.shift();
      } else if (char === "," && formattable[0]) {
        result += `, `;
        continue;
      } else if (char === " " && formattable[0] && result[result.length - 1] === " ") {
        continue;
      } else if ((char === "+" || char === "*" || char === "/" || char === "-") && formattable[0]) {
        let trimmed = result.trimEnd();
        let prev = trimmed[trimmed.length - 1];
        if (prev === "+" || prev === "*" || prev === "/" || prev === "-") {
          result += char;
          continue;
        } else if (prev === "(" || prev === ",") {
          result += char;
          continue;
        } else if (input[i - 1] === " ") {
          result += `${char} `;
        } else {
          result += ` ${char} `;
        }
      } else if (formattable[0] && input.startsWith("to-zero", i)) {
        let start = i;
        i += 7;
        result += input.slice(start, i + 1);
      } else {
        result += char;
      }
    }
    if (hasKnownFunctions) {
      return result.replace(/\$(\d+)\$/g, (fn, idx) => KNOWN_DASHED_FUNCTIONS[idx] ?? fn);
    }
    return result;
  }

  // ../tailwindcss/src/utils/decode-arbitrary-value.ts
  function decodeArbitraryValue(input) {
    if (input.indexOf("(") === -1) {
      return convertUnderscoresToWhitespace(input);
    }
    let ast = parse2(input);
    recursivelyDecodeArbitraryValues(ast);
    input = toCss(ast);
    input = addWhitespaceAroundMathOperators(input);
    return input;
  }
  function convertUnderscoresToWhitespace(input, skipUnderscoreToSpace = false) {
    let output = "";
    for (let i = 0; i < input.length; i++) {
      let char = input[i];
      if (char === "\\" && input[i + 1] === "_") {
        output += "_";
        i += 1;
      } else if (char === "_" && !skipUnderscoreToSpace) {
        output += " ";
      } else {
        output += char;
      }
    }
    return output;
  }
  function recursivelyDecodeArbitraryValues(ast) {
    for (let node of ast) {
      switch (node.kind) {
        case "function": {
          if (node.value === "url" || node.value.endsWith("_url")) {
            node.value = convertUnderscoresToWhitespace(node.value);
            break;
          }
          if (
            node.value === "var" ||
            node.value.endsWith("_var") ||
            node.value === "theme" ||
            node.value.endsWith("_theme")
          ) {
            node.value = convertUnderscoresToWhitespace(node.value);
            for (let i = 0; i < node.nodes.length; i++) {
              if (i == 0 && node.nodes[i].kind === "word") {
                node.nodes[i].value = convertUnderscoresToWhitespace(node.nodes[i].value, true);
                continue;
              }
              recursivelyDecodeArbitraryValues([node.nodes[i]]);
            }
            break;
          }
          node.value = convertUnderscoresToWhitespace(node.value);
          recursivelyDecodeArbitraryValues(node.nodes);
          break;
        }
        case "separator":
        case "word": {
          node.value = convertUnderscoresToWhitespace(node.value);
          break;
        }
        default:
          never(node);
      }
    }
  }
  function never(value2) {
    throw new Error(`Unexpected value: ${value2}`);
  }

  // ../tailwindcss/src/utils/is-valid-arbitrary.ts
  var BACKSLASH3 = 92;
  var OPEN_CURLY2 = 123;
  var CLOSE_CURLY2 = 125;
  var OPEN_PAREN3 = 40;
  var CLOSE_PAREN3 = 41;
  var OPEN_BRACKET2 = 91;
  var CLOSE_BRACKET2 = 93;
  var DOUBLE_QUOTE3 = 34;
  var SINGLE_QUOTE3 = 39;
  var SEMICOLON2 = 59;
  var closingBracketStack = new Uint8Array(256);
  function isValidArbitrary(input) {
    let stackPos = 0;
    let len = input.length;
    for (let idx = 0; idx < len; idx++) {
      let char = input.charCodeAt(idx);
      switch (char) {
        case BACKSLASH3:
          idx += 1;
          break;
        // Strings should be handled as-is until the end of the string. No need to
        // worry about balancing parens, brackets, or curlies inside a string.
        case SINGLE_QUOTE3:
        case DOUBLE_QUOTE3:
          while (++idx < len) {
            let nextChar = input.charCodeAt(idx);
            if (nextChar === BACKSLASH3) {
              idx += 1;
              continue;
            }
            if (nextChar === char) {
              break;
            }
          }
          break;
        case OPEN_PAREN3:
          closingBracketStack[stackPos] = CLOSE_PAREN3;
          stackPos++;
          break;
        case OPEN_BRACKET2:
          closingBracketStack[stackPos] = CLOSE_BRACKET2;
          stackPos++;
          break;
        case OPEN_CURLY2:
          break;
        case CLOSE_BRACKET2:
        case CLOSE_CURLY2:
        case CLOSE_PAREN3:
          if (stackPos === 0) return false;
          if (stackPos > 0 && char === closingBracketStack[stackPos - 1]) {
            stackPos--;
          }
          break;
        case SEMICOLON2:
          if (stackPos === 0) return false;
          break;
      }
    }
    return true;
  }

  // ../tailwindcss/src/utils/segment.ts
  var BACKSLASH4 = 92;
  var OPEN_CURLY3 = 123;
  var CLOSE_CURLY3 = 125;
  var OPEN_PAREN4 = 40;
  var CLOSE_PAREN4 = 41;
  var OPEN_BRACKET3 = 91;
  var CLOSE_BRACKET3 = 93;
  var DOUBLE_QUOTE4 = 34;
  var SINGLE_QUOTE4 = 39;
  var closingBracketStack2 = new Uint8Array(256);
  function segment(input, separator3) {
    let stackPos = 0;
    let parts = [];
    let lastPos = 0;
    let len = input.length;
    let separatorCode = separator3.charCodeAt(0);
    for (let idx = 0; idx < len; idx++) {
      let char = input.charCodeAt(idx);
      if (stackPos === 0 && char === separatorCode) {
        parts.push(input.slice(lastPos, idx));
        lastPos = idx + 1;
        continue;
      }
      switch (char) {
        case BACKSLASH4:
          idx += 1;
          break;
        // Strings should be handled as-is until the end of the string. No need to
        // worry about balancing parens, brackets, or curlies inside a string.
        case SINGLE_QUOTE4:
        case DOUBLE_QUOTE4:
          while (++idx < len) {
            let nextChar = input.charCodeAt(idx);
            if (nextChar === BACKSLASH4) {
              idx += 1;
              continue;
            }
            if (nextChar === char) {
              break;
            }
          }
          break;
        case OPEN_PAREN4:
          closingBracketStack2[stackPos] = CLOSE_PAREN4;
          stackPos++;
          break;
        case OPEN_BRACKET3:
          closingBracketStack2[stackPos] = CLOSE_BRACKET3;
          stackPos++;
          break;
        case OPEN_CURLY3:
          closingBracketStack2[stackPos] = CLOSE_CURLY3;
          stackPos++;
          break;
        case CLOSE_BRACKET3:
        case CLOSE_CURLY3:
        case CLOSE_PAREN4:
          if (stackPos > 0 && char === closingBracketStack2[stackPos - 1]) {
            stackPos--;
          }
          break;
      }
    }
    parts.push(input.slice(lastPos));
    return parts;
  }

  // ../tailwindcss/src/candidate.ts
  var COLON3 = 58;
  var DASH2 = 45;
  var LOWER_A = 97;
  var LOWER_Z = 122;
  function* parseCandidate(input, designSystem) {
    let rawVariants = segment(input, ":");
    if (designSystem.theme.prefix) {
      if (rawVariants.length === 1) return null;
      if (rawVariants[0] !== designSystem.theme.prefix) return null;
      rawVariants.shift();
    }
    let base = rawVariants.pop();
    let parsedCandidateVariants = [];
    for (let i = rawVariants.length - 1; i >= 0; --i) {
      let parsedVariant = designSystem.parseVariant(rawVariants[i]);
      if (parsedVariant === null) return;
      parsedCandidateVariants.push(parsedVariant);
    }
    let important = false;
    if (base[base.length - 1] === "!") {
      important = true;
      base = base.slice(0, -1);
    } else if (base[0] === "!") {
      important = true;
      base = base.slice(1);
    }
    if (designSystem.utilities.has(base, "static") && !base.includes("[")) {
      yield {
        kind: "static",
        root: base,
        variants: parsedCandidateVariants,
        important,
        raw: input,
      };
    }
    let [baseWithoutModifier, modifierSegment = null, additionalModifier] = segment(base, "/");
    if (additionalModifier) return;
    let parsedModifier = modifierSegment === null ? null : parseModifier(modifierSegment);
    if (modifierSegment !== null && parsedModifier === null) return;
    if (baseWithoutModifier[0] === "[") {
      if (baseWithoutModifier[baseWithoutModifier.length - 1] !== "]") return;
      let charCode = baseWithoutModifier.charCodeAt(1);
      if (charCode !== DASH2 && !(charCode >= LOWER_A && charCode <= LOWER_Z)) {
        return;
      }
      baseWithoutModifier = baseWithoutModifier.slice(1, -1);
      let idx = baseWithoutModifier.indexOf(":");
      if (idx === -1 || idx === 0 || idx === baseWithoutModifier.length - 1) return;
      let property2 = baseWithoutModifier.slice(0, idx);
      let value2 = decodeArbitraryValue(baseWithoutModifier.slice(idx + 1));
      if (!isValidArbitrary(value2)) return;
      yield {
        kind: "arbitrary",
        property: property2,
        value: value2,
        modifier: parsedModifier,
        variants: parsedCandidateVariants,
        important,
        raw: input,
      };
      return;
    }
    let roots;
    if (baseWithoutModifier[baseWithoutModifier.length - 1] === "]") {
      let idx = baseWithoutModifier.indexOf("-[");
      if (idx === -1) return;
      let root = baseWithoutModifier.slice(0, idx);
      if (!designSystem.utilities.has(root, "functional")) return;
      let value2 = baseWithoutModifier.slice(idx + 1);
      roots = [[root, value2]];
    } else if (baseWithoutModifier[baseWithoutModifier.length - 1] === ")") {
      let idx = baseWithoutModifier.indexOf("-(");
      if (idx === -1) return;
      let root = baseWithoutModifier.slice(0, idx);
      if (!designSystem.utilities.has(root, "functional")) return;
      let value2 = baseWithoutModifier.slice(idx + 2, -1);
      let parts = segment(value2, ":");
      let dataType = null;
      if (parts.length === 2) {
        dataType = parts[0];
        value2 = parts[1];
      }
      if (value2[0] !== "-" || value2[1] !== "-") return;
      if (!isValidArbitrary(value2)) return;
      roots = [[root, dataType === null ? `[var(${value2})]` : `[${dataType}:var(${value2})]`]];
    } else {
      roots = findRoots(baseWithoutModifier, (root) => {
        return designSystem.utilities.has(root, "functional");
      });
    }
    for (let [root, value2] of roots) {
      let candidate = {
        kind: "functional",
        root,
        modifier: parsedModifier,
        value: null,
        variants: parsedCandidateVariants,
        important,
        raw: input,
      };
      if (value2 === null) {
        yield candidate;
        continue;
      }
      {
        let startArbitraryIdx = value2.indexOf("[");
        let valueIsArbitrary = startArbitraryIdx !== -1;
        if (valueIsArbitrary) {
          if (value2[value2.length - 1] !== "]") return;
          let arbitraryValue = decodeArbitraryValue(value2.slice(startArbitraryIdx + 1, -1));
          if (!isValidArbitrary(arbitraryValue)) continue;
          let typehint = "";
          for (let i = 0; i < arbitraryValue.length; i++) {
            let code = arbitraryValue.charCodeAt(i);
            if (code === COLON3) {
              typehint = arbitraryValue.slice(0, i);
              arbitraryValue = arbitraryValue.slice(i + 1);
              break;
            }
            if (code === DASH2 || (code >= LOWER_A && code <= LOWER_Z)) {
              continue;
            }
            break;
          }
          if (arbitraryValue.length === 0 || arbitraryValue.trim().length === 0) {
            continue;
          }
          candidate.value = {
            kind: "arbitrary",
            dataType: typehint || null,
            value: arbitraryValue,
          };
        } else {
          let fraction =
            modifierSegment === null || candidate.modifier?.kind === "arbitrary"
              ? null
              : `${value2}/${modifierSegment}`;
          candidate.value = {
            kind: "named",
            value: value2,
            fraction,
          };
        }
      }
      yield candidate;
    }
  }
  function parseModifier(modifier) {
    if (modifier[0] === "[" && modifier[modifier.length - 1] === "]") {
      let arbitraryValue = decodeArbitraryValue(modifier.slice(1, -1));
      if (!isValidArbitrary(arbitraryValue)) return null;
      if (arbitraryValue.length === 0 || arbitraryValue.trim().length === 0) return null;
      return {
        kind: "arbitrary",
        value: arbitraryValue,
      };
    }
    if (modifier[0] === "(" && modifier[modifier.length - 1] === ")") {
      modifier = modifier.slice(1, -1);
      if (modifier[0] !== "-" || modifier[1] !== "-") return null;
      if (!isValidArbitrary(modifier)) return null;
      modifier = `var(${modifier})`;
      let arbitraryValue = decodeArbitraryValue(modifier);
      return {
        kind: "arbitrary",
        value: arbitraryValue,
      };
    }
    return {
      kind: "named",
      value: modifier,
    };
  }
  function parseVariant(variant, designSystem) {
    if (variant[0] === "[" && variant[variant.length - 1] === "]") {
      if (variant[1] === "@" && variant.includes("&")) return null;
      let selector2 = decodeArbitraryValue(variant.slice(1, -1));
      if (!isValidArbitrary(selector2)) return null;
      if (selector2.length === 0 || selector2.trim().length === 0) return null;
      let relative = selector2[0] === ">" || selector2[0] === "+" || selector2[0] === "~";
      if (!relative && selector2[0] !== "@" && !selector2.includes("&")) {
        selector2 = `&:is(${selector2})`;
      }
      return {
        kind: "arbitrary",
        selector: selector2,
        relative,
      };
    }
    {
      let [variantWithoutModifier, modifier = null, additionalModifier] = segment(variant, "/");
      if (additionalModifier) return null;
      let roots = findRoots(variantWithoutModifier, (root) => {
        return designSystem.variants.has(root);
      });
      for (let [root, value2] of roots) {
        switch (designSystem.variants.kind(root)) {
          case "static": {
            if (value2 !== null) return null;
            if (modifier !== null) return null;
            return {
              kind: "static",
              root,
            };
          }
          case "functional": {
            let parsedModifier = modifier === null ? null : parseModifier(modifier);
            if (modifier !== null && parsedModifier === null) return null;
            if (value2 === null) {
              return {
                kind: "functional",
                root,
                modifier: parsedModifier,
                value: null,
              };
            }
            if (value2[value2.length - 1] === "]") {
              if (value2[0] !== "[") continue;
              let arbitraryValue = decodeArbitraryValue(value2.slice(1, -1));
              if (!isValidArbitrary(arbitraryValue)) return null;
              if (arbitraryValue.length === 0 || arbitraryValue.trim().length === 0) return null;
              return {
                kind: "functional",
                root,
                modifier: parsedModifier,
                value: {
                  kind: "arbitrary",
                  value: arbitraryValue,
                },
              };
            }
            if (value2[value2.length - 1] === ")") {
              if (value2[0] !== "(") continue;
              let arbitraryValue = decodeArbitraryValue(value2.slice(1, -1));
              if (!isValidArbitrary(arbitraryValue)) return null;
              if (arbitraryValue.length === 0 || arbitraryValue.trim().length === 0) return null;
              if (arbitraryValue[0] !== "-" || arbitraryValue[1] !== "-") return null;
              return {
                kind: "functional",
                root,
                modifier: parsedModifier,
                value: {
                  kind: "arbitrary",
                  value: `var(${arbitraryValue})`,
                },
              };
            }
            return {
              kind: "functional",
              root,
              modifier: parsedModifier,
              value: { kind: "named", value: value2 },
            };
          }
          case "compound": {
            if (value2 === null) return null;
            let subVariant = designSystem.parseVariant(value2);
            if (subVariant === null) return null;
            if (!designSystem.variants.compoundsWith(root, subVariant)) return null;
            let parsedModifier = modifier === null ? null : parseModifier(modifier);
            if (modifier !== null && parsedModifier === null) return null;
            return {
              kind: "compound",
              root,
              modifier: parsedModifier,
              variant: subVariant,
            };
          }
        }
      }
    }
    return null;
  }
  function* findRoots(input, exists) {
    if (exists(input)) {
      yield [input, null];
    }
    let idx = input.lastIndexOf("-");
    while (idx > 0) {
      let maybeRoot = input.slice(0, idx);
      if (exists(maybeRoot)) {
        let root = [maybeRoot, input.slice(idx + 1)];
        if (root[1] === "") break;
        yield root;
      }
      idx = input.lastIndexOf("-", idx - 1);
    }
    if (input[0] === "@" && exists("@")) {
      yield ["@", input.slice(1)];
    }
  }
  function printCandidate(designSystem, candidate) {
    let parts = [];
    for (let variant of candidate.variants) {
      parts.unshift(printVariant(variant));
    }
    if (designSystem.theme.prefix) {
      parts.unshift(designSystem.theme.prefix);
    }
    let base = "";
    if (candidate.kind === "static") {
      base += candidate.root;
    }
    if (candidate.kind === "functional") {
      base += candidate.root;
      if (candidate.value) {
        if (candidate.value.kind === "arbitrary") {
          if (candidate.value !== null) {
            let isVarValue = isVar(candidate.value.value);
            let value2 = isVarValue ? candidate.value.value.slice(4, -1) : candidate.value.value;
            let [open, close] = isVarValue ? ["(", ")"] : ["[", "]"];
            if (candidate.value.dataType) {
              base += `-${open}${candidate.value.dataType}:${printArbitraryValue(value2)}${close}`;
            } else {
              base += `-${open}${printArbitraryValue(value2)}${close}`;
            }
          }
        } else if (candidate.value.kind === "named") {
          base += `-${candidate.value.value}`;
        }
      }
    }
    if (candidate.kind === "arbitrary") {
      base += `[${candidate.property}:${printArbitraryValue(candidate.value)}]`;
    }
    if (candidate.kind === "arbitrary" || candidate.kind === "functional") {
      base += printModifier(candidate.modifier);
    }
    if (candidate.important) {
      base += "!";
    }
    parts.push(base);
    return parts.join(":");
  }
  function printModifier(modifier) {
    if (modifier === null) return "";
    let isVarValue = isVar(modifier.value);
    let value2 = isVarValue ? modifier.value.slice(4, -1) : modifier.value;
    let [open, close] = isVarValue ? ["(", ")"] : ["[", "]"];
    if (modifier.kind === "arbitrary") {
      return `/${open}${printArbitraryValue(value2)}${close}`;
    } else if (modifier.kind === "named") {
      return `/${modifier.value}`;
    } else {
      modifier;
      return "";
    }
  }
  function printVariant(variant) {
    if (variant.kind === "static") {
      return variant.root;
    }
    if (variant.kind === "arbitrary") {
      return `[${printArbitraryValue(simplifyArbitraryVariant(variant.selector))}]`;
    }
    let base = "";
    if (variant.kind === "functional") {
      base += variant.root;
      let hasDash = variant.root !== "@";
      if (variant.value) {
        if (variant.value.kind === "arbitrary") {
          let isVarValue = isVar(variant.value.value);
          let value2 = isVarValue ? variant.value.value.slice(4, -1) : variant.value.value;
          let [open, close] = isVarValue ? ["(", ")"] : ["[", "]"];
          base += `${hasDash ? "-" : ""}${open}${printArbitraryValue(value2)}${close}`;
        } else if (variant.value.kind === "named") {
          base += `${hasDash ? "-" : ""}${variant.value.value}`;
        }
      }
    }
    if (variant.kind === "compound") {
      base += variant.root;
      base += "-";
      base += printVariant(variant.variant);
    }
    if (variant.kind === "functional" || variant.kind === "compound") {
      base += printModifier(variant.modifier);
    }
    return base;
  }
  var printArbitraryValueCache = new DefaultMap((input) => {
    let ast = parse2(input);
    let drop = /* @__PURE__ */ new Set();
    walk(ast, (node, { parent }) => {
      let parentArray = parent === null ? ast : parent.nodes ?? [];
      if (
        node.kind === "word" && // Operators
        (node.value === "+" || node.value === "-" || node.value === "*" || node.value === "/")
      ) {
        let idx = parentArray.indexOf(node) ?? -1;
        if (idx === -1) return;
        let previous = parentArray[idx - 1];
        if (previous?.kind !== "separator" || previous.value !== " ") return;
        let next = parentArray[idx + 1];
        if (next?.kind !== "separator" || next.value !== " ") return;
        drop.add(previous);
        drop.add(next);
      } else if (node.kind === "separator" && node.value.trim() === "/") {
        node.value = "/";
      } else if (node.kind === "separator" && node.value.length > 0 && node.value.trim() === "") {
        if (parentArray[0] === node || parentArray[parentArray.length - 1] === node) {
          drop.add(node);
        }
      } else if (node.kind === "separator" && node.value.trim() === ",") {
        node.value = ",";
      }
    });
    if (drop.size > 0) {
      walk(ast, (node, { replaceWith }) => {
        if (drop.has(node)) {
          drop.delete(node);
          replaceWith([]);
        }
      });
    }
    recursivelyEscapeUnderscores(ast);
    return toCss(ast);
  });
  function printArbitraryValue(input) {
    return printArbitraryValueCache.get(input);
  }
  var simplifyArbitraryVariantCache = new DefaultMap((input) => {
    let ast = parse2(input);
    if (
      ast.length === 3 && // &
      ast[0].kind === "word" &&
      ast[0].value === "&" && // :
      ast[1].kind === "separator" &&
      ast[1].value === ":" && // is(…)
      ast[2].kind === "function" &&
      ast[2].value === "is"
    ) {
      return toCss(ast[2].nodes);
    }
    return input;
  });
  function simplifyArbitraryVariant(input) {
    return simplifyArbitraryVariantCache.get(input);
  }
  function recursivelyEscapeUnderscores(ast) {
    for (let node of ast) {
      switch (node.kind) {
        case "function": {
          if (node.value === "url" || node.value.endsWith("_url")) {
            node.value = escapeUnderscore(node.value);
            break;
          }
          if (
            node.value === "var" ||
            node.value.endsWith("_var") ||
            node.value === "theme" ||
            node.value.endsWith("_theme")
          ) {
            node.value = escapeUnderscore(node.value);
            for (let i = 0; i < node.nodes.length; i++) {
              recursivelyEscapeUnderscores([node.nodes[i]]);
            }
            break;
          }
          node.value = escapeUnderscore(node.value);
          recursivelyEscapeUnderscores(node.nodes);
          break;
        }
        case "separator":
          node.value = escapeUnderscore(node.value);
          break;
        case "word": {
          if (node.value[0] !== "-" || node.value[1] !== "-") {
            node.value = escapeUnderscore(node.value);
          }
          break;
        }
        default:
          never2(node);
      }
    }
  }
  var isVarCache = new DefaultMap((value2) => {
    let ast = parse2(value2);
    return ast.length === 1 && ast[0].kind === "function" && ast[0].value === "var";
  });
  function isVar(value2) {
    return isVarCache.get(value2);
  }
  function never2(value2) {
    throw new Error(`Unexpected value: ${value2}`);
  }
  function escapeUnderscore(value2) {
    return value2.replaceAll("_", String.raw`\_`).replaceAll(" ", "_");
  }

  // ../tailwindcss/src/utils/compare-breakpoints.ts
  function compareBreakpoints(a, z, direction) {
    if (a === z) return 0;
    let aIsCssFunction = a.indexOf("(");
    let zIsCssFunction = z.indexOf("(");
    let aBucket =
      aIsCssFunction === -1
        ? // No CSS function found, bucket by unit instead
          a.replace(/[\d.]+/g, "")
        : // CSS function found, bucket by function name
          a.slice(0, aIsCssFunction);
    let zBucket =
      zIsCssFunction === -1
        ? // No CSS function found, bucket by unit
          z.replace(/[\d.]+/g, "")
        : // CSS function found, bucket by function name
          z.slice(0, zIsCssFunction);
    let order =
      // Compare by bucket name
      (aBucket === zBucket ? 0 : aBucket < zBucket ? -1 : 1) || // If bucket names are the same, compare by value
      (direction === "asc" ? parseInt(a) - parseInt(z) : parseInt(z) - parseInt(a));
    if (Number.isNaN(order)) {
      return a < z ? -1 : 1;
    }
    return order;
  }

  // ../tailwindcss/src/utils/is-color.ts
  var HASH = 35;
  var NAMED_COLORS = /* @__PURE__ */ new Set([
    // CSS Level 1 colors
    "black",
    "silver",
    "gray",
    "white",
    "maroon",
    "red",
    "purple",
    "fuchsia",
    "green",
    "lime",
    "olive",
    "yellow",
    "navy",
    "blue",
    "teal",
    "aqua",
    // CSS Level 2/3 colors
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "green",
    "greenyellow",
    "grey",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "rebeccapurple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen",
    // Keywords
    "transparent",
    "currentcolor",
    // System colors
    "canvas",
    "canvastext",
    "linktext",
    "visitedtext",
    "activetext",
    "buttonface",
    "buttontext",
    "buttonborder",
    "field",
    "fieldtext",
    "highlight",
    "highlighttext",
    "selecteditem",
    "selecteditemtext",
    "mark",
    "marktext",
    "graytext",
    "accentcolor",
    "accentcolortext",
  ]);
  var IS_COLOR_FN = /^(rgba?|hsla?|hwb|color|(ok)?(lab|lch)|light-dark|color-mix)\(/i;
  function isColor(value2) {
    return value2.charCodeAt(0) === HASH || IS_COLOR_FN.test(value2) || NAMED_COLORS.has(value2.toLowerCase());
  }

  // ../tailwindcss/src/utils/infer-data-type.ts
  var checks = {
    color: isColor,
    length: isLength,
    percentage: isPercentage,
    ratio: isFraction,
    number: isNumber,
    integer: isPositiveInteger,
    url: isUrl,
    position: isBackgroundPosition,
    "bg-size": isBackgroundSize,
    "line-width": isLineWidth,
    image: isImage,
    "family-name": isFamilyName,
    "generic-name": isGenericName,
    "absolute-size": isAbsoluteSize,
    "relative-size": isRelativeSize,
    angle: isAngle,
    vector: isVector,
  };
  function inferDataType(value2, types) {
    if (value2.startsWith("var(")) return null;
    for (let type of types) {
      if (checks[type]?.(value2)) {
        return type;
      }
    }
    return null;
  }
  var IS_URL = /^url\(.*\)$/;
  function isUrl(value2) {
    return IS_URL.test(value2);
  }
  function isLineWidth(value2) {
    return segment(value2, " ").every(
      (value3) => isLength(value3) || isNumber(value3) || value3 === "thin" || value3 === "medium" || value3 === "thick"
    );
  }
  var IS_IMAGE_FN = /^(?:element|image|cross-fade|image-set)\(/;
  var IS_GRADIENT_FN = /^(repeating-)?(conic|linear|radial)-gradient\(/;
  function isImage(value2) {
    let count = 0;
    for (let part of segment(value2, ",")) {
      if (part.startsWith("var(")) continue;
      if (isUrl(part)) {
        count += 1;
        continue;
      }
      if (IS_GRADIENT_FN.test(part)) {
        count += 1;
        continue;
      }
      if (IS_IMAGE_FN.test(part)) {
        count += 1;
        continue;
      }
      return false;
    }
    return count > 0;
  }
  function isGenericName(value2) {
    return (
      value2 === "serif" ||
      value2 === "sans-serif" ||
      value2 === "monospace" ||
      value2 === "cursive" ||
      value2 === "fantasy" ||
      value2 === "system-ui" ||
      value2 === "ui-serif" ||
      value2 === "ui-sans-serif" ||
      value2 === "ui-monospace" ||
      value2 === "ui-rounded" ||
      value2 === "math" ||
      value2 === "emoji" ||
      value2 === "fangsong"
    );
  }
  function isFamilyName(value2) {
    let count = 0;
    for (let part of segment(value2, ",")) {
      let char = part.charCodeAt(0);
      if (char >= 48 && char <= 57) return false;
      if (part.startsWith("var(")) continue;
      count += 1;
    }
    return count > 0;
  }
  function isAbsoluteSize(value2) {
    return (
      value2 === "xx-small" ||
      value2 === "x-small" ||
      value2 === "small" ||
      value2 === "medium" ||
      value2 === "large" ||
      value2 === "x-large" ||
      value2 === "xx-large" ||
      value2 === "xxx-large"
    );
  }
  function isRelativeSize(value2) {
    return value2 === "larger" || value2 === "smaller";
  }
  var HAS_NUMBER = /[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/;
  var IS_NUMBER = new RegExp(`^${HAS_NUMBER.source}$`);
  function isNumber(value2) {
    return IS_NUMBER.test(value2) || hasMathFn(value2);
  }
  var IS_PERCENTAGE = new RegExp(`^${HAS_NUMBER.source}%$`);
  function isPercentage(value2) {
    return IS_PERCENTAGE.test(value2) || hasMathFn(value2);
  }
  var IS_FRACTION = new RegExp(`^${HAS_NUMBER.source}s*/s*${HAS_NUMBER.source}$`);
  function isFraction(value2) {
    return IS_FRACTION.test(value2) || hasMathFn(value2);
  }
  var LENGTH_UNITS = [
    "cm",
    "mm",
    "Q",
    "in",
    "pc",
    "pt",
    "px",
    "em",
    "ex",
    "ch",
    "rem",
    "lh",
    "rlh",
    "vw",
    "vh",
    "vmin",
    "vmax",
    "vb",
    "vi",
    "svw",
    "svh",
    "lvw",
    "lvh",
    "dvw",
    "dvh",
    "cqw",
    "cqh",
    "cqi",
    "cqb",
    "cqmin",
    "cqmax",
  ];
  var IS_LENGTH = new RegExp(`^${HAS_NUMBER.source}(${LENGTH_UNITS.join("|")})$`);
  function isLength(value2) {
    return IS_LENGTH.test(value2) || hasMathFn(value2);
  }
  function isBackgroundPosition(value2) {
    let count = 0;
    for (let part of segment(value2, " ")) {
      if (part === "center" || part === "top" || part === "right" || part === "bottom" || part === "left") {
        count += 1;
        continue;
      }
      if (part.startsWith("var(")) continue;
      if (isLength(part) || isPercentage(part)) {
        count += 1;
        continue;
      }
      return false;
    }
    return count > 0;
  }
  function isBackgroundSize(value2) {
    let count = 0;
    for (let size of segment(value2, ",")) {
      if (size === "cover" || size === "contain") {
        count += 1;
        continue;
      }
      let values = segment(size, " ");
      if (values.length !== 1 && values.length !== 2) {
        return false;
      }
      if (values.every((value3) => value3 === "auto" || isLength(value3) || isPercentage(value3))) {
        count += 1;
        continue;
      }
    }
    return count > 0;
  }
  var ANGLE_UNITS = ["deg", "rad", "grad", "turn"];
  var IS_ANGLE = new RegExp(`^${HAS_NUMBER.source}(${ANGLE_UNITS.join("|")})$`);
  function isAngle(value2) {
    return IS_ANGLE.test(value2);
  }
  var IS_VECTOR = new RegExp(`^${HAS_NUMBER.source} +${HAS_NUMBER.source} +${HAS_NUMBER.source}$`);
  function isVector(value2) {
    return IS_VECTOR.test(value2);
  }
  function isPositiveInteger(value2) {
    let num = Number(value2);
    return Number.isInteger(num) && num >= 0 && String(num) === String(value2);
  }
  function isStrictPositiveInteger(value2) {
    let num = Number(value2);
    return Number.isInteger(num) && num > 0 && String(num) === String(value2);
  }
  function isValidSpacingMultiplier(value2) {
    return isMultipleOf(value2, 0.25);
  }
  function isValidOpacityValue(value2) {
    return isMultipleOf(value2, 0.25);
  }
  function isMultipleOf(value2, divisor) {
    let num = Number(value2);
    return num >= 0 && num % divisor === 0 && String(num) === String(value2);
  }

  // ../tailwindcss/src/utils/replace-shadow-colors.ts
  var KEYWORDS = /* @__PURE__ */ new Set(["inset", "inherit", "initial", "revert", "unset"]);
  var LENGTH = /^-?(\d+|\.\d+)(.*?)$/g;
  function replaceShadowColors(input, replacement) {
    let shadows = segment(input, ",").map((shadow) => {
      shadow = shadow.trim();
      let parts = segment(shadow, " ").filter((part) => part.trim() !== "");
      let color = null;
      let offsetX = null;
      let offsetY = null;
      for (let part of parts) {
        if (KEYWORDS.has(part)) {
          continue;
        } else if (LENGTH.test(part)) {
          if (offsetX === null) {
            offsetX = part;
          } else if (offsetY === null) {
            offsetY = part;
          }
          LENGTH.lastIndex = 0;
        } else if (color === null) {
          color = part;
        }
      }
      if (offsetX === null || offsetY === null) return shadow;
      let replacementColor = replacement(color ?? "currentcolor");
      if (color !== null) {
        return shadow.replace(color, replacementColor);
      }
      return `${shadow} ${replacementColor}`;
    });
    return shadows.join(", ");
  }

  // ../tailwindcss/src/utilities.ts
  var IS_VALID_STATIC_UTILITY_NAME = /^-?[a-z][a-zA-Z0-9/%._-]*$/;
  var IS_VALID_FUNCTIONAL_UTILITY_NAME = /^-?[a-z][a-zA-Z0-9/%._-]*-\*$/;
  var DEFAULT_SPACING_SUGGESTIONS = [
    "0",
    "0.5",
    "1",
    "1.5",
    "2",
    "2.5",
    "3",
    "3.5",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "14",
    "16",
    "20",
    "24",
    "28",
    "32",
    "36",
    "40",
    "44",
    "48",
    "52",
    "56",
    "60",
    "64",
    "72",
    "80",
    "96",
  ];
  var Utilities = class {
    utilities = new DefaultMap(() => []);
    completions = /* @__PURE__ */ new Map();
    static(name, compileFn) {
      this.utilities.get(name).push({ kind: "static", compileFn });
    }
    functional(name, compileFn, options) {
      this.utilities.get(name).push({ kind: "functional", compileFn, options });
    }
    has(name, kind) {
      return this.utilities.has(name) && this.utilities.get(name).some((fn) => fn.kind === kind);
    }
    get(name) {
      return this.utilities.has(name) ? this.utilities.get(name) : [];
    }
    getCompletions(name) {
      return this.completions.get(name)?.() ?? [];
    }
    suggest(name, groups) {
      this.completions.set(name, groups);
    }
    keys(kind) {
      let keys = [];
      for (let [key, fns] of this.utilities.entries()) {
        for (let fn of fns) {
          if (fn.kind === kind) {
            keys.push(key);
            break;
          }
        }
      }
      return keys;
    }
  };
  function property(ident, initialValue, syntax) {
    return atRule("@property", ident, [
      decl("syntax", syntax ? `"${syntax}"` : `"*"`),
      decl("inherits", "false"),
      // If there's no initial value, it's important that we omit it rather than
      // use an empty value. Safari currently doesn't support an empty
      // `initial-value` properly, so we have to design how we use things around
      // the guaranteed invalid value instead, which is how `initial-value`
      // behaves when omitted.
      ...(initialValue ? [decl("initial-value", initialValue)] : []),
    ]);
  }
  function withAlpha(value2, alpha2) {
    if (alpha2 === null) return value2;
    let alphaAsNumber = Number(alpha2);
    if (!Number.isNaN(alphaAsNumber)) {
      alpha2 = `${alphaAsNumber * 100}%`;
    }
    if (alpha2 === "100%") {
      return value2;
    }
    return `color-mix(in oklab, ${value2} ${alpha2}, transparent)`;
  }
  function replaceAlpha(value2, alpha2) {
    let alphaAsNumber = Number(alpha2);
    if (!Number.isNaN(alphaAsNumber)) {
      alpha2 = `${alphaAsNumber * 100}%`;
    }
    return `oklab(from ${value2} l a b / ${alpha2})`;
  }
  function asColor(value2, modifier, theme2) {
    if (!modifier) return value2;
    if (modifier.kind === "arbitrary") {
      return withAlpha(value2, modifier.value);
    }
    let alpha2 = theme2.resolve(modifier.value, ["--opacity"]);
    if (alpha2) {
      return withAlpha(value2, alpha2);
    }
    if (!isValidOpacityValue(modifier.value)) {
      return null;
    }
    return withAlpha(value2, `${modifier.value}%`);
  }
  function resolveThemeColor(candidate, theme2, themeKeys) {
    if (false) {
      if (!candidate.value) {
        throw new Error("resolveThemeColor must be called with a named candidate");
      }
      if (candidate.value.kind !== "named") {
        throw new Error("resolveThemeColor must be called with a named value");
      }
    }
    let value2 = null;
    switch (candidate.value.value) {
      case "inherit": {
        value2 = "inherit";
        break;
      }
      case "transparent": {
        value2 = "transparent";
        break;
      }
      case "current": {
        value2 = "currentcolor";
        break;
      }
      default: {
        value2 = theme2.resolve(candidate.value.value, themeKeys);
        break;
      }
    }
    return value2 ? asColor(value2, candidate.modifier, theme2) : null;
  }
  var LEGACY_NUMERIC_KEY = /(\d+)_(\d+)/g;
  function createUtilities(theme2) {
    let utilities = new Utilities();
    function suggest(classRoot, defns) {
      function* resolve(themeKeys) {
        for (let value2 of theme2.keysInNamespaces(themeKeys)) {
          yield value2.replace(LEGACY_NUMERIC_KEY, (_, a, b) => {
            return `${a}.${b}`;
          });
        }
      }
      let suggestedFractions = [
        "1/2",
        "1/3",
        "2/3",
        "1/4",
        "2/4",
        "3/4",
        "1/5",
        "2/5",
        "3/5",
        "4/5",
        "1/6",
        "2/6",
        "3/6",
        "4/6",
        "5/6",
        "1/12",
        "2/12",
        "3/12",
        "4/12",
        "5/12",
        "6/12",
        "7/12",
        "8/12",
        "9/12",
        "10/12",
        "11/12",
      ];
      utilities.suggest(classRoot, () => {
        let groups = [];
        for (let defn of defns()) {
          if (typeof defn === "string") {
            groups.push({ values: [defn], modifiers: [] });
            continue;
          }
          let values = [...(defn.values ?? []), ...resolve(defn.valueThemeKeys ?? [])];
          let modifiers = [...(defn.modifiers ?? []), ...resolve(defn.modifierThemeKeys ?? [])];
          if (defn.supportsFractions) {
            values.push(...suggestedFractions);
          }
          if (defn.hasDefaultValue) {
            values.unshift(null);
          }
          groups.push({
            supportsNegative: defn.supportsNegative,
            values,
            modifiers,
          });
        }
        return groups;
      });
    }
    function staticUtility(className, declarations) {
      utilities.static(className, () => {
        return declarations.map((node) => {
          return typeof node === "function" ? node() : decl(node[0], node[1]);
        });
      });
    }
    function functionalUtility(classRoot, desc) {
      function handleFunctionalUtility({ negative }) {
        return (candidate) => {
          let value2 = null;
          let dataType = null;
          if (!candidate.value) {
            if (candidate.modifier) return;
            value2 = desc.defaultValue !== void 0 ? desc.defaultValue : theme2.resolve(null, desc.themeKeys ?? []);
          } else if (candidate.value.kind === "arbitrary") {
            if (candidate.modifier) return;
            value2 = candidate.value.value;
            dataType = candidate.value.dataType;
          } else {
            value2 = theme2.resolve(candidate.value.fraction ?? candidate.value.value, desc.themeKeys ?? []);
            if (value2 === null && desc.supportsFractions && candidate.value.fraction) {
              let [lhs, rhs] = segment(candidate.value.fraction, "/");
              if (!isPositiveInteger(lhs) || !isPositiveInteger(rhs)) return;
              value2 = `calc(${candidate.value.fraction} * 100%)`;
            }
            if (value2 === null && negative && desc.handleNegativeBareValue) {
              value2 = desc.handleNegativeBareValue(candidate.value);
              if (!value2?.includes("/") && candidate.modifier) return;
              if (value2 !== null) return desc.handle(value2, null);
            }
            if (value2 === null && desc.handleBareValue) {
              value2 = desc.handleBareValue(candidate.value);
              if (!value2?.includes("/") && candidate.modifier) return;
            }
          }
          if (value2 === null) return;
          return desc.handle(negative ? `calc(${value2} * -1)` : value2, dataType);
        };
      }
      if (desc.supportsNegative) {
        utilities.functional(`-${classRoot}`, handleFunctionalUtility({ negative: true }));
      }
      utilities.functional(classRoot, handleFunctionalUtility({ negative: false }));
      suggest(classRoot, () => [
        {
          supportsNegative: desc.supportsNegative,
          valueThemeKeys: desc.themeKeys ?? [],
          hasDefaultValue: desc.defaultValue !== void 0 && desc.defaultValue !== null,
          supportsFractions: desc.supportsFractions,
        },
      ]);
    }
    function colorUtility(classRoot, desc) {
      utilities.functional(classRoot, (candidate) => {
        if (!candidate.value) return;
        let value2 = null;
        if (candidate.value.kind === "arbitrary") {
          value2 = candidate.value.value;
          value2 = asColor(value2, candidate.modifier, theme2);
        } else {
          value2 = resolveThemeColor(candidate, theme2, desc.themeKeys);
        }
        if (value2 === null) return;
        return desc.handle(value2);
      });
      suggest(classRoot, () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: desc.themeKeys,
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
      ]);
    }
    function spacingUtility(name, themeKeys, handle, { supportsNegative = false, supportsFractions = false } = {}) {
      if (supportsNegative) {
        utilities.static(`-${name}-px`, () => handle("-1px"));
      }
      utilities.static(`${name}-px`, () => handle("1px"));
      functionalUtility(name, {
        themeKeys,
        supportsFractions,
        supportsNegative,
        defaultValue: null,
        handleBareValue: ({ value: value2 }) => {
          let multiplier = theme2.resolve(null, ["--spacing"]);
          if (!multiplier) return null;
          if (!isValidSpacingMultiplier(value2)) return null;
          return `calc(${multiplier} * ${value2})`;
        },
        handleNegativeBareValue: ({ value: value2 }) => {
          let multiplier = theme2.resolve(null, ["--spacing"]);
          if (!multiplier) return null;
          if (!isValidSpacingMultiplier(value2)) return null;
          return `calc(${multiplier} * -${value2})`;
        },
        handle,
      });
      suggest(name, () => [
        {
          values: theme2.get(["--spacing"]) ? DEFAULT_SPACING_SUGGESTIONS : [],
          supportsNegative,
          supportsFractions,
          valueThemeKeys: themeKeys,
        },
      ]);
    }
    staticUtility("sr-only", [
      ["position", "absolute"],
      ["width", "1px"],
      ["height", "1px"],
      ["padding", "0"],
      ["margin", "-1px"],
      ["overflow", "hidden"],
      ["clip", "rect(0, 0, 0, 0)"],
      ["white-space", "nowrap"],
      ["border-width", "0"],
    ]);
    staticUtility("not-sr-only", [
      ["position", "static"],
      ["width", "auto"],
      ["height", "auto"],
      ["padding", "0"],
      ["margin", "0"],
      ["overflow", "visible"],
      ["clip", "auto"],
      ["white-space", "normal"],
    ]);
    staticUtility("pointer-events-none", [["pointer-events", "none"]]);
    staticUtility("pointer-events-auto", [["pointer-events", "auto"]]);
    staticUtility("visible", [["visibility", "visible"]]);
    staticUtility("invisible", [["visibility", "hidden"]]);
    staticUtility("collapse", [["visibility", "collapse"]]);
    staticUtility("static", [["position", "static"]]);
    staticUtility("fixed", [["position", "fixed"]]);
    staticUtility("absolute", [["position", "absolute"]]);
    staticUtility("relative", [["position", "relative"]]);
    staticUtility("sticky", [["position", "sticky"]]);
    for (let [name, property2] of [
      ["inset", "inset"],
      ["inset-x", "inset-inline"],
      ["inset-y", "inset-block"],
      ["start", "inset-inline-start"],
      ["end", "inset-inline-end"],
      ["top", "top"],
      ["right", "right"],
      ["bottom", "bottom"],
      ["left", "left"],
    ]) {
      staticUtility(`${name}-auto`, [[property2, "auto"]]);
      staticUtility(`${name}-full`, [[property2, "100%"]]);
      staticUtility(`-${name}-full`, [[property2, "-100%"]]);
      spacingUtility(name, ["--inset", "--spacing"], (value2) => [decl(property2, value2)], {
        supportsNegative: true,
        supportsFractions: true,
      });
    }
    staticUtility("isolate", [["isolation", "isolate"]]);
    staticUtility("isolation-auto", [["isolation", "auto"]]);
    staticUtility("z-auto", [["z-index", "auto"]]);
    functionalUtility("z", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--z-index"],
      handle: (value2) => [decl("z-index", value2)],
    });
    suggest("z", () => [
      {
        supportsNegative: true,
        values: ["0", "10", "20", "30", "40", "50"],
        valueThemeKeys: ["--z-index"],
      },
    ]);
    staticUtility("order-first", [["order", "-9999"]]);
    staticUtility("order-last", [["order", "9999"]]);
    staticUtility("order-none", [["order", "0"]]);
    functionalUtility("order", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--order"],
      handle: (value2) => [decl("order", value2)],
    });
    suggest("order", () => [
      {
        supportsNegative: true,
        values: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--order"],
      },
    ]);
    staticUtility("col-auto", [["grid-column", "auto"]]);
    functionalUtility("col", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--grid-column"],
      handle: (value2) => [decl("grid-column", value2)],
    });
    staticUtility("col-span-full", [["grid-column", "1 / -1"]]);
    functionalUtility("col-span", {
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      handle: (value2) => [decl("grid-column", `span ${value2} / span ${value2}`)],
    });
    staticUtility("col-start-auto", [["grid-column-start", "auto"]]);
    functionalUtility("col-start", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--grid-column-start"],
      handle: (value2) => [decl("grid-column-start", value2)],
    });
    staticUtility("col-end-auto", [["grid-column-end", "auto"]]);
    functionalUtility("col-end", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--grid-column-end"],
      handle: (value2) => [decl("grid-column-end", value2)],
    });
    suggest("col-span", () => [
      {
        values: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
        valueThemeKeys: [],
      },
    ]);
    suggest("col-start", () => [
      {
        supportsNegative: true,
        values: Array.from({ length: 13 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--grid-column-start"],
      },
    ]);
    suggest("col-end", () => [
      {
        supportsNegative: true,
        values: Array.from({ length: 13 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--grid-column-end"],
      },
    ]);
    staticUtility("row-auto", [["grid-row", "auto"]]);
    functionalUtility("row", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--grid-row"],
      handle: (value2) => [decl("grid-row", value2)],
    });
    staticUtility("row-span-full", [["grid-row", "1 / -1"]]);
    functionalUtility("row-span", {
      themeKeys: [],
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      handle: (value2) => [decl("grid-row", `span ${value2} / span ${value2}`)],
    });
    staticUtility("row-start-auto", [["grid-row-start", "auto"]]);
    functionalUtility("row-start", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--grid-row-start"],
      handle: (value2) => [decl("grid-row-start", value2)],
    });
    staticUtility("row-end-auto", [["grid-row-end", "auto"]]);
    functionalUtility("row-end", {
      supportsNegative: true,
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      themeKeys: ["--grid-row-end"],
      handle: (value2) => [decl("grid-row-end", value2)],
    });
    suggest("row-span", () => [
      {
        values: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
        valueThemeKeys: [],
      },
    ]);
    suggest("row-start", () => [
      {
        supportsNegative: true,
        values: Array.from({ length: 13 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--grid-row-start"],
      },
    ]);
    suggest("row-end", () => [
      {
        supportsNegative: true,
        values: Array.from({ length: 13 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--grid-row-end"],
      },
    ]);
    staticUtility("float-start", [["float", "inline-start"]]);
    staticUtility("float-end", [["float", "inline-end"]]);
    staticUtility("float-right", [["float", "right"]]);
    staticUtility("float-left", [["float", "left"]]);
    staticUtility("float-none", [["float", "none"]]);
    staticUtility("clear-start", [["clear", "inline-start"]]);
    staticUtility("clear-end", [["clear", "inline-end"]]);
    staticUtility("clear-right", [["clear", "right"]]);
    staticUtility("clear-left", [["clear", "left"]]);
    staticUtility("clear-both", [["clear", "both"]]);
    staticUtility("clear-none", [["clear", "none"]]);
    for (let [namespace, property2] of [
      ["m", "margin"],
      ["mx", "margin-inline"],
      ["my", "margin-block"],
      ["ms", "margin-inline-start"],
      ["me", "margin-inline-end"],
      ["mt", "margin-top"],
      ["mr", "margin-right"],
      ["mb", "margin-bottom"],
      ["ml", "margin-left"],
    ]) {
      staticUtility(`${namespace}-auto`, [[property2, "auto"]]);
      spacingUtility(namespace, ["--margin", "--spacing"], (value2) => [decl(property2, value2)], {
        supportsNegative: true,
      });
    }
    staticUtility("box-border", [["box-sizing", "border-box"]]);
    staticUtility("box-content", [["box-sizing", "content-box"]]);
    staticUtility("line-clamp-none", [
      ["overflow", "visible"],
      ["display", "block"],
      ["-webkit-box-orient", "horizontal"],
      ["-webkit-line-clamp", "unset"],
    ]);
    functionalUtility("line-clamp", {
      themeKeys: ["--line-clamp"],
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      handle: (value2) => [
        decl("overflow", "hidden"),
        decl("display", "-webkit-box"),
        decl("-webkit-box-orient", "vertical"),
        decl("-webkit-line-clamp", value2),
      ],
    });
    suggest("line-clamp", () => [
      {
        values: ["1", "2", "3", "4", "5", "6"],
        valueThemeKeys: ["--line-clamp"],
      },
    ]);
    staticUtility("block", [["display", "block"]]);
    staticUtility("inline-block", [["display", "inline-block"]]);
    staticUtility("inline", [["display", "inline"]]);
    staticUtility("hidden", [["display", "none"]]);
    staticUtility("inline-flex", [["display", "inline-flex"]]);
    staticUtility("table", [["display", "table"]]);
    staticUtility("inline-table", [["display", "inline-table"]]);
    staticUtility("table-caption", [["display", "table-caption"]]);
    staticUtility("table-cell", [["display", "table-cell"]]);
    staticUtility("table-column", [["display", "table-column"]]);
    staticUtility("table-column-group", [["display", "table-column-group"]]);
    staticUtility("table-footer-group", [["display", "table-footer-group"]]);
    staticUtility("table-header-group", [["display", "table-header-group"]]);
    staticUtility("table-row-group", [["display", "table-row-group"]]);
    staticUtility("table-row", [["display", "table-row"]]);
    staticUtility("flow-root", [["display", "flow-root"]]);
    staticUtility("flex", [["display", "flex"]]);
    staticUtility("grid", [["display", "grid"]]);
    staticUtility("inline-grid", [["display", "inline-grid"]]);
    staticUtility("contents", [["display", "contents"]]);
    staticUtility("list-item", [["display", "list-item"]]);
    staticUtility("field-sizing-content", [["field-sizing", "content"]]);
    staticUtility("field-sizing-fixed", [["field-sizing", "fixed"]]);
    staticUtility("aspect-auto", [["aspect-ratio", "auto"]]);
    staticUtility("aspect-square", [["aspect-ratio", "1 / 1"]]);
    functionalUtility("aspect", {
      themeKeys: ["--aspect"],
      handleBareValue: ({ fraction }) => {
        if (fraction === null) return null;
        let [lhs, rhs] = segment(fraction, "/");
        if (!isPositiveInteger(lhs) || !isPositiveInteger(rhs)) return null;
        return fraction;
      },
      handle: (value2) => [decl("aspect-ratio", value2)],
    });
    for (let [key, value2] of [
      ["full", "100%"],
      ["svw", "100svw"],
      ["lvw", "100lvw"],
      ["dvw", "100dvw"],
      ["svh", "100svh"],
      ["lvh", "100lvh"],
      ["dvh", "100dvh"],
      ["min", "min-content"],
      ["max", "max-content"],
      ["fit", "fit-content"],
    ]) {
      staticUtility(`size-${key}`, [
        ["--tw-sort", "size"],
        ["width", value2],
        ["height", value2],
      ]);
      staticUtility(`w-${key}`, [["width", value2]]);
      staticUtility(`h-${key}`, [["height", value2]]);
      staticUtility(`min-w-${key}`, [["min-width", value2]]);
      staticUtility(`min-h-${key}`, [["min-height", value2]]);
      staticUtility(`max-w-${key}`, [["max-width", value2]]);
      staticUtility(`max-h-${key}`, [["max-height", value2]]);
    }
    staticUtility(`size-auto`, [
      ["--tw-sort", "size"],
      ["width", "auto"],
      ["height", "auto"],
    ]);
    staticUtility(`w-auto`, [["width", "auto"]]);
    staticUtility(`h-auto`, [["height", "auto"]]);
    staticUtility(`min-w-auto`, [["min-width", "auto"]]);
    staticUtility(`min-h-auto`, [["min-height", "auto"]]);
    staticUtility(`h-lh`, [["height", "1lh"]]);
    staticUtility(`min-h-lh`, [["min-height", "1lh"]]);
    staticUtility(`max-h-lh`, [["max-height", "1lh"]]);
    staticUtility(`w-screen`, [["width", "100vw"]]);
    staticUtility(`min-w-screen`, [["min-width", "100vw"]]);
    staticUtility(`max-w-screen`, [["max-width", "100vw"]]);
    staticUtility(`h-screen`, [["height", "100vh"]]);
    staticUtility(`min-h-screen`, [["min-height", "100vh"]]);
    staticUtility(`max-h-screen`, [["max-height", "100vh"]]);
    staticUtility(`max-w-none`, [["max-width", "none"]]);
    staticUtility(`max-h-none`, [["max-height", "none"]]);
    spacingUtility(
      "size",
      ["--size", "--spacing"],
      (value2) => [decl("--tw-sort", "size"), decl("width", value2), decl("height", value2)],
      {
        supportsFractions: true,
      }
    );
    for (let [name, namespaces, property2] of [
      ["w", ["--width", "--spacing", "--container"], "width"],
      ["min-w", ["--min-width", "--spacing", "--container"], "min-width"],
      ["max-w", ["--max-width", "--spacing", "--container"], "max-width"],
      ["h", ["--height", "--spacing"], "height"],
      ["min-h", ["--min-height", "--height", "--spacing"], "min-height"],
      ["max-h", ["--max-height", "--height", "--spacing"], "max-height"],
    ]) {
      spacingUtility(name, namespaces, (value2) => [decl(property2, value2)], {
        supportsFractions: true,
      });
    }
    utilities.static("container", () => {
      let breakpoints = [...theme2.namespace("--breakpoint").values()];
      breakpoints.sort((a, z) => compareBreakpoints(a, z, "asc"));
      let decls = [decl("--tw-sort", "--tw-container-component"), decl("width", "100%")];
      for (let breakpoint of breakpoints) {
        decls.push(atRule("@media", `(width >= ${breakpoint})`, [decl("max-width", breakpoint)]));
      }
      return decls;
    });
    staticUtility("flex-auto", [["flex", "auto"]]);
    staticUtility("flex-initial", [["flex", "0 auto"]]);
    staticUtility("flex-none", [["flex", "none"]]);
    utilities.functional("flex", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") {
        if (candidate.modifier) return;
        return [decl("flex", candidate.value.value)];
      }
      if (candidate.value.fraction) {
        let [lhs, rhs] = segment(candidate.value.fraction, "/");
        if (!isPositiveInteger(lhs) || !isPositiveInteger(rhs)) return;
        return [decl("flex", `calc(${candidate.value.fraction} * 100%)`)];
      }
      if (isPositiveInteger(candidate.value.value)) {
        if (candidate.modifier) return;
        return [decl("flex", candidate.value.value)];
      }
    });
    suggest("flex", () => [{ supportsFractions: true }]);
    functionalUtility("shrink", {
      defaultValue: "1",
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      handle: (value2) => [decl("flex-shrink", value2)],
    });
    functionalUtility("grow", {
      defaultValue: "1",
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      handle: (value2) => [decl("flex-grow", value2)],
    });
    suggest("shrink", () => [
      {
        values: ["0"],
        valueThemeKeys: [],
        hasDefaultValue: true,
      },
    ]);
    suggest("grow", () => [
      {
        values: ["0"],
        valueThemeKeys: [],
        hasDefaultValue: true,
      },
    ]);
    staticUtility("basis-auto", [["flex-basis", "auto"]]);
    staticUtility("basis-full", [["flex-basis", "100%"]]);
    spacingUtility("basis", ["--flex-basis", "--spacing", "--container"], (value2) => [decl("flex-basis", value2)], {
      supportsFractions: true,
    });
    staticUtility("table-auto", [["table-layout", "auto"]]);
    staticUtility("table-fixed", [["table-layout", "fixed"]]);
    staticUtility("caption-top", [["caption-side", "top"]]);
    staticUtility("caption-bottom", [["caption-side", "bottom"]]);
    staticUtility("border-collapse", [["border-collapse", "collapse"]]);
    staticUtility("border-separate", [["border-collapse", "separate"]]);
    let borderSpacingProperties = () =>
      atRoot([property("--tw-border-spacing-x", "0", "<length>"), property("--tw-border-spacing-y", "0", "<length>")]);
    spacingUtility("border-spacing", ["--border-spacing", "--spacing"], (value2) => [
      borderSpacingProperties(),
      decl("--tw-border-spacing-x", value2),
      decl("--tw-border-spacing-y", value2),
      decl("border-spacing", "var(--tw-border-spacing-x) var(--tw-border-spacing-y)"),
    ]);
    spacingUtility("border-spacing-x", ["--border-spacing", "--spacing"], (value2) => [
      borderSpacingProperties(),
      decl("--tw-border-spacing-x", value2),
      decl("border-spacing", "var(--tw-border-spacing-x) var(--tw-border-spacing-y)"),
    ]);
    spacingUtility("border-spacing-y", ["--border-spacing", "--spacing"], (value2) => [
      borderSpacingProperties(),
      decl("--tw-border-spacing-y", value2),
      decl("border-spacing", "var(--tw-border-spacing-x) var(--tw-border-spacing-y)"),
    ]);
    staticUtility("origin-center", [["transform-origin", "center"]]);
    staticUtility("origin-top", [["transform-origin", "top"]]);
    staticUtility("origin-top-right", [["transform-origin", "top right"]]);
    staticUtility("origin-right", [["transform-origin", "right"]]);
    staticUtility("origin-bottom-right", [["transform-origin", "bottom right"]]);
    staticUtility("origin-bottom", [["transform-origin", "bottom"]]);
    staticUtility("origin-bottom-left", [["transform-origin", "bottom left"]]);
    staticUtility("origin-left", [["transform-origin", "left"]]);
    staticUtility("origin-top-left", [["transform-origin", "top left"]]);
    functionalUtility("origin", {
      themeKeys: ["--transform-origin"],
      handle: (value2) => [decl("transform-origin", value2)],
    });
    staticUtility("perspective-origin-center", [["perspective-origin", "center"]]);
    staticUtility("perspective-origin-top", [["perspective-origin", "top"]]);
    staticUtility("perspective-origin-top-right", [["perspective-origin", "top right"]]);
    staticUtility("perspective-origin-right", [["perspective-origin", "right"]]);
    staticUtility("perspective-origin-bottom-right", [["perspective-origin", "bottom right"]]);
    staticUtility("perspective-origin-bottom", [["perspective-origin", "bottom"]]);
    staticUtility("perspective-origin-bottom-left", [["perspective-origin", "bottom left"]]);
    staticUtility("perspective-origin-left", [["perspective-origin", "left"]]);
    staticUtility("perspective-origin-top-left", [["perspective-origin", "top left"]]);
    functionalUtility("perspective-origin", {
      themeKeys: ["--perspective-origin"],
      handle: (value2) => [decl("perspective-origin", value2)],
    });
    staticUtility("perspective-none", [["perspective", "none"]]);
    functionalUtility("perspective", {
      themeKeys: ["--perspective"],
      handle: (value2) => [decl("perspective", value2)],
    });
    let translateProperties = () =>
      atRoot([property("--tw-translate-x", "0"), property("--tw-translate-y", "0"), property("--tw-translate-z", "0")]);
    staticUtility("translate-none", [["translate", "none"]]);
    staticUtility("-translate-full", [
      translateProperties,
      ["--tw-translate-x", "-100%"],
      ["--tw-translate-y", "-100%"],
      ["translate", "var(--tw-translate-x) var(--tw-translate-y)"],
    ]);
    staticUtility("translate-full", [
      translateProperties,
      ["--tw-translate-x", "100%"],
      ["--tw-translate-y", "100%"],
      ["translate", "var(--tw-translate-x) var(--tw-translate-y)"],
    ]);
    spacingUtility(
      "translate",
      ["--translate", "--spacing"],
      (value2) => [
        translateProperties(),
        decl("--tw-translate-x", value2),
        decl("--tw-translate-y", value2),
        decl("translate", "var(--tw-translate-x) var(--tw-translate-y)"),
      ],
      { supportsNegative: true, supportsFractions: true }
    );
    for (let axis of ["x", "y"]) {
      staticUtility(`-translate-${axis}-full`, [
        translateProperties,
        [`--tw-translate-${axis}`, "-100%"],
        ["translate", `var(--tw-translate-x) var(--tw-translate-y)`],
      ]);
      staticUtility(`translate-${axis}-full`, [
        translateProperties,
        [`--tw-translate-${axis}`, "100%"],
        ["translate", `var(--tw-translate-x) var(--tw-translate-y)`],
      ]);
      spacingUtility(
        `translate-${axis}`,
        ["--translate", "--spacing"],
        (value2) => [
          translateProperties(),
          decl(`--tw-translate-${axis}`, value2),
          decl("translate", `var(--tw-translate-x) var(--tw-translate-y)`),
        ],
        {
          supportsNegative: true,
          supportsFractions: true,
        }
      );
    }
    spacingUtility(
      `translate-z`,
      ["--translate", "--spacing"],
      (value2) => [
        translateProperties(),
        decl(`--tw-translate-z`, value2),
        decl("translate", "var(--tw-translate-x) var(--tw-translate-y) var(--tw-translate-z)"),
      ],
      {
        supportsNegative: true,
      }
    );
    staticUtility("translate-3d", [
      translateProperties,
      ["translate", "var(--tw-translate-x) var(--tw-translate-y) var(--tw-translate-z)"],
    ]);
    let scaleProperties = () =>
      atRoot([property("--tw-scale-x", "1"), property("--tw-scale-y", "1"), property("--tw-scale-z", "1")]);
    staticUtility("scale-none", [["scale", "none"]]);
    function handleScale({ negative }) {
      return (candidate) => {
        if (!candidate.value || candidate.modifier) return;
        let value2;
        if (candidate.value.kind === "arbitrary") {
          value2 = candidate.value.value;
          value2 = negative ? `calc(${value2} * -1)` : value2;
          return [decl("scale", value2)];
        } else {
          value2 = theme2.resolve(candidate.value.value, ["--scale"]);
          if (!value2 && isPositiveInteger(candidate.value.value)) {
            value2 = `${candidate.value.value}%`;
          }
          if (!value2) return;
        }
        value2 = negative ? `calc(${value2} * -1)` : value2;
        return [
          scaleProperties(),
          decl("--tw-scale-x", value2),
          decl("--tw-scale-y", value2),
          decl("--tw-scale-z", value2),
          decl("scale", `var(--tw-scale-x) var(--tw-scale-y)`),
        ];
      };
    }
    utilities.functional("-scale", handleScale({ negative: true }));
    utilities.functional("scale", handleScale({ negative: false }));
    suggest("scale", () => [
      {
        supportsNegative: true,
        values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"],
        valueThemeKeys: ["--scale"],
      },
    ]);
    for (let axis of ["x", "y", "z"]) {
      functionalUtility(`scale-${axis}`, {
        supportsNegative: true,
        themeKeys: ["--scale"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          scaleProperties(),
          decl(`--tw-scale-${axis}`, value2),
          decl("scale", `var(--tw-scale-x) var(--tw-scale-y)${axis === "z" ? " var(--tw-scale-z)" : ""}`),
        ],
      });
      suggest(`scale-${axis}`, () => [
        {
          supportsNegative: true,
          values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"],
          valueThemeKeys: ["--scale"],
        },
      ]);
    }
    staticUtility("scale-3d", [scaleProperties, ["scale", "var(--tw-scale-x) var(--tw-scale-y) var(--tw-scale-z)"]]);
    staticUtility("rotate-none", [["rotate", "none"]]);
    function handleRotate({ negative }) {
      return (candidate) => {
        if (!candidate.value || candidate.modifier) return;
        let value2;
        if (candidate.value.kind === "arbitrary") {
          value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["angle", "vector"]);
          if (type === "vector") {
            return [decl("rotate", `${value2} var(--tw-rotate)`)];
          } else if (type !== "angle") {
            return [decl("rotate", negative ? `calc(${value2} * -1)` : value2)];
          }
        } else {
          value2 = theme2.resolve(candidate.value.value, ["--rotate"]);
          if (!value2 && isPositiveInteger(candidate.value.value)) {
            value2 = `${candidate.value.value}deg`;
          }
          if (!value2) return;
        }
        return [decl("rotate", negative ? `calc(${value2} * -1)` : value2)];
      };
    }
    utilities.functional("-rotate", handleRotate({ negative: true }));
    utilities.functional("rotate", handleRotate({ negative: false }));
    suggest("rotate", () => [
      {
        supportsNegative: true,
        values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"],
        valueThemeKeys: ["--rotate"],
      },
    ]);
    {
      let transformValue = [
        "var(--tw-rotate-x,)",
        "var(--tw-rotate-y,)",
        "var(--tw-rotate-z,)",
        "var(--tw-skew-x,)",
        "var(--tw-skew-y,)",
      ].join(" ");
      let transformProperties = () =>
        atRoot([
          property("--tw-rotate-x"),
          property("--tw-rotate-y"),
          property("--tw-rotate-z"),
          property("--tw-skew-x"),
          property("--tw-skew-y"),
        ]);
      for (let axis of ["x", "y", "z"]) {
        functionalUtility(`rotate-${axis}`, {
          supportsNegative: true,
          themeKeys: ["--rotate"],
          handleBareValue: ({ value: value2 }) => {
            if (!isPositiveInteger(value2)) return null;
            return `${value2}deg`;
          },
          handle: (value2) => [
            transformProperties(),
            decl(`--tw-rotate-${axis}`, `rotate${axis.toUpperCase()}(${value2})`),
            decl("transform", transformValue),
          ],
        });
        suggest(`rotate-${axis}`, () => [
          {
            supportsNegative: true,
            values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"],
            valueThemeKeys: ["--rotate"],
          },
        ]);
      }
      functionalUtility("skew", {
        supportsNegative: true,
        themeKeys: ["--skew"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}deg`;
        },
        handle: (value2) => [
          transformProperties(),
          decl("--tw-skew-x", `skewX(${value2})`),
          decl("--tw-skew-y", `skewY(${value2})`),
          decl("transform", transformValue),
        ],
      });
      functionalUtility("skew-x", {
        supportsNegative: true,
        themeKeys: ["--skew"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}deg`;
        },
        handle: (value2) => [
          transformProperties(),
          decl("--tw-skew-x", `skewX(${value2})`),
          decl("transform", transformValue),
        ],
      });
      functionalUtility("skew-y", {
        supportsNegative: true,
        themeKeys: ["--skew"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}deg`;
        },
        handle: (value2) => [
          transformProperties(),
          decl("--tw-skew-y", `skewY(${value2})`),
          decl("transform", transformValue),
        ],
      });
      suggest("skew", () => [
        {
          supportsNegative: true,
          values: ["0", "1", "2", "3", "6", "12"],
          valueThemeKeys: ["--skew"],
        },
      ]);
      suggest("skew-x", () => [
        {
          supportsNegative: true,
          values: ["0", "1", "2", "3", "6", "12"],
          valueThemeKeys: ["--skew"],
        },
      ]);
      suggest("skew-y", () => [
        {
          supportsNegative: true,
          values: ["0", "1", "2", "3", "6", "12"],
          valueThemeKeys: ["--skew"],
        },
      ]);
      utilities.functional("transform", (candidate) => {
        if (candidate.modifier) return;
        let value2 = null;
        if (!candidate.value) {
          value2 = transformValue;
        } else if (candidate.value.kind === "arbitrary") {
          value2 = candidate.value.value;
        }
        if (value2 === null) return;
        return [transformProperties(), decl("transform", value2)];
      });
      suggest("transform", () => [
        {
          hasDefaultValue: true,
        },
      ]);
      staticUtility("transform-cpu", [["transform", transformValue]]);
      staticUtility("transform-gpu", [["transform", `translateZ(0) ${transformValue}`]]);
      staticUtility("transform-none", [["transform", "none"]]);
    }
    staticUtility("transform-flat", [["transform-style", "flat"]]);
    staticUtility("transform-3d", [["transform-style", "preserve-3d"]]);
    staticUtility("transform-content", [["transform-box", "content-box"]]);
    staticUtility("transform-border", [["transform-box", "border-box"]]);
    staticUtility("transform-fill", [["transform-box", "fill-box"]]);
    staticUtility("transform-stroke", [["transform-box", "stroke-box"]]);
    staticUtility("transform-view", [["transform-box", "view-box"]]);
    staticUtility("backface-visible", [["backface-visibility", "visible"]]);
    staticUtility("backface-hidden", [["backface-visibility", "hidden"]]);
    for (let value2 of [
      "auto",
      "default",
      "pointer",
      "wait",
      "text",
      "move",
      "help",
      "not-allowed",
      "none",
      "context-menu",
      "progress",
      "cell",
      "crosshair",
      "vertical-text",
      "alias",
      "copy",
      "no-drop",
      "grab",
      "grabbing",
      "all-scroll",
      "col-resize",
      "row-resize",
      "n-resize",
      "e-resize",
      "s-resize",
      "w-resize",
      "ne-resize",
      "nw-resize",
      "se-resize",
      "sw-resize",
      "ew-resize",
      "ns-resize",
      "nesw-resize",
      "nwse-resize",
      "zoom-in",
      "zoom-out",
    ]) {
      staticUtility(`cursor-${value2}`, [["cursor", value2]]);
    }
    functionalUtility("cursor", {
      themeKeys: ["--cursor"],
      handle: (value2) => [decl("cursor", value2)],
    });
    for (let value2 of ["auto", "none", "manipulation"]) {
      staticUtility(`touch-${value2}`, [["touch-action", value2]]);
    }
    let touchProperties = () => atRoot([property("--tw-pan-x"), property("--tw-pan-y"), property("--tw-pinch-zoom")]);
    for (let value2 of ["x", "left", "right"]) {
      staticUtility(`touch-pan-${value2}`, [
        touchProperties,
        ["--tw-pan-x", `pan-${value2}`],
        ["touch-action", "var(--tw-pan-x,) var(--tw-pan-y,) var(--tw-pinch-zoom,)"],
      ]);
    }
    for (let value2 of ["y", "up", "down"]) {
      staticUtility(`touch-pan-${value2}`, [
        touchProperties,
        ["--tw-pan-y", `pan-${value2}`],
        ["touch-action", "var(--tw-pan-x,) var(--tw-pan-y,) var(--tw-pinch-zoom,)"],
      ]);
    }
    staticUtility("touch-pinch-zoom", [
      touchProperties,
      ["--tw-pinch-zoom", `pinch-zoom`],
      ["touch-action", "var(--tw-pan-x,) var(--tw-pan-y,) var(--tw-pinch-zoom,)"],
    ]);
    for (let value2 of ["none", "text", "all", "auto"]) {
      staticUtility(`select-${value2}`, [
        ["-webkit-user-select", value2],
        ["user-select", value2],
      ]);
    }
    staticUtility("resize-none", [["resize", "none"]]);
    staticUtility("resize-x", [["resize", "horizontal"]]);
    staticUtility("resize-y", [["resize", "vertical"]]);
    staticUtility("resize", [["resize", "both"]]);
    staticUtility("snap-none", [["scroll-snap-type", "none"]]);
    let snapProperties = () => atRoot([property("--tw-scroll-snap-strictness", "proximity", "*")]);
    for (let value2 of ["x", "y", "both"]) {
      staticUtility(`snap-${value2}`, [
        snapProperties,
        ["scroll-snap-type", `${value2} var(--tw-scroll-snap-strictness)`],
      ]);
    }
    staticUtility("snap-mandatory", [snapProperties, ["--tw-scroll-snap-strictness", "mandatory"]]);
    staticUtility("snap-proximity", [snapProperties, ["--tw-scroll-snap-strictness", "proximity"]]);
    staticUtility("snap-align-none", [["scroll-snap-align", "none"]]);
    staticUtility("snap-start", [["scroll-snap-align", "start"]]);
    staticUtility("snap-end", [["scroll-snap-align", "end"]]);
    staticUtility("snap-center", [["scroll-snap-align", "center"]]);
    staticUtility("snap-normal", [["scroll-snap-stop", "normal"]]);
    staticUtility("snap-always", [["scroll-snap-stop", "always"]]);
    for (let [namespace, property2] of [
      ["scroll-m", "scroll-margin"],
      ["scroll-mx", "scroll-margin-inline"],
      ["scroll-my", "scroll-margin-block"],
      ["scroll-ms", "scroll-margin-inline-start"],
      ["scroll-me", "scroll-margin-inline-end"],
      ["scroll-mt", "scroll-margin-top"],
      ["scroll-mr", "scroll-margin-right"],
      ["scroll-mb", "scroll-margin-bottom"],
      ["scroll-ml", "scroll-margin-left"],
    ]) {
      spacingUtility(namespace, ["--scroll-margin", "--spacing"], (value2) => [decl(property2, value2)], {
        supportsNegative: true,
      });
    }
    for (let [namespace, property2] of [
      ["scroll-p", "scroll-padding"],
      ["scroll-px", "scroll-padding-inline"],
      ["scroll-py", "scroll-padding-block"],
      ["scroll-ps", "scroll-padding-inline-start"],
      ["scroll-pe", "scroll-padding-inline-end"],
      ["scroll-pt", "scroll-padding-top"],
      ["scroll-pr", "scroll-padding-right"],
      ["scroll-pb", "scroll-padding-bottom"],
      ["scroll-pl", "scroll-padding-left"],
    ]) {
      spacingUtility(namespace, ["--scroll-padding", "--spacing"], (value2) => [decl(property2, value2)]);
    }
    staticUtility("list-inside", [["list-style-position", "inside"]]);
    staticUtility("list-outside", [["list-style-position", "outside"]]);
    staticUtility("list-none", [["list-style-type", "none"]]);
    staticUtility("list-disc", [["list-style-type", "disc"]]);
    staticUtility("list-decimal", [["list-style-type", "decimal"]]);
    functionalUtility("list", {
      themeKeys: ["--list-style-type"],
      handle: (value2) => [decl("list-style-type", value2)],
    });
    staticUtility("list-image-none", [["list-style-image", "none"]]);
    functionalUtility("list-image", {
      themeKeys: ["--list-style-image"],
      handle: (value2) => [decl("list-style-image", value2)],
    });
    staticUtility("appearance-none", [["appearance", "none"]]);
    staticUtility("appearance-auto", [["appearance", "auto"]]);
    staticUtility("scheme-normal", [["color-scheme", "normal"]]);
    staticUtility("scheme-dark", [["color-scheme", "dark"]]);
    staticUtility("scheme-light", [["color-scheme", "light"]]);
    staticUtility("scheme-light-dark", [["color-scheme", "light dark"]]);
    staticUtility("scheme-only-dark", [["color-scheme", "only dark"]]);
    staticUtility("scheme-only-light", [["color-scheme", "only light"]]);
    staticUtility("columns-auto", [["columns", "auto"]]);
    functionalUtility("columns", {
      themeKeys: ["--columns", "--container"],
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return value2;
      },
      handle: (value2) => [decl("columns", value2)],
    });
    suggest("columns", () => [
      {
        values: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--columns", "--container"],
      },
    ]);
    for (let value2 of ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"]) {
      staticUtility(`break-before-${value2}`, [["break-before", value2]]);
    }
    for (let value2 of ["auto", "avoid", "avoid-page", "avoid-column"]) {
      staticUtility(`break-inside-${value2}`, [["break-inside", value2]]);
    }
    for (let value2 of ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"]) {
      staticUtility(`break-after-${value2}`, [["break-after", value2]]);
    }
    staticUtility("grid-flow-row", [["grid-auto-flow", "row"]]);
    staticUtility("grid-flow-col", [["grid-auto-flow", "column"]]);
    staticUtility("grid-flow-dense", [["grid-auto-flow", "dense"]]);
    staticUtility("grid-flow-row-dense", [["grid-auto-flow", "row dense"]]);
    staticUtility("grid-flow-col-dense", [["grid-auto-flow", "column dense"]]);
    staticUtility("auto-cols-auto", [["grid-auto-columns", "auto"]]);
    staticUtility("auto-cols-min", [["grid-auto-columns", "min-content"]]);
    staticUtility("auto-cols-max", [["grid-auto-columns", "max-content"]]);
    staticUtility("auto-cols-fr", [["grid-auto-columns", "minmax(0, 1fr)"]]);
    functionalUtility("auto-cols", {
      themeKeys: ["--grid-auto-columns"],
      handle: (value2) => [decl("grid-auto-columns", value2)],
    });
    staticUtility("auto-rows-auto", [["grid-auto-rows", "auto"]]);
    staticUtility("auto-rows-min", [["grid-auto-rows", "min-content"]]);
    staticUtility("auto-rows-max", [["grid-auto-rows", "max-content"]]);
    staticUtility("auto-rows-fr", [["grid-auto-rows", "minmax(0, 1fr)"]]);
    functionalUtility("auto-rows", {
      themeKeys: ["--grid-auto-rows"],
      handle: (value2) => [decl("grid-auto-rows", value2)],
    });
    staticUtility("grid-cols-none", [["grid-template-columns", "none"]]);
    staticUtility("grid-cols-subgrid", [["grid-template-columns", "subgrid"]]);
    functionalUtility("grid-cols", {
      themeKeys: ["--grid-template-columns"],
      handleBareValue: ({ value: value2 }) => {
        if (!isStrictPositiveInteger(value2)) return null;
        return `repeat(${value2}, minmax(0, 1fr))`;
      },
      handle: (value2) => [decl("grid-template-columns", value2)],
    });
    staticUtility("grid-rows-none", [["grid-template-rows", "none"]]);
    staticUtility("grid-rows-subgrid", [["grid-template-rows", "subgrid"]]);
    functionalUtility("grid-rows", {
      themeKeys: ["--grid-template-rows"],
      handleBareValue: ({ value: value2 }) => {
        if (!isStrictPositiveInteger(value2)) return null;
        return `repeat(${value2}, minmax(0, 1fr))`;
      },
      handle: (value2) => [decl("grid-template-rows", value2)],
    });
    suggest("grid-cols", () => [
      {
        values: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--grid-template-columns"],
      },
    ]);
    suggest("grid-rows", () => [
      {
        values: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
        valueThemeKeys: ["--grid-template-rows"],
      },
    ]);
    staticUtility("flex-row", [["flex-direction", "row"]]);
    staticUtility("flex-row-reverse", [["flex-direction", "row-reverse"]]);
    staticUtility("flex-col", [["flex-direction", "column"]]);
    staticUtility("flex-col-reverse", [["flex-direction", "column-reverse"]]);
    staticUtility("flex-wrap", [["flex-wrap", "wrap"]]);
    staticUtility("flex-nowrap", [["flex-wrap", "nowrap"]]);
    staticUtility("flex-wrap-reverse", [["flex-wrap", "wrap-reverse"]]);
    staticUtility("place-content-center", [["place-content", "center"]]);
    staticUtility("place-content-start", [["place-content", "start"]]);
    staticUtility("place-content-end", [["place-content", "end"]]);
    staticUtility("place-content-center-safe", [["place-content", "safe center"]]);
    staticUtility("place-content-end-safe", [["place-content", "safe end"]]);
    staticUtility("place-content-between", [["place-content", "space-between"]]);
    staticUtility("place-content-around", [["place-content", "space-around"]]);
    staticUtility("place-content-evenly", [["place-content", "space-evenly"]]);
    staticUtility("place-content-baseline", [["place-content", "baseline"]]);
    staticUtility("place-content-stretch", [["place-content", "stretch"]]);
    staticUtility("place-items-center", [["place-items", "center"]]);
    staticUtility("place-items-start", [["place-items", "start"]]);
    staticUtility("place-items-end", [["place-items", "end"]]);
    staticUtility("place-items-center-safe", [["place-items", "safe center"]]);
    staticUtility("place-items-end-safe", [["place-items", "safe end"]]);
    staticUtility("place-items-baseline", [["place-items", "baseline"]]);
    staticUtility("place-items-stretch", [["place-items", "stretch"]]);
    staticUtility("content-normal", [["align-content", "normal"]]);
    staticUtility("content-center", [["align-content", "center"]]);
    staticUtility("content-start", [["align-content", "flex-start"]]);
    staticUtility("content-end", [["align-content", "flex-end"]]);
    staticUtility("content-center-safe", [["align-content", "safe center"]]);
    staticUtility("content-end-safe", [["align-content", "safe flex-end"]]);
    staticUtility("content-between", [["align-content", "space-between"]]);
    staticUtility("content-around", [["align-content", "space-around"]]);
    staticUtility("content-evenly", [["align-content", "space-evenly"]]);
    staticUtility("content-baseline", [["align-content", "baseline"]]);
    staticUtility("content-stretch", [["align-content", "stretch"]]);
    staticUtility("items-center", [["align-items", "center"]]);
    staticUtility("items-start", [["align-items", "flex-start"]]);
    staticUtility("items-end", [["align-items", "flex-end"]]);
    staticUtility("items-center-safe", [["align-items", "safe center"]]);
    staticUtility("items-end-safe", [["align-items", "safe flex-end"]]);
    staticUtility("items-baseline", [["align-items", "baseline"]]);
    staticUtility("items-baseline-last", [["align-items", "last baseline"]]);
    staticUtility("items-stretch", [["align-items", "stretch"]]);
    staticUtility("justify-normal", [["justify-content", "normal"]]);
    staticUtility("justify-center", [["justify-content", "center"]]);
    staticUtility("justify-start", [["justify-content", "flex-start"]]);
    staticUtility("justify-end", [["justify-content", "flex-end"]]);
    staticUtility("justify-center-safe", [["justify-content", "safe center"]]);
    staticUtility("justify-end-safe", [["justify-content", "safe flex-end"]]);
    staticUtility("justify-between", [["justify-content", "space-between"]]);
    staticUtility("justify-around", [["justify-content", "space-around"]]);
    staticUtility("justify-evenly", [["justify-content", "space-evenly"]]);
    staticUtility("justify-baseline", [["justify-content", "baseline"]]);
    staticUtility("justify-stretch", [["justify-content", "stretch"]]);
    staticUtility("justify-items-normal", [["justify-items", "normal"]]);
    staticUtility("justify-items-center", [["justify-items", "center"]]);
    staticUtility("justify-items-start", [["justify-items", "start"]]);
    staticUtility("justify-items-end", [["justify-items", "end"]]);
    staticUtility("justify-items-center-safe", [["justify-items", "safe center"]]);
    staticUtility("justify-items-end-safe", [["justify-items", "safe end"]]);
    staticUtility("justify-items-stretch", [["justify-items", "stretch"]]);
    spacingUtility("gap", ["--gap", "--spacing"], (value2) => [decl("gap", value2)]);
    spacingUtility("gap-x", ["--gap", "--spacing"], (value2) => [decl("column-gap", value2)]);
    spacingUtility("gap-y", ["--gap", "--spacing"], (value2) => [decl("row-gap", value2)]);
    spacingUtility(
      "space-x",
      ["--space", "--spacing"],
      (value2) => [
        atRoot([property("--tw-space-x-reverse", "0")]),
        styleRule(":where(& > :not(:last-child))", [
          decl("--tw-sort", "row-gap"),
          decl("--tw-space-x-reverse", "0"),
          decl("margin-inline-start", `calc(${value2} * var(--tw-space-x-reverse))`),
          decl("margin-inline-end", `calc(${value2} * calc(1 - var(--tw-space-x-reverse)))`),
        ]),
      ],
      { supportsNegative: true }
    );
    spacingUtility(
      "space-y",
      ["--space", "--spacing"],
      (value2) => [
        atRoot([property("--tw-space-y-reverse", "0")]),
        styleRule(":where(& > :not(:last-child))", [
          decl("--tw-sort", "column-gap"),
          decl("--tw-space-y-reverse", "0"),
          decl("margin-block-start", `calc(${value2} * var(--tw-space-y-reverse))`),
          decl("margin-block-end", `calc(${value2} * calc(1 - var(--tw-space-y-reverse)))`),
        ]),
      ],
      { supportsNegative: true }
    );
    staticUtility("space-x-reverse", [
      () => atRoot([property("--tw-space-x-reverse", "0")]),
      () =>
        styleRule(":where(& > :not(:last-child))", [decl("--tw-sort", "row-gap"), decl("--tw-space-x-reverse", "1")]),
    ]);
    staticUtility("space-y-reverse", [
      () => atRoot([property("--tw-space-y-reverse", "0")]),
      () =>
        styleRule(":where(& > :not(:last-child))", [
          decl("--tw-sort", "column-gap"),
          decl("--tw-space-y-reverse", "1"),
        ]),
    ]);
    staticUtility("accent-auto", [["accent-color", "auto"]]);
    colorUtility("accent", {
      themeKeys: ["--accent-color", "--color"],
      handle: (value2) => [decl("accent-color", value2)],
    });
    colorUtility("caret", {
      themeKeys: ["--caret-color", "--color"],
      handle: (value2) => [decl("caret-color", value2)],
    });
    colorUtility("divide", {
      themeKeys: ["--divide-color", "--color"],
      handle: (value2) => [
        styleRule(":where(& > :not(:last-child))", [decl("--tw-sort", "divide-color"), decl("border-color", value2)]),
      ],
    });
    staticUtility("place-self-auto", [["place-self", "auto"]]);
    staticUtility("place-self-start", [["place-self", "start"]]);
    staticUtility("place-self-end", [["place-self", "end"]]);
    staticUtility("place-self-center", [["place-self", "center"]]);
    staticUtility("place-self-end-safe", [["place-self", "safe end"]]);
    staticUtility("place-self-center-safe", [["place-self", "safe center"]]);
    staticUtility("place-self-stretch", [["place-self", "stretch"]]);
    staticUtility("self-auto", [["align-self", "auto"]]);
    staticUtility("self-start", [["align-self", "flex-start"]]);
    staticUtility("self-end", [["align-self", "flex-end"]]);
    staticUtility("self-center", [["align-self", "center"]]);
    staticUtility("self-end-safe", [["align-self", "safe flex-end"]]);
    staticUtility("self-center-safe", [["align-self", "safe center"]]);
    staticUtility("self-stretch", [["align-self", "stretch"]]);
    staticUtility("self-baseline", [["align-self", "baseline"]]);
    staticUtility("self-baseline-last", [["align-self", "last baseline"]]);
    staticUtility("justify-self-auto", [["justify-self", "auto"]]);
    staticUtility("justify-self-start", [["justify-self", "flex-start"]]);
    staticUtility("justify-self-end", [["justify-self", "flex-end"]]);
    staticUtility("justify-self-center", [["justify-self", "center"]]);
    staticUtility("justify-self-end-safe", [["justify-self", "safe flex-end"]]);
    staticUtility("justify-self-center-safe", [["justify-self", "safe center"]]);
    staticUtility("justify-self-stretch", [["justify-self", "stretch"]]);
    for (let value2 of ["auto", "hidden", "clip", "visible", "scroll"]) {
      staticUtility(`overflow-${value2}`, [["overflow", value2]]);
      staticUtility(`overflow-x-${value2}`, [["overflow-x", value2]]);
      staticUtility(`overflow-y-${value2}`, [["overflow-y", value2]]);
    }
    for (let value2 of ["auto", "contain", "none"]) {
      staticUtility(`overscroll-${value2}`, [["overscroll-behavior", value2]]);
      staticUtility(`overscroll-x-${value2}`, [["overscroll-behavior-x", value2]]);
      staticUtility(`overscroll-y-${value2}`, [["overscroll-behavior-y", value2]]);
    }
    staticUtility("scroll-auto", [["scroll-behavior", "auto"]]);
    staticUtility("scroll-smooth", [["scroll-behavior", "smooth"]]);
    staticUtility("truncate", [
      ["overflow", "hidden"],
      ["text-overflow", "ellipsis"],
      ["white-space", "nowrap"],
    ]);
    staticUtility("text-ellipsis", [["text-overflow", "ellipsis"]]);
    staticUtility("text-clip", [["text-overflow", "clip"]]);
    staticUtility("hyphens-none", [
      ["-webkit-hyphens", "none"],
      ["hyphens", "none"],
    ]);
    staticUtility("hyphens-manual", [
      ["-webkit-hyphens", "manual"],
      ["hyphens", "manual"],
    ]);
    staticUtility("hyphens-auto", [
      ["-webkit-hyphens", "auto"],
      ["hyphens", "auto"],
    ]);
    staticUtility("whitespace-normal", [["white-space", "normal"]]);
    staticUtility("whitespace-nowrap", [["white-space", "nowrap"]]);
    staticUtility("whitespace-pre", [["white-space", "pre"]]);
    staticUtility("whitespace-pre-line", [["white-space", "pre-line"]]);
    staticUtility("whitespace-pre-wrap", [["white-space", "pre-wrap"]]);
    staticUtility("whitespace-break-spaces", [["white-space", "break-spaces"]]);
    staticUtility("text-wrap", [["text-wrap", "wrap"]]);
    staticUtility("text-nowrap", [["text-wrap", "nowrap"]]);
    staticUtility("text-balance", [["text-wrap", "balance"]]);
    staticUtility("text-pretty", [["text-wrap", "pretty"]]);
    staticUtility("break-normal", [
      ["overflow-wrap", "normal"],
      ["word-break", "normal"],
    ]);
    staticUtility("break-words", [["overflow-wrap", "break-word"]]);
    staticUtility("break-all", [["word-break", "break-all"]]);
    staticUtility("break-keep", [["word-break", "keep-all"]]);
    staticUtility("wrap-anywhere", [["overflow-wrap", "anywhere"]]);
    staticUtility("wrap-break-word", [["overflow-wrap", "break-word"]]);
    staticUtility("wrap-normal", [["overflow-wrap", "normal"]]);
    {
      for (let [root, properties] of [
        ["rounded", ["border-radius"]],
        ["rounded-s", ["border-start-start-radius", "border-end-start-radius"]],
        ["rounded-e", ["border-start-end-radius", "border-end-end-radius"]],
        ["rounded-t", ["border-top-left-radius", "border-top-right-radius"]],
        ["rounded-r", ["border-top-right-radius", "border-bottom-right-radius"]],
        ["rounded-b", ["border-bottom-right-radius", "border-bottom-left-radius"]],
        ["rounded-l", ["border-top-left-radius", "border-bottom-left-radius"]],
        ["rounded-ss", ["border-start-start-radius"]],
        ["rounded-se", ["border-start-end-radius"]],
        ["rounded-ee", ["border-end-end-radius"]],
        ["rounded-es", ["border-end-start-radius"]],
        ["rounded-tl", ["border-top-left-radius"]],
        ["rounded-tr", ["border-top-right-radius"]],
        ["rounded-br", ["border-bottom-right-radius"]],
        ["rounded-bl", ["border-bottom-left-radius"]],
      ]) {
        staticUtility(
          `${root}-none`,
          properties.map((property2) => [property2, "0"])
        );
        staticUtility(
          `${root}-full`,
          properties.map((property2) => [property2, "calc(infinity * 1px)"])
        );
        functionalUtility(root, {
          themeKeys: ["--radius"],
          handle: (value2) => properties.map((property2) => decl(property2, value2)),
        });
      }
    }
    staticUtility("border-solid", [
      ["--tw-border-style", "solid"],
      ["border-style", "solid"],
    ]);
    staticUtility("border-dashed", [
      ["--tw-border-style", "dashed"],
      ["border-style", "dashed"],
    ]);
    staticUtility("border-dotted", [
      ["--tw-border-style", "dotted"],
      ["border-style", "dotted"],
    ]);
    staticUtility("border-double", [
      ["--tw-border-style", "double"],
      ["border-style", "double"],
    ]);
    staticUtility("border-hidden", [
      ["--tw-border-style", "hidden"],
      ["border-style", "hidden"],
    ]);
    staticUtility("border-none", [
      ["--tw-border-style", "none"],
      ["border-style", "none"],
    ]);
    {
      let borderSideUtility2 = function (classRoot, desc) {
        utilities.functional(classRoot, (candidate) => {
          if (!candidate.value) {
            if (candidate.modifier) return;
            let value2 = theme2.get(["--default-border-width"]) ?? "1px";
            let decls = desc.width(value2);
            if (!decls) return;
            return [borderProperties(), ...decls];
          }
          if (candidate.value.kind === "arbitrary") {
            let value2 = candidate.value.value;
            let type = candidate.value.dataType ?? inferDataType(value2, ["color", "line-width", "length"]);
            switch (type) {
              case "line-width":
              case "length": {
                if (candidate.modifier) return;
                let decls = desc.width(value2);
                if (!decls) return;
                return [borderProperties(), ...decls];
              }
              default: {
                value2 = asColor(value2, candidate.modifier, theme2);
                if (value2 === null) return;
                return desc.color(value2);
              }
            }
          }
          {
            let value2 = resolveThemeColor(candidate, theme2, ["--border-color", "--color"]);
            if (value2) {
              return desc.color(value2);
            }
          }
          {
            if (candidate.modifier) return;
            let value2 = theme2.resolve(candidate.value.value, ["--border-width"]);
            if (value2) {
              let decls = desc.width(value2);
              if (!decls) return;
              return [borderProperties(), ...decls];
            }
            if (isPositiveInteger(candidate.value.value)) {
              let decls = desc.width(`${candidate.value.value}px`);
              if (!decls) return;
              return [borderProperties(), ...decls];
            }
          }
        });
        suggest(classRoot, () => [
          {
            values: ["current", "inherit", "transparent"],
            valueThemeKeys: ["--border-color", "--color"],
            modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
            hasDefaultValue: true,
          },
          {
            values: ["0", "2", "4", "8"],
            valueThemeKeys: ["--border-width"],
          },
        ]);
      };
      var borderSideUtility = borderSideUtility2;
      let borderProperties = () => {
        return atRoot([property("--tw-border-style", "solid")]);
      };
      borderSideUtility2("border", {
        width: (value2) => [decl("border-style", "var(--tw-border-style)"), decl("border-width", value2)],
        color: (value2) => [decl("border-color", value2)],
      });
      borderSideUtility2("border-x", {
        width: (value2) => [decl("border-inline-style", "var(--tw-border-style)"), decl("border-inline-width", value2)],
        color: (value2) => [decl("border-inline-color", value2)],
      });
      borderSideUtility2("border-y", {
        width: (value2) => [decl("border-block-style", "var(--tw-border-style)"), decl("border-block-width", value2)],
        color: (value2) => [decl("border-block-color", value2)],
      });
      borderSideUtility2("border-s", {
        width: (value2) => [
          decl("border-inline-start-style", "var(--tw-border-style)"),
          decl("border-inline-start-width", value2),
        ],
        color: (value2) => [decl("border-inline-start-color", value2)],
      });
      borderSideUtility2("border-e", {
        width: (value2) => [
          decl("border-inline-end-style", "var(--tw-border-style)"),
          decl("border-inline-end-width", value2),
        ],
        color: (value2) => [decl("border-inline-end-color", value2)],
      });
      borderSideUtility2("border-t", {
        width: (value2) => [decl("border-top-style", "var(--tw-border-style)"), decl("border-top-width", value2)],
        color: (value2) => [decl("border-top-color", value2)],
      });
      borderSideUtility2("border-r", {
        width: (value2) => [decl("border-right-style", "var(--tw-border-style)"), decl("border-right-width", value2)],
        color: (value2) => [decl("border-right-color", value2)],
      });
      borderSideUtility2("border-b", {
        width: (value2) => [decl("border-bottom-style", "var(--tw-border-style)"), decl("border-bottom-width", value2)],
        color: (value2) => [decl("border-bottom-color", value2)],
      });
      borderSideUtility2("border-l", {
        width: (value2) => [decl("border-left-style", "var(--tw-border-style)"), decl("border-left-width", value2)],
        color: (value2) => [decl("border-left-color", value2)],
      });
      functionalUtility("divide-x", {
        defaultValue: theme2.get(["--default-border-width"]) ?? "1px",
        themeKeys: ["--divide-width", "--border-width"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}px`;
        },
        handle: (value2) => [
          atRoot([property("--tw-divide-x-reverse", "0")]),
          styleRule(":where(& > :not(:last-child))", [
            decl("--tw-sort", "divide-x-width"),
            borderProperties(),
            decl("--tw-divide-x-reverse", "0"),
            decl("border-inline-style", "var(--tw-border-style)"),
            decl("border-inline-start-width", `calc(${value2} * var(--tw-divide-x-reverse))`),
            decl("border-inline-end-width", `calc(${value2} * calc(1 - var(--tw-divide-x-reverse)))`),
          ]),
        ],
      });
      functionalUtility("divide-y", {
        defaultValue: theme2.get(["--default-border-width"]) ?? "1px",
        themeKeys: ["--divide-width", "--border-width"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}px`;
        },
        handle: (value2) => [
          atRoot([property("--tw-divide-y-reverse", "0")]),
          styleRule(":where(& > :not(:last-child))", [
            decl("--tw-sort", "divide-y-width"),
            borderProperties(),
            decl("--tw-divide-y-reverse", "0"),
            decl("border-bottom-style", "var(--tw-border-style)"),
            decl("border-top-style", "var(--tw-border-style)"),
            decl("border-top-width", `calc(${value2} * var(--tw-divide-y-reverse))`),
            decl("border-bottom-width", `calc(${value2} * calc(1 - var(--tw-divide-y-reverse)))`),
          ]),
        ],
      });
      suggest("divide-x", () => [
        {
          values: ["0", "2", "4", "8"],
          valueThemeKeys: ["--divide-width", "--border-width"],
          hasDefaultValue: true,
        },
      ]);
      suggest("divide-y", () => [
        {
          values: ["0", "2", "4", "8"],
          valueThemeKeys: ["--divide-width", "--border-width"],
          hasDefaultValue: true,
        },
      ]);
      staticUtility("divide-x-reverse", [
        () => atRoot([property("--tw-divide-x-reverse", "0")]),
        () => styleRule(":where(& > :not(:last-child))", [decl("--tw-divide-x-reverse", "1")]),
      ]);
      staticUtility("divide-y-reverse", [
        () => atRoot([property("--tw-divide-y-reverse", "0")]),
        () => styleRule(":where(& > :not(:last-child))", [decl("--tw-divide-y-reverse", "1")]),
      ]);
      for (let value2 of ["solid", "dashed", "dotted", "double", "none"]) {
        staticUtility(`divide-${value2}`, [
          () =>
            styleRule(":where(& > :not(:last-child))", [
              decl("--tw-sort", "divide-style"),
              decl("--tw-border-style", value2),
              decl("border-style", value2),
            ]),
        ]);
      }
    }
    staticUtility("bg-auto", [["background-size", "auto"]]);
    staticUtility("bg-cover", [["background-size", "cover"]]);
    staticUtility("bg-contain", [["background-size", "contain"]]);
    functionalUtility("bg-size", {
      handle(value2) {
        if (!value2) return;
        return [decl("background-size", value2)];
      },
    });
    staticUtility("bg-fixed", [["background-attachment", "fixed"]]);
    staticUtility("bg-local", [["background-attachment", "local"]]);
    staticUtility("bg-scroll", [["background-attachment", "scroll"]]);
    staticUtility("bg-top", [["background-position", "top"]]);
    staticUtility("bg-top-left", [["background-position", "left top"]]);
    staticUtility("bg-top-right", [["background-position", "right top"]]);
    staticUtility("bg-bottom", [["background-position", "bottom"]]);
    staticUtility("bg-bottom-left", [["background-position", "left bottom"]]);
    staticUtility("bg-bottom-right", [["background-position", "right bottom"]]);
    staticUtility("bg-left", [["background-position", "left"]]);
    staticUtility("bg-right", [["background-position", "right"]]);
    staticUtility("bg-center", [["background-position", "center"]]);
    functionalUtility("bg-position", {
      handle(value2) {
        if (!value2) return;
        return [decl("background-position", value2)];
      },
    });
    staticUtility("bg-repeat", [["background-repeat", "repeat"]]);
    staticUtility("bg-no-repeat", [["background-repeat", "no-repeat"]]);
    staticUtility("bg-repeat-x", [["background-repeat", "repeat-x"]]);
    staticUtility("bg-repeat-y", [["background-repeat", "repeat-y"]]);
    staticUtility("bg-repeat-round", [["background-repeat", "round"]]);
    staticUtility("bg-repeat-space", [["background-repeat", "space"]]);
    staticUtility("bg-none", [["background-image", "none"]]);
    {
      let resolveInterpolationModifier2 = function (modifier) {
          let interpolationMethod = "in oklab";
          if (modifier?.kind === "named") {
            switch (modifier.value) {
              case "longer":
              case "shorter":
              case "increasing":
              case "decreasing":
                interpolationMethod = `in oklch ${modifier.value} hue`;
                break;
              default:
                interpolationMethod = `in ${modifier.value}`;
            }
          } else if (modifier?.kind === "arbitrary") {
            interpolationMethod = modifier.value;
          }
          return interpolationMethod;
        },
        handleBgLinear2 = function ({ negative }) {
          return (candidate) => {
            if (!candidate.value) return;
            if (candidate.value.kind === "arbitrary") {
              if (candidate.modifier) return;
              let value3 = candidate.value.value;
              let type = candidate.value.dataType ?? inferDataType(value3, ["angle"]);
              switch (type) {
                case "angle": {
                  value3 = negative ? `calc(${value3} * -1)` : `${value3}`;
                  return [
                    decl("--tw-gradient-position", value3),
                    decl("background-image", `linear-gradient(var(--tw-gradient-stops,${value3}))`),
                  ];
                }
                default: {
                  if (negative) return;
                  return [
                    decl("--tw-gradient-position", value3),
                    decl("background-image", `linear-gradient(var(--tw-gradient-stops,${value3}))`),
                  ];
                }
              }
            }
            let value2 = candidate.value.value;
            if (!negative && linearGradientDirections.has(value2)) {
              value2 = linearGradientDirections.get(value2);
            } else if (isPositiveInteger(value2)) {
              value2 = negative ? `calc(${value2}deg * -1)` : `${value2}deg`;
            } else {
              return;
            }
            let interpolationMethod = resolveInterpolationModifier2(candidate.modifier);
            return [
              decl("--tw-gradient-position", `${value2}`),
              rule("@supports (background-image: linear-gradient(in lab, red, red))", [
                decl("--tw-gradient-position", `${value2} ${interpolationMethod}`),
              ]),
              decl("background-image", `linear-gradient(var(--tw-gradient-stops))`),
            ];
          };
        },
        handleBgConic2 = function ({ negative }) {
          return (candidate) => {
            if (candidate.value?.kind === "arbitrary") {
              if (candidate.modifier) return;
              let value3 = candidate.value.value;
              return [
                decl("--tw-gradient-position", value3),
                decl("background-image", `conic-gradient(var(--tw-gradient-stops,${value3}))`),
              ];
            }
            let interpolationMethod = resolveInterpolationModifier2(candidate.modifier);
            if (!candidate.value) {
              return [
                decl("--tw-gradient-position", interpolationMethod),
                decl("background-image", `conic-gradient(var(--tw-gradient-stops))`),
              ];
            }
            let value2 = candidate.value.value;
            if (!isPositiveInteger(value2)) return;
            value2 = negative ? `calc(${value2}deg * -1)` : `${value2}deg`;
            return [
              decl("--tw-gradient-position", `from ${value2} ${interpolationMethod}`),
              decl("background-image", `conic-gradient(var(--tw-gradient-stops))`),
            ];
          };
        };
      var resolveInterpolationModifier = resolveInterpolationModifier2,
        handleBgLinear = handleBgLinear2,
        handleBgConic = handleBgConic2;
      let suggestedModifiers = ["oklab", "oklch", "srgb", "hsl", "longer", "shorter", "increasing", "decreasing"];
      let linearGradientDirections = /* @__PURE__ */ new Map([
        ["to-t", "to top"],
        ["to-tr", "to top right"],
        ["to-r", "to right"],
        ["to-br", "to bottom right"],
        ["to-b", "to bottom"],
        ["to-bl", "to bottom left"],
        ["to-l", "to left"],
        ["to-tl", "to top left"],
      ]);
      utilities.functional("-bg-linear", handleBgLinear2({ negative: true }));
      utilities.functional("bg-linear", handleBgLinear2({ negative: false }));
      suggest("bg-linear", () => [
        {
          values: [...linearGradientDirections.keys()],
          modifiers: suggestedModifiers,
        },
        {
          values: ["0", "30", "60", "90", "120", "150", "180", "210", "240", "270", "300", "330"],
          supportsNegative: true,
          modifiers: suggestedModifiers,
        },
      ]);
      utilities.functional("-bg-conic", handleBgConic2({ negative: true }));
      utilities.functional("bg-conic", handleBgConic2({ negative: false }));
      suggest("bg-conic", () => [
        {
          hasDefaultValue: true,
          modifiers: suggestedModifiers,
        },
        {
          values: ["0", "30", "60", "90", "120", "150", "180", "210", "240", "270", "300", "330"],
          supportsNegative: true,
          modifiers: suggestedModifiers,
        },
      ]);
      utilities.functional("bg-radial", (candidate) => {
        if (!candidate.value) {
          let interpolationMethod = resolveInterpolationModifier2(candidate.modifier);
          return [
            decl("--tw-gradient-position", interpolationMethod),
            decl("background-image", `radial-gradient(var(--tw-gradient-stops))`),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          if (candidate.modifier) return;
          let value2 = candidate.value.value;
          return [
            decl("--tw-gradient-position", value2),
            decl("background-image", `radial-gradient(var(--tw-gradient-stops,${value2}))`),
          ];
        }
      });
      suggest("bg-radial", () => [
        {
          hasDefaultValue: true,
          modifiers: suggestedModifiers,
        },
      ]);
    }
    utilities.functional("bg", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") {
        let value2 = candidate.value.value;
        let type =
          candidate.value.dataType ??
          inferDataType(value2, ["image", "color", "percentage", "position", "bg-size", "length", "url"]);
        switch (type) {
          case "percentage":
          case "position": {
            if (candidate.modifier) return;
            return [decl("background-position", value2)];
          }
          case "bg-size":
          case "length":
          case "size": {
            if (candidate.modifier) return;
            return [decl("background-size", value2)];
          }
          case "image":
          case "url": {
            if (candidate.modifier) return;
            return [decl("background-image", value2)];
          }
          default: {
            value2 = asColor(value2, candidate.modifier, theme2);
            if (value2 === null) return;
            return [decl("background-color", value2)];
          }
        }
      }
      {
        let value2 = resolveThemeColor(candidate, theme2, ["--background-color", "--color"]);
        if (value2) {
          return [decl("background-color", value2)];
        }
      }
      {
        if (candidate.modifier) return;
        let value2 = theme2.resolve(candidate.value.value, ["--background-image"]);
        if (value2) {
          return [decl("background-image", value2)];
        }
      }
    });
    suggest("bg", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--background-color", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
      {
        values: [],
        valueThemeKeys: ["--background-image"],
      },
    ]);
    let gradientStopProperties = () => {
      return atRoot([
        property("--tw-gradient-position"),
        property("--tw-gradient-from", "#0000", "<color>"),
        property("--tw-gradient-via", "#0000", "<color>"),
        property("--tw-gradient-to", "#0000", "<color>"),
        property("--tw-gradient-stops"),
        property("--tw-gradient-via-stops"),
        property("--tw-gradient-from-position", "0%", "<length-percentage>"),
        property("--tw-gradient-via-position", "50%", "<length-percentage>"),
        property("--tw-gradient-to-position", "100%", "<length-percentage>"),
      ]);
    };
    function gradientStopUtility(classRoot, desc) {
      utilities.functional(classRoot, (candidate) => {
        if (!candidate.value) return;
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color", "length", "percentage"]);
          switch (type) {
            case "length":
            case "percentage": {
              if (candidate.modifier) return;
              return desc.position(value2);
            }
            default: {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return desc.color(value2);
            }
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--background-color", "--color"]);
          if (value2) {
            return desc.color(value2);
          }
        }
        {
          if (candidate.modifier) return;
          let value2 = theme2.resolve(candidate.value.value, ["--gradient-color-stop-positions"]);
          if (value2) {
            return desc.position(value2);
          } else if (
            candidate.value.value[candidate.value.value.length - 1] === "%" &&
            isPositiveInteger(candidate.value.value.slice(0, -1))
          ) {
            return desc.position(candidate.value.value);
          }
        }
      });
      suggest(classRoot, () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--background-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          values: Array.from({ length: 21 }, (_, index) => `${index * 5}%`),
          valueThemeKeys: ["--gradient-color-stop-positions"],
        },
      ]);
    }
    gradientStopUtility("from", {
      color: (value2) => [
        gradientStopProperties(),
        decl("--tw-sort", "--tw-gradient-from"),
        decl("--tw-gradient-from", value2),
        decl(
          "--tw-gradient-stops",
          "var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))"
        ),
      ],
      position: (value2) => [gradientStopProperties(), decl("--tw-gradient-from-position", value2)],
    });
    staticUtility("via-none", [["--tw-gradient-via-stops", "initial"]]);
    gradientStopUtility("via", {
      color: (value2) => [
        gradientStopProperties(),
        decl("--tw-sort", "--tw-gradient-via"),
        decl("--tw-gradient-via", value2),
        decl(
          "--tw-gradient-via-stops",
          "var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-via) var(--tw-gradient-via-position), var(--tw-gradient-to) var(--tw-gradient-to-position)"
        ),
        decl("--tw-gradient-stops", "var(--tw-gradient-via-stops)"),
      ],
      position: (value2) => [gradientStopProperties(), decl("--tw-gradient-via-position", value2)],
    });
    gradientStopUtility("to", {
      color: (value2) => [
        gradientStopProperties(),
        decl("--tw-sort", "--tw-gradient-to"),
        decl("--tw-gradient-to", value2),
        decl(
          "--tw-gradient-stops",
          "var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))"
        ),
      ],
      position: (value2) => [gradientStopProperties(), decl("--tw-gradient-to-position", value2)],
    });
    staticUtility("mask-none", [["mask-image", "none"]]);
    utilities.functional("mask", (candidate) => {
      if (!candidate.value) return;
      if (candidate.modifier) return;
      if (candidate.value.kind !== "arbitrary") return;
      let value2 = candidate.value.value;
      let type =
        candidate.value.dataType ??
        inferDataType(value2, ["image", "percentage", "position", "bg-size", "length", "url"]);
      switch (type) {
        case "percentage":
        case "position": {
          if (candidate.modifier) return;
          return [decl("mask-position", value2)];
        }
        case "bg-size":
        case "length":
        case "size": {
          return [decl("mask-size", value2)];
        }
        case "image":
        case "url":
        default: {
          return [decl("mask-image", value2)];
        }
      }
    });
    staticUtility("mask-add", [["mask-composite", "add"]]);
    staticUtility("mask-subtract", [["mask-composite", "subtract"]]);
    staticUtility("mask-intersect", [["mask-composite", "intersect"]]);
    staticUtility("mask-exclude", [["mask-composite", "exclude"]]);
    staticUtility("mask-alpha", [["mask-mode", "alpha"]]);
    staticUtility("mask-luminance", [["mask-mode", "luminance"]]);
    staticUtility("mask-match", [["mask-mode", "match-source"]]);
    staticUtility("mask-type-alpha", [["mask-type", "alpha"]]);
    staticUtility("mask-type-luminance", [["mask-type", "luminance"]]);
    staticUtility("mask-auto", [["mask-size", "auto"]]);
    staticUtility("mask-cover", [["mask-size", "cover"]]);
    staticUtility("mask-contain", [["mask-size", "contain"]]);
    functionalUtility("mask-size", {
      handle(value2) {
        if (!value2) return;
        return [decl("mask-size", value2)];
      },
    });
    staticUtility("mask-top", [["mask-position", "top"]]);
    staticUtility("mask-top-left", [["mask-position", "left top"]]);
    staticUtility("mask-top-right", [["mask-position", "right top"]]);
    staticUtility("mask-bottom", [["mask-position", "bottom"]]);
    staticUtility("mask-bottom-left", [["mask-position", "left bottom"]]);
    staticUtility("mask-bottom-right", [["mask-position", "right bottom"]]);
    staticUtility("mask-left", [["mask-position", "left"]]);
    staticUtility("mask-right", [["mask-position", "right"]]);
    staticUtility("mask-center", [["mask-position", "center"]]);
    functionalUtility("mask-position", {
      handle(value2) {
        if (!value2) return;
        return [decl("mask-position", value2)];
      },
    });
    staticUtility("mask-repeat", [["mask-repeat", "repeat"]]);
    staticUtility("mask-no-repeat", [["mask-repeat", "no-repeat"]]);
    staticUtility("mask-repeat-x", [["mask-repeat", "repeat-x"]]);
    staticUtility("mask-repeat-y", [["mask-repeat", "repeat-y"]]);
    staticUtility("mask-repeat-round", [["mask-repeat", "round"]]);
    staticUtility("mask-repeat-space", [["mask-repeat", "space"]]);
    staticUtility("mask-clip-border", [["mask-clip", "border-box"]]);
    staticUtility("mask-clip-padding", [["mask-clip", "padding-box"]]);
    staticUtility("mask-clip-content", [["mask-clip", "content-box"]]);
    staticUtility("mask-clip-fill", [["mask-clip", "fill-box"]]);
    staticUtility("mask-clip-stroke", [["mask-clip", "stroke-box"]]);
    staticUtility("mask-clip-view", [["mask-clip", "view-box"]]);
    staticUtility("mask-no-clip", [["mask-clip", "no-clip"]]);
    staticUtility("mask-origin-border", [["mask-origin", "border-box"]]);
    staticUtility("mask-origin-padding", [["mask-origin", "padding-box"]]);
    staticUtility("mask-origin-content", [["mask-origin", "content-box"]]);
    staticUtility("mask-origin-fill", [["mask-origin", "fill-box"]]);
    staticUtility("mask-origin-stroke", [["mask-origin", "stroke-box"]]);
    staticUtility("mask-origin-view", [["mask-origin", "view-box"]]);
    let maskPropertiesGradient = () =>
      atRoot([
        property("--tw-mask-linear", "linear-gradient(#fff, #fff)"),
        property("--tw-mask-radial", "linear-gradient(#fff, #fff)"),
        property("--tw-mask-conic", "linear-gradient(#fff, #fff)"),
      ]);
    function maskStopUtility(classRoot, desc) {
      utilities.functional(classRoot, (candidate) => {
        if (!candidate.value) return;
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["length", "percentage", "color"]);
          switch (type) {
            case "color": {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return desc.color(value2);
            }
            case "percentage": {
              if (candidate.modifier) return;
              if (!isPositiveInteger(value2.slice(0, -1))) return;
              return desc.position(value2);
            }
            default: {
              if (candidate.modifier) return;
              return desc.position(value2);
            }
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--background-color", "--color"]);
          if (value2) {
            return desc.color(value2);
          }
        }
        {
          if (candidate.modifier) return;
          let type = inferDataType(candidate.value.value, ["number", "percentage"]);
          if (!type) return;
          switch (type) {
            case "number": {
              let multiplier = theme2.resolve(null, ["--spacing"]);
              if (!multiplier) return;
              if (!isValidSpacingMultiplier(candidate.value.value)) return;
              return desc.position(`calc(${multiplier} * ${candidate.value.value})`);
            }
            case "percentage": {
              if (!isPositiveInteger(candidate.value.value.slice(0, -1))) return;
              return desc.position(candidate.value.value);
            }
            default: {
              return;
            }
          }
        }
      });
      suggest(classRoot, () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--background-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          values: Array.from({ length: 21 }, (_, index) => `${index * 5}%`),
          valueThemeKeys: ["--gradient-color-stop-positions"],
        },
      ]);
      suggest(classRoot, () => [
        // Percentages
        {
          values: Array.from({ length: 21 }, (_, index) => `${index * 5}%`),
        },
        // Spacing Scale
        {
          values: theme2.get(["--spacing"]) ? DEFAULT_SPACING_SUGGESTIONS : [],
        },
        // Colors
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--background-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
      ]);
    }
    let maskPropertiesEdge = () =>
      atRoot([
        property("--tw-mask-left", "linear-gradient(#fff, #fff)"),
        property("--tw-mask-right", "linear-gradient(#fff, #fff)"),
        property("--tw-mask-bottom", "linear-gradient(#fff, #fff)"),
        property("--tw-mask-top", "linear-gradient(#fff, #fff)"),
      ]);
    function maskEdgeUtility(name, stop, edges) {
      maskStopUtility(name, {
        color(value2) {
          let nodes = [
            // Common @property declarations
            maskPropertiesGradient(),
            maskPropertiesEdge(),
            // Common properties to all edge utilities
            decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
            decl("mask-composite", "intersect"),
            decl(
              "--tw-mask-linear",
              "var(--tw-mask-left), var(--tw-mask-right), var(--tw-mask-bottom), var(--tw-mask-top)"
            ),
          ];
          for (let edge of ["top", "right", "bottom", "left"]) {
            if (!edges[edge]) continue;
            nodes.push(
              decl(
                `--tw-mask-${edge}`,
                `linear-gradient(to ${edge}, var(--tw-mask-${edge}-from-color) var(--tw-mask-${edge}-from-position), var(--tw-mask-${edge}-to-color) var(--tw-mask-${edge}-to-position))`
              )
            );
            nodes.push(
              atRoot([
                property(`--tw-mask-${edge}-from-position`, "0%"),
                property(`--tw-mask-${edge}-to-position`, "100%"),
                property(`--tw-mask-${edge}-from-color`, "black"),
                property(`--tw-mask-${edge}-to-color`, "transparent"),
              ])
            );
            nodes.push(decl(`--tw-mask-${edge}-${stop}-color`, value2));
          }
          return nodes;
        },
        position(value2) {
          let nodes = [
            // Common @property declarations
            maskPropertiesGradient(),
            maskPropertiesEdge(),
            // Common properties to all edge utilities
            decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
            decl("mask-composite", "intersect"),
            decl(
              "--tw-mask-linear",
              "var(--tw-mask-left), var(--tw-mask-right), var(--tw-mask-bottom), var(--tw-mask-top)"
            ),
          ];
          for (let edge of ["top", "right", "bottom", "left"]) {
            if (!edges[edge]) continue;
            nodes.push(
              decl(
                `--tw-mask-${edge}`,
                `linear-gradient(to ${edge}, var(--tw-mask-${edge}-from-color) var(--tw-mask-${edge}-from-position), var(--tw-mask-${edge}-to-color) var(--tw-mask-${edge}-to-position))`
              )
            );
            nodes.push(
              atRoot([
                property(`--tw-mask-${edge}-from-position`, "0%"),
                property(`--tw-mask-${edge}-to-position`, "100%"),
                property(`--tw-mask-${edge}-from-color`, "black"),
                property(`--tw-mask-${edge}-to-color`, "transparent"),
              ])
            );
            nodes.push(decl(`--tw-mask-${edge}-${stop}-position`, value2));
          }
          return nodes;
        },
      });
    }
    maskEdgeUtility("mask-x-from", "from", {
      top: false,
      right: true,
      bottom: false,
      left: true,
    });
    maskEdgeUtility("mask-x-to", "to", {
      top: false,
      right: true,
      bottom: false,
      left: true,
    });
    maskEdgeUtility("mask-y-from", "from", {
      top: true,
      right: false,
      bottom: true,
      left: false,
    });
    maskEdgeUtility("mask-y-to", "to", {
      top: true,
      right: false,
      bottom: true,
      left: false,
    });
    maskEdgeUtility("mask-t-from", "from", {
      top: true,
      right: false,
      bottom: false,
      left: false,
    });
    maskEdgeUtility("mask-t-to", "to", {
      top: true,
      right: false,
      bottom: false,
      left: false,
    });
    maskEdgeUtility("mask-r-from", "from", {
      top: false,
      right: true,
      bottom: false,
      left: false,
    });
    maskEdgeUtility("mask-r-to", "to", {
      top: false,
      right: true,
      bottom: false,
      left: false,
    });
    maskEdgeUtility("mask-b-from", "from", {
      top: false,
      right: false,
      bottom: true,
      left: false,
    });
    maskEdgeUtility("mask-b-to", "to", {
      top: false,
      right: false,
      bottom: true,
      left: false,
    });
    maskEdgeUtility("mask-l-from", "from", {
      top: false,
      right: false,
      bottom: false,
      left: true,
    });
    maskEdgeUtility("mask-l-to", "to", {
      top: false,
      right: false,
      bottom: false,
      left: true,
    });
    let maskPropertiesLinear = () =>
      atRoot([
        property("--tw-mask-linear-position", "0deg"),
        property("--tw-mask-linear-from-position", "0%"),
        property("--tw-mask-linear-to-position", "100%"),
        property("--tw-mask-linear-from-color", "black"),
        property("--tw-mask-linear-to-color", "transparent"),
      ]);
    functionalUtility("mask-linear", {
      defaultValue: null,
      supportsNegative: true,
      supportsFractions: false,
      handleBareValue(value2) {
        if (!isPositiveInteger(value2.value)) return null;
        return `calc(1deg * ${value2.value})`;
      },
      handleNegativeBareValue(value2) {
        if (!isPositiveInteger(value2.value)) return null;
        return `calc(1deg * -${value2.value})`;
      },
      handle: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesLinear(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl("--tw-mask-linear", `linear-gradient(var(--tw-mask-linear-stops, var(--tw-mask-linear-position)))`),
        decl("--tw-mask-linear-position", value2),
      ],
    });
    suggest("mask-linear", () => [
      {
        supportsNegative: true,
        values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"],
      },
    ]);
    maskStopUtility("mask-linear-from", {
      color: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesLinear(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-linear-stops",
          "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"
        ),
        decl("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"),
        decl("--tw-mask-linear-from-color", value2),
      ],
      position: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesLinear(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-linear-stops",
          "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"
        ),
        decl("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"),
        decl("--tw-mask-linear-from-position", value2),
      ],
    });
    maskStopUtility("mask-linear-to", {
      color: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesLinear(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-linear-stops",
          "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"
        ),
        decl("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"),
        decl("--tw-mask-linear-to-color", value2),
      ],
      position: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesLinear(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-linear-stops",
          "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"
        ),
        decl("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"),
        decl("--tw-mask-linear-to-position", value2),
      ],
    });
    let maskPropertiesRadial = () =>
      atRoot([
        property("--tw-mask-radial-from-position", "0%"),
        property("--tw-mask-radial-to-position", "100%"),
        property("--tw-mask-radial-from-color", "black"),
        property("--tw-mask-radial-to-color", "transparent"),
        property("--tw-mask-radial-shape", "ellipse"),
        property("--tw-mask-radial-size", "farthest-corner"),
        property("--tw-mask-radial-position", "center"),
      ]);
    staticUtility("mask-circle", [["--tw-mask-radial-shape", "circle"]]);
    staticUtility("mask-ellipse", [["--tw-mask-radial-shape", "ellipse"]]);
    staticUtility("mask-radial-closest-side", [["--tw-mask-radial-size", "closest-side"]]);
    staticUtility("mask-radial-farthest-side", [["--tw-mask-radial-size", "farthest-side"]]);
    staticUtility("mask-radial-closest-corner", [["--tw-mask-radial-size", "closest-corner"]]);
    staticUtility("mask-radial-farthest-corner", [["--tw-mask-radial-size", "farthest-corner"]]);
    staticUtility("mask-radial-at-top", [["--tw-mask-radial-position", "top"]]);
    staticUtility("mask-radial-at-top-left", [["--tw-mask-radial-position", "top left"]]);
    staticUtility("mask-radial-at-top-right", [["--tw-mask-radial-position", "top right"]]);
    staticUtility("mask-radial-at-bottom", [["--tw-mask-radial-position", "bottom"]]);
    staticUtility("mask-radial-at-bottom-left", [["--tw-mask-radial-position", "bottom left"]]);
    staticUtility("mask-radial-at-bottom-right", [["--tw-mask-radial-position", "bottom right"]]);
    staticUtility("mask-radial-at-left", [["--tw-mask-radial-position", "left"]]);
    staticUtility("mask-radial-at-right", [["--tw-mask-radial-position", "right"]]);
    staticUtility("mask-radial-at-center", [["--tw-mask-radial-position", "center"]]);
    functionalUtility("mask-radial-at", {
      defaultValue: null,
      supportsNegative: false,
      supportsFractions: false,
      handle: (value2) => [decl("--tw-mask-radial-position", value2)],
    });
    functionalUtility("mask-radial", {
      defaultValue: null,
      supportsNegative: false,
      supportsFractions: false,
      handle: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesRadial(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops, var(--tw-mask-radial-size)))"),
        decl("--tw-mask-radial-size", value2),
      ],
    });
    maskStopUtility("mask-radial-from", {
      color: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesRadial(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-radial-stops",
          "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"
        ),
        decl("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"),
        decl("--tw-mask-radial-from-color", value2),
      ],
      position: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesRadial(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-radial-stops",
          "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"
        ),
        decl("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"),
        decl("--tw-mask-radial-from-position", value2),
      ],
    });
    maskStopUtility("mask-radial-to", {
      color: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesRadial(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-radial-stops",
          "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"
        ),
        decl("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"),
        decl("--tw-mask-radial-to-color", value2),
      ],
      position: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesRadial(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-radial-stops",
          "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"
        ),
        decl("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"),
        decl("--tw-mask-radial-to-position", value2),
      ],
    });
    let maskPropertiesConic = () =>
      atRoot([
        property("--tw-mask-conic-position", "0deg"),
        property("--tw-mask-conic-from-position", "0%"),
        property("--tw-mask-conic-to-position", "100%"),
        property("--tw-mask-conic-from-color", "black"),
        property("--tw-mask-conic-to-color", "transparent"),
      ]);
    functionalUtility("mask-conic", {
      defaultValue: null,
      supportsNegative: true,
      supportsFractions: false,
      handleBareValue(value2) {
        if (!isPositiveInteger(value2.value)) return null;
        return `calc(1deg * ${value2.value})`;
      },
      handleNegativeBareValue(value2) {
        if (!isPositiveInteger(value2.value)) return null;
        return `calc(1deg * -${value2.value})`;
      },
      handle: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesConic(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops, var(--tw-mask-conic-position)))"),
        decl("--tw-mask-conic-position", value2),
      ],
    });
    suggest("mask-conic", () => [
      {
        supportsNegative: true,
        values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"],
      },
    ]);
    maskStopUtility("mask-conic-from", {
      color: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesConic(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-conic-stops",
          "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"
        ),
        decl("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"),
        decl("--tw-mask-conic-from-color", value2),
      ],
      position: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesConic(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-conic-stops",
          "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"
        ),
        decl("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"),
        decl("--tw-mask-conic-from-position", value2),
      ],
    });
    maskStopUtility("mask-conic-to", {
      color: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesConic(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-conic-stops",
          "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"
        ),
        decl("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"),
        decl("--tw-mask-conic-to-color", value2),
      ],
      position: (value2) => [
        maskPropertiesGradient(),
        maskPropertiesConic(),
        decl("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"),
        decl("mask-composite", "intersect"),
        decl(
          "--tw-mask-conic-stops",
          "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"
        ),
        decl("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"),
        decl("--tw-mask-conic-to-position", value2),
      ],
    });
    staticUtility("box-decoration-slice", [
      ["-webkit-box-decoration-break", "slice"],
      ["box-decoration-break", "slice"],
    ]);
    staticUtility("box-decoration-clone", [
      ["-webkit-box-decoration-break", "clone"],
      ["box-decoration-break", "clone"],
    ]);
    staticUtility("bg-clip-text", [["background-clip", "text"]]);
    staticUtility("bg-clip-border", [["background-clip", "border-box"]]);
    staticUtility("bg-clip-padding", [["background-clip", "padding-box"]]);
    staticUtility("bg-clip-content", [["background-clip", "content-box"]]);
    staticUtility("bg-origin-border", [["background-origin", "border-box"]]);
    staticUtility("bg-origin-padding", [["background-origin", "padding-box"]]);
    staticUtility("bg-origin-content", [["background-origin", "content-box"]]);
    for (let value2 of [
      "normal",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
      "luminosity",
    ]) {
      staticUtility(`bg-blend-${value2}`, [["background-blend-mode", value2]]);
      staticUtility(`mix-blend-${value2}`, [["mix-blend-mode", value2]]);
    }
    staticUtility("mix-blend-plus-darker", [["mix-blend-mode", "plus-darker"]]);
    staticUtility("mix-blend-plus-lighter", [["mix-blend-mode", "plus-lighter"]]);
    staticUtility("fill-none", [["fill", "none"]]);
    utilities.functional("fill", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") {
        let value3 = asColor(candidate.value.value, candidate.modifier, theme2);
        if (value3 === null) return;
        return [decl("fill", value3)];
      }
      let value2 = resolveThemeColor(candidate, theme2, ["--fill", "--color"]);
      if (value2) {
        return [decl("fill", value2)];
      }
    });
    suggest("fill", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--fill", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
    ]);
    staticUtility("stroke-none", [["stroke", "none"]]);
    utilities.functional("stroke", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") {
        let value2 = candidate.value.value;
        let type = candidate.value.dataType ?? inferDataType(value2, ["color", "number", "length", "percentage"]);
        switch (type) {
          case "number":
          case "length":
          case "percentage": {
            if (candidate.modifier) return;
            return [decl("stroke-width", value2)];
          }
          default: {
            value2 = asColor(candidate.value.value, candidate.modifier, theme2);
            if (value2 === null) return;
            return [decl("stroke", value2)];
          }
        }
      }
      {
        let value2 = resolveThemeColor(candidate, theme2, ["--stroke", "--color"]);
        if (value2) {
          return [decl("stroke", value2)];
        }
      }
      {
        let value2 = theme2.resolve(candidate.value.value, ["--stroke-width"]);
        if (value2) {
          return [decl("stroke-width", value2)];
        } else if (isPositiveInteger(candidate.value.value)) {
          return [decl("stroke-width", candidate.value.value)];
        }
      }
    });
    suggest("stroke", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--stroke", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
      {
        values: ["0", "1", "2", "3"],
        valueThemeKeys: ["--stroke-width"],
      },
    ]);
    staticUtility("object-contain", [["object-fit", "contain"]]);
    staticUtility("object-cover", [["object-fit", "cover"]]);
    staticUtility("object-fill", [["object-fit", "fill"]]);
    staticUtility("object-none", [["object-fit", "none"]]);
    staticUtility("object-scale-down", [["object-fit", "scale-down"]]);
    staticUtility("object-top", [["object-position", "top"]]);
    staticUtility("object-top-left", [["object-position", "left top"]]);
    staticUtility("object-top-right", [["object-position", "right top"]]);
    staticUtility("object-bottom", [["object-position", "bottom"]]);
    staticUtility("object-bottom-left", [["object-position", "left bottom"]]);
    staticUtility("object-bottom-right", [["object-position", "right bottom"]]);
    staticUtility("object-left", [["object-position", "left"]]);
    staticUtility("object-right", [["object-position", "right"]]);
    staticUtility("object-center", [["object-position", "center"]]);
    functionalUtility("object", {
      themeKeys: ["--object-position"],
      handle: (value2) => [decl("object-position", value2)],
    });
    for (let [name, property2] of [
      ["p", "padding"],
      ["px", "padding-inline"],
      ["py", "padding-block"],
      ["ps", "padding-inline-start"],
      ["pe", "padding-inline-end"],
      ["pt", "padding-top"],
      ["pr", "padding-right"],
      ["pb", "padding-bottom"],
      ["pl", "padding-left"],
    ]) {
      spacingUtility(name, ["--padding", "--spacing"], (value2) => [decl(property2, value2)]);
    }
    staticUtility("text-left", [["text-align", "left"]]);
    staticUtility("text-center", [["text-align", "center"]]);
    staticUtility("text-right", [["text-align", "right"]]);
    staticUtility("text-justify", [["text-align", "justify"]]);
    staticUtility("text-start", [["text-align", "start"]]);
    staticUtility("text-end", [["text-align", "end"]]);
    spacingUtility("indent", ["--text-indent", "--spacing"], (value2) => [decl("text-indent", value2)], {
      supportsNegative: true,
    });
    staticUtility("align-baseline", [["vertical-align", "baseline"]]);
    staticUtility("align-top", [["vertical-align", "top"]]);
    staticUtility("align-middle", [["vertical-align", "middle"]]);
    staticUtility("align-bottom", [["vertical-align", "bottom"]]);
    staticUtility("align-text-top", [["vertical-align", "text-top"]]);
    staticUtility("align-text-bottom", [["vertical-align", "text-bottom"]]);
    staticUtility("align-sub", [["vertical-align", "sub"]]);
    staticUtility("align-super", [["vertical-align", "super"]]);
    functionalUtility("align", {
      themeKeys: [],
      handle: (value2) => [decl("vertical-align", value2)],
    });
    utilities.functional("font", (candidate) => {
      if (!candidate.value || candidate.modifier) return;
      if (candidate.value.kind === "arbitrary") {
        let value2 = candidate.value.value;
        let type = candidate.value.dataType ?? inferDataType(value2, ["number", "generic-name", "family-name"]);
        switch (type) {
          case "generic-name":
          case "family-name": {
            return [decl("font-family", value2)];
          }
          default: {
            return [
              atRoot([property("--tw-font-weight")]),
              decl("--tw-font-weight", value2),
              decl("font-weight", value2),
            ];
          }
        }
      }
      {
        let value2 = theme2.resolveWith(
          candidate.value.value,
          ["--font"],
          ["--font-feature-settings", "--font-variation-settings"]
        );
        if (value2) {
          let [families, options = {}] = value2;
          return [
            decl("font-family", families),
            decl("font-feature-settings", options["--font-feature-settings"]),
            decl("font-variation-settings", options["--font-variation-settings"]),
          ];
        }
      }
      {
        let value2 = theme2.resolve(candidate.value.value, ["--font-weight"]);
        if (value2) {
          return [
            atRoot([property("--tw-font-weight")]),
            decl("--tw-font-weight", value2),
            decl("font-weight", value2),
          ];
        }
      }
    });
    suggest("font", () => [
      {
        values: [],
        valueThemeKeys: ["--font"],
      },
      {
        values: [],
        valueThemeKeys: ["--font-weight"],
      },
    ]);
    staticUtility("uppercase", [["text-transform", "uppercase"]]);
    staticUtility("lowercase", [["text-transform", "lowercase"]]);
    staticUtility("capitalize", [["text-transform", "capitalize"]]);
    staticUtility("normal-case", [["text-transform", "none"]]);
    staticUtility("italic", [["font-style", "italic"]]);
    staticUtility("not-italic", [["font-style", "normal"]]);
    staticUtility("underline", [["text-decoration-line", "underline"]]);
    staticUtility("overline", [["text-decoration-line", "overline"]]);
    staticUtility("line-through", [["text-decoration-line", "line-through"]]);
    staticUtility("no-underline", [["text-decoration-line", "none"]]);
    staticUtility("font-stretch-normal", [["font-stretch", "normal"]]);
    staticUtility("font-stretch-ultra-condensed", [["font-stretch", "ultra-condensed"]]);
    staticUtility("font-stretch-extra-condensed", [["font-stretch", "extra-condensed"]]);
    staticUtility("font-stretch-condensed", [["font-stretch", "condensed"]]);
    staticUtility("font-stretch-semi-condensed", [["font-stretch", "semi-condensed"]]);
    staticUtility("font-stretch-semi-expanded", [["font-stretch", "semi-expanded"]]);
    staticUtility("font-stretch-expanded", [["font-stretch", "expanded"]]);
    staticUtility("font-stretch-extra-expanded", [["font-stretch", "extra-expanded"]]);
    staticUtility("font-stretch-ultra-expanded", [["font-stretch", "ultra-expanded"]]);
    functionalUtility("font-stretch", {
      handleBareValue: ({ value: value2 }) => {
        if (!value2.endsWith("%")) return null;
        let num = Number(value2.slice(0, -1));
        if (!isPositiveInteger(num)) return null;
        if (Number.isNaN(num) || num < 50 || num > 200) return null;
        return value2;
      },
      handle: (value2) => [decl("font-stretch", value2)],
    });
    suggest("font-stretch", () => [
      {
        values: ["50%", "75%", "90%", "95%", "100%", "105%", "110%", "125%", "150%", "200%"],
      },
    ]);
    colorUtility("placeholder", {
      themeKeys: ["--background-color", "--color"],
      handle: (value2) => [
        styleRule("&::placeholder", [decl("--tw-sort", "placeholder-color"), decl("color", value2)]),
      ],
    });
    staticUtility("decoration-solid", [["text-decoration-style", "solid"]]);
    staticUtility("decoration-double", [["text-decoration-style", "double"]]);
    staticUtility("decoration-dotted", [["text-decoration-style", "dotted"]]);
    staticUtility("decoration-dashed", [["text-decoration-style", "dashed"]]);
    staticUtility("decoration-wavy", [["text-decoration-style", "wavy"]]);
    staticUtility("decoration-auto", [["text-decoration-thickness", "auto"]]);
    staticUtility("decoration-from-font", [["text-decoration-thickness", "from-font"]]);
    utilities.functional("decoration", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") {
        let value2 = candidate.value.value;
        let type = candidate.value.dataType ?? inferDataType(value2, ["color", "length", "percentage"]);
        switch (type) {
          case "length":
          case "percentage": {
            if (candidate.modifier) return;
            return [decl("text-decoration-thickness", value2)];
          }
          default: {
            value2 = asColor(value2, candidate.modifier, theme2);
            if (value2 === null) return;
            return [decl("text-decoration-color", value2)];
          }
        }
      }
      {
        let value2 = theme2.resolve(candidate.value.value, ["--text-decoration-thickness"]);
        if (value2) {
          if (candidate.modifier) return;
          return [decl("text-decoration-thickness", value2)];
        }
        if (isPositiveInteger(candidate.value.value)) {
          if (candidate.modifier) return;
          return [decl("text-decoration-thickness", `${candidate.value.value}px`)];
        }
      }
      {
        let value2 = resolveThemeColor(candidate, theme2, ["--text-decoration-color", "--color"]);
        if (value2) {
          return [decl("text-decoration-color", value2)];
        }
      }
    });
    suggest("decoration", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--text-decoration-color", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
      {
        values: ["0", "1", "2"],
        valueThemeKeys: ["--text-decoration-thickness"],
      },
    ]);
    staticUtility("animate-none", [["animation", "none"]]);
    functionalUtility("animate", {
      themeKeys: ["--animate"],
      handle: (value2) => [decl("animation", value2)],
    });
    {
      let cssFilterValue = [
        "var(--tw-blur,)",
        "var(--tw-brightness,)",
        "var(--tw-contrast,)",
        "var(--tw-grayscale,)",
        "var(--tw-hue-rotate,)",
        "var(--tw-invert,)",
        "var(--tw-saturate,)",
        "var(--tw-sepia,)",
        "var(--tw-drop-shadow,)",
      ].join(" ");
      let cssBackdropFilterValue = [
        "var(--tw-backdrop-blur,)",
        "var(--tw-backdrop-brightness,)",
        "var(--tw-backdrop-contrast,)",
        "var(--tw-backdrop-grayscale,)",
        "var(--tw-backdrop-hue-rotate,)",
        "var(--tw-backdrop-invert,)",
        "var(--tw-backdrop-opacity,)",
        "var(--tw-backdrop-saturate,)",
        "var(--tw-backdrop-sepia,)",
      ].join(" ");
      let filterProperties = () => {
        return atRoot([
          property("--tw-blur"),
          property("--tw-brightness"),
          property("--tw-contrast"),
          property("--tw-grayscale"),
          property("--tw-hue-rotate"),
          property("--tw-invert"),
          property("--tw-opacity"),
          property("--tw-saturate"),
          property("--tw-sepia"),
          property("--tw-drop-shadow"),
          property("--tw-drop-shadow-color"),
          property("--tw-drop-shadow-alpha", "100%", "<percentage>"),
          property("--tw-drop-shadow-size"),
        ]);
      };
      let backdropFilterProperties = () => {
        return atRoot([
          property("--tw-backdrop-blur"),
          property("--tw-backdrop-brightness"),
          property("--tw-backdrop-contrast"),
          property("--tw-backdrop-grayscale"),
          property("--tw-backdrop-hue-rotate"),
          property("--tw-backdrop-invert"),
          property("--tw-backdrop-opacity"),
          property("--tw-backdrop-saturate"),
          property("--tw-backdrop-sepia"),
        ]);
      };
      utilities.functional("filter", (candidate) => {
        if (candidate.modifier) return;
        if (candidate.value === null) {
          return [filterProperties(), decl("filter", cssFilterValue)];
        }
        if (candidate.value.kind === "arbitrary") {
          return [decl("filter", candidate.value.value)];
        }
        switch (candidate.value.value) {
          case "none":
            return [decl("filter", "none")];
        }
      });
      utilities.functional("backdrop-filter", (candidate) => {
        if (candidate.modifier) return;
        if (candidate.value === null) {
          return [
            backdropFilterProperties(),
            decl("-webkit-backdrop-filter", cssBackdropFilterValue),
            decl("backdrop-filter", cssBackdropFilterValue),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          return [
            decl("-webkit-backdrop-filter", candidate.value.value),
            decl("backdrop-filter", candidate.value.value),
          ];
        }
        switch (candidate.value.value) {
          case "none":
            return [decl("-webkit-backdrop-filter", "none"), decl("backdrop-filter", "none")];
        }
      });
      functionalUtility("blur", {
        themeKeys: ["--blur"],
        handle: (value2) => [filterProperties(), decl("--tw-blur", `blur(${value2})`), decl("filter", cssFilterValue)],
      });
      staticUtility("blur-none", [filterProperties, ["--tw-blur", " "], ["filter", cssFilterValue]]);
      functionalUtility("backdrop-blur", {
        themeKeys: ["--backdrop-blur", "--blur"],
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-blur", `blur(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      staticUtility("backdrop-blur-none", [
        backdropFilterProperties,
        ["--tw-backdrop-blur", " "],
        ["-webkit-backdrop-filter", cssBackdropFilterValue],
        ["backdrop-filter", cssBackdropFilterValue],
      ]);
      functionalUtility("brightness", {
        themeKeys: ["--brightness"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          filterProperties(),
          decl("--tw-brightness", `brightness(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-brightness", {
        themeKeys: ["--backdrop-brightness", "--brightness"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-brightness", `brightness(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("brightness", () => [
        {
          values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"],
          valueThemeKeys: ["--brightness"],
        },
      ]);
      suggest("backdrop-brightness", () => [
        {
          values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"],
          valueThemeKeys: ["--backdrop-brightness", "--brightness"],
        },
      ]);
      functionalUtility("contrast", {
        themeKeys: ["--contrast"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          filterProperties(),
          decl("--tw-contrast", `contrast(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-contrast", {
        themeKeys: ["--backdrop-contrast", "--contrast"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-contrast", `contrast(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("contrast", () => [
        {
          values: ["0", "50", "75", "100", "125", "150", "200"],
          valueThemeKeys: ["--contrast"],
        },
      ]);
      suggest("backdrop-contrast", () => [
        {
          values: ["0", "50", "75", "100", "125", "150", "200"],
          valueThemeKeys: ["--backdrop-contrast", "--contrast"],
        },
      ]);
      functionalUtility("grayscale", {
        themeKeys: ["--grayscale"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        defaultValue: "100%",
        handle: (value2) => [
          filterProperties(),
          decl("--tw-grayscale", `grayscale(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-grayscale", {
        themeKeys: ["--backdrop-grayscale", "--grayscale"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        defaultValue: "100%",
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-grayscale", `grayscale(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("grayscale", () => [
        {
          values: ["0", "25", "50", "75", "100"],
          valueThemeKeys: ["--grayscale"],
          hasDefaultValue: true,
        },
      ]);
      suggest("backdrop-grayscale", () => [
        {
          values: ["0", "25", "50", "75", "100"],
          valueThemeKeys: ["--backdrop-grayscale", "--grayscale"],
          hasDefaultValue: true,
        },
      ]);
      functionalUtility("hue-rotate", {
        supportsNegative: true,
        themeKeys: ["--hue-rotate"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}deg`;
        },
        handle: (value2) => [
          filterProperties(),
          decl("--tw-hue-rotate", `hue-rotate(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-hue-rotate", {
        supportsNegative: true,
        themeKeys: ["--backdrop-hue-rotate", "--hue-rotate"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}deg`;
        },
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-hue-rotate", `hue-rotate(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("hue-rotate", () => [
        {
          values: ["0", "15", "30", "60", "90", "180"],
          valueThemeKeys: ["--hue-rotate"],
        },
      ]);
      suggest("backdrop-hue-rotate", () => [
        {
          values: ["0", "15", "30", "60", "90", "180"],
          valueThemeKeys: ["--backdrop-hue-rotate", "--hue-rotate"],
        },
      ]);
      functionalUtility("invert", {
        themeKeys: ["--invert"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        defaultValue: "100%",
        handle: (value2) => [
          filterProperties(),
          decl("--tw-invert", `invert(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-invert", {
        themeKeys: ["--backdrop-invert", "--invert"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        defaultValue: "100%",
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-invert", `invert(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("invert", () => [
        {
          values: ["0", "25", "50", "75", "100"],
          valueThemeKeys: ["--invert"],
          hasDefaultValue: true,
        },
      ]);
      suggest("backdrop-invert", () => [
        {
          values: ["0", "25", "50", "75", "100"],
          valueThemeKeys: ["--backdrop-invert", "--invert"],
          hasDefaultValue: true,
        },
      ]);
      functionalUtility("saturate", {
        themeKeys: ["--saturate"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          filterProperties(),
          decl("--tw-saturate", `saturate(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-saturate", {
        themeKeys: ["--backdrop-saturate", "--saturate"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-saturate", `saturate(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("saturate", () => [
        {
          values: ["0", "50", "100", "150", "200"],
          valueThemeKeys: ["--saturate"],
        },
      ]);
      suggest("backdrop-saturate", () => [
        {
          values: ["0", "50", "100", "150", "200"],
          valueThemeKeys: ["--backdrop-saturate", "--saturate"],
        },
      ]);
      functionalUtility("sepia", {
        themeKeys: ["--sepia"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        defaultValue: "100%",
        handle: (value2) => [
          filterProperties(),
          decl("--tw-sepia", `sepia(${value2})`),
          decl("filter", cssFilterValue),
        ],
      });
      functionalUtility("backdrop-sepia", {
        themeKeys: ["--backdrop-sepia", "--sepia"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}%`;
        },
        defaultValue: "100%",
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-sepia", `sepia(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("sepia", () => [
        {
          values: ["0", "50", "100"],
          valueThemeKeys: ["--sepia"],
          hasDefaultValue: true,
        },
      ]);
      suggest("backdrop-sepia", () => [
        {
          values: ["0", "50", "100"],
          valueThemeKeys: ["--backdrop-sepia", "--sepia"],
          hasDefaultValue: true,
        },
      ]);
      staticUtility("drop-shadow-none", [filterProperties, ["--tw-drop-shadow", " "], ["filter", cssFilterValue]]);
      utilities.functional("drop-shadow", (candidate) => {
        let alpha2;
        if (candidate.modifier) {
          if (candidate.modifier.kind === "arbitrary") {
            alpha2 = candidate.modifier.value;
          } else {
            if (isPositiveInteger(candidate.modifier.value)) {
              alpha2 = `${candidate.modifier.value}%`;
            }
          }
        }
        if (!candidate.value) {
          let value2 = theme2.get(["--drop-shadow"]);
          let resolved = theme2.resolve(null, ["--drop-shadow"]);
          if (value2 === null || resolved === null) return;
          return [
            filterProperties(),
            decl("--tw-drop-shadow-alpha", alpha2),
            ...alphaReplacedDropShadowProperties(
              "--tw-drop-shadow-size",
              value2,
              alpha2,
              (color) => `var(--tw-drop-shadow-color, ${color})`
            ),
            decl(
              "--tw-drop-shadow",
              segment(resolved, ",")
                .map((value3) => `drop-shadow(${value3})`)
                .join(" ")
            ),
            decl("filter", cssFilterValue),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color"]);
          switch (type) {
            case "color": {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [
                filterProperties(),
                decl("--tw-drop-shadow-color", withAlpha(value2, "var(--tw-drop-shadow-alpha)")),
                decl("--tw-drop-shadow", `var(--tw-drop-shadow-size)`),
              ];
            }
            default: {
              if (candidate.modifier && !alpha2) return;
              return [
                filterProperties(),
                decl("--tw-drop-shadow-alpha", alpha2),
                ...alphaReplacedDropShadowProperties(
                  "--tw-drop-shadow-size",
                  value2,
                  alpha2,
                  (color) => `var(--tw-drop-shadow-color, ${color})`
                ),
                decl("--tw-drop-shadow", `var(--tw-drop-shadow-size)`),
                decl("filter", cssFilterValue),
              ];
            }
          }
        }
        {
          let value2 = theme2.get([`--drop-shadow-${candidate.value.value}`]);
          let resolved = theme2.resolve(candidate.value.value, ["--drop-shadow"]);
          if (value2 && resolved) {
            if (candidate.modifier && !alpha2) return;
            if (alpha2) {
              return [
                filterProperties(),
                decl("--tw-drop-shadow-alpha", alpha2),
                ...alphaReplacedDropShadowProperties(
                  "--tw-drop-shadow-size",
                  value2,
                  alpha2,
                  (color) => `var(--tw-drop-shadow-color, ${color})`
                ),
                decl("--tw-drop-shadow", `var(--tw-drop-shadow-size)`),
                decl("filter", cssFilterValue),
              ];
            }
            return [
              filterProperties(),
              decl("--tw-drop-shadow-alpha", alpha2),
              ...alphaReplacedDropShadowProperties(
                "--tw-drop-shadow-size",
                value2,
                alpha2,
                (color) => `var(--tw-drop-shadow-color, ${color})`
              ),
              decl(
                "--tw-drop-shadow",
                segment(resolved, ",")
                  .map((value3) => `drop-shadow(${value3})`)
                  .join(" ")
              ),
              decl("filter", cssFilterValue),
            ];
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--drop-shadow-color", "--color"]);
          if (value2) {
            if (value2 === "inherit") {
              return [
                filterProperties(),
                decl("--tw-drop-shadow-color", "inherit"),
                decl("--tw-drop-shadow", `var(--tw-drop-shadow-size)`),
              ];
            }
            return [
              filterProperties(),
              decl("--tw-drop-shadow-color", withAlpha(value2, "var(--tw-drop-shadow-alpha)")),
              decl("--tw-drop-shadow", `var(--tw-drop-shadow-size)`),
            ];
          }
        }
      });
      suggest("drop-shadow", () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--drop-shadow-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          valueThemeKeys: ["--drop-shadow"],
        },
      ]);
      functionalUtility("backdrop-opacity", {
        themeKeys: ["--backdrop-opacity", "--opacity"],
        handleBareValue: ({ value: value2 }) => {
          if (!isValidOpacityValue(value2)) return null;
          return `${value2}%`;
        },
        handle: (value2) => [
          backdropFilterProperties(),
          decl("--tw-backdrop-opacity", `opacity(${value2})`),
          decl("-webkit-backdrop-filter", cssBackdropFilterValue),
          decl("backdrop-filter", cssBackdropFilterValue),
        ],
      });
      suggest("backdrop-opacity", () => [
        {
          values: Array.from({ length: 21 }, (_, i) => `${i * 5}`),
          valueThemeKeys: ["--backdrop-opacity", "--opacity"],
        },
      ]);
    }
    {
      let defaultTimingFunction = `var(--tw-ease, ${
        theme2.resolve(null, ["--default-transition-timing-function"]) ?? "ease"
      })`;
      let defaultDuration = `var(--tw-duration, ${theme2.resolve(null, ["--default-transition-duration"]) ?? "0s"})`;
      staticUtility("transition-none", [["transition-property", "none"]]);
      staticUtility("transition-all", [
        ["transition-property", "all"],
        ["transition-timing-function", defaultTimingFunction],
        ["transition-duration", defaultDuration],
      ]);
      staticUtility("transition-colors", [
        [
          "transition-property",
          "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to",
        ],
        ["transition-timing-function", defaultTimingFunction],
        ["transition-duration", defaultDuration],
      ]);
      staticUtility("transition-opacity", [
        ["transition-property", "opacity"],
        ["transition-timing-function", defaultTimingFunction],
        ["transition-duration", defaultDuration],
      ]);
      staticUtility("transition-shadow", [
        ["transition-property", "box-shadow"],
        ["transition-timing-function", defaultTimingFunction],
        ["transition-duration", defaultDuration],
      ]);
      staticUtility("transition-transform", [
        ["transition-property", "transform, translate, scale, rotate"],
        ["transition-timing-function", defaultTimingFunction],
        ["transition-duration", defaultDuration],
      ]);
      functionalUtility("transition", {
        defaultValue:
          "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, visibility, content-visibility, overlay, pointer-events",
        themeKeys: ["--transition-property"],
        handle: (value2) => [
          decl("transition-property", value2),
          decl("transition-timing-function", defaultTimingFunction),
          decl("transition-duration", defaultDuration),
        ],
      });
      staticUtility("transition-discrete", [["transition-behavior", "allow-discrete"]]);
      staticUtility("transition-normal", [["transition-behavior", "normal"]]);
      functionalUtility("delay", {
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}ms`;
        },
        themeKeys: ["--transition-delay"],
        handle: (value2) => [decl("transition-delay", value2)],
      });
      {
        let transitionDurationProperty = () => {
          return atRoot([property("--tw-duration")]);
        };
        staticUtility("duration-initial", [transitionDurationProperty, ["--tw-duration", "initial"]]);
        utilities.functional("duration", (candidate) => {
          if (candidate.modifier) return;
          if (!candidate.value) return;
          let value2 = null;
          if (candidate.value.kind === "arbitrary") {
            value2 = candidate.value.value;
          } else {
            value2 = theme2.resolve(candidate.value.fraction ?? candidate.value.value, ["--transition-duration"]);
            if (value2 === null && isPositiveInteger(candidate.value.value)) {
              value2 = `${candidate.value.value}ms`;
            }
          }
          if (value2 === null) return;
          return [transitionDurationProperty(), decl("--tw-duration", value2), decl("transition-duration", value2)];
        });
      }
      suggest("delay", () => [
        {
          values: ["75", "100", "150", "200", "300", "500", "700", "1000"],
          valueThemeKeys: ["--transition-delay"],
        },
      ]);
      suggest("duration", () => [
        {
          values: ["75", "100", "150", "200", "300", "500", "700", "1000"],
          valueThemeKeys: ["--transition-duration"],
        },
      ]);
    }
    {
      let transitionTimingFunctionProperty = () => {
        return atRoot([property("--tw-ease")]);
      };
      staticUtility("ease-initial", [transitionTimingFunctionProperty, ["--tw-ease", "initial"]]);
      staticUtility("ease-linear", [
        transitionTimingFunctionProperty,
        ["--tw-ease", "linear"],
        ["transition-timing-function", "linear"],
      ]);
      functionalUtility("ease", {
        themeKeys: ["--ease"],
        handle: (value2) => [
          transitionTimingFunctionProperty(),
          decl("--tw-ease", value2),
          decl("transition-timing-function", value2),
        ],
      });
    }
    staticUtility("will-change-auto", [["will-change", "auto"]]);
    staticUtility("will-change-scroll", [["will-change", "scroll-position"]]);
    staticUtility("will-change-contents", [["will-change", "contents"]]);
    staticUtility("will-change-transform", [["will-change", "transform"]]);
    functionalUtility("will-change", {
      themeKeys: [],
      handle: (value2) => [decl("will-change", value2)],
    });
    staticUtility("content-none", [
      ["--tw-content", "none"],
      ["content", "none"],
    ]);
    functionalUtility("content", {
      themeKeys: [],
      handle: (value2) => [
        atRoot([property("--tw-content", '""')]),
        decl("--tw-content", value2),
        decl("content", "var(--tw-content)"),
      ],
    });
    {
      let cssContainValue =
        "var(--tw-contain-size,) var(--tw-contain-layout,) var(--tw-contain-paint,) var(--tw-contain-style,)";
      let cssContainProperties = () => {
        return atRoot([
          property("--tw-contain-size"),
          property("--tw-contain-layout"),
          property("--tw-contain-paint"),
          property("--tw-contain-style"),
        ]);
      };
      staticUtility("contain-none", [["contain", "none"]]);
      staticUtility("contain-content", [["contain", "content"]]);
      staticUtility("contain-strict", [["contain", "strict"]]);
      staticUtility("contain-size", [
        cssContainProperties,
        ["--tw-contain-size", "size"],
        ["contain", cssContainValue],
      ]);
      staticUtility("contain-inline-size", [
        cssContainProperties,
        ["--tw-contain-size", "inline-size"],
        ["contain", cssContainValue],
      ]);
      staticUtility("contain-layout", [
        cssContainProperties,
        ["--tw-contain-layout", "layout"],
        ["contain", cssContainValue],
      ]);
      staticUtility("contain-paint", [
        cssContainProperties,
        ["--tw-contain-paint", "paint"],
        ["contain", cssContainValue],
      ]);
      staticUtility("contain-style", [
        cssContainProperties,
        ["--tw-contain-style", "style"],
        ["contain", cssContainValue],
      ]);
      functionalUtility("contain", {
        themeKeys: [],
        handle: (value2) => [decl("contain", value2)],
      });
    }
    staticUtility("forced-color-adjust-none", [["forced-color-adjust", "none"]]);
    staticUtility("forced-color-adjust-auto", [["forced-color-adjust", "auto"]]);
    staticUtility("leading-none", [
      () => atRoot([property("--tw-leading")]),
      ["--tw-leading", "1"],
      ["line-height", "1"],
    ]);
    spacingUtility("leading", ["--leading", "--spacing"], (value2) => [
      atRoot([property("--tw-leading")]),
      decl("--tw-leading", value2),
      decl("line-height", value2),
    ]);
    functionalUtility("tracking", {
      supportsNegative: true,
      themeKeys: ["--tracking"],
      handle: (value2) => [
        atRoot([property("--tw-tracking")]),
        decl("--tw-tracking", value2),
        decl("letter-spacing", value2),
      ],
    });
    staticUtility("antialiased", [
      ["-webkit-font-smoothing", "antialiased"],
      ["-moz-osx-font-smoothing", "grayscale"],
    ]);
    staticUtility("subpixel-antialiased", [
      ["-webkit-font-smoothing", "auto"],
      ["-moz-osx-font-smoothing", "auto"],
    ]);
    {
      let cssFontVariantNumericValue =
        "var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)";
      let fontVariantNumericProperties = () => {
        return atRoot([
          property("--tw-ordinal"),
          property("--tw-slashed-zero"),
          property("--tw-numeric-figure"),
          property("--tw-numeric-spacing"),
          property("--tw-numeric-fraction"),
        ]);
      };
      staticUtility("normal-nums", [["font-variant-numeric", "normal"]]);
      staticUtility("ordinal", [
        fontVariantNumericProperties,
        ["--tw-ordinal", "ordinal"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("slashed-zero", [
        fontVariantNumericProperties,
        ["--tw-slashed-zero", "slashed-zero"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("lining-nums", [
        fontVariantNumericProperties,
        ["--tw-numeric-figure", "lining-nums"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("oldstyle-nums", [
        fontVariantNumericProperties,
        ["--tw-numeric-figure", "oldstyle-nums"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("proportional-nums", [
        fontVariantNumericProperties,
        ["--tw-numeric-spacing", "proportional-nums"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("tabular-nums", [
        fontVariantNumericProperties,
        ["--tw-numeric-spacing", "tabular-nums"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("diagonal-fractions", [
        fontVariantNumericProperties,
        ["--tw-numeric-fraction", "diagonal-fractions"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
      staticUtility("stacked-fractions", [
        fontVariantNumericProperties,
        ["--tw-numeric-fraction", "stacked-fractions"],
        ["font-variant-numeric", cssFontVariantNumericValue],
      ]);
    }
    {
      let outlineProperties = () => {
        return atRoot([property("--tw-outline-style", "solid")]);
      };
      utilities.static("outline-hidden", () => {
        return [
          decl("--tw-outline-style", "none"),
          decl("outline-style", "none"),
          atRule("@media", "(forced-colors: active)", [
            decl("outline", "2px solid transparent"),
            decl("outline-offset", "2px"),
          ]),
        ];
      });
      staticUtility("outline-none", [
        ["--tw-outline-style", "none"],
        ["outline-style", "none"],
      ]);
      staticUtility("outline-solid", [
        ["--tw-outline-style", "solid"],
        ["outline-style", "solid"],
      ]);
      staticUtility("outline-dashed", [
        ["--tw-outline-style", "dashed"],
        ["outline-style", "dashed"],
      ]);
      staticUtility("outline-dotted", [
        ["--tw-outline-style", "dotted"],
        ["outline-style", "dotted"],
      ]);
      staticUtility("outline-double", [
        ["--tw-outline-style", "double"],
        ["outline-style", "double"],
      ]);
      utilities.functional("outline", (candidate) => {
        if (candidate.value === null) {
          if (candidate.modifier) return;
          let value2 = theme2.get(["--default-outline-width"]) ?? "1px";
          return [outlineProperties(), decl("outline-style", "var(--tw-outline-style)"), decl("outline-width", value2)];
        }
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color", "length", "number", "percentage"]);
          switch (type) {
            case "length":
            case "number":
            case "percentage": {
              if (candidate.modifier) return;
              return [
                outlineProperties(),
                decl("outline-style", "var(--tw-outline-style)"),
                decl("outline-width", value2),
              ];
            }
            default: {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [decl("outline-color", value2)];
            }
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--outline-color", "--color"]);
          if (value2) {
            return [decl("outline-color", value2)];
          }
        }
        {
          if (candidate.modifier) return;
          let value2 = theme2.resolve(candidate.value.value, ["--outline-width"]);
          if (value2) {
            return [
              outlineProperties(),
              decl("outline-style", "var(--tw-outline-style)"),
              decl("outline-width", value2),
            ];
          } else if (isPositiveInteger(candidate.value.value)) {
            return [
              outlineProperties(),
              decl("outline-style", "var(--tw-outline-style)"),
              decl("outline-width", `${candidate.value.value}px`),
            ];
          }
        }
      });
      suggest("outline", () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--outline-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
          hasDefaultValue: true,
        },
        {
          values: ["0", "1", "2", "4", "8"],
          valueThemeKeys: ["--outline-width"],
        },
      ]);
      functionalUtility("outline-offset", {
        supportsNegative: true,
        themeKeys: ["--outline-offset"],
        handleBareValue: ({ value: value2 }) => {
          if (!isPositiveInteger(value2)) return null;
          return `${value2}px`;
        },
        handle: (value2) => [decl("outline-offset", value2)],
      });
      suggest("outline-offset", () => [
        {
          supportsNegative: true,
          values: ["0", "1", "2", "4", "8"],
          valueThemeKeys: ["--outline-offset"],
        },
      ]);
    }
    functionalUtility("opacity", {
      themeKeys: ["--opacity"],
      handleBareValue: ({ value: value2 }) => {
        if (!isValidOpacityValue(value2)) return null;
        return `${value2}%`;
      },
      handle: (value2) => [decl("opacity", value2)],
    });
    suggest("opacity", () => [
      {
        values: Array.from({ length: 21 }, (_, i) => `${i * 5}`),
        valueThemeKeys: ["--opacity"],
      },
    ]);
    staticUtility("underline-offset-auto", [["text-underline-offset", "auto"]]);
    functionalUtility("underline-offset", {
      supportsNegative: true,
      themeKeys: ["--text-underline-offset"],
      handleBareValue: ({ value: value2 }) => {
        if (!isPositiveInteger(value2)) return null;
        return `${value2}px`;
      },
      handle: (value2) => [decl("text-underline-offset", value2)],
    });
    suggest("underline-offset", () => [
      {
        supportsNegative: true,
        values: ["0", "1", "2", "4", "8"],
        valueThemeKeys: ["--text-underline-offset"],
      },
    ]);
    utilities.functional("text", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") {
        let value2 = candidate.value.value;
        let type =
          candidate.value.dataType ??
          inferDataType(value2, ["color", "length", "percentage", "absolute-size", "relative-size"]);
        switch (type) {
          case "size":
          case "length":
          case "percentage":
          case "absolute-size":
          case "relative-size": {
            if (candidate.modifier) {
              let modifier =
                candidate.modifier.kind === "arbitrary"
                  ? candidate.modifier.value
                  : theme2.resolve(candidate.modifier.value, ["--leading"]);
              if (!modifier && isValidSpacingMultiplier(candidate.modifier.value)) {
                let multiplier = theme2.resolve(null, ["--spacing"]);
                if (!multiplier) return null;
                modifier = `calc(${multiplier} * ${candidate.modifier.value})`;
              }
              if (!modifier && candidate.modifier.value === "none") {
                modifier = "1";
              }
              if (modifier) {
                return [decl("font-size", value2), decl("line-height", modifier)];
              }
              return null;
            }
            return [decl("font-size", value2)];
          }
          default: {
            value2 = asColor(value2, candidate.modifier, theme2);
            if (value2 === null) return;
            return [decl("color", value2)];
          }
        }
      }
      {
        let value2 = resolveThemeColor(candidate, theme2, ["--text-color", "--color"]);
        if (value2) {
          return [decl("color", value2)];
        }
      }
      {
        let value2 = theme2.resolveWith(
          candidate.value.value,
          ["--text"],
          ["--line-height", "--letter-spacing", "--font-weight"]
        );
        if (value2) {
          let [fontSize, options = {}] = Array.isArray(value2) ? value2 : [value2];
          if (candidate.modifier) {
            let modifier =
              candidate.modifier.kind === "arbitrary"
                ? candidate.modifier.value
                : theme2.resolve(candidate.modifier.value, ["--leading"]);
            if (!modifier && isValidSpacingMultiplier(candidate.modifier.value)) {
              let multiplier = theme2.resolve(null, ["--spacing"]);
              if (!multiplier) return null;
              modifier = `calc(${multiplier} * ${candidate.modifier.value})`;
            }
            if (!modifier && candidate.modifier.value === "none") {
              modifier = "1";
            }
            if (!modifier) {
              return null;
            }
            let declarations = [decl("font-size", fontSize)];
            modifier && declarations.push(decl("line-height", modifier));
            return declarations;
          }
          if (typeof options === "string") {
            return [decl("font-size", fontSize), decl("line-height", options)];
          }
          return [
            decl("font-size", fontSize),
            decl("line-height", options["--line-height"] ? `var(--tw-leading, ${options["--line-height"]})` : void 0),
            decl(
              "letter-spacing",
              options["--letter-spacing"] ? `var(--tw-tracking, ${options["--letter-spacing"]})` : void 0
            ),
            decl(
              "font-weight",
              options["--font-weight"] ? `var(--tw-font-weight, ${options["--font-weight"]})` : void 0
            ),
          ];
        }
      }
    });
    suggest("text", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--text-color", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
      {
        values: [],
        valueThemeKeys: ["--text"],
        modifiers: [],
        modifierThemeKeys: ["--leading"],
      },
    ]);
    let textShadowProperties = () => {
      return atRoot([property("--tw-text-shadow-color"), property("--tw-text-shadow-alpha", "100%", "<percentage>")]);
    };
    staticUtility("text-shadow-initial", [textShadowProperties, ["--tw-text-shadow-color", "initial"]]);
    utilities.functional("text-shadow", (candidate) => {
      let alpha2;
      if (candidate.modifier) {
        if (candidate.modifier.kind === "arbitrary") {
          alpha2 = candidate.modifier.value;
        } else {
          if (isPositiveInteger(candidate.modifier.value)) {
            alpha2 = `${candidate.modifier.value}%`;
          }
        }
      }
      if (!candidate.value) {
        let value2 = theme2.get(["--text-shadow"]);
        if (value2 === null) return;
        return [
          textShadowProperties(),
          decl("--tw-text-shadow-alpha", alpha2),
          ...alphaReplacedShadowProperties(
            "text-shadow",
            value2,
            alpha2,
            (color) => `var(--tw-text-shadow-color, ${color})`
          ),
        ];
      }
      if (candidate.value.kind === "arbitrary") {
        let value2 = candidate.value.value;
        let type = candidate.value.dataType ?? inferDataType(value2, ["color"]);
        switch (type) {
          case "color": {
            value2 = asColor(value2, candidate.modifier, theme2);
            if (value2 === null) return;
            return [
              textShadowProperties(),
              decl("--tw-text-shadow-color", withAlpha(value2, "var(--tw-text-shadow-alpha)")),
            ];
          }
          default: {
            return [
              textShadowProperties(),
              decl("--tw-text-shadow-alpha", alpha2),
              ...alphaReplacedShadowProperties(
                "text-shadow",
                value2,
                alpha2,
                (color) => `var(--tw-text-shadow-color, ${color})`
              ),
            ];
          }
        }
      }
      switch (candidate.value.value) {
        case "none":
          if (candidate.modifier) return;
          return [textShadowProperties(), decl("text-shadow", "none")];
        case "inherit":
          if (candidate.modifier) return;
          return [textShadowProperties(), decl("--tw-text-shadow-color", "inherit")];
      }
      {
        let value2 = theme2.get([`--text-shadow-${candidate.value.value}`]);
        if (value2) {
          return [
            textShadowProperties(),
            decl("--tw-text-shadow-alpha", alpha2),
            ...alphaReplacedShadowProperties(
              "text-shadow",
              value2,
              alpha2,
              (color) => `var(--tw-text-shadow-color, ${color})`
            ),
          ];
        }
      }
      {
        let value2 = resolveThemeColor(candidate, theme2, ["--text-shadow-color", "--color"]);
        if (value2) {
          return [
            textShadowProperties(),
            decl("--tw-text-shadow-color", withAlpha(value2, "var(--tw-text-shadow-alpha)")),
          ];
        }
      }
    });
    suggest("text-shadow", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--text-shadow-color", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
      {
        values: ["none"],
      },
      {
        valueThemeKeys: ["--text-shadow"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        hasDefaultValue: theme2.get(["--text-shadow"]) !== null,
      },
    ]);
    {
      let ringShadowValue2 = function (value2) {
          return `var(--tw-ring-inset,) 0 0 0 calc(${value2} + var(--tw-ring-offset-width)) var(--tw-ring-color, ${defaultRingColor})`;
        },
        insetRingShadowValue2 = function (value2) {
          return `inset 0 0 0 ${value2} var(--tw-inset-ring-color, currentcolor)`;
        };
      var ringShadowValue = ringShadowValue2,
        insetRingShadowValue = insetRingShadowValue2;
      let cssBoxShadowValue = [
        "var(--tw-inset-shadow)",
        "var(--tw-inset-ring-shadow)",
        "var(--tw-ring-offset-shadow)",
        "var(--tw-ring-shadow)",
        "var(--tw-shadow)",
      ].join(", ");
      let nullShadow = "0 0 #0000";
      let boxShadowProperties = () => {
        return atRoot([
          property("--tw-shadow", nullShadow),
          property("--tw-shadow-color"),
          property("--tw-shadow-alpha", "100%", "<percentage>"),
          property("--tw-inset-shadow", nullShadow),
          property("--tw-inset-shadow-color"),
          property("--tw-inset-shadow-alpha", "100%", "<percentage>"),
          property("--tw-ring-color"),
          property("--tw-ring-shadow", nullShadow),
          property("--tw-inset-ring-color"),
          property("--tw-inset-ring-shadow", nullShadow),
          // Legacy
          property("--tw-ring-inset"),
          property("--tw-ring-offset-width", "0px", "<length>"),
          property("--tw-ring-offset-color", "#fff"),
          property("--tw-ring-offset-shadow", nullShadow),
        ]);
      };
      staticUtility("shadow-initial", [boxShadowProperties, ["--tw-shadow-color", "initial"]]);
      utilities.functional("shadow", (candidate) => {
        let alpha2;
        if (candidate.modifier) {
          if (candidate.modifier.kind === "arbitrary") {
            alpha2 = candidate.modifier.value;
          } else {
            if (isPositiveInteger(candidate.modifier.value)) {
              alpha2 = `${candidate.modifier.value}%`;
            }
          }
        }
        if (!candidate.value) {
          let value2 = theme2.get(["--shadow"]);
          if (value2 === null) return;
          return [
            boxShadowProperties(),
            decl("--tw-shadow-alpha", alpha2),
            ...alphaReplacedShadowProperties(
              "--tw-shadow",
              value2,
              alpha2,
              (color) => `var(--tw-shadow-color, ${color})`
            ),
            decl("box-shadow", cssBoxShadowValue),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color"]);
          switch (type) {
            case "color": {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [boxShadowProperties(), decl("--tw-shadow-color", withAlpha(value2, "var(--tw-shadow-alpha)"))];
            }
            default: {
              return [
                boxShadowProperties(),
                decl("--tw-shadow-alpha", alpha2),
                ...alphaReplacedShadowProperties(
                  "--tw-shadow",
                  value2,
                  alpha2,
                  (color) => `var(--tw-shadow-color, ${color})`
                ),
                decl("box-shadow", cssBoxShadowValue),
              ];
            }
          }
        }
        switch (candidate.value.value) {
          case "none":
            if (candidate.modifier) return;
            return [boxShadowProperties(), decl("--tw-shadow", nullShadow), decl("box-shadow", cssBoxShadowValue)];
          case "inherit":
            if (candidate.modifier) return;
            return [boxShadowProperties(), decl("--tw-shadow-color", "inherit")];
        }
        {
          let value2 = theme2.get([`--shadow-${candidate.value.value}`]);
          if (value2) {
            return [
              boxShadowProperties(),
              decl("--tw-shadow-alpha", alpha2),
              ...alphaReplacedShadowProperties(
                "--tw-shadow",
                value2,
                alpha2,
                (color) => `var(--tw-shadow-color, ${color})`
              ),
              decl("box-shadow", cssBoxShadowValue),
            ];
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--box-shadow-color", "--color"]);
          if (value2) {
            return [boxShadowProperties(), decl("--tw-shadow-color", withAlpha(value2, "var(--tw-shadow-alpha)"))];
          }
        }
      });
      suggest("shadow", () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--box-shadow-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          values: ["none"],
        },
        {
          valueThemeKeys: ["--shadow"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
          hasDefaultValue: theme2.get(["--shadow"]) !== null,
        },
      ]);
      staticUtility("inset-shadow-initial", [boxShadowProperties, ["--tw-inset-shadow-color", "initial"]]);
      utilities.functional("inset-shadow", (candidate) => {
        let alpha2;
        if (candidate.modifier) {
          if (candidate.modifier.kind === "arbitrary") {
            alpha2 = candidate.modifier.value;
          } else {
            if (isPositiveInteger(candidate.modifier.value)) {
              alpha2 = `${candidate.modifier.value}%`;
            }
          }
        }
        if (!candidate.value) {
          let value2 = theme2.get(["--inset-shadow"]);
          if (value2 === null) return;
          return [
            boxShadowProperties(),
            decl("--tw-inset-shadow-alpha", alpha2),
            ...alphaReplacedShadowProperties(
              "--tw-inset-shadow",
              value2,
              alpha2,
              (color) => `var(--tw-inset-shadow-color, ${color})`
            ),
            decl("box-shadow", cssBoxShadowValue),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color"]);
          switch (type) {
            case "color": {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [
                boxShadowProperties(),
                decl("--tw-inset-shadow-color", withAlpha(value2, "var(--tw-inset-shadow-alpha)")),
              ];
            }
            default: {
              return [
                boxShadowProperties(),
                decl("--tw-inset-shadow-alpha", alpha2),
                ...alphaReplacedShadowProperties(
                  "--tw-inset-shadow",
                  value2,
                  alpha2,
                  (color) => `var(--tw-inset-shadow-color, ${color})`,
                  "inset "
                ),
                decl("box-shadow", cssBoxShadowValue),
              ];
            }
          }
        }
        switch (candidate.value.value) {
          case "none":
            if (candidate.modifier) return;
            return [
              boxShadowProperties(),
              decl("--tw-inset-shadow", nullShadow),
              decl("box-shadow", cssBoxShadowValue),
            ];
          case "inherit":
            if (candidate.modifier) return;
            return [boxShadowProperties(), decl("--tw-inset-shadow-color", "inherit")];
        }
        {
          let value2 = theme2.get([`--inset-shadow-${candidate.value.value}`]);
          if (value2) {
            return [
              boxShadowProperties(),
              decl("--tw-inset-shadow-alpha", alpha2),
              ...alphaReplacedShadowProperties(
                "--tw-inset-shadow",
                value2,
                alpha2,
                (color) => `var(--tw-inset-shadow-color, ${color})`
              ),
              decl("box-shadow", cssBoxShadowValue),
            ];
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--box-shadow-color", "--color"]);
          if (value2) {
            return [
              boxShadowProperties(),
              decl("--tw-inset-shadow-color", withAlpha(value2, "var(--tw-inset-shadow-alpha)")),
            ];
          }
        }
      });
      suggest("inset-shadow", () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--box-shadow-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          values: ["none"],
        },
        {
          valueThemeKeys: ["--inset-shadow"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
          hasDefaultValue: theme2.get(["--inset-shadow"]) !== null,
        },
      ]);
      staticUtility("ring-inset", [boxShadowProperties, ["--tw-ring-inset", "inset"]]);
      let defaultRingColor = theme2.get(["--default-ring-color"]) ?? "currentcolor";
      utilities.functional("ring", (candidate) => {
        if (!candidate.value) {
          if (candidate.modifier) return;
          let value2 = theme2.get(["--default-ring-width"]) ?? "1px";
          return [
            boxShadowProperties(),
            decl("--tw-ring-shadow", ringShadowValue2(value2)),
            decl("box-shadow", cssBoxShadowValue),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color", "length"]);
          switch (type) {
            case "length": {
              if (candidate.modifier) return;
              return [
                boxShadowProperties(),
                decl("--tw-ring-shadow", ringShadowValue2(value2)),
                decl("box-shadow", cssBoxShadowValue),
              ];
            }
            default: {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [decl("--tw-ring-color", value2)];
            }
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--ring-color", "--color"]);
          if (value2) {
            return [decl("--tw-ring-color", value2)];
          }
        }
        {
          if (candidate.modifier) return;
          let value2 = theme2.resolve(candidate.value.value, ["--ring-width"]);
          if (value2 === null && isPositiveInteger(candidate.value.value)) {
            value2 = `${candidate.value.value}px`;
          }
          if (value2) {
            return [
              boxShadowProperties(),
              decl("--tw-ring-shadow", ringShadowValue2(value2)),
              decl("box-shadow", cssBoxShadowValue),
            ];
          }
        }
      });
      suggest("ring", () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--ring-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          values: ["0", "1", "2", "4", "8"],
          valueThemeKeys: ["--ring-width"],
          hasDefaultValue: true,
        },
      ]);
      utilities.functional("inset-ring", (candidate) => {
        if (!candidate.value) {
          if (candidate.modifier) return;
          return [
            boxShadowProperties(),
            decl("--tw-inset-ring-shadow", insetRingShadowValue2("1px")),
            decl("box-shadow", cssBoxShadowValue),
          ];
        }
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color", "length"]);
          switch (type) {
            case "length": {
              if (candidate.modifier) return;
              return [
                boxShadowProperties(),
                decl("--tw-inset-ring-shadow", insetRingShadowValue2(value2)),
                decl("box-shadow", cssBoxShadowValue),
              ];
            }
            default: {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [decl("--tw-inset-ring-color", value2)];
            }
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--ring-color", "--color"]);
          if (value2) {
            return [decl("--tw-inset-ring-color", value2)];
          }
        }
        {
          if (candidate.modifier) return;
          let value2 = theme2.resolve(candidate.value.value, ["--ring-width"]);
          if (value2 === null && isPositiveInteger(candidate.value.value)) {
            value2 = `${candidate.value.value}px`;
          }
          if (value2) {
            return [
              boxShadowProperties(),
              decl("--tw-inset-ring-shadow", insetRingShadowValue2(value2)),
              decl("box-shadow", cssBoxShadowValue),
            ];
          }
        }
      });
      suggest("inset-ring", () => [
        {
          values: ["current", "inherit", "transparent"],
          valueThemeKeys: ["--ring-color", "--color"],
          modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
        },
        {
          values: ["0", "1", "2", "4", "8"],
          valueThemeKeys: ["--ring-width"],
          hasDefaultValue: true,
        },
      ]);
      let ringOffsetShadowValue = "var(--tw-ring-inset,) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)";
      utilities.functional("ring-offset", (candidate) => {
        if (!candidate.value) return;
        if (candidate.value.kind === "arbitrary") {
          let value2 = candidate.value.value;
          let type = candidate.value.dataType ?? inferDataType(value2, ["color", "length"]);
          switch (type) {
            case "length": {
              if (candidate.modifier) return;
              return [decl("--tw-ring-offset-width", value2), decl("--tw-ring-offset-shadow", ringOffsetShadowValue)];
            }
            default: {
              value2 = asColor(value2, candidate.modifier, theme2);
              if (value2 === null) return;
              return [decl("--tw-ring-offset-color", value2)];
            }
          }
        }
        {
          let value2 = theme2.resolve(candidate.value.value, ["--ring-offset-width"]);
          if (value2) {
            if (candidate.modifier) return;
            return [decl("--tw-ring-offset-width", value2), decl("--tw-ring-offset-shadow", ringOffsetShadowValue)];
          } else if (isPositiveInteger(candidate.value.value)) {
            if (candidate.modifier) return;
            return [
              decl("--tw-ring-offset-width", `${candidate.value.value}px`),
              decl("--tw-ring-offset-shadow", ringOffsetShadowValue),
            ];
          }
        }
        {
          let value2 = resolveThemeColor(candidate, theme2, ["--ring-offset-color", "--color"]);
          if (value2) {
            return [decl("--tw-ring-offset-color", value2)];
          }
        }
      });
    }
    suggest("ring-offset", () => [
      {
        values: ["current", "inherit", "transparent"],
        valueThemeKeys: ["--ring-offset-color", "--color"],
        modifiers: Array.from({ length: 21 }, (_, index) => `${index * 5}`),
      },
      {
        values: ["0", "1", "2", "4", "8"],
        valueThemeKeys: ["--ring-offset-width"],
      },
    ]);
    utilities.functional("@container", (candidate) => {
      let value2 = null;
      if (candidate.value === null) {
        value2 = "inline-size";
      } else if (candidate.value.kind === "arbitrary") {
        value2 = candidate.value.value;
      } else if (candidate.value.kind === "named" && candidate.value.value === "normal") {
        value2 = "normal";
      }
      if (value2 === null) return;
      if (candidate.modifier) {
        return [decl("container-type", value2), decl("container-name", candidate.modifier.value)];
      }
      return [decl("container-type", value2)];
    });
    suggest("@container", () => [
      {
        values: ["normal"],
        valueThemeKeys: [],
        hasDefaultValue: true,
      },
    ]);
    return utilities;
  }
  var BARE_VALUE_DATA_TYPES = [
    "number",
    // 2.5
    "integer",
    // 8
    "ratio",
    // 2/3
    "percentage",
    // 25%
  ];
  function createCssUtility(node) {
    let name = node.params;
    if (IS_VALID_FUNCTIONAL_UTILITY_NAME.test(name)) {
      return (designSystem) => {
        let storage = {
          "--value": {
            usedSpacingInteger: false,
            usedSpacingNumber: false,
            themeKeys: /* @__PURE__ */ new Set(),
            literals: /* @__PURE__ */ new Set(),
          },
          "--modifier": {
            usedSpacingInteger: false,
            usedSpacingNumber: false,
            themeKeys: /* @__PURE__ */ new Set(),
            literals: /* @__PURE__ */ new Set(),
          },
        };
        walk2(node.nodes, (child) => {
          if (child.kind !== "declaration") return;
          if (!child.value) return;
          if (!child.value.includes("--value(") && !child.value.includes("--modifier(")) return;
          let declarationValueAst = parse2(child.value);
          walk(declarationValueAst, (fn) => {
            if (fn.kind !== "function") return;
            if (
              fn.value === "--spacing" && // Quick bail check if we already know that `--value` and `--modifier` are
              // using the full `--spacing` theme scale.
              !(storage["--modifier"].usedSpacingNumber && storage["--value"].usedSpacingNumber)
            ) {
              walk(fn.nodes, (node2) => {
                if (node2.kind !== "function") return;
                if (node2.value !== "--value" && node2.value !== "--modifier") return;
                const key = node2.value;
                for (let arg of node2.nodes) {
                  if (arg.kind !== "word") continue;
                  if (arg.value === "integer") {
                    storage[key].usedSpacingInteger ||= true;
                  } else if (arg.value === "number") {
                    storage[key].usedSpacingNumber ||= true;
                    if (storage["--modifier"].usedSpacingNumber && storage["--value"].usedSpacingNumber) {
                      return 2 /* Stop */;
                    }
                  }
                }
              });
              return 0 /* Continue */;
            }
            if (fn.value !== "--value" && fn.value !== "--modifier") return;
            let args = segment(toCss(fn.nodes), ",");
            for (let [idx, arg] of args.entries()) {
              arg = arg.replace(/\\\*/g, "*");
              arg = arg.replace(/--(.*?)\s--(.*?)/g, "--$1-*--$2");
              arg = arg.replace(/\s+/g, "");
              arg = arg.replace(/(-\*){2,}/g, "-*");
              if (arg[0] === "-" && arg[1] === "-" && !arg.includes("-*")) {
                arg += "-*";
              }
              args[idx] = arg;
            }
            fn.nodes = parse2(args.join(","));
            for (let node2 of fn.nodes) {
              if (
                node2.kind === "word" &&
                (node2.value[0] === '"' || node2.value[0] === "'") &&
                node2.value[0] === node2.value[node2.value.length - 1]
              ) {
                let value2 = node2.value.slice(1, -1);
                storage[fn.value].literals.add(value2);
              } else if (node2.kind === "word" && node2.value[0] === "-" && node2.value[1] === "-") {
                let value2 = node2.value.replace(/-\*.*$/g, "");
                storage[fn.value].themeKeys.add(value2);
              } else if (
                node2.kind === "word" &&
                !(node2.value[0] === "[" && node2.value[node2.value.length - 1] === "]") && // Ignore arbitrary values
                !BARE_VALUE_DATA_TYPES.includes(node2.value)
              ) {
                console.warn(
                  `Unsupported bare value data type: "${node2.value}".
Only valid data types are: ${BARE_VALUE_DATA_TYPES.map((x) => `"${x}"`).join(", ")}.
`
                );
                let dataType = node2.value;
                let copy = structuredClone(fn);
                let sentinelValue = "\xB6";
                walk(copy.nodes, (node3, { replaceWith }) => {
                  if (node3.kind === "word" && node3.value === dataType) {
                    replaceWith({ kind: "word", value: sentinelValue });
                  }
                });
                let underline = "^".repeat(toCss([node2]).length);
                let offset = toCss([copy]).indexOf(sentinelValue);
                let output = ["```css", toCss([fn]), " ".repeat(offset) + underline, "```"].join("\n");
                console.warn(output);
              }
            }
          });
          child.value = toCss(declarationValueAst);
        });
        designSystem.utilities.functional(name.slice(0, -2), (candidate) => {
          let atRule2 = structuredClone(node);
          let value2 = candidate.value;
          let modifier = candidate.modifier;
          if (value2 === null) return;
          let usedValueFn = false;
          let resolvedValueFn = false;
          let usedModifierFn = false;
          let resolvedModifierFn = false;
          let resolvedDeclarations = /* @__PURE__ */ new Map();
          let resolvedRatioValue = false;
          walk2([atRule2], (node2, { parent, replaceWith: replaceDeclarationWith }) => {
            if (parent?.kind !== "rule" && parent?.kind !== "at-rule") return;
            if (node2.kind !== "declaration") return;
            if (!node2.value) return;
            let valueAst = parse2(node2.value);
            let result =
              walk(valueAst, (valueNode, { replaceWith }) => {
                if (valueNode.kind !== "function") return;
                if (valueNode.value === "--value") {
                  usedValueFn = true;
                  let resolved = resolveValueFunction(value2, valueNode, designSystem);
                  if (resolved) {
                    resolvedValueFn = true;
                    if (resolved.ratio) {
                      resolvedRatioValue = true;
                    } else {
                      resolvedDeclarations.set(node2, parent);
                    }
                    replaceWith(resolved.nodes);
                    return 1 /* Skip */;
                  }
                  usedValueFn ||= false;
                  replaceDeclarationWith([]);
                  return 2 /* Stop */;
                } else if (valueNode.value === "--modifier") {
                  if (modifier === null) {
                    replaceDeclarationWith([]);
                    return 2 /* Stop */;
                  }
                  usedModifierFn = true;
                  let replacement = resolveValueFunction(modifier, valueNode, designSystem);
                  if (replacement) {
                    resolvedModifierFn = true;
                    replaceWith(replacement.nodes);
                    return 1 /* Skip */;
                  }
                  usedModifierFn ||= false;
                  replaceDeclarationWith([]);
                  return 2 /* Stop */;
                }
              }) ?? 0; /* Continue */
            if (result === 0 /* Continue */) {
              node2.value = toCss(valueAst);
            }
          });
          if (usedValueFn && !resolvedValueFn) return null;
          if (usedModifierFn && !resolvedModifierFn) return null;
          if (resolvedRatioValue && resolvedModifierFn) return null;
          if (modifier && !resolvedRatioValue && !resolvedModifierFn) return null;
          if (resolvedRatioValue) {
            for (let [declaration, parent] of resolvedDeclarations) {
              let idx = parent.nodes.indexOf(declaration);
              if (idx !== -1) parent.nodes.splice(idx, 1);
            }
          }
          return atRule2.nodes;
        });
        designSystem.utilities.suggest(name.slice(0, -2), () => {
          let values = [];
          let modifiers = [];
          for (let [target, { literals, usedSpacingNumber, usedSpacingInteger, themeKeys }] of [
            [values, storage["--value"]],
            [modifiers, storage["--modifier"]],
          ]) {
            for (let value2 of literals) {
              target.push(value2);
            }
            if (usedSpacingNumber) {
              target.push(...DEFAULT_SPACING_SUGGESTIONS);
            } else if (usedSpacingInteger) {
              for (let value2 of DEFAULT_SPACING_SUGGESTIONS) {
                if (isPositiveInteger(value2)) {
                  target.push(value2);
                }
              }
            }
            for (let value2 of designSystem.theme.keysInNamespaces(themeKeys)) {
              target.push(
                value2.replace(LEGACY_NUMERIC_KEY, (_, a, b) => {
                  return `${a}.${b}`;
                })
              );
            }
          }
          return [{ values, modifiers }];
        });
      };
    }
    if (IS_VALID_STATIC_UTILITY_NAME.test(name)) {
      return (designSystem) => {
        designSystem.utilities.static(name, () => structuredClone(node.nodes));
      };
    }
    return null;
  }
  function resolveValueFunction(value2, fn, designSystem) {
    for (let arg of fn.nodes) {
      if (
        value2.kind === "named" &&
        arg.kind === "word" && // Should be wreapped in quotes
        (arg.value[0] === "'" || arg.value[0] === '"') &&
        arg.value[arg.value.length - 1] === arg.value[0] && // Values should match
        arg.value.slice(1, -1) === value2.value
      ) {
        return { nodes: parse2(value2.value) };
      } else if (value2.kind === "named" && arg.kind === "word" && arg.value[0] === "-" && arg.value[1] === "-") {
        let themeKey = arg.value;
        if (themeKey.endsWith("-*")) {
          themeKey = themeKey.slice(0, -2);
          let resolved = designSystem.theme.resolve(value2.value, [themeKey]);
          if (resolved) return { nodes: parse2(resolved) };
        } else {
          let nestedKeys = themeKey.split("-*");
          if (nestedKeys.length <= 1) continue;
          let themeKeys = [nestedKeys.shift()];
          let resolved = designSystem.theme.resolveWith(value2.value, themeKeys, nestedKeys);
          if (resolved) {
            let [, options = {}] = resolved;
            {
              let resolved2 = options[nestedKeys.pop()];
              if (resolved2) return { nodes: parse2(resolved2) };
            }
          }
        }
      } else if (value2.kind === "named" && arg.kind === "word") {
        if (!BARE_VALUE_DATA_TYPES.includes(arg.value)) {
          continue;
        }
        let resolved = arg.value === "ratio" && "fraction" in value2 ? value2.fraction : value2.value;
        if (!resolved) continue;
        let type = inferDataType(resolved, [arg.value]);
        if (type === null) continue;
        if (type === "ratio") {
          let [lhs, rhs] = segment(resolved, "/");
          if (!isPositiveInteger(lhs) || !isPositiveInteger(rhs)) continue;
        } else if (type === "number" && !isValidSpacingMultiplier(resolved)) {
          continue;
        } else if (type === "percentage" && !isPositiveInteger(resolved.slice(0, -1))) {
          continue;
        }
        return { nodes: parse2(resolved), ratio: type === "ratio" };
      } else if (
        value2.kind === "arbitrary" &&
        arg.kind === "word" &&
        arg.value[0] === "[" &&
        arg.value[arg.value.length - 1] === "]"
      ) {
        let dataType = arg.value.slice(1, -1);
        if (dataType === "*") {
          return { nodes: parse2(value2.value) };
        }
        if ("dataType" in value2 && value2.dataType && value2.dataType !== dataType) {
          continue;
        }
        if ("dataType" in value2 && value2.dataType) {
          return { nodes: parse2(value2.value) };
        }
        let type = inferDataType(value2.value, [dataType]);
        if (type !== null) {
          return { nodes: parse2(value2.value) };
        }
      }
    }
  }
  function alphaReplacedShadowProperties(property2, value2, alpha2, varInjector, prefix = "") {
    let requiresFallback = false;
    let replacedValue = replaceShadowColors(value2, (color) => {
      if (alpha2 == null) {
        return varInjector(color);
      }
      if (color.startsWith("current")) {
        return varInjector(withAlpha(color, alpha2));
      }
      if (color.startsWith("var(") || alpha2.startsWith("var(")) {
        requiresFallback = true;
      }
      return varInjector(replaceAlpha(color, alpha2));
    });
    function applyPrefix(x) {
      if (!prefix) return x;
      return segment(x, ",")
        .map((value3) => prefix + value3)
        .join(",");
    }
    if (requiresFallback) {
      return [
        decl(property2, applyPrefix(replaceShadowColors(value2, varInjector))),
        rule("@supports (color: lab(from red l a b))", [decl(property2, applyPrefix(replacedValue))]),
      ];
    } else {
      return [decl(property2, applyPrefix(replacedValue))];
    }
  }
  function alphaReplacedDropShadowProperties(property2, value2, alpha2, varInjector, prefix = "") {
    let requiresFallback = false;
    let replacedValue = segment(value2, ",")
      .map((value3) =>
        replaceShadowColors(value3, (color) => {
          if (alpha2 == null) {
            return varInjector(color);
          }
          if (color.startsWith("current")) {
            return varInjector(withAlpha(color, alpha2));
          }
          if (color.startsWith("var(") || alpha2.startsWith("var(")) {
            requiresFallback = true;
          }
          return varInjector(replaceAlpha(color, alpha2));
        })
      )
      .map((value3) => `drop-shadow(${value3})`)
      .join(" ");
    if (requiresFallback) {
      return [
        decl(
          property2,
          prefix +
            segment(value2, ",")
              .map((value3) => `drop-shadow(${replaceShadowColors(value3, varInjector)})`)
              .join(" ")
        ),
        rule("@supports (color: lab(from red l a b))", [decl(property2, prefix + replacedValue)]),
      ];
    } else {
      return [decl(property2, prefix + replacedValue)];
    }
  }

  // ../tailwindcss/src/css-functions.ts
  var CSS_FUNCTIONS = {
    "--alpha": alpha,
    "--spacing": spacing,
    "--theme": theme,
    theme: legacyTheme,
  };
  function alpha(_designSystem, _source, value2, ...rest) {
    let [color, alpha2] = segment(value2, "/").map((v) => v.trim());
    if (!color || !alpha2) {
      throw new Error(
        `The --alpha(\u2026) function requires a color and an alpha value, e.g.: \`--alpha(${
          color || "var(--my-color)"
        } / ${alpha2 || "50%"})\``
      );
    }
    if (rest.length > 0) {
      throw new Error(
        `The --alpha(\u2026) function only accepts one argument, e.g.: \`--alpha(${color || "var(--my-color)"} / ${
          alpha2 || "50%"
        })\``
      );
    }
    return withAlpha(color, alpha2);
  }
  function spacing(designSystem, _source, value2, ...rest) {
    if (!value2) {
      throw new Error(`The --spacing(\u2026) function requires an argument, but received none.`);
    }
    if (rest.length > 0) {
      throw new Error(
        `The --spacing(\u2026) function only accepts a single argument, but received ${rest.length + 1}.`
      );
    }
    let multiplier = designSystem.theme.resolve(null, ["--spacing"]);
    if (!multiplier) {
      throw new Error(
        "The --spacing(\u2026) function requires that the `--spacing` theme variable exists, but it was not found."
      );
    }
    return `calc(${multiplier} * ${value2})`;
  }
  function theme(designSystem, source, path, ...fallback) {
    if (!path.startsWith("--")) {
      throw new Error(`The --theme(\u2026) function can only be used with CSS variables from your theme.`);
    }
    let inline = false;
    if (path.endsWith(" inline")) {
      inline = true;
      path = path.slice(0, -7);
    }
    if (source.kind === "at-rule") {
      inline = true;
    }
    let resolvedValue = designSystem.resolveThemeValue(path, inline);
    if (!resolvedValue) {
      if (fallback.length > 0) return fallback.join(", ");
      throw new Error(
        `Could not resolve value for theme function: \`theme(${path})\`. Consider checking if the variable name is correct or provide a fallback value to silence this error.`
      );
    }
    if (fallback.length === 0) {
      return resolvedValue;
    }
    let joinedFallback = fallback.join(", ");
    if (joinedFallback === "initial") return resolvedValue;
    if (resolvedValue === "initial") return joinedFallback;
    if (
      resolvedValue.startsWith("var(") ||
      resolvedValue.startsWith("theme(") ||
      resolvedValue.startsWith("--theme(")
    ) {
      let valueAst = parse2(resolvedValue);
      injectFallbackForInitialFallback(valueAst, joinedFallback);
      return toCss(valueAst);
    }
    return resolvedValue;
  }
  function legacyTheme(designSystem, _source, path, ...fallback) {
    path = eventuallyUnquote(path);
    let resolvedValue = designSystem.resolveThemeValue(path);
    if (!resolvedValue && fallback.length > 0) {
      return fallback.join(", ");
    }
    if (!resolvedValue) {
      throw new Error(
        `Could not resolve value for theme function: \`theme(${path})\`. Consider checking if the path is correct or provide a fallback value to silence this error.`
      );
    }
    return resolvedValue;
  }
  var THEME_FUNCTION_INVOCATION = new RegExp(
    Object.keys(CSS_FUNCTIONS)
      .map((x) => `${x}\\(`)
      .join("|")
  );
  function substituteFunctions(ast, designSystem) {
    let features = 0; /* None */
    walk2(ast, (node) => {
      if (node.kind === "declaration" && node.value && THEME_FUNCTION_INVOCATION.test(node.value)) {
        features |= 8 /* ThemeFunction */;
        node.value = substituteFunctionsInValue(node.value, node, designSystem);
        return;
      }
      if (node.kind === "at-rule") {
        if (
          (node.name === "@media" ||
            node.name === "@custom-media" ||
            node.name === "@container" ||
            node.name === "@supports") &&
          THEME_FUNCTION_INVOCATION.test(node.params)
        ) {
          features |= 8 /* ThemeFunction */;
          node.params = substituteFunctionsInValue(node.params, node, designSystem);
        }
      }
    });
    return features;
  }
  function substituteFunctionsInValue(value2, source, designSystem) {
    let ast = parse2(value2);
    walk(ast, (node, { replaceWith }) => {
      if (node.kind === "function" && node.value in CSS_FUNCTIONS) {
        let args = segment(toCss(node.nodes).trim(), ",").map((x) => x.trim());
        let result = CSS_FUNCTIONS[node.value](designSystem, source, ...args);
        return replaceWith(parse2(result));
      }
    });
    return toCss(ast);
  }
  function eventuallyUnquote(value2) {
    if (value2[0] !== "'" && value2[0] !== '"') return value2;
    let unquoted = "";
    let quoteChar = value2[0];
    for (let i = 1; i < value2.length - 1; i++) {
      let currentChar = value2[i];
      let nextChar = value2[i + 1];
      if (currentChar === "\\" && (nextChar === quoteChar || nextChar === "\\")) {
        unquoted += nextChar;
        i++;
      } else {
        unquoted += currentChar;
      }
    }
    return unquoted;
  }
  function injectFallbackForInitialFallback(ast, fallback) {
    walk(ast, (node) => {
      if (node.kind !== "function") return;
      if (node.value !== "var" && node.value !== "theme" && node.value !== "--theme") return;
      if (node.nodes.length === 1) {
        node.nodes.push({
          kind: "word",
          value: `, ${fallback}`,
        });
      } else {
        let lastNode = node.nodes[node.nodes.length - 1];
        if (lastNode.kind === "word" && lastNode.value === "initial") {
          lastNode.value = fallback;
        }
      }
    });
  }

  // ../tailwindcss/src/utils/compare.ts
  var ZERO = 48;
  var NINE = 57;
  function compare(a, z) {
    let aLen = a.length;
    let zLen = z.length;
    let minLen = aLen < zLen ? aLen : zLen;
    for (let i = 0; i < minLen; i++) {
      let aCode = a.charCodeAt(i);
      let zCode = z.charCodeAt(i);
      if (aCode >= ZERO && aCode <= NINE && zCode >= ZERO && zCode <= NINE) {
        let aStart = i;
        let aEnd = i + 1;
        let zStart = i;
        let zEnd = i + 1;
        aCode = a.charCodeAt(aEnd);
        while (aCode >= ZERO && aCode <= NINE) aCode = a.charCodeAt(++aEnd);
        zCode = z.charCodeAt(zEnd);
        while (zCode >= ZERO && zCode <= NINE) zCode = z.charCodeAt(++zEnd);
        let aNumber = a.slice(aStart, aEnd);
        let zNumber = z.slice(zStart, zEnd);
        let diff = Number(aNumber) - Number(zNumber);
        if (diff) return diff;
        if (aNumber < zNumber) return -1;
        if (aNumber > zNumber) return 1;
        continue;
      }
      if (aCode === zCode) continue;
      return aCode - zCode;
    }
    return a.length - z.length;
  }

  // ../tailwindcss/src/intellisense.ts
  var IS_FRACTION2 = /^\d+\/\d+$/;
  function getClassList(design) {
    let items = new DefaultMap((utility) => ({
      name: utility,
      utility,
      fraction: false,
      modifiers: [],
    }));
    for (let utility of design.utilities.keys("static")) {
      let item = items.get(utility);
      item.fraction = false;
      item.modifiers = [];
    }
    for (let utility of design.utilities.keys("functional")) {
      let completions = design.utilities.getCompletions(utility);
      for (let group of completions) {
        for (let value2 of group.values) {
          let fraction = value2 !== null && IS_FRACTION2.test(value2);
          let name = value2 === null ? utility : `${utility}-${value2}`;
          let item = items.get(name);
          item.utility = utility;
          item.fraction ||= fraction;
          item.modifiers.push(...group.modifiers);
          if (group.supportsNegative) {
            let item2 = items.get(`-${name}`);
            item2.utility = `-${utility}`;
            item2.fraction ||= fraction;
            item2.modifiers.push(...group.modifiers);
          }
        }
      }
    }
    if (items.size === 0) return [];
    let list = Array.from(items.values());
    list.sort((a, b) => compare(a.name, b.name));
    let entries = sortFractionsLast(list);
    return entries;
  }
  function sortFractionsLast(list) {
    let buckets = [];
    let current = null;
    let lastUtilityBucket = /* @__PURE__ */ new Map();
    let fractions = new DefaultMap(() => []);
    for (let item of list) {
      let { utility, fraction } = item;
      if (!current) {
        current = { utility, items: [] };
        lastUtilityBucket.set(utility, current);
      }
      if (utility !== current.utility) {
        buckets.push(current);
        current = { utility, items: [] };
        lastUtilityBucket.set(utility, current);
      }
      if (fraction) {
        fractions.get(utility).push(item);
      } else {
        current.items.push(item);
      }
    }
    if (current && buckets[buckets.length - 1] !== current) {
      buckets.push(current);
    }
    for (let [utility, items] of fractions) {
      let bucket = lastUtilityBucket.get(utility);
      if (!bucket) continue;
      bucket.items.push(...items);
    }
    let entries = [];
    for (let bucket of buckets) {
      for (let entry of bucket.items) {
        entries.push([entry.name, { modifiers: entry.modifiers }]);
      }
    }
    return entries;
  }
  function getVariants(design) {
    let list = [];
    for (let [root, variant] of design.variants.entries()) {
      let selectors2 = function ({ value: value2, modifier } = {}) {
        let name = root;
        if (value2) name += hasDash ? `-${value2}` : value2;
        if (modifier) name += `/${modifier}`;
        let variant2 = design.parseVariant(name);
        if (!variant2) return [];
        let node = styleRule(".__placeholder__", []);
        if (applyVariant(node, variant2, design.variants) === null) {
          return [];
        }
        let selectors3 = [];
        walkDepth(node.nodes, (node2, { path }) => {
          if (node2.kind !== "rule" && node2.kind !== "at-rule") return;
          if (node2.nodes.length > 0) return;
          path.sort((a, b) => {
            let aIsAtRule = a.kind === "at-rule";
            let bIsAtRule = b.kind === "at-rule";
            if (aIsAtRule && !bIsAtRule) return -1;
            if (!aIsAtRule && bIsAtRule) return 1;
            return 0;
          });
          let group = path.flatMap((node3) => {
            if (node3.kind === "rule") {
              return node3.selector === "&" ? [] : [node3.selector];
            }
            if (node3.kind === "at-rule") {
              return [`${node3.name} ${node3.params}`];
            }
            return [];
          });
          let selector2 = "";
          for (let i = group.length - 1; i >= 0; i--) {
            selector2 = selector2 === "" ? group[i] : `${group[i]} { ${selector2} }`;
          }
          selectors3.push(selector2);
        });
        return selectors3;
      };
      var selectors = selectors2;
      if (variant.kind === "arbitrary") continue;
      let hasDash = root !== "@";
      let values = design.variants.getCompletions(root);
      switch (variant.kind) {
        case "static": {
          list.push({
            name: root,
            values,
            isArbitrary: false,
            hasDash,
            selectors: selectors2,
          });
          break;
        }
        case "functional": {
          list.push({
            name: root,
            values,
            isArbitrary: true,
            hasDash,
            selectors: selectors2,
          });
          break;
        }
        case "compound": {
          list.push({
            name: root,
            values,
            isArbitrary: true,
            hasDash,
            selectors: selectors2,
          });
          break;
        }
      }
    }
    return list;
  }

  // ../tailwindcss/src/sort.ts
  function getClassOrder(design, classes2) {
    let { astNodes, nodeSorting } = compileCandidates(Array.from(classes2), design);
    let sorted = new Map(classes2.map((className) => [className, null]));
    let idx = 0n;
    for (let node of astNodes) {
      let candidate = nodeSorting.get(node)?.candidate;
      if (!candidate) continue;
      sorted.set(candidate, sorted.get(candidate) ?? idx++);
    }
    return classes2.map((className) => [
      //
      className,
      sorted.get(className) ?? null,
    ]);
  }

  // ../tailwindcss/src/variants.ts
  var IS_VALID_VARIANT_NAME = /^@?[a-zA-Z0-9_-]*$/;
  var Variants = class {
    compareFns = /* @__PURE__ */ new Map();
    variants = /* @__PURE__ */ new Map();
    completions = /* @__PURE__ */ new Map();
    /**
     * Registering a group of variants should result in the same sort number for
     * all the variants. This is to ensure that the variants are applied in the
     * correct order.
     */
    groupOrder = null;
    /**
     * Keep track of the last sort order instead of using the size of the map to
     * avoid unnecessarily skipping order numbers.
     */
    lastOrder = 0;
    static(name, applyFn, { compounds, order } = {}) {
      this.set(name, {
        kind: "static",
        applyFn,
        compoundsWith: 0 /* Never */,
        compounds: compounds ?? 2 /* StyleRules */,
        order,
      });
    }
    fromAst(name, ast) {
      let selectors = [];
      walk2(ast, (node) => {
        if (node.kind === "rule") {
          selectors.push(node.selector);
        } else if (node.kind === "at-rule" && node.name !== "@slot") {
          selectors.push(`${node.name} ${node.params}`);
        }
      });
      this.static(
        name,
        (r) => {
          let body = structuredClone(ast);
          substituteAtSlot(body, r.nodes);
          r.nodes = body;
        },
        {
          compounds: compoundsForSelectors(selectors),
        }
      );
    }
    functional(name, applyFn, { compounds, order } = {}) {
      this.set(name, {
        kind: "functional",
        applyFn,
        compoundsWith: 0 /* Never */,
        compounds: compounds ?? 2 /* StyleRules */,
        order,
      });
    }
    compound(name, compoundsWith, applyFn, { compounds, order } = {}) {
      this.set(name, {
        kind: "compound",
        applyFn,
        compoundsWith,
        compounds: compounds ?? 2 /* StyleRules */,
        order,
      });
    }
    group(fn, compareFn) {
      this.groupOrder = this.nextOrder();
      if (compareFn) this.compareFns.set(this.groupOrder, compareFn);
      fn();
      this.groupOrder = null;
    }
    has(name) {
      return this.variants.has(name);
    }
    get(name) {
      return this.variants.get(name);
    }
    kind(name) {
      return this.variants.get(name)?.kind;
    }
    compoundsWith(parent, child) {
      let parentInfo = this.variants.get(parent);
      let childInfo =
        typeof child === "string"
          ? this.variants.get(child)
          : child.kind === "arbitrary"
          ? // This isn't strictly necessary but it'll allow us to bail quickly
            // when parsing candidates
            { compounds: compoundsForSelectors([child.selector]) }
          : this.variants.get(child.root);
      if (!parentInfo || !childInfo) return false;
      if (parentInfo.kind !== "compound") return false;
      if (childInfo.compounds === 0 /* Never */) return false;
      if (parentInfo.compoundsWith === 0 /* Never */) return false;
      if ((parentInfo.compoundsWith & childInfo.compounds) === 0) return false;
      return true;
    }
    suggest(name, suggestions) {
      this.completions.set(name, suggestions);
    }
    getCompletions(name) {
      return this.completions.get(name)?.() ?? [];
    }
    compare(a, z) {
      if (a === z) return 0;
      if (a === null) return -1;
      if (z === null) return 1;
      if (a.kind === "arbitrary" && z.kind === "arbitrary") {
        return a.selector < z.selector ? -1 : 1;
      } else if (a.kind === "arbitrary") {
        return 1;
      } else if (z.kind === "arbitrary") {
        return -1;
      }
      let aOrder = this.variants.get(a.root).order;
      let zOrder = this.variants.get(z.root).order;
      let orderedByVariant = aOrder - zOrder;
      if (orderedByVariant !== 0) return orderedByVariant;
      if (a.kind === "compound" && z.kind === "compound") {
        let order = this.compare(a.variant, z.variant);
        if (order !== 0) return order;
        if (a.modifier && z.modifier) {
          return a.modifier.value < z.modifier.value ? -1 : 1;
        } else if (a.modifier) {
          return 1;
        } else if (z.modifier) {
          return -1;
        } else {
          return 0;
        }
      }
      let compareFn = this.compareFns.get(aOrder);
      if (compareFn !== void 0) return compareFn(a, z);
      if (a.root !== z.root) return a.root < z.root ? -1 : 1;
      let aValue = a.value;
      let zValue = z.value;
      if (aValue === null) return -1;
      if (zValue === null) return 1;
      if (aValue.kind === "arbitrary" && zValue.kind !== "arbitrary") return 1;
      if (aValue.kind !== "arbitrary" && zValue.kind === "arbitrary") return -1;
      return aValue.value < zValue.value ? -1 : 1;
    }
    keys() {
      return this.variants.keys();
    }
    entries() {
      return this.variants.entries();
    }
    set(name, { kind, applyFn, compounds, compoundsWith, order }) {
      let existing = this.variants.get(name);
      if (existing) {
        Object.assign(existing, { kind, applyFn, compounds });
      } else {
        if (order === void 0) {
          this.lastOrder = this.nextOrder();
          order = this.lastOrder;
        }
        this.variants.set(name, {
          kind,
          applyFn,
          order,
          compoundsWith,
          compounds,
        });
      }
    }
    nextOrder() {
      return this.groupOrder ?? this.lastOrder + 1;
    }
  };
  function compoundsForSelectors(selectors) {
    let compounds = 0; /* Never */
    for (let sel of selectors) {
      if (sel[0] === "@") {
        if (!sel.startsWith("@media") && !sel.startsWith("@supports") && !sel.startsWith("@container")) {
          return 0 /* Never */;
        }
        compounds |= 1 /* AtRules */;
        continue;
      }
      if (sel.includes("::")) {
        return 0 /* Never */;
      }
      compounds |= 2 /* StyleRules */;
    }
    return compounds;
  }
  function createVariants(theme2) {
    let variants = new Variants();
    function staticVariant(name, selectors, { compounds } = {}) {
      compounds = compounds ?? compoundsForSelectors(selectors);
      variants.static(
        name,
        (r) => {
          r.nodes = selectors.map((selector2) => rule(selector2, r.nodes));
        },
        { compounds }
      );
    }
    staticVariant("*", [":is(& > *)"], { compounds: 0 /* Never */ });
    staticVariant("**", [":is(& *)"], { compounds: 0 /* Never */ });
    function negateConditions(ruleName, conditions) {
      return conditions.map((condition) => {
        condition = condition.trim();
        let parts = segment(condition, " ");
        if (parts[0] === "not") {
          return parts.slice(1).join(" ");
        }
        if (ruleName === "@container") {
          if (parts[0][0] === "(") {
            return `not ${condition}`;
          } else if (parts[1] === "not") {
            return `${parts[0]} ${parts.slice(2).join(" ")}`;
          } else {
            return `${parts[0]} not ${parts.slice(1).join(" ")}`;
          }
        }
        return `not ${condition}`;
      });
    }
    let conditionalRules = ["@media", "@supports", "@container"];
    function negateAtRule(rule2) {
      for (let ruleName of conditionalRules) {
        if (ruleName !== rule2.name) continue;
        let conditions = segment(rule2.params, ",");
        if (conditions.length > 1) return null;
        conditions = negateConditions(rule2.name, conditions);
        return atRule(rule2.name, conditions.join(", "));
      }
      return null;
    }
    function negateSelector(selector2) {
      if (selector2.includes("::")) return null;
      let selectors = segment(selector2, ",").map((sel) => {
        sel = sel.replaceAll("&", "*");
        return sel;
      });
      return `&:not(${selectors.join(", ")})`;
    }
    variants.compound("not", 2 /* StyleRules */ | 1 /* AtRules */, (ruleNode, variant) => {
      if (variant.variant.kind === "arbitrary" && variant.variant.relative) return null;
      if (variant.modifier) return null;
      let didApply = false;
      walk2([ruleNode], (node, { path }) => {
        if (node.kind !== "rule" && node.kind !== "at-rule") return 0 /* Continue */;
        if (node.nodes.length > 0) return 0 /* Continue */;
        let atRules = [];
        let styleRules = [];
        for (let parent of path) {
          if (parent.kind === "at-rule") {
            atRules.push(parent);
          } else if (parent.kind === "rule") {
            styleRules.push(parent);
          }
        }
        if (atRules.length > 1) return 2 /* Stop */;
        if (styleRules.length > 1) return 2 /* Stop */;
        let rules = [];
        for (let node2 of styleRules) {
          let selector2 = negateSelector(node2.selector);
          if (!selector2) {
            didApply = false;
            return 2 /* Stop */;
          }
          rules.push(styleRule(selector2, []));
        }
        for (let node2 of atRules) {
          let negatedAtRule = negateAtRule(node2);
          if (!negatedAtRule) {
            didApply = false;
            return 2 /* Stop */;
          }
          rules.push(negatedAtRule);
        }
        Object.assign(ruleNode, styleRule("&", rules));
        didApply = true;
        return 1 /* Skip */;
      });
      if (ruleNode.kind === "rule" && ruleNode.selector === "&" && ruleNode.nodes.length === 1) {
        Object.assign(ruleNode, ruleNode.nodes[0]);
      }
      if (!didApply) return null;
    });
    variants.suggest("not", () => {
      return Array.from(variants.keys()).filter((name) => {
        return variants.compoundsWith("not", name);
      });
    });
    variants.compound("group", 2 /* StyleRules */, (ruleNode, variant) => {
      if (variant.variant.kind === "arbitrary" && variant.variant.relative) return null;
      let variantSelector = variant.modifier
        ? `:where(.${theme2.prefix ? `${theme2.prefix}\\:` : ""}group\\/${variant.modifier.value})`
        : `:where(.${theme2.prefix ? `${theme2.prefix}\\:` : ""}group)`;
      let didApply = false;
      walk2([ruleNode], (node, { path }) => {
        if (node.kind !== "rule") return 0 /* Continue */;
        for (let parent of path.slice(0, -1)) {
          if (parent.kind !== "rule") continue;
          didApply = false;
          return 2 /* Stop */;
        }
        let selector2 = node.selector.replaceAll("&", variantSelector);
        if (segment(selector2, ",").length > 1) {
          selector2 = `:is(${selector2})`;
        }
        node.selector = `&:is(${selector2} *)`;
        didApply = true;
      });
      if (!didApply) return null;
    });
    variants.suggest("group", () => {
      return Array.from(variants.keys()).filter((name) => {
        return variants.compoundsWith("group", name);
      });
    });
    variants.compound("peer", 2 /* StyleRules */, (ruleNode, variant) => {
      if (variant.variant.kind === "arbitrary" && variant.variant.relative) return null;
      let variantSelector = variant.modifier
        ? `:where(.${theme2.prefix ? `${theme2.prefix}\\:` : ""}peer\\/${variant.modifier.value})`
        : `:where(.${theme2.prefix ? `${theme2.prefix}\\:` : ""}peer)`;
      let didApply = false;
      walk2([ruleNode], (node, { path }) => {
        if (node.kind !== "rule") return 0 /* Continue */;
        for (let parent of path.slice(0, -1)) {
          if (parent.kind !== "rule") continue;
          didApply = false;
          return 2 /* Stop */;
        }
        let selector2 = node.selector.replaceAll("&", variantSelector);
        if (segment(selector2, ",").length > 1) {
          selector2 = `:is(${selector2})`;
        }
        node.selector = `&:is(${selector2} ~ *)`;
        didApply = true;
      });
      if (!didApply) return null;
    });
    variants.suggest("peer", () => {
      return Array.from(variants.keys()).filter((name) => {
        return variants.compoundsWith("peer", name);
      });
    });
    staticVariant("first-letter", ["&::first-letter"]);
    staticVariant("first-line", ["&::first-line"]);
    staticVariant("marker", ["& *::marker", "&::marker", "& *::-webkit-details-marker", "&::-webkit-details-marker"]);
    staticVariant("selection", ["& *::selection", "&::selection"]);
    staticVariant("file", ["&::file-selector-button"]);
    staticVariant("placeholder", ["&::placeholder"]);
    staticVariant("backdrop", ["&::backdrop"]);
    staticVariant("details-content", ["&::details-content"]);
    {
      let contentProperties2 = function () {
        return atRoot([
          atRule("@property", "--tw-content", [
            decl("syntax", '"*"'),
            decl("initial-value", '""'),
            decl("inherits", "false"),
          ]),
        ]);
      };
      var contentProperties = contentProperties2;
      variants.static(
        "before",
        (v) => {
          v.nodes = [styleRule("&::before", [contentProperties2(), decl("content", "var(--tw-content)"), ...v.nodes])];
        },
        { compounds: 0 /* Never */ }
      );
      variants.static(
        "after",
        (v) => {
          v.nodes = [styleRule("&::after", [contentProperties2(), decl("content", "var(--tw-content)"), ...v.nodes])];
        },
        { compounds: 0 /* Never */ }
      );
    }
    staticVariant("first", ["&:first-child"]);
    staticVariant("last", ["&:last-child"]);
    staticVariant("only", ["&:only-child"]);
    staticVariant("odd", ["&:nth-child(odd)"]);
    staticVariant("even", ["&:nth-child(even)"]);
    staticVariant("first-of-type", ["&:first-of-type"]);
    staticVariant("last-of-type", ["&:last-of-type"]);
    staticVariant("only-of-type", ["&:only-of-type"]);
    staticVariant("visited", ["&:visited"]);
    staticVariant("target", ["&:target"]);
    staticVariant("open", ["&:is([open], :popover-open, :open)"]);
    staticVariant("default", ["&:default"]);
    staticVariant("checked", ["&:checked"]);
    staticVariant("indeterminate", ["&:indeterminate"]);
    staticVariant("placeholder-shown", ["&:placeholder-shown"]);
    staticVariant("autofill", ["&:autofill"]);
    staticVariant("optional", ["&:optional"]);
    staticVariant("required", ["&:required"]);
    staticVariant("valid", ["&:valid"]);
    staticVariant("invalid", ["&:invalid"]);
    staticVariant("user-valid", ["&:user-valid"]);
    staticVariant("user-invalid", ["&:user-invalid"]);
    staticVariant("in-range", ["&:in-range"]);
    staticVariant("out-of-range", ["&:out-of-range"]);
    staticVariant("read-only", ["&:read-only"]);
    staticVariant("empty", ["&:empty"]);
    staticVariant("focus-within", ["&:focus-within"]);
    variants.static("hover", (r) => {
      r.nodes = [styleRule("&:hover", [atRule("@media", "(hover: hover)", r.nodes)])];
    });
    staticVariant("focus", ["&:focus"]);
    staticVariant("focus-visible", ["&:focus-visible"]);
    staticVariant("active", ["&:active"]);
    staticVariant("enabled", ["&:enabled"]);
    staticVariant("disabled", ["&:disabled"]);
    staticVariant("inert", ["&:is([inert], [inert] *)"]);
    staticVariant("slotted", ["::slotted(*)"]);
    variants.compound("in", 2 /* StyleRules */, (ruleNode, variant) => {
      if (variant.modifier) return null;
      let didApply = false;
      walk2([ruleNode], (node, { path }) => {
        if (node.kind !== "rule") return 0 /* Continue */;
        for (let parent of path.slice(0, -1)) {
          if (parent.kind !== "rule") continue;
          didApply = false;
          return 2 /* Stop */;
        }
        node.selector = `:where(${node.selector.replaceAll("&", "*")}) &`;
        didApply = true;
      });
      if (!didApply) return null;
    });
    variants.suggest("in", () => {
      return Array.from(variants.keys()).filter((name) => {
        return variants.compoundsWith("in", name);
      });
    });
    variants.compound("has", 2 /* StyleRules */, (ruleNode, variant) => {
      if (variant.modifier) return null;
      let didApply = false;
      walk2([ruleNode], (node, { path }) => {
        if (node.kind !== "rule") return 0 /* Continue */;
        for (let parent of path.slice(0, -1)) {
          if (parent.kind !== "rule") continue;
          didApply = false;
          return 2 /* Stop */;
        }
        node.selector = `&:has(${node.selector.replaceAll("&", "*")})`;
        didApply = true;
      });
      if (!didApply) return null;
    });
    variants.suggest("has", () => {
      return Array.from(variants.keys()).filter((name) => {
        return variants.compoundsWith("has", name);
      });
    });
    variants.functional("aria", (ruleNode, variant) => {
      if (!variant.value || variant.modifier) return null;
      if (variant.value.kind === "arbitrary") {
        ruleNode.nodes = [styleRule(`&[aria-${quoteAttributeValue(variant.value.value)}]`, ruleNode.nodes)];
      } else {
        ruleNode.nodes = [styleRule(`&[aria-${variant.value.value}="true"]`, ruleNode.nodes)];
      }
    });
    variants.suggest("aria", () => [
      "busy",
      "checked",
      "disabled",
      "expanded",
      "hidden",
      "pressed",
      "readonly",
      "required",
      "selected",
    ]);
    variants.functional("data", (ruleNode, variant) => {
      if (!variant.value || variant.modifier) return null;
      ruleNode.nodes = [styleRule(`&[data-${quoteAttributeValue(variant.value.value)}]`, ruleNode.nodes)];
    });
    variants.functional("nth", (ruleNode, variant) => {
      if (!variant.value || variant.modifier) return null;
      if (variant.value.kind === "named" && !isPositiveInteger(variant.value.value)) return null;
      ruleNode.nodes = [styleRule(`&:nth-child(${variant.value.value})`, ruleNode.nodes)];
    });
    variants.functional("nth-last", (ruleNode, variant) => {
      if (!variant.value || variant.modifier) return null;
      if (variant.value.kind === "named" && !isPositiveInteger(variant.value.value)) return null;
      ruleNode.nodes = [styleRule(`&:nth-last-child(${variant.value.value})`, ruleNode.nodes)];
    });
    variants.functional("nth-of-type", (ruleNode, variant) => {
      if (!variant.value || variant.modifier) return null;
      if (variant.value.kind === "named" && !isPositiveInteger(variant.value.value)) return null;
      ruleNode.nodes = [styleRule(`&:nth-of-type(${variant.value.value})`, ruleNode.nodes)];
    });
    variants.functional("nth-last-of-type", (ruleNode, variant) => {
      if (!variant.value || variant.modifier) return null;
      if (variant.value.kind === "named" && !isPositiveInteger(variant.value.value)) return null;
      ruleNode.nodes = [styleRule(`&:nth-last-of-type(${variant.value.value})`, ruleNode.nodes)];
    });
    variants.functional(
      "supports",
      (ruleNode, variant) => {
        if (!variant.value || variant.modifier) return null;
        let value2 = variant.value.value;
        if (value2 === null) return null;
        if (/^[\w-]*\s*\(/.test(value2)) {
          let query = value2.replace(/\b(and|or|not)\b/g, " $1 ");
          ruleNode.nodes = [atRule("@supports", query, ruleNode.nodes)];
          return;
        }
        if (!value2.includes(":")) {
          value2 = `${value2}: var(--tw)`;
        }
        if (value2[0] !== "(" || value2[value2.length - 1] !== ")") {
          value2 = `(${value2})`;
        }
        ruleNode.nodes = [atRule("@supports", value2, ruleNode.nodes)];
      },
      { compounds: 1 /* AtRules */ }
    );
    staticVariant("motion-safe", ["@media (prefers-reduced-motion: no-preference)"]);
    staticVariant("motion-reduce", ["@media (prefers-reduced-motion: reduce)"]);
    staticVariant("contrast-more", ["@media (prefers-contrast: more)"]);
    staticVariant("contrast-less", ["@media (prefers-contrast: less)"]);
    {
      let compareBreakpointVariants2 = function (a, z, direction, lookup) {
        if (a === z) return 0;
        let aValue = lookup.get(a);
        if (aValue === null) return direction === "asc" ? -1 : 1;
        let zValue = lookup.get(z);
        if (zValue === null) return direction === "asc" ? 1 : -1;
        return compareBreakpoints(aValue, zValue, direction);
      };
      var compareBreakpointVariants = compareBreakpointVariants2;
      {
        let breakpoints = theme2.namespace("--breakpoint");
        let resolvedBreakpoints = new DefaultMap((variant) => {
          switch (variant.kind) {
            case "static": {
              return theme2.resolveValue(variant.root, ["--breakpoint"]) ?? null;
            }
            case "functional": {
              if (!variant.value || variant.modifier) return null;
              let value2 = null;
              if (variant.value.kind === "arbitrary") {
                value2 = variant.value.value;
              } else if (variant.value.kind === "named") {
                value2 = theme2.resolveValue(variant.value.value, ["--breakpoint"]);
              }
              if (!value2) return null;
              if (value2.includes("var(")) return null;
              return value2;
            }
            case "arbitrary":
            case "compound":
              return null;
          }
        });
        variants.group(
          () => {
            variants.functional(
              "max",
              (ruleNode, variant) => {
                if (variant.modifier) return null;
                let value2 = resolvedBreakpoints.get(variant);
                if (value2 === null) return null;
                ruleNode.nodes = [atRule("@media", `(width < ${value2})`, ruleNode.nodes)];
              },
              { compounds: 1 /* AtRules */ }
            );
          },
          (a, z) => compareBreakpointVariants2(a, z, "desc", resolvedBreakpoints)
        );
        variants.suggest("max", () => Array.from(breakpoints.keys()).filter((key) => key !== null));
        variants.group(
          () => {
            for (let [key, value2] of theme2.namespace("--breakpoint")) {
              if (key === null) continue;
              variants.static(
                key,
                (ruleNode) => {
                  ruleNode.nodes = [atRule("@media", `(width >= ${value2})`, ruleNode.nodes)];
                },
                { compounds: 1 /* AtRules */ }
              );
            }
            variants.functional(
              "min",
              (ruleNode, variant) => {
                if (variant.modifier) return null;
                let value2 = resolvedBreakpoints.get(variant);
                if (value2 === null) return null;
                ruleNode.nodes = [atRule("@media", `(width >= ${value2})`, ruleNode.nodes)];
              },
              { compounds: 1 /* AtRules */ }
            );
          },
          (a, z) => compareBreakpointVariants2(a, z, "asc", resolvedBreakpoints)
        );
        variants.suggest("min", () => Array.from(breakpoints.keys()).filter((key) => key !== null));
      }
      {
        let widths = theme2.namespace("--container");
        let resolvedWidths = new DefaultMap((variant) => {
          switch (variant.kind) {
            case "functional": {
              if (variant.value === null) return null;
              let value2 = null;
              if (variant.value.kind === "arbitrary") {
                value2 = variant.value.value;
              } else if (variant.value.kind === "named") {
                value2 = theme2.resolveValue(variant.value.value, ["--container"]);
              }
              if (!value2) return null;
              if (value2.includes("var(")) return null;
              return value2;
            }
            case "static":
            case "arbitrary":
            case "compound":
              return null;
          }
        });
        variants.group(
          () => {
            variants.functional(
              "@max",
              (ruleNode, variant) => {
                let value2 = resolvedWidths.get(variant);
                if (value2 === null) return null;
                ruleNode.nodes = [
                  atRule(
                    "@container",
                    variant.modifier ? `${variant.modifier.value} (width < ${value2})` : `(width < ${value2})`,
                    ruleNode.nodes
                  ),
                ];
              },
              { compounds: 1 /* AtRules */ }
            );
          },
          (a, z) => compareBreakpointVariants2(a, z, "desc", resolvedWidths)
        );
        variants.suggest("@max", () => Array.from(widths.keys()).filter((key) => key !== null));
        variants.group(
          () => {
            variants.functional(
              "@",
              (ruleNode, variant) => {
                let value2 = resolvedWidths.get(variant);
                if (value2 === null) return null;
                ruleNode.nodes = [
                  atRule(
                    "@container",
                    variant.modifier ? `${variant.modifier.value} (width >= ${value2})` : `(width >= ${value2})`,
                    ruleNode.nodes
                  ),
                ];
              },
              { compounds: 1 /* AtRules */ }
            );
            variants.functional(
              "@min",
              (ruleNode, variant) => {
                let value2 = resolvedWidths.get(variant);
                if (value2 === null) return null;
                ruleNode.nodes = [
                  atRule(
                    "@container",
                    variant.modifier ? `${variant.modifier.value} (width >= ${value2})` : `(width >= ${value2})`,
                    ruleNode.nodes
                  ),
                ];
              },
              { compounds: 1 /* AtRules */ }
            );
          },
          (a, z) => compareBreakpointVariants2(a, z, "asc", resolvedWidths)
        );
        variants.suggest("@min", () => Array.from(widths.keys()).filter((key) => key !== null));
        variants.suggest("@", () => Array.from(widths.keys()).filter((key) => key !== null));
      }
    }
    staticVariant("portrait", ["@media (orientation: portrait)"]);
    staticVariant("landscape", ["@media (orientation: landscape)"]);
    staticVariant("ltr", ['&:where(:dir(ltr), [dir="ltr"], [dir="ltr"] *)']);
    staticVariant("rtl", ['&:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)']);
    staticVariant("dark", ["@media (prefers-color-scheme: dark)"]);
    staticVariant("starting", ["@starting-style"]);
    staticVariant("print", ["@media print"]);
    staticVariant("forced-colors", ["@media (forced-colors: active)"]);
    staticVariant("inverted-colors", ["@media (inverted-colors: inverted)"]);
    staticVariant("pointer-none", ["@media (pointer: none)"]);
    staticVariant("pointer-coarse", ["@media (pointer: coarse)"]);
    staticVariant("pointer-fine", ["@media (pointer: fine)"]);
    staticVariant("any-pointer-none", ["@media (any-pointer: none)"]);
    staticVariant("any-pointer-coarse", ["@media (any-pointer: coarse)"]);
    staticVariant("any-pointer-fine", ["@media (any-pointer: fine)"]);
    staticVariant("noscript", ["@media (scripting: none)"]);
    return variants;
  }
  function quoteAttributeValue(input) {
    if (input.includes("=")) {
      let [attribute, ...after] = segment(input, "=");
      let value2 = after.join("=").trim();
      if (value2[0] === "'" || value2[0] === '"') {
        return input;
      }
      if (value2.length > 1) {
        let trailingCharacter = value2[value2.length - 1];
        if (
          value2[value2.length - 2] === " " &&
          (trailingCharacter === "i" ||
            trailingCharacter === "I" ||
            trailingCharacter === "s" ||
            trailingCharacter === "S")
        ) {
          return `${attribute}="${value2.slice(0, -2)}" ${trailingCharacter}`;
        }
      }
      return `${attribute}="${value2}"`;
    }
    return input;
  }
  function substituteAtSlot(ast, nodes) {
    walk2(ast, (node, { replaceWith }) => {
      if (node.kind === "at-rule" && node.name === "@slot") {
        replaceWith(nodes);
      } else if (node.kind === "at-rule" && (node.name === "@keyframes" || node.name === "@property")) {
        Object.assign(node, atRoot([atRule(node.name, node.params, node.nodes)]));
        return 1 /* Skip */;
      }
    });
  }

  // ../tailwindcss/src/design-system.ts
  function buildDesignSystem(theme2) {
    let utilities = createUtilities(theme2);
    let variants = createVariants(theme2);
    let parsedVariants = new DefaultMap((variant) => parseVariant(variant, designSystem));
    let parsedCandidates = new DefaultMap((candidate) => Array.from(parseCandidate(candidate, designSystem)));
    let compiledAstNodes = new DefaultMap((candidate) => {
      let ast = compileAstNodes(candidate, designSystem);
      try {
        substituteFunctions(
          ast.map(({ node }) => node),
          designSystem
        );
      } catch (err) {
        return [];
      }
      return ast;
    });
    let trackUsedVariables = new DefaultMap((raw) => {
      for (let variable of extractUsedVariables(raw)) {
        theme2.markUsedVariable(variable);
      }
    });
    let designSystem = {
      theme: theme2,
      utilities,
      variants,
      invalidCandidates: /* @__PURE__ */ new Set(),
      important: false,
      candidatesToCss(classes2) {
        let result = [];
        for (let className of classes2) {
          let wasInvalid = false;
          let { astNodes } = compileCandidates([className], this, {
            onInvalidCandidate() {
              wasInvalid = true;
            },
          });
          astNodes = optimizeAst(astNodes, designSystem, 0 /* None */);
          if (astNodes.length === 0 || wasInvalid) {
            result.push(null);
          } else {
            result.push(toCss2(astNodes));
          }
        }
        return result;
      },
      getClassOrder(classes2) {
        return getClassOrder(this, classes2);
      },
      getClassList() {
        return getClassList(this);
      },
      getVariants() {
        return getVariants(this);
      },
      parseCandidate(candidate) {
        return parsedCandidates.get(candidate);
      },
      parseVariant(variant) {
        return parsedVariants.get(variant);
      },
      compileAstNodes(candidate) {
        return compiledAstNodes.get(candidate);
      },
      printCandidate(candidate) {
        return printCandidate(designSystem, candidate);
      },
      printVariant(variant) {
        return printVariant(variant);
      },
      getVariantOrder() {
        let variants2 = Array.from(parsedVariants.values());
        variants2.sort((a, z) => this.variants.compare(a, z));
        let order = /* @__PURE__ */ new Map();
        let prevVariant = void 0;
        let index = 0;
        for (let variant of variants2) {
          if (variant === null) {
            continue;
          }
          if (prevVariant !== void 0 && this.variants.compare(prevVariant, variant) !== 0) {
            index++;
          }
          order.set(variant, index);
          prevVariant = variant;
        }
        return order;
      },
      resolveThemeValue(path, forceInline = true) {
        let lastSlash = path.lastIndexOf("/");
        let modifier = null;
        if (lastSlash !== -1) {
          modifier = path.slice(lastSlash + 1).trim();
          path = path.slice(0, lastSlash).trim();
        }
        let themeValue = theme2.resolve(null, [path], forceInline ? 1 /* INLINE */ : 0 /* NONE */) ?? void 0;
        if (modifier && themeValue) {
          return withAlpha(themeValue, modifier);
        }
        return themeValue;
      },
      trackUsedVariables(raw) {
        trackUsedVariables.get(raw);
      },
    };
    return designSystem;
  }

  // ../tailwindcss/src/property-order.ts
  var property_order_default = [
    "container-type",
    "pointer-events",
    "visibility",
    "position",
    // How do we make `inset-x-0` come before `top-0`?
    "inset",
    "inset-inline",
    "inset-block",
    "inset-inline-start",
    "inset-inline-end",
    "top",
    "right",
    "bottom",
    "left",
    "isolation",
    "z-index",
    "order",
    "grid-column",
    "grid-column-start",
    "grid-column-end",
    "grid-row",
    "grid-row-start",
    "grid-row-end",
    "float",
    "clear",
    // Ensure that the included `container` class is always sorted before any
    // custom container extensions
    "--tw-container-component",
    // How do we make `mx-0` come before `mt-0`?
    // Idea: `margin-x` property that we compile away with a Visitor plugin?
    "margin",
    "margin-inline",
    "margin-block",
    "margin-inline-start",
    "margin-inline-end",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "box-sizing",
    "display",
    "field-sizing",
    "aspect-ratio",
    "height",
    "max-height",
    "min-height",
    "width",
    "max-width",
    "min-width",
    "flex",
    "flex-shrink",
    "flex-grow",
    "flex-basis",
    "table-layout",
    "caption-side",
    "border-collapse",
    // There's no `border-spacing-x` property, we use variables, how to sort?
    "border-spacing",
    // '--tw-border-spacing-x',
    // '--tw-border-spacing-y',
    "transform-origin",
    "translate",
    "--tw-translate-x",
    "--tw-translate-y",
    "--tw-translate-z",
    "scale",
    "--tw-scale-x",
    "--tw-scale-y",
    "--tw-scale-z",
    "rotate",
    "--tw-rotate-x",
    "--tw-rotate-y",
    "--tw-rotate-z",
    "--tw-skew-x",
    "--tw-skew-y",
    "transform",
    "animation",
    "cursor",
    "touch-action",
    "--tw-pan-x",
    "--tw-pan-y",
    "--tw-pinch-zoom",
    "resize",
    "scroll-snap-type",
    "--tw-scroll-snap-strictness",
    "scroll-snap-align",
    "scroll-snap-stop",
    "scroll-margin",
    "scroll-margin-inline",
    "scroll-margin-block",
    "scroll-margin-inline-start",
    "scroll-margin-inline-end",
    "scroll-margin-top",
    "scroll-margin-right",
    "scroll-margin-bottom",
    "scroll-margin-left",
    "scroll-padding",
    "scroll-padding-inline",
    "scroll-padding-block",
    "scroll-padding-inline-start",
    "scroll-padding-inline-end",
    "scroll-padding-top",
    "scroll-padding-right",
    "scroll-padding-bottom",
    "scroll-padding-left",
    "list-style-position",
    "list-style-type",
    "list-style-image",
    "appearance",
    "columns",
    "break-before",
    "break-inside",
    "break-after",
    "grid-auto-columns",
    "grid-auto-flow",
    "grid-auto-rows",
    "grid-template-columns",
    "grid-template-rows",
    "flex-direction",
    "flex-wrap",
    "place-content",
    "place-items",
    "align-content",
    "align-items",
    "justify-content",
    "justify-items",
    "gap",
    "column-gap",
    "row-gap",
    "--tw-space-x-reverse",
    "--tw-space-y-reverse",
    // Is there a more "real" property we could use for this?
    "divide-x-width",
    "divide-y-width",
    "--tw-divide-y-reverse",
    "divide-style",
    "divide-color",
    "place-self",
    "align-self",
    "justify-self",
    "overflow",
    "overflow-x",
    "overflow-y",
    "overscroll-behavior",
    "overscroll-behavior-x",
    "overscroll-behavior-y",
    "scroll-behavior",
    "border-radius",
    "border-start-radius",
    // Not real
    "border-end-radius",
    // Not real
    "border-top-radius",
    // Not real
    "border-right-radius",
    // Not real
    "border-bottom-radius",
    // Not real
    "border-left-radius",
    // Not real
    "border-start-start-radius",
    "border-start-end-radius",
    "border-end-end-radius",
    "border-end-start-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
    "border-width",
    "border-inline-width",
    "border-block-width",
    "border-inline-start-width",
    "border-inline-end-width",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-style",
    "border-inline-style",
    "border-block-style",
    "border-inline-start-style",
    "border-inline-end-style",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-color",
    "border-inline-color",
    "border-block-color",
    "border-inline-start-color",
    "border-inline-end-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "background-color",
    "background-image",
    "--tw-gradient-position",
    "--tw-gradient-stops",
    "--tw-gradient-via-stops",
    "--tw-gradient-from",
    "--tw-gradient-from-position",
    "--tw-gradient-via",
    "--tw-gradient-via-position",
    "--tw-gradient-to",
    "--tw-gradient-to-position",
    "mask-image",
    // Edge masks
    "--tw-mask-top",
    "--tw-mask-top-from-color",
    "--tw-mask-top-from-position",
    "--tw-mask-top-to-color",
    "--tw-mask-top-to-position",
    "--tw-mask-right",
    "--tw-mask-right-from-color",
    "--tw-mask-right-from-position",
    "--tw-mask-right-to-color",
    "--tw-mask-right-to-position",
    "--tw-mask-bottom",
    "--tw-mask-bottom-from-color",
    "--tw-mask-bottom-from-position",
    "--tw-mask-bottom-to-color",
    "--tw-mask-bottom-to-position",
    "--tw-mask-left",
    "--tw-mask-left-from-color",
    "--tw-mask-left-from-position",
    "--tw-mask-left-to-color",
    "--tw-mask-left-to-position",
    // Linear masks
    "--tw-mask-linear",
    "--tw-mask-linear-position",
    "--tw-mask-linear-from-color",
    "--tw-mask-linear-from-position",
    "--tw-mask-linear-to-color",
    "--tw-mask-linear-to-position",
    // Radial masks
    "--tw-mask-radial",
    "--tw-mask-radial-shape",
    "--tw-mask-radial-size",
    "--tw-mask-radial-position",
    "--tw-mask-radial-from-color",
    "--tw-mask-radial-from-position",
    "--tw-mask-radial-to-color",
    "--tw-mask-radial-to-position",
    // Conic masks
    "--tw-mask-conic",
    "--tw-mask-conic-position",
    "--tw-mask-conic-from-color",
    "--tw-mask-conic-from-position",
    "--tw-mask-conic-to-color",
    "--tw-mask-conic-to-position",
    "box-decoration-break",
    "background-size",
    "background-attachment",
    "background-clip",
    "background-position",
    "background-repeat",
    "background-origin",
    "mask-composite",
    "mask-mode",
    "mask-type",
    "mask-size",
    "mask-clip",
    "mask-position",
    "mask-repeat",
    "mask-origin",
    "fill",
    "stroke",
    "stroke-width",
    "object-fit",
    "object-position",
    "padding",
    "padding-inline",
    "padding-block",
    "padding-inline-start",
    "padding-inline-end",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "text-align",
    "text-indent",
    "vertical-align",
    "font-family",
    "font-size",
    "line-height",
    "font-weight",
    "letter-spacing",
    "text-wrap",
    "overflow-wrap",
    "word-break",
    "text-overflow",
    "hyphens",
    "white-space",
    "color",
    "text-transform",
    "font-style",
    "font-stretch",
    "font-variant-numeric",
    "text-decoration-line",
    "text-decoration-color",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-underline-offset",
    "-webkit-font-smoothing",
    "placeholder-color",
    "caret-color",
    "accent-color",
    "color-scheme",
    "opacity",
    "background-blend-mode",
    "mix-blend-mode",
    "box-shadow",
    "--tw-shadow",
    "--tw-shadow-color",
    "--tw-ring-shadow",
    "--tw-ring-color",
    "--tw-inset-shadow",
    "--tw-inset-shadow-color",
    "--tw-inset-ring-shadow",
    "--tw-inset-ring-color",
    "--tw-ring-offset-width",
    "--tw-ring-offset-color",
    "outline",
    "outline-width",
    "outline-offset",
    "outline-color",
    "--tw-blur",
    "--tw-brightness",
    "--tw-contrast",
    "--tw-drop-shadow",
    "--tw-grayscale",
    "--tw-hue-rotate",
    "--tw-invert",
    "--tw-saturate",
    "--tw-sepia",
    "filter",
    "--tw-backdrop-blur",
    "--tw-backdrop-brightness",
    "--tw-backdrop-contrast",
    "--tw-backdrop-grayscale",
    "--tw-backdrop-hue-rotate",
    "--tw-backdrop-invert",
    "--tw-backdrop-opacity",
    "--tw-backdrop-saturate",
    "--tw-backdrop-sepia",
    "backdrop-filter",
    "transition-property",
    "transition-behavior",
    "transition-delay",
    "transition-duration",
    "transition-timing-function",
    "will-change",
    "contain",
    "content",
    "forced-color-adjust",
  ];

  // ../tailwindcss/src/compile.ts
  function compileCandidates(rawCandidates, designSystem, { onInvalidCandidate } = {}) {
    let nodeSorting = /* @__PURE__ */ new Map();
    let astNodes = [];
    let matches = /* @__PURE__ */ new Map();
    for (let rawCandidate of rawCandidates) {
      if (designSystem.invalidCandidates.has(rawCandidate)) {
        onInvalidCandidate?.(rawCandidate);
        continue;
      }
      let candidates = designSystem.parseCandidate(rawCandidate);
      if (candidates.length === 0) {
        onInvalidCandidate?.(rawCandidate);
        continue;
      }
      matches.set(rawCandidate, candidates);
    }
    let variantOrderMap = designSystem.getVariantOrder();
    for (let [rawCandidate, candidates] of matches) {
      let found = false;
      for (let candidate of candidates) {
        let rules = designSystem.compileAstNodes(candidate);
        if (rules.length === 0) continue;
        found = true;
        for (let { node, propertySort } of rules) {
          let variantOrder = 0n;
          for (let variant of candidate.variants) {
            variantOrder |= 1n << BigInt(variantOrderMap.get(variant));
          }
          nodeSorting.set(node, {
            properties: propertySort,
            variants: variantOrder,
            candidate: rawCandidate,
          });
          astNodes.push(node);
        }
      }
      if (!found) {
        onInvalidCandidate?.(rawCandidate);
      }
    }
    astNodes.sort((a, z) => {
      let aSorting = nodeSorting.get(a);
      let zSorting = nodeSorting.get(z);
      if (aSorting.variants - zSorting.variants !== 0n) {
        return Number(aSorting.variants - zSorting.variants);
      }
      let offset = 0;
      while (
        offset < aSorting.properties.order.length &&
        offset < zSorting.properties.order.length &&
        aSorting.properties.order[offset] === zSorting.properties.order[offset]
      ) {
        offset += 1;
      }
      return (
        // Sort by lowest property index first
        (aSorting.properties.order[offset] ?? Infinity) - (zSorting.properties.order[offset] ?? Infinity) || // Sort by most properties first, then by least properties
        zSorting.properties.count - aSorting.properties.count || // Sort alphabetically
        compare(aSorting.candidate, zSorting.candidate)
      );
    });
    return {
      astNodes,
      nodeSorting,
    };
  }
  function compileAstNodes(candidate, designSystem) {
    let asts = compileBaseUtility(candidate, designSystem);
    if (asts.length === 0) return [];
    let rules = [];
    let selector2 = `.${escape(candidate.raw)}`;
    for (let nodes of asts) {
      let propertySort = getPropertySort(nodes);
      if (candidate.important || designSystem.important) {
        applyImportant(nodes);
      }
      let node = {
        kind: "rule",
        selector: selector2,
        nodes,
      };
      for (let variant of candidate.variants) {
        let result = applyVariant(node, variant, designSystem.variants);
        if (result === null) return [];
      }
      rules.push({
        node,
        propertySort,
      });
    }
    return rules;
  }
  function applyVariant(node, variant, variants, depth = 0) {
    if (variant.kind === "arbitrary") {
      if (variant.relative && depth === 0) return null;
      node.nodes = [rule(variant.selector, node.nodes)];
      return;
    }
    let { applyFn } = variants.get(variant.root);
    if (variant.kind === "compound") {
      let isolatedNode = atRule("@slot");
      let result2 = applyVariant(isolatedNode, variant.variant, variants, depth + 1);
      if (result2 === null) return null;
      if (variant.root === "not" && isolatedNode.nodes.length > 1) {
        return null;
      }
      for (let child of isolatedNode.nodes) {
        if (child.kind !== "rule" && child.kind !== "at-rule") return null;
        let result3 = applyFn(child, variant);
        if (result3 === null) return null;
      }
      {
        walk2(isolatedNode.nodes, (child) => {
          if ((child.kind === "rule" || child.kind === "at-rule") && child.nodes.length <= 0) {
            child.nodes = node.nodes;
            return 1 /* Skip */;
          }
        });
        node.nodes = isolatedNode.nodes;
      }
      return;
    }
    let result = applyFn(node, variant);
    if (result === null) return null;
  }
  function isFallbackUtility(utility) {
    let types = utility.options?.types ?? [];
    return types.length > 1 && types.includes("any");
  }
  function compileBaseUtility(candidate, designSystem) {
    if (candidate.kind === "arbitrary") {
      let value2 = candidate.value;
      if (candidate.modifier) {
        value2 = asColor(value2, candidate.modifier, designSystem.theme);
      }
      if (value2 === null) return [];
      return [[decl(candidate.property, value2)]];
    }
    let utilities = designSystem.utilities.get(candidate.root) ?? [];
    let asts = [];
    let normalUtilities = utilities.filter((u) => !isFallbackUtility(u));
    for (let utility of normalUtilities) {
      if (utility.kind !== candidate.kind) continue;
      let compiledNodes = utility.compileFn(candidate);
      if (compiledNodes === void 0) continue;
      if (compiledNodes === null) return asts;
      asts.push(compiledNodes);
    }
    if (asts.length > 0) return asts;
    let fallbackUtilities = utilities.filter((u) => isFallbackUtility(u));
    for (let utility of fallbackUtilities) {
      if (utility.kind !== candidate.kind) continue;
      let compiledNodes = utility.compileFn(candidate);
      if (compiledNodes === void 0) continue;
      if (compiledNodes === null) return asts;
      asts.push(compiledNodes);
    }
    return asts;
  }
  function applyImportant(ast) {
    for (let node of ast) {
      if (node.kind === "at-root") {
        continue;
      }
      if (node.kind === "declaration") {
        node.important = true;
      } else if (node.kind === "rule" || node.kind === "at-rule") {
        applyImportant(node.nodes);
      }
    }
  }
  function getPropertySort(nodes) {
    let order = /* @__PURE__ */ new Set();
    let count = 0;
    let q = nodes.slice();
    let seenTwSort = false;
    while (q.length > 0) {
      let node = q.shift();
      if (node.kind === "declaration") {
        if (node.value === void 0) continue;
        count++;
        if (seenTwSort) continue;
        if (node.property === "--tw-sort") {
          let idx2 = property_order_default.indexOf(node.value ?? "");
          if (idx2 !== -1) {
            order.add(idx2);
            seenTwSort = true;
            continue;
          }
        }
        let idx = property_order_default.indexOf(node.property);
        if (idx !== -1) order.add(idx);
      } else if (node.kind === "rule" || node.kind === "at-rule") {
        for (let child of node.nodes) {
          q.push(child);
        }
      }
    }
    return {
      order: Array.from(order).sort((a, z) => a - z),
      count,
    };
  }

  // ../tailwindcss/src/apply.ts
  function substituteAtApply(ast, designSystem) {
    let features = 0; /* None */
    let root = rule("&", ast);
    let parents = /* @__PURE__ */ new Set();
    let dependencies = new DefaultMap(() => /* @__PURE__ */ new Set());
    let definitions = new DefaultMap(() => /* @__PURE__ */ new Set());
    walk2([root], (node, { parent, path }) => {
      if (node.kind !== "at-rule") return;
      if (node.name === "@keyframes") {
        walk2(node.nodes, (child) => {
          if (child.kind === "at-rule" && child.name === "@apply") {
            throw new Error(`You cannot use \`@apply\` inside \`@keyframes\`.`);
          }
        });
        return 1 /* Skip */;
      }
      if (node.name === "@utility") {
        let name = node.params.replace(/-\*$/, "");
        definitions.get(name).add(node);
        walk2(node.nodes, (child) => {
          if (child.kind !== "at-rule" || child.name !== "@apply") return;
          parents.add(node);
          for (let dependency of resolveApplyDependencies(child, designSystem)) {
            dependencies.get(node).add(dependency);
          }
        });
        return;
      }
      if (node.name === "@apply") {
        if (parent === null) return;
        features |= 1 /* AtApply */;
        parents.add(parent);
        for (let dependency of resolveApplyDependencies(node, designSystem)) {
          for (let parent2 of path) {
            if (parent2 === node) continue;
            if (!parents.has(parent2)) continue;
            dependencies.get(parent2).add(dependency);
          }
        }
      }
    });
    let seen = /* @__PURE__ */ new Set();
    let sorted = [];
    let wip = /* @__PURE__ */ new Set();
    function visit(node, path = []) {
      if (seen.has(node)) {
        return;
      }
      if (wip.has(node)) {
        let next = path[(path.indexOf(node) + 1) % path.length];
        if (
          node.kind === "at-rule" &&
          node.name === "@utility" &&
          next.kind === "at-rule" &&
          next.name === "@utility"
        ) {
          walk2(node.nodes, (child) => {
            if (child.kind !== "at-rule" || child.name !== "@apply") return;
            let candidates = child.params.split(/\s+/g);
            for (let candidate of candidates) {
              for (let candidateAstNode of designSystem.parseCandidate(candidate)) {
                switch (candidateAstNode.kind) {
                  case "arbitrary":
                    break;
                  case "static":
                  case "functional":
                    if (next.params.replace(/-\*$/, "") === candidateAstNode.root) {
                      throw new Error(
                        `You cannot \`@apply\` the \`${candidate}\` utility here because it creates a circular dependency.`
                      );
                    }
                    break;
                  default:
                    candidateAstNode;
                }
              }
            }
          });
        }
        throw new Error(
          `Circular dependency detected:

${toCss2([node])}
Relies on:

${toCss2([next])}`
        );
      }
      wip.add(node);
      for (let dependencyId of dependencies.get(node)) {
        for (let dependency of definitions.get(dependencyId)) {
          path.push(node);
          visit(dependency, path);
          path.pop();
        }
      }
      seen.add(node);
      wip.delete(node);
      sorted.push(node);
    }
    for (let node of parents) {
      visit(node);
    }
    for (let parent of sorted) {
      if (!("nodes" in parent)) continue;
      walk2(parent.nodes, (child, { replaceWith }) => {
        if (child.kind !== "at-rule" || child.name !== "@apply") return;
        let parts = child.params.split(/(\s+)/g);
        let candidateOffsets = {};
        let offset = 0;
        for (let [idx, part] of parts.entries()) {
          if (idx % 2 === 0) candidateOffsets[part] = offset;
          offset += part.length;
        }
        {
          let candidates = Object.keys(candidateOffsets);
          let compiled = compileCandidates(candidates, designSystem, {
            onInvalidCandidate: (candidate) => {
              throw new Error(`Cannot apply unknown utility class: ${candidate}`);
            },
          });
          let src = child.src;
          let candidateAst = compiled.astNodes.map((node) => {
            let candidate = compiled.nodeSorting.get(node)?.candidate;
            let candidateOffset = candidate ? candidateOffsets[candidate] : void 0;
            node = structuredClone(node);
            if (!src || !candidate || candidateOffset === void 0) {
              walk2([node], (node2) => {
                node2.src = src;
              });
              return node;
            }
            let candidateSrc = [src[0], src[1], src[2]];
            candidateSrc[1] += 7 + candidateOffset;
            candidateSrc[2] = candidateSrc[1] + candidate.length;
            walk2([node], (node2) => {
              node2.src = candidateSrc;
            });
            return node;
          });
          let newNodes = [];
          for (let candidateNode of candidateAst) {
            if (candidateNode.kind === "rule") {
              for (let child2 of candidateNode.nodes) {
                newNodes.push(child2);
              }
            } else {
              newNodes.push(candidateNode);
            }
          }
          replaceWith(newNodes);
        }
      });
    }
    return features;
  }
  function* resolveApplyDependencies(node, designSystem) {
    for (let candidate of node.params.split(/\s+/g)) {
      for (let node2 of designSystem.parseCandidate(candidate)) {
        switch (node2.kind) {
          case "arbitrary":
            break;
          case "static":
          case "functional":
            yield node2.root;
            break;
          default:
            node2;
        }
      }
    }
  }

  // ../tailwindcss/src/at-import.ts
  async function substituteAtImports(ast, base, loadStylesheet2, recurseCount = 0, track = false) {
    let features = 0; /* None */
    let promises = [];
    walk2(ast, (node, { replaceWith }) => {
      if (node.kind === "at-rule" && (node.name === "@import" || node.name === "@reference")) {
        let parsed = parseImportParams(parse2(node.params));
        if (parsed === null) return;
        if (node.name === "@reference") {
          parsed.media = "reference";
        }
        features |= 2 /* AtImport */;
        let { uri, layer, media, supports } = parsed;
        if (uri.startsWith("data:")) return;
        if (uri.startsWith("http://") || uri.startsWith("https://")) return;
        let contextNode = context({}, []);
        promises.push(
          (async () => {
            if (recurseCount > 100) {
              throw new Error(`Exceeded maximum recursion depth while resolving \`${uri}\` in \`${base}\`)`);
            }
            let loaded = await loadStylesheet2(uri, base);
            let ast2 = parse(loaded.content, {
              from: track ? loaded.path : void 0,
            });
            await substituteAtImports(ast2, loaded.base, loadStylesheet2, recurseCount + 1, track);
            contextNode.nodes = buildImportNodes(node, [context({ base: loaded.base }, ast2)], layer, media, supports);
          })()
        );
        replaceWith(contextNode);
        return 1 /* Skip */;
      }
    });
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    return features;
  }
  function parseImportParams(params) {
    let uri;
    let layer = null;
    let media = null;
    let supports = null;
    for (let i = 0; i < params.length; i++) {
      let node = params[i];
      if (node.kind === "separator") continue;
      if (node.kind === "word" && !uri) {
        if (!node.value) return null;
        if (node.value[0] !== '"' && node.value[0] !== "'") return null;
        uri = node.value.slice(1, -1);
        continue;
      }
      if (node.kind === "function" && node.value.toLowerCase() === "url") {
        return null;
      }
      if (!uri) return null;
      if ((node.kind === "word" || node.kind === "function") && node.value.toLowerCase() === "layer") {
        if (layer) return null;
        if (supports) {
          throw new Error("`layer(\u2026)` in an `@import` should come before any other functions or conditions");
        }
        if ("nodes" in node) {
          layer = toCss(node.nodes);
        } else {
          layer = "";
        }
        continue;
      }
      if (node.kind === "function" && node.value.toLowerCase() === "supports") {
        if (supports) return null;
        supports = toCss(node.nodes);
        continue;
      }
      media = toCss(params.slice(i));
      break;
    }
    if (!uri) return null;
    return { uri, layer, media, supports };
  }
  function buildImportNodes(importNode, importedAst, layer, media, supports) {
    let root = importedAst;
    if (layer !== null) {
      let node = atRule("@layer", layer, root);
      node.src = importNode.src;
      root = [node];
    }
    if (media !== null) {
      let node = atRule("@media", media, root);
      node.src = importNode.src;
      root = [node];
    }
    if (supports !== null) {
      let node = atRule("@supports", supports[0] === "(" ? supports : `(${supports})`, root);
      node.src = importNode.src;
      root = [node];
    }
    return root;
  }

  // ../tailwindcss/src/compat/apply-config-to-theme.ts
  function resolveThemeValue(value2, subValue = null) {
    if (Array.isArray(value2) && value2.length === 2 && typeof value2[1] === "object" && typeof value2[1] !== null) {
      return subValue ? value2[1][subValue] ?? null : value2[0];
    } else if (Array.isArray(value2) && subValue === null) {
      return value2.join(", ");
    } else if (typeof value2 === "string" && subValue === null) {
      return value2;
    }
    return null;
  }
  function applyConfigToTheme(designSystem, { theme: theme2 }, replacedThemeKeys) {
    for (let replacedThemeKey of replacedThemeKeys) {
      let name = keyPathToCssProperty([replacedThemeKey]);
      if (!name) continue;
      designSystem.theme.clearNamespace(`--${name}`, 4 /* DEFAULT */);
    }
    for (let [path, value2] of themeableValues(theme2)) {
      if (typeof value2 !== "string" && typeof value2 !== "number") {
        continue;
      }
      if (typeof value2 === "string") {
        value2 = value2.replace(/<alpha-value>/g, "1");
      }
      if (path[0] === "opacity" && (typeof value2 === "number" || typeof value2 === "string")) {
        let numValue = typeof value2 === "string" ? parseFloat(value2) : value2;
        if (numValue >= 0 && numValue <= 1) {
          value2 = numValue * 100 + "%";
        }
      }
      let name = keyPathToCssProperty(path);
      if (!name) continue;
      designSystem.theme.add(`--${name}`, "" + value2, 1 /* INLINE */ | 2 /* REFERENCE */ | 4 /* DEFAULT */);
    }
    if (Object.hasOwn(theme2, "fontFamily")) {
      let options = 1 /* INLINE */ | 4; /* DEFAULT */
      {
        let fontFamily = resolveThemeValue(theme2.fontFamily.sans);
        if (fontFamily && designSystem.theme.hasDefault("--font-sans")) {
          designSystem.theme.add("--default-font-family", fontFamily, options);
          designSystem.theme.add(
            "--default-font-feature-settings",
            resolveThemeValue(theme2.fontFamily.sans, "fontFeatureSettings") ?? "normal",
            options
          );
          designSystem.theme.add(
            "--default-font-variation-settings",
            resolveThemeValue(theme2.fontFamily.sans, "fontVariationSettings") ?? "normal",
            options
          );
        }
      }
      {
        let fontFamily = resolveThemeValue(theme2.fontFamily.mono);
        if (fontFamily && designSystem.theme.hasDefault("--font-mono")) {
          designSystem.theme.add("--default-mono-font-family", fontFamily, options);
          designSystem.theme.add(
            "--default-mono-font-feature-settings",
            resolveThemeValue(theme2.fontFamily.mono, "fontFeatureSettings") ?? "normal",
            options
          );
          designSystem.theme.add(
            "--default-mono-font-variation-settings",
            resolveThemeValue(theme2.fontFamily.mono, "fontVariationSettings") ?? "normal",
            options
          );
        }
      }
    }
    return theme2;
  }
  function themeableValues(config) {
    let toAdd = [];
    walk3(config, [], (value2, path) => {
      if (isValidThemePrimitive(value2)) {
        toAdd.push([path, value2]);
        return 1 /* Skip */;
      }
      if (isValidThemeTuple(value2)) {
        toAdd.push([path, value2[0]]);
        for (let key of Reflect.ownKeys(value2[1])) {
          toAdd.push([[...path, `-${key}`], value2[1][key]]);
        }
        return 1 /* Skip */;
      }
      if (Array.isArray(value2) && value2.every((v) => typeof v === "string")) {
        if (path[0] === "fontSize") {
          toAdd.push([path, value2[0]]);
          if (value2.length >= 2) {
            toAdd.push([[...path, "-line-height"], value2[1]]);
          }
        } else {
          toAdd.push([path, value2.join(", ")]);
        }
        return 1 /* Skip */;
      }
    });
    return toAdd;
  }
  var IS_VALID_KEY = /^[a-zA-Z0-9-_%/\.]+$/;
  function keyPathToCssProperty(path) {
    if (path[0] === "container") return null;
    path = structuredClone(path);
    if (path[0] === "animation") path[0] = "animate";
    if (path[0] === "aspectRatio") path[0] = "aspect";
    if (path[0] === "borderRadius") path[0] = "radius";
    if (path[0] === "boxShadow") path[0] = "shadow";
    if (path[0] === "colors") path[0] = "color";
    if (path[0] === "containers") path[0] = "container";
    if (path[0] === "fontFamily") path[0] = "font";
    if (path[0] === "fontSize") path[0] = "text";
    if (path[0] === "letterSpacing") path[0] = "tracking";
    if (path[0] === "lineHeight") path[0] = "leading";
    if (path[0] === "maxWidth") path[0] = "container";
    if (path[0] === "screens") path[0] = "breakpoint";
    if (path[0] === "transitionTimingFunction") path[0] = "ease";
    for (let part of path) {
      if (!IS_VALID_KEY.test(part)) return null;
    }
    return path
      .map((path2, idx, all) => (path2 === "1" && idx !== all.length - 1 ? "" : path2))
      .map((part) => part.replaceAll(".", "_").replace(/([a-z])([A-Z])/g, (_, a, b) => `${a}-${b.toLowerCase()}`))
      .filter((part, index) => part !== "DEFAULT" || index !== path.length - 1)
      .join("-");
  }
  function isValidThemePrimitive(value2) {
    return typeof value2 === "number" || typeof value2 === "string";
  }
  function isValidThemeTuple(value2) {
    if (!Array.isArray(value2)) return false;
    if (value2.length !== 2) return false;
    if (typeof value2[0] !== "string" && typeof value2[0] !== "number") return false;
    if (value2[1] === void 0 || value2[1] === null) return false;
    if (typeof value2[1] !== "object") return false;
    for (let key of Reflect.ownKeys(value2[1])) {
      if (typeof key !== "string") return false;
      if (typeof value2[1][key] !== "string" && typeof value2[1][key] !== "number") return false;
    }
    return true;
  }
  function walk3(obj, path = [], callback) {
    for (let key of Reflect.ownKeys(obj)) {
      let value2 = obj[key];
      if (value2 === void 0 || value2 === null) {
        continue;
      }
      let keyPath = [...path, key];
      let result = callback(value2, keyPath) ?? 0; /* Continue */
      if (result === 1 /* Skip */) continue;
      if (result === 2 /* Stop */) return 2 /* Stop */;
      if (!Array.isArray(value2) && typeof value2 !== "object") continue;
      if (walk3(value2, keyPath, callback) === 2 /* Stop */) {
        return 2 /* Stop */;
      }
    }
  }

  // ../tailwindcss/src/utils/to-key-path.ts
  function toKeyPath(path) {
    let keypath = [];
    for (let part of segment(path, ".")) {
      if (!part.includes("[")) {
        keypath.push(part);
        continue;
      }
      let currentIndex = 0;
      while (true) {
        let bracketL = part.indexOf("[", currentIndex);
        let bracketR = part.indexOf("]", bracketL);
        if (bracketL === -1 || bracketR === -1) {
          break;
        }
        if (bracketL > currentIndex) {
          keypath.push(part.slice(currentIndex, bracketL));
        }
        keypath.push(part.slice(bracketL + 1, bracketR));
        currentIndex = bracketR + 1;
      }
      if (currentIndex <= part.length - 1) {
        keypath.push(part.slice(currentIndex));
      }
    }
    return keypath;
  }

  // ../tailwindcss/src/compat/config/deep-merge.ts
  function isPlainObject(value2) {
    if (Object.prototype.toString.call(value2) !== "[object Object]") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value2);
    return prototype === null || Object.getPrototypeOf(prototype) === null;
  }
  function deepMerge(target, sources, customizer, path = []) {
    for (let source of sources) {
      if (source === null || source === void 0) {
        continue;
      }
      for (let k of Reflect.ownKeys(source)) {
        path.push(k);
        let merged = customizer(target[k], source[k], path);
        if (merged !== void 0) {
          target[k] = merged;
        } else if (!isPlainObject(target[k]) || !isPlainObject(source[k])) {
          target[k] = source[k];
        } else {
          target[k] = deepMerge({}, [target[k], source[k]], customizer, path);
        }
        path.pop();
      }
    }
    return target;
  }

  // ../tailwindcss/src/compat/plugin-functions.ts
  function createThemeFn(designSystem, configTheme, resolveValue) {
    return function theme2(path, defaultValue) {
      let lastSlash = path.lastIndexOf("/");
      let modifier = null;
      if (lastSlash !== -1) {
        modifier = path.slice(lastSlash + 1).trim();
        path = path.slice(0, lastSlash).trim();
      }
      let resolvedValue = (() => {
        let keypath = toKeyPath(path);
        let [cssValue, options] = readFromCss(designSystem.theme, keypath);
        let configValue = resolveValue(get(configTheme() ?? {}, keypath) ?? null);
        if (typeof configValue === "string") {
          configValue = configValue.replace("<alpha-value>", "1");
        }
        if (typeof cssValue !== "object") {
          if (typeof options !== "object" && options & 4 /* DEFAULT */) {
            return configValue ?? cssValue;
          }
          return cssValue;
        }
        if (configValue !== null && typeof configValue === "object" && !Array.isArray(configValue)) {
          let configValueCopy =
            // We want to make sure that we don't mutate the original config
            // value. Ideally we use `structuredClone` here, but it's not possible
            // because it can contain functions.
            deepMerge({}, [configValue], (_, b) => b);
          if (cssValue === null && Object.hasOwn(configValue, "__CSS_VALUES__")) {
            let localCssValue = {};
            for (let key in configValue.__CSS_VALUES__) {
              localCssValue[key] = configValue[key];
              delete configValueCopy[key];
            }
            cssValue = localCssValue;
          }
          for (let key in cssValue) {
            if (key === "__CSS_VALUES__") continue;
            if (
              configValue?.__CSS_VALUES__?.[key] & 4 /* DEFAULT */ &&
              get(configValueCopy, key.split("-")) !== void 0
            ) {
              continue;
            }
            configValueCopy[unescape(key)] = cssValue[key];
          }
          return configValueCopy;
        }
        if (Array.isArray(cssValue) && Array.isArray(options) && Array.isArray(configValue)) {
          let base = cssValue[0];
          let extra = cssValue[1];
          if (options[0] & 4 /* DEFAULT */) {
            base = configValue[0] ?? base;
          }
          for (let key of Object.keys(extra)) {
            if (options[1][key] & 4 /* DEFAULT */) {
              extra[key] = configValue[1][key] ?? extra[key];
            }
          }
          return [base, extra];
        }
        return cssValue ?? configValue;
      })();
      if (modifier && typeof resolvedValue === "string") {
        resolvedValue = withAlpha(resolvedValue, modifier);
      }
      return resolvedValue ?? defaultValue;
    };
  }
  function readFromCss(theme2, path) {
    if (path.length === 1 && path[0].startsWith("--")) {
      return [theme2.get([path[0]]), theme2.getOptions(path[0])];
    }
    let themeKey = keyPathToCssProperty(path);
    let map = /* @__PURE__ */ new Map();
    let nested = new DefaultMap(() => /* @__PURE__ */ new Map());
    let ns = theme2.namespace(`--${themeKey}`);
    if (ns.size === 0) {
      return [null, 0 /* NONE */];
    }
    let options = /* @__PURE__ */ new Map();
    for (let [key, value2] of ns) {
      if (!key || !key.includes("--")) {
        map.set(key, value2);
        options.set(key, theme2.getOptions(!key ? `--${themeKey}` : `--${themeKey}-${key}`));
        continue;
      }
      let nestedIndex = key.indexOf("--");
      let mainKey = key.slice(0, nestedIndex);
      let nestedKey = key.slice(nestedIndex + 2);
      nestedKey = nestedKey.replace(/-([a-z])/g, (_, a) => a.toUpperCase());
      nested.get(mainKey === "" ? null : mainKey).set(nestedKey, [value2, theme2.getOptions(`--${themeKey}${key}`)]);
    }
    let baseOptions = theme2.getOptions(`--${themeKey}`);
    for (let [key, extra] of nested) {
      let value2 = map.get(key);
      if (typeof value2 !== "string") continue;
      let extraObj = {};
      let extraOptionsObj = {};
      for (let [nestedKey, [nestedValue, nestedOptions]] of extra) {
        extraObj[nestedKey] = nestedValue;
        extraOptionsObj[nestedKey] = nestedOptions;
      }
      map.set(key, [value2, extraObj]);
      options.set(key, [baseOptions, extraOptionsObj]);
    }
    let obj = {};
    let optionsObj = {};
    for (let [key, value2] of map) {
      set(obj, [key ?? "DEFAULT"], value2);
    }
    for (let [key, value2] of options) {
      set(optionsObj, [key ?? "DEFAULT"], value2);
    }
    if (path[path.length - 1] === "DEFAULT") {
      return [obj?.DEFAULT ?? null, optionsObj.DEFAULT ?? 0 /* NONE */];
    }
    if ("DEFAULT" in obj && Object.keys(obj).length === 1) {
      return [obj.DEFAULT, optionsObj.DEFAULT ?? 0 /* NONE */];
    }
    obj.__CSS_VALUES__ = optionsObj;
    return [obj, optionsObj];
  }
  function get(obj, path) {
    for (let i = 0; i < path.length; ++i) {
      let key = path[i];
      if (obj?.[key] === void 0) {
        if (path[i + 1] === void 0) {
          return void 0;
        }
        path[i + 1] = `${key}-${path[i + 1]}`;
        continue;
      }
      obj = obj[key];
    }
    return obj;
  }
  function set(obj, path, value2) {
    for (let key of path.slice(0, -1)) {
      if (obj[key] === void 0) {
        obj[key] = {};
      }
      obj = obj[key];
    }
    obj[path[path.length - 1]] = value2;
  }

  // ../tailwindcss/src/compat/selector-parser.ts
  function combinator(value2) {
    return {
      kind: "combinator",
      value: value2,
    };
  }
  function fun2(value2, nodes) {
    return {
      kind: "function",
      value: value2,
      nodes,
    };
  }
  function selector(value2) {
    return {
      kind: "selector",
      value: value2,
    };
  }
  function separator2(value2) {
    return {
      kind: "separator",
      value: value2,
    };
  }
  function value(value2) {
    return {
      kind: "value",
      value: value2,
    };
  }
  function walk4(ast, visit, parent = null) {
    for (let i = 0; i < ast.length; i++) {
      let node = ast[i];
      let replacedNode = false;
      let replacedNodeOffset = 0;
      let status =
        visit(node, {
          parent,
          replaceWith(newNode) {
            if (replacedNode) return;
            replacedNode = true;
            if (Array.isArray(newNode)) {
              if (newNode.length === 0) {
                ast.splice(i, 1);
                replacedNodeOffset = 0;
              } else if (newNode.length === 1) {
                ast[i] = newNode[0];
                replacedNodeOffset = 1;
              } else {
                ast.splice(i, 1, ...newNode);
                replacedNodeOffset = newNode.length;
              }
            } else {
              ast[i] = newNode;
              replacedNodeOffset = 1;
            }
          },
        }) ?? 0; /* Continue */
      if (replacedNode) {
        if (status === 0 /* Continue */) {
          i--;
        } else {
          i += replacedNodeOffset - 1;
        }
        continue;
      }
      if (status === 2 /* Stop */) return 2 /* Stop */;
      if (status === 1 /* Skip */) continue;
      if (node.kind === "function") {
        if (walk4(node.nodes, visit, node) === 2 /* Stop */) {
          return 2 /* Stop */;
        }
      }
    }
  }
  function toCss3(ast) {
    let css2 = "";
    for (const node of ast) {
      switch (node.kind) {
        case "combinator":
        case "selector":
        case "separator":
        case "value": {
          css2 += node.value;
          break;
        }
        case "function": {
          css2 += node.value + "(" + toCss3(node.nodes) + ")";
        }
      }
    }
    return css2;
  }
  var BACKSLASH5 = 92;
  var CLOSE_BRACKET4 = 93;
  var CLOSE_PAREN5 = 41;
  var COLON4 = 58;
  var COMMA2 = 44;
  var DOUBLE_QUOTE5 = 34;
  var FULL_STOP = 46;
  var GREATER_THAN2 = 62;
  var NEWLINE2 = 10;
  var NUMBER_SIGN = 35;
  var OPEN_BRACKET4 = 91;
  var OPEN_PAREN5 = 40;
  var PLUS = 43;
  var SINGLE_QUOTE5 = 39;
  var SPACE3 = 32;
  var TAB3 = 9;
  var TILDE = 126;
  function parse3(input) {
    input = input.replaceAll("\r\n", "\n");
    let ast = [];
    let stack = [];
    let parent = null;
    let buffer = "";
    let peekChar;
    for (let i = 0; i < input.length; i++) {
      let currentChar = input.charCodeAt(i);
      switch (currentChar) {
        // E.g.:
        //
        // ```css
        // .foo .bar
        //     ^
        //
        // .foo > .bar
        //     ^^^
        // ```
        case COMMA2:
        case GREATER_THAN2:
        case NEWLINE2:
        case SPACE3:
        case PLUS:
        case TAB3:
        case TILDE: {
          if (buffer.length > 0) {
            let node2 = selector(buffer);
            if (parent) {
              parent.nodes.push(node2);
            } else {
              ast.push(node2);
            }
            buffer = "";
          }
          let start = i;
          let end = i + 1;
          for (; end < input.length; end++) {
            peekChar = input.charCodeAt(end);
            if (
              peekChar !== COMMA2 &&
              peekChar !== GREATER_THAN2 &&
              peekChar !== NEWLINE2 &&
              peekChar !== SPACE3 &&
              peekChar !== PLUS &&
              peekChar !== TAB3 &&
              peekChar !== TILDE
            ) {
              break;
            }
          }
          i = end - 1;
          let contents = input.slice(start, end);
          let node = contents.trim() === "," ? separator2(contents) : combinator(contents);
          if (parent) {
            parent.nodes.push(node);
          } else {
            ast.push(node);
          }
          break;
        }
        // Start of a function call.
        //
        // E.g.:
        //
        // ```css
        // .foo:not(.bar)
        //         ^
        // ```
        case OPEN_PAREN5: {
          let node = fun2(buffer, []);
          buffer = "";
          if (node.value !== ":not" && node.value !== ":where" && node.value !== ":has" && node.value !== ":is") {
            let start = i + 1;
            let nesting = 0;
            for (let j = i + 1; j < input.length; j++) {
              peekChar = input.charCodeAt(j);
              if (peekChar === OPEN_PAREN5) {
                nesting++;
                continue;
              }
              if (peekChar === CLOSE_PAREN5) {
                if (nesting === 0) {
                  i = j;
                  break;
                }
                nesting--;
              }
            }
            let end = i;
            node.nodes.push(value(input.slice(start, end)));
            buffer = "";
            i = end;
            if (parent) {
              parent.nodes.push(node);
            } else {
              ast.push(node);
            }
            break;
          }
          if (parent) {
            parent.nodes.push(node);
          } else {
            ast.push(node);
          }
          stack.push(node);
          parent = node;
          break;
        }
        // End of a function call.
        //
        // E.g.:
        //
        // ```css
        // foo(bar, baz)
        //             ^
        // ```
        case CLOSE_PAREN5: {
          let tail = stack.pop();
          if (buffer.length > 0) {
            let node = selector(buffer);
            tail.nodes.push(node);
            buffer = "";
          }
          if (stack.length > 0) {
            parent = stack[stack.length - 1];
          } else {
            parent = null;
          }
          break;
        }
        // Split compound selectors.
        //
        // E.g.:
        //
        // ```css
        // .foo.bar
        //     ^
        // ```
        case FULL_STOP:
        case COLON4:
        case NUMBER_SIGN: {
          if (buffer.length > 0) {
            let node = selector(buffer);
            if (parent) {
              parent.nodes.push(node);
            } else {
              ast.push(node);
            }
          }
          buffer = String.fromCharCode(currentChar);
          break;
        }
        // Start of an attribute selector.
        case OPEN_BRACKET4: {
          if (buffer.length > 0) {
            let node = selector(buffer);
            if (parent) {
              parent.nodes.push(node);
            } else {
              ast.push(node);
            }
          }
          buffer = "";
          let start = i;
          let nesting = 0;
          for (let j = i + 1; j < input.length; j++) {
            peekChar = input.charCodeAt(j);
            if (peekChar === OPEN_BRACKET4) {
              nesting++;
              continue;
            }
            if (peekChar === CLOSE_BRACKET4) {
              if (nesting === 0) {
                i = j;
                break;
              }
              nesting--;
            }
          }
          buffer += input.slice(start, i + 1);
          break;
        }
        // Start of a string.
        case SINGLE_QUOTE5:
        case DOUBLE_QUOTE5: {
          let start = i;
          for (let j = i + 1; j < input.length; j++) {
            peekChar = input.charCodeAt(j);
            if (peekChar === BACKSLASH5) {
              j += 1;
            } else if (peekChar === currentChar) {
              i = j;
              break;
            }
          }
          buffer += input.slice(start, i + 1);
          break;
        }
        // Escaped characters.
        case BACKSLASH5: {
          let nextChar = input.charCodeAt(i + 1);
          buffer += String.fromCharCode(currentChar) + String.fromCharCode(nextChar);
          i += 1;
          break;
        }
        // Everything else will be collected in the buffer
        default: {
          buffer += String.fromCharCode(currentChar);
        }
      }
    }
    if (buffer.length > 0) {
      ast.push(selector(buffer));
    }
    return ast;
  }

  // ../tailwindcss/src/compat/plugin-api.ts
  var IS_VALID_UTILITY_NAME = /^[a-z@][a-zA-Z0-9/%._-]*$/;
  function buildPluginApi({ designSystem, ast, resolvedConfig, featuresRef, referenceMode }) {
    let api = {
      addBase(css2) {
        if (referenceMode) return;
        let baseNodes = objectToAst(css2);
        featuresRef.current |= substituteFunctions(baseNodes, designSystem);
        ast.push(atRule("@layer", "base", baseNodes));
      },
      addVariant(name, variant) {
        if (!IS_VALID_VARIANT_NAME.test(name)) {
          throw new Error(
            `\`addVariant('${name}')\` defines an invalid variant name. Variants should only contain alphanumeric, dashes or underscore characters.`
          );
        }
        if (typeof variant === "string") {
          if (variant.includes(":merge(")) return;
        } else if (Array.isArray(variant)) {
          if (variant.some((v) => v.includes(":merge("))) return;
        } else if (typeof variant === "object") {
          let keyIncludes2 = function (object, search) {
            return Object.entries(object).some(
              ([key, value2]) => key.includes(search) || (typeof value2 === "object" && keyIncludes2(value2, search))
            );
          };
          var keyIncludes = keyIncludes2;
          if (keyIncludes2(variant, ":merge(")) return;
        }
        if (typeof variant === "string" || Array.isArray(variant)) {
          designSystem.variants.static(
            name,
            (r) => {
              r.nodes = parseVariantValue(variant, r.nodes);
            },
            {
              compounds: compoundsForSelectors(typeof variant === "string" ? [variant] : variant),
            }
          );
        } else if (typeof variant === "object") {
          designSystem.variants.fromAst(name, objectToAst(variant));
        }
      },
      matchVariant(name, fn, options) {
        function resolveVariantValue(value2, modifier, nodes) {
          let resolved = fn(value2, { modifier: modifier?.value ?? null });
          return parseVariantValue(resolved, nodes);
        }
        try {
          let sample = fn("a", { modifier: null });
          if (typeof sample === "string" && sample.includes(":merge(")) {
            return;
          } else if (Array.isArray(sample) && sample.some((r) => r.includes(":merge("))) {
            return;
          }
        } catch {}
        let defaultOptionKeys = Object.keys(options?.values ?? {});
        designSystem.variants.group(
          () => {
            designSystem.variants.functional(name, (ruleNodes, variant) => {
              if (!variant.value) {
                if (options?.values && "DEFAULT" in options.values) {
                  ruleNodes.nodes = resolveVariantValue(options.values.DEFAULT, variant.modifier, ruleNodes.nodes);
                  return;
                }
                return null;
              }
              if (variant.value.kind === "arbitrary") {
                ruleNodes.nodes = resolveVariantValue(variant.value.value, variant.modifier, ruleNodes.nodes);
              } else if (variant.value.kind === "named" && options?.values) {
                let defaultValue = options.values[variant.value.value];
                if (typeof defaultValue !== "string") {
                  return;
                }
                ruleNodes.nodes = resolveVariantValue(defaultValue, variant.modifier, ruleNodes.nodes);
              }
            });
          },
          (a, z) => {
            if (a.kind !== "functional" || z.kind !== "functional") {
              return 0;
            }
            let aValueKey = a.value ? a.value.value : "DEFAULT";
            let zValueKey = z.value ? z.value.value : "DEFAULT";
            let aValue = options?.values?.[aValueKey] ?? aValueKey;
            let zValue = options?.values?.[zValueKey] ?? zValueKey;
            if (options && typeof options.sort === "function") {
              return options.sort(
                { value: aValue, modifier: a.modifier?.value ?? null },
                { value: zValue, modifier: z.modifier?.value ?? null }
              );
            }
            let aOrder = defaultOptionKeys.indexOf(aValueKey);
            let zOrder = defaultOptionKeys.indexOf(zValueKey);
            aOrder = aOrder === -1 ? defaultOptionKeys.length : aOrder;
            zOrder = zOrder === -1 ? defaultOptionKeys.length : zOrder;
            if (aOrder !== zOrder) return aOrder - zOrder;
            return aValue < zValue ? -1 : 1;
          }
        );
      },
      addUtilities(utilities) {
        utilities = Array.isArray(utilities) ? utilities : [utilities];
        let entries = utilities.flatMap((u) => Object.entries(u));
        entries = entries.flatMap(([name, css2]) => segment(name, ",").map((selector2) => [selector2.trim(), css2]));
        let utils = new DefaultMap(() => []);
        for (let [name, css2] of entries) {
          if (name.startsWith("@keyframes ")) {
            if (!referenceMode) {
              ast.push(rule(name, objectToAst(css2)));
            }
            continue;
          }
          let selectorAst = parse3(name);
          let foundValidUtility = false;
          walk4(selectorAst, (node) => {
            if (node.kind === "selector" && node.value[0] === "." && IS_VALID_UTILITY_NAME.test(node.value.slice(1))) {
              let value2 = node.value;
              node.value = "&";
              let selector2 = toCss3(selectorAst);
              let className = value2.slice(1);
              let contents = selector2 === "&" ? objectToAst(css2) : [rule(selector2, objectToAst(css2))];
              utils.get(className).push(...contents);
              foundValidUtility = true;
              node.value = value2;
              return;
            }
            if (node.kind === "function" && node.value === ":not") {
              return 1 /* Skip */;
            }
          });
          if (!foundValidUtility) {
            throw new Error(
              `\`addUtilities({ '${name}' : \u2026 })\` defines an invalid utility selector. Utilities must be a single class name and start with a lowercase letter, eg. \`.scrollbar-none\`.`
            );
          }
        }
        for (let [className, ast2] of utils) {
          if (designSystem.theme.prefix) {
            walk2(ast2, (node) => {
              if (node.kind === "rule") {
                let selectorAst = parse3(node.selector);
                walk4(selectorAst, (node2) => {
                  if (node2.kind === "selector" && node2.value[0] === ".") {
                    node2.value = `.${designSystem.theme.prefix}\\:${node2.value.slice(1)}`;
                  }
                });
                node.selector = toCss3(selectorAst);
              }
            });
          }
          designSystem.utilities.static(className, (candidate) => {
            let clonedAst = structuredClone(ast2);
            replaceNestedClassNameReferences(clonedAst, className, candidate.raw);
            featuresRef.current |= substituteAtApply(clonedAst, designSystem);
            return clonedAst;
          });
        }
      },
      matchUtilities(utilities, options) {
        let types = options?.type ? (Array.isArray(options?.type) ? options.type : [options.type]) : ["any"];
        for (let [name, fn] of Object.entries(utilities)) {
          let compileFn2 = function ({ negative }) {
            return (candidate) => {
              if (candidate.value?.kind === "arbitrary" && types.length > 0 && !types.includes("any")) {
                if (candidate.value.dataType && !types.includes(candidate.value.dataType)) {
                  return;
                }
                if (!candidate.value.dataType && !inferDataType(candidate.value.value, types)) {
                  return;
                }
              }
              let isColor2 = types.includes("color");
              let value2 = null;
              let ignoreModifier = false;
              {
                let values = options?.values ?? {};
                if (isColor2) {
                  values = Object.assign(
                    {
                      inherit: "inherit",
                      transparent: "transparent",
                      current: "currentcolor",
                    },
                    values
                  );
                }
                if (!candidate.value) {
                  value2 = values.DEFAULT ?? null;
                } else if (candidate.value.kind === "arbitrary") {
                  value2 = candidate.value.value;
                } else if (candidate.value.fraction && values[candidate.value.fraction]) {
                  value2 = values[candidate.value.fraction];
                  ignoreModifier = true;
                } else if (values[candidate.value.value]) {
                  value2 = values[candidate.value.value];
                } else if (values.__BARE_VALUE__) {
                  value2 = values.__BARE_VALUE__(candidate.value) ?? null;
                  ignoreModifier = (candidate.value.fraction !== null && value2?.includes("/")) ?? false;
                }
              }
              if (value2 === null) return;
              let modifier;
              {
                let modifiers = options?.modifiers ?? null;
                if (!candidate.modifier) {
                  modifier = null;
                } else if (modifiers === "any" || candidate.modifier.kind === "arbitrary") {
                  modifier = candidate.modifier.value;
                } else if (modifiers?.[candidate.modifier.value]) {
                  modifier = modifiers[candidate.modifier.value];
                } else if (isColor2 && !Number.isNaN(Number(candidate.modifier.value))) {
                  modifier = `${candidate.modifier.value}%`;
                } else {
                  modifier = null;
                }
              }
              if (candidate.modifier && modifier === null && !ignoreModifier) {
                return candidate.value?.kind === "arbitrary" ? null : void 0;
              }
              if (isColor2 && modifier !== null) {
                value2 = withAlpha(value2, modifier);
              }
              if (negative) {
                value2 = `calc(${value2} * -1)`;
              }
              let ast2 = objectToAst(fn(value2, { modifier }));
              replaceNestedClassNameReferences(ast2, name, candidate.raw);
              featuresRef.current |= substituteAtApply(ast2, designSystem);
              return ast2;
            };
          };
          var compileFn = compileFn2;
          if (!IS_VALID_UTILITY_NAME.test(name)) {
            throw new Error(
              `\`matchUtilities({ '${name}' : \u2026 })\` defines an invalid utility name. Utilities should be alphanumeric and start with a lowercase letter, eg. \`scrollbar\`.`
            );
          }
          if (options?.supportsNegativeValues) {
            designSystem.utilities.functional(`-${name}`, compileFn2({ negative: true }), { types });
          }
          designSystem.utilities.functional(name, compileFn2({ negative: false }), { types });
          designSystem.utilities.suggest(name, () => {
            let values = options?.values ?? {};
            let valueKeys = new Set(Object.keys(values));
            valueKeys.delete("__BARE_VALUE__");
            if (valueKeys.has("DEFAULT")) {
              valueKeys.delete("DEFAULT");
              valueKeys.add(null);
            }
            let modifiers = options?.modifiers ?? {};
            let modifierKeys = modifiers === "any" ? [] : Object.keys(modifiers);
            return [
              {
                supportsNegative: options?.supportsNegativeValues ?? false,
                values: Array.from(valueKeys),
                modifiers: modifierKeys,
              },
            ];
          });
        }
      },
      addComponents(components, options) {
        this.addUtilities(components, options);
      },
      matchComponents(components, options) {
        this.matchUtilities(components, options);
      },
      theme: createThemeFn(
        designSystem,
        () => resolvedConfig.theme ?? {},
        (value2) => value2
      ),
      prefix(className) {
        return className;
      },
      config(path, defaultValue) {
        let obj = resolvedConfig;
        if (!path) return obj;
        let keypath = toKeyPath(path);
        for (let i = 0; i < keypath.length; ++i) {
          let key = keypath[i];
          if (obj[key] === void 0) return defaultValue;
          obj = obj[key];
        }
        return obj ?? defaultValue;
      },
    };
    api.addComponents = api.addComponents.bind(api);
    api.matchComponents = api.matchComponents.bind(api);
    return api;
  }
  function objectToAst(rules) {
    let ast = [];
    rules = Array.isArray(rules) ? rules : [rules];
    let entries = rules.flatMap((rule2) => Object.entries(rule2));
    for (let [name, value2] of entries) {
      if (typeof value2 !== "object") {
        if (!name.startsWith("--")) {
          if (value2 === "@slot") {
            ast.push(rule(name, [atRule("@slot")]));
            continue;
          }
          name = name.replace(/([A-Z])/g, "-$1").toLowerCase();
        }
        ast.push(decl(name, String(value2)));
      } else if (Array.isArray(value2)) {
        for (let item of value2) {
          if (typeof item === "string") {
            ast.push(decl(name, item));
          } else {
            ast.push(rule(name, objectToAst(item)));
          }
        }
      } else if (value2 !== null) {
        ast.push(rule(name, objectToAst(value2)));
      }
    }
    return ast;
  }
  function parseVariantValue(resolved, nodes) {
    let resolvedArray = typeof resolved === "string" ? [resolved] : resolved;
    return resolvedArray.flatMap((r) => {
      if (r.trim().endsWith("}")) {
        let updatedCSS = r.replace("}", "{@slot}}");
        let ast = parse(updatedCSS);
        substituteAtSlot(ast, nodes);
        return ast;
      } else {
        return rule(r, nodes);
      }
    });
  }
  function replaceNestedClassNameReferences(ast, utilityName, rawCandidate) {
    walk2(ast, (node) => {
      if (node.kind === "rule") {
        let selectorAst = parse3(node.selector);
        walk4(selectorAst, (node2) => {
          if (node2.kind === "selector" && node2.value === `.${utilityName}`) {
            node2.value = `.${escape(rawCandidate)}`;
          }
        });
        node.selector = toCss3(selectorAst);
      }
    });
  }

  // ../tailwindcss/src/compat/apply-keyframes-to-theme.ts
  function applyKeyframesToTheme(designSystem, resolvedConfig, replacedThemeKeys) {
    for (let rule2 of keyframesToRules(resolvedConfig)) {
      designSystem.theme.addKeyframes(rule2);
    }
  }
  function keyframesToRules(resolvedConfig) {
    let rules = [];
    if ("keyframes" in resolvedConfig.theme) {
      for (let [name, keyframe] of Object.entries(resolvedConfig.theme.keyframes)) {
        rules.push(atRule("@keyframes", name, objectToAst(keyframe)));
      }
    }
    return rules;
  }

  // ../tailwindcss/src/compat/colors.ts
  var colors_default = {
    inherit: "inherit",
    current: "currentcolor",
    transparent: "transparent",
    black: "#000",
    white: "#fff",
    slate: {
      50: "oklch(98.4% 0.003 247.858)",
      100: "oklch(96.8% 0.007 247.896)",
      200: "oklch(92.9% 0.013 255.508)",
      300: "oklch(86.9% 0.022 252.894)",
      400: "oklch(70.4% 0.04 256.788)",
      500: "oklch(55.4% 0.046 257.417)",
      600: "oklch(44.6% 0.043 257.281)",
      700: "oklch(37.2% 0.044 257.287)",
      800: "oklch(27.9% 0.041 260.031)",
      900: "oklch(20.8% 0.042 265.755)",
      950: "oklch(12.9% 0.042 264.695)",
    },
    gray: {
      50: "oklch(98.5% 0.002 247.839)",
      100: "oklch(96.7% 0.003 264.542)",
      200: "oklch(92.8% 0.006 264.531)",
      300: "oklch(87.2% 0.01 258.338)",
      400: "oklch(70.7% 0.022 261.325)",
      500: "oklch(55.1% 0.027 264.364)",
      600: "oklch(44.6% 0.03 256.802)",
      700: "oklch(37.3% 0.034 259.733)",
      800: "oklch(27.8% 0.033 256.848)",
      900: "oklch(21% 0.034 264.665)",
      950: "oklch(13% 0.028 261.692)",
    },
    zinc: {
      50: "oklch(98.5% 0 0)",
      100: "oklch(96.7% 0.001 286.375)",
      200: "oklch(92% 0.004 286.32)",
      300: "oklch(87.1% 0.006 286.286)",
      400: "oklch(70.5% 0.015 286.067)",
      500: "oklch(55.2% 0.016 285.938)",
      600: "oklch(44.2% 0.017 285.786)",
      700: "oklch(37% 0.013 285.805)",
      800: "oklch(27.4% 0.006 286.033)",
      900: "oklch(21% 0.006 285.885)",
      950: "oklch(14.1% 0.005 285.823)",
    },
    neutral: {
      50: "oklch(98.5% 0 0)",
      100: "oklch(97% 0 0)",
      200: "oklch(92.2% 0 0)",
      300: "oklch(87% 0 0)",
      400: "oklch(70.8% 0 0)",
      500: "oklch(55.6% 0 0)",
      600: "oklch(43.9% 0 0)",
      700: "oklch(37.1% 0 0)",
      800: "oklch(26.9% 0 0)",
      900: "oklch(20.5% 0 0)",
      950: "oklch(14.5% 0 0)",
    },
    stone: {
      50: "oklch(98.5% 0.001 106.423)",
      100: "oklch(97% 0.001 106.424)",
      200: "oklch(92.3% 0.003 48.717)",
      300: "oklch(86.9% 0.005 56.366)",
      400: "oklch(70.9% 0.01 56.259)",
      500: "oklch(55.3% 0.013 58.071)",
      600: "oklch(44.4% 0.011 73.639)",
      700: "oklch(37.4% 0.01 67.558)",
      800: "oklch(26.8% 0.007 34.298)",
      900: "oklch(21.6% 0.006 56.043)",
      950: "oklch(14.7% 0.004 49.25)",
    },
    red: {
      50: "oklch(97.1% 0.013 17.38)",
      100: "oklch(93.6% 0.032 17.717)",
      200: "oklch(88.5% 0.062 18.334)",
      300: "oklch(80.8% 0.114 19.571)",
      400: "oklch(70.4% 0.191 22.216)",
      500: "oklch(63.7% 0.237 25.331)",
      600: "oklch(57.7% 0.245 27.325)",
      700: "oklch(50.5% 0.213 27.518)",
      800: "oklch(44.4% 0.177 26.899)",
      900: "oklch(39.6% 0.141 25.723)",
      950: "oklch(25.8% 0.092 26.042)",
    },
    orange: {
      50: "oklch(98% 0.016 73.684)",
      100: "oklch(95.4% 0.038 75.164)",
      200: "oklch(90.1% 0.076 70.697)",
      300: "oklch(83.7% 0.128 66.29)",
      400: "oklch(75% 0.183 55.934)",
      500: "oklch(70.5% 0.213 47.604)",
      600: "oklch(64.6% 0.222 41.116)",
      700: "oklch(55.3% 0.195 38.402)",
      800: "oklch(47% 0.157 37.304)",
      900: "oklch(40.8% 0.123 38.172)",
      950: "oklch(26.6% 0.079 36.259)",
    },
    amber: {
      50: "oklch(98.7% 0.022 95.277)",
      100: "oklch(96.2% 0.059 95.617)",
      200: "oklch(92.4% 0.12 95.746)",
      300: "oklch(87.9% 0.169 91.605)",
      400: "oklch(82.8% 0.189 84.429)",
      500: "oklch(76.9% 0.188 70.08)",
      600: "oklch(66.6% 0.179 58.318)",
      700: "oklch(55.5% 0.163 48.998)",
      800: "oklch(47.3% 0.137 46.201)",
      900: "oklch(41.4% 0.112 45.904)",
      950: "oklch(27.9% 0.077 45.635)",
    },
    yellow: {
      50: "oklch(98.7% 0.026 102.212)",
      100: "oklch(97.3% 0.071 103.193)",
      200: "oklch(94.5% 0.129 101.54)",
      300: "oklch(90.5% 0.182 98.111)",
      400: "oklch(85.2% 0.199 91.936)",
      500: "oklch(79.5% 0.184 86.047)",
      600: "oklch(68.1% 0.162 75.834)",
      700: "oklch(55.4% 0.135 66.442)",
      800: "oklch(47.6% 0.114 61.907)",
      900: "oklch(42.1% 0.095 57.708)",
      950: "oklch(28.6% 0.066 53.813)",
    },
    lime: {
      50: "oklch(98.6% 0.031 120.757)",
      100: "oklch(96.7% 0.067 122.328)",
      200: "oklch(93.8% 0.127 124.321)",
      300: "oklch(89.7% 0.196 126.665)",
      400: "oklch(84.1% 0.238 128.85)",
      500: "oklch(76.8% 0.233 130.85)",
      600: "oklch(64.8% 0.2 131.684)",
      700: "oklch(53.2% 0.157 131.589)",
      800: "oklch(45.3% 0.124 130.933)",
      900: "oklch(40.5% 0.101 131.063)",
      950: "oklch(27.4% 0.072 132.109)",
    },
    green: {
      50: "oklch(98.2% 0.018 155.826)",
      100: "oklch(96.2% 0.044 156.743)",
      200: "oklch(92.5% 0.084 155.995)",
      300: "oklch(87.1% 0.15 154.449)",
      400: "oklch(79.2% 0.209 151.711)",
      500: "oklch(72.3% 0.219 149.579)",
      600: "oklch(62.7% 0.194 149.214)",
      700: "oklch(52.7% 0.154 150.069)",
      800: "oklch(44.8% 0.119 151.328)",
      900: "oklch(39.3% 0.095 152.535)",
      950: "oklch(26.6% 0.065 152.934)",
    },
    emerald: {
      50: "oklch(97.9% 0.021 166.113)",
      100: "oklch(95% 0.052 163.051)",
      200: "oklch(90.5% 0.093 164.15)",
      300: "oklch(84.5% 0.143 164.978)",
      400: "oklch(76.5% 0.177 163.223)",
      500: "oklch(69.6% 0.17 162.48)",
      600: "oklch(59.6% 0.145 163.225)",
      700: "oklch(50.8% 0.118 165.612)",
      800: "oklch(43.2% 0.095 166.913)",
      900: "oklch(37.8% 0.077 168.94)",
      950: "oklch(26.2% 0.051 172.552)",
    },
    teal: {
      50: "oklch(98.4% 0.014 180.72)",
      100: "oklch(95.3% 0.051 180.801)",
      200: "oklch(91% 0.096 180.426)",
      300: "oklch(85.5% 0.138 181.071)",
      400: "oklch(77.7% 0.152 181.912)",
      500: "oklch(70.4% 0.14 182.503)",
      600: "oklch(60% 0.118 184.704)",
      700: "oklch(51.1% 0.096 186.391)",
      800: "oklch(43.7% 0.078 188.216)",
      900: "oklch(38.6% 0.063 188.416)",
      950: "oklch(27.7% 0.046 192.524)",
    },
    cyan: {
      50: "oklch(98.4% 0.019 200.873)",
      100: "oklch(95.6% 0.045 203.388)",
      200: "oklch(91.7% 0.08 205.041)",
      300: "oklch(86.5% 0.127 207.078)",
      400: "oklch(78.9% 0.154 211.53)",
      500: "oklch(71.5% 0.143 215.221)",
      600: "oklch(60.9% 0.126 221.723)",
      700: "oklch(52% 0.105 223.128)",
      800: "oklch(45% 0.085 224.283)",
      900: "oklch(39.8% 0.07 227.392)",
      950: "oklch(30.2% 0.056 229.695)",
    },
    sky: {
      50: "oklch(97.7% 0.013 236.62)",
      100: "oklch(95.1% 0.026 236.824)",
      200: "oklch(90.1% 0.058 230.902)",
      300: "oklch(82.8% 0.111 230.318)",
      400: "oklch(74.6% 0.16 232.661)",
      500: "oklch(68.5% 0.169 237.323)",
      600: "oklch(58.8% 0.158 241.966)",
      700: "oklch(50% 0.134 242.749)",
      800: "oklch(44.3% 0.11 240.79)",
      900: "oklch(39.1% 0.09 240.876)",
      950: "oklch(29.3% 0.066 243.157)",
    },
    blue: {
      50: "oklch(97% 0.014 254.604)",
      100: "oklch(93.2% 0.032 255.585)",
      200: "oklch(88.2% 0.059 254.128)",
      300: "oklch(80.9% 0.105 251.813)",
      400: "oklch(70.7% 0.165 254.624)",
      500: "oklch(62.3% 0.214 259.815)",
      600: "oklch(54.6% 0.245 262.881)",
      700: "oklch(48.8% 0.243 264.376)",
      800: "oklch(42.4% 0.199 265.638)",
      900: "oklch(37.9% 0.146 265.522)",
      950: "oklch(28.2% 0.091 267.935)",
    },
    indigo: {
      50: "oklch(96.2% 0.018 272.314)",
      100: "oklch(93% 0.034 272.788)",
      200: "oklch(87% 0.065 274.039)",
      300: "oklch(78.5% 0.115 274.713)",
      400: "oklch(67.3% 0.182 276.935)",
      500: "oklch(58.5% 0.233 277.117)",
      600: "oklch(51.1% 0.262 276.966)",
      700: "oklch(45.7% 0.24 277.023)",
      800: "oklch(39.8% 0.195 277.366)",
      900: "oklch(35.9% 0.144 278.697)",
      950: "oklch(25.7% 0.09 281.288)",
    },
    violet: {
      50: "oklch(96.9% 0.016 293.756)",
      100: "oklch(94.3% 0.029 294.588)",
      200: "oklch(89.4% 0.057 293.283)",
      300: "oklch(81.1% 0.111 293.571)",
      400: "oklch(70.2% 0.183 293.541)",
      500: "oklch(60.6% 0.25 292.717)",
      600: "oklch(54.1% 0.281 293.009)",
      700: "oklch(49.1% 0.27 292.581)",
      800: "oklch(43.2% 0.232 292.759)",
      900: "oklch(38% 0.189 293.745)",
      950: "oklch(28.3% 0.141 291.089)",
    },
    purple: {
      50: "oklch(97.7% 0.014 308.299)",
      100: "oklch(94.6% 0.033 307.174)",
      200: "oklch(90.2% 0.063 306.703)",
      300: "oklch(82.7% 0.119 306.383)",
      400: "oklch(71.4% 0.203 305.504)",
      500: "oklch(62.7% 0.265 303.9)",
      600: "oklch(55.8% 0.288 302.321)",
      700: "oklch(49.6% 0.265 301.924)",
      800: "oklch(43.8% 0.218 303.724)",
      900: "oklch(38.1% 0.176 304.987)",
      950: "oklch(29.1% 0.149 302.717)",
    },
    fuchsia: {
      50: "oklch(97.7% 0.017 320.058)",
      100: "oklch(95.2% 0.037 318.852)",
      200: "oklch(90.3% 0.076 319.62)",
      300: "oklch(83.3% 0.145 321.434)",
      400: "oklch(74% 0.238 322.16)",
      500: "oklch(66.7% 0.295 322.15)",
      600: "oklch(59.1% 0.293 322.896)",
      700: "oklch(51.8% 0.253 323.949)",
      800: "oklch(45.2% 0.211 324.591)",
      900: "oklch(40.1% 0.17 325.612)",
      950: "oklch(29.3% 0.136 325.661)",
    },
    pink: {
      50: "oklch(97.1% 0.014 343.198)",
      100: "oklch(94.8% 0.028 342.258)",
      200: "oklch(89.9% 0.061 343.231)",
      300: "oklch(82.3% 0.12 346.018)",
      400: "oklch(71.8% 0.202 349.761)",
      500: "oklch(65.6% 0.241 354.308)",
      600: "oklch(59.2% 0.249 0.584)",
      700: "oklch(52.5% 0.223 3.958)",
      800: "oklch(45.9% 0.187 3.815)",
      900: "oklch(40.8% 0.153 2.432)",
      950: "oklch(28.4% 0.109 3.907)",
    },
    rose: {
      50: "oklch(96.9% 0.015 12.422)",
      100: "oklch(94.1% 0.03 12.58)",
      200: "oklch(89.2% 0.058 10.001)",
      300: "oklch(81% 0.117 11.638)",
      400: "oklch(71.2% 0.194 13.428)",
      500: "oklch(64.5% 0.246 16.439)",
      600: "oklch(58.6% 0.253 17.585)",
      700: "oklch(51.4% 0.222 16.935)",
      800: "oklch(45.5% 0.188 13.697)",
      900: "oklch(41% 0.159 10.272)",
      950: "oklch(27.1% 0.105 12.094)",
    },
  };

  // ../tailwindcss/src/compat/default-theme.ts
  function bareValues(fn) {
    return {
      // Ideally this would be a Symbol but some of the ecosystem assumes object with
      // string / number keys for example by using `Object.entries()` which means that
      // the function that handles the bare value would be lost
      __BARE_VALUE__: fn,
    };
  }
  var bareIntegers = bareValues((value2) => {
    if (isPositiveInteger(value2.value)) {
      return value2.value;
    }
  });
  var barePercentages = bareValues((value2) => {
    if (isPositiveInteger(value2.value)) {
      return `${value2.value}%`;
    }
  });
  var barePixels = bareValues((value2) => {
    if (isPositiveInteger(value2.value)) {
      return `${value2.value}px`;
    }
  });
  var bareMilliseconds = bareValues((value2) => {
    if (isPositiveInteger(value2.value)) {
      return `${value2.value}ms`;
    }
  });
  var bareDegrees = bareValues((value2) => {
    if (isPositiveInteger(value2.value)) {
      return `${value2.value}deg`;
    }
  });
  var bareAspectRatio = bareValues((value2) => {
    if (value2.fraction === null) return;
    let [lhs, rhs] = segment(value2.fraction, "/");
    if (!isPositiveInteger(lhs) || !isPositiveInteger(rhs)) return;
    return value2.fraction;
  });
  var bareRepeatValues = bareValues((value2) => {
    if (isPositiveInteger(Number(value2.value))) {
      return `repeat(${value2.value}, minmax(0, 1fr))`;
    }
  });
  var default_theme_default = {
    accentColor: ({ theme: theme2 }) => theme2("colors"),
    animation: {
      none: "none",
      spin: "spin 1s linear infinite",
      ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
      pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      bounce: "bounce 1s infinite",
    },
    aria: {
      busy: 'busy="true"',
      checked: 'checked="true"',
      disabled: 'disabled="true"',
      expanded: 'expanded="true"',
      hidden: 'hidden="true"',
      pressed: 'pressed="true"',
      readonly: 'readonly="true"',
      required: 'required="true"',
      selected: 'selected="true"',
    },
    aspectRatio: {
      auto: "auto",
      square: "1 / 1",
      video: "16 / 9",
      ...bareAspectRatio,
    },
    backdropBlur: ({ theme: theme2 }) => theme2("blur"),
    backdropBrightness: ({ theme: theme2 }) => ({
      ...theme2("brightness"),
      ...barePercentages,
    }),
    backdropContrast: ({ theme: theme2 }) => ({
      ...theme2("contrast"),
      ...barePercentages,
    }),
    backdropGrayscale: ({ theme: theme2 }) => ({
      ...theme2("grayscale"),
      ...barePercentages,
    }),
    backdropHueRotate: ({ theme: theme2 }) => ({
      ...theme2("hueRotate"),
      ...bareDegrees,
    }),
    backdropInvert: ({ theme: theme2 }) => ({
      ...theme2("invert"),
      ...barePercentages,
    }),
    backdropOpacity: ({ theme: theme2 }) => ({
      ...theme2("opacity"),
      ...barePercentages,
    }),
    backdropSaturate: ({ theme: theme2 }) => ({
      ...theme2("saturate"),
      ...barePercentages,
    }),
    backdropSepia: ({ theme: theme2 }) => ({
      ...theme2("sepia"),
      ...barePercentages,
    }),
    backgroundColor: ({ theme: theme2 }) => theme2("colors"),
    backgroundImage: {
      none: "none",
      "gradient-to-t": "linear-gradient(to top, var(--tw-gradient-stops))",
      "gradient-to-tr": "linear-gradient(to top right, var(--tw-gradient-stops))",
      "gradient-to-r": "linear-gradient(to right, var(--tw-gradient-stops))",
      "gradient-to-br": "linear-gradient(to bottom right, var(--tw-gradient-stops))",
      "gradient-to-b": "linear-gradient(to bottom, var(--tw-gradient-stops))",
      "gradient-to-bl": "linear-gradient(to bottom left, var(--tw-gradient-stops))",
      "gradient-to-l": "linear-gradient(to left, var(--tw-gradient-stops))",
      "gradient-to-tl": "linear-gradient(to top left, var(--tw-gradient-stops))",
    },
    backgroundOpacity: ({ theme: theme2 }) => theme2("opacity"),
    backgroundPosition: {
      bottom: "bottom",
      center: "center",
      left: "left",
      "left-bottom": "left bottom",
      "left-top": "left top",
      right: "right",
      "right-bottom": "right bottom",
      "right-top": "right top",
      top: "top",
    },
    backgroundSize: {
      auto: "auto",
      cover: "cover",
      contain: "contain",
    },
    blur: {
      0: "0",
      none: "",
      sm: "4px",
      DEFAULT: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px",
      "2xl": "40px",
      "3xl": "64px",
    },
    borderColor: ({ theme: theme2 }) => ({
      DEFAULT: "currentcolor",
      ...theme2("colors"),
    }),
    borderOpacity: ({ theme: theme2 }) => theme2("opacity"),
    borderRadius: {
      none: "0px",
      sm: "0.125rem",
      DEFAULT: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
      "2xl": "1rem",
      "3xl": "1.5rem",
      full: "9999px",
    },
    borderSpacing: ({ theme: theme2 }) => theme2("spacing"),
    borderWidth: {
      DEFAULT: "1px",
      0: "0px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    boxShadow: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
      none: "none",
    },
    boxShadowColor: ({ theme: theme2 }) => theme2("colors"),
    brightness: {
      0: "0",
      50: ".5",
      75: ".75",
      90: ".9",
      95: ".95",
      100: "1",
      105: "1.05",
      110: "1.1",
      125: "1.25",
      150: "1.5",
      200: "2",
      ...barePercentages,
    },
    caretColor: ({ theme: theme2 }) => theme2("colors"),
    colors: () => ({ ...colors_default }),
    columns: {
      auto: "auto",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "11",
      12: "12",
      "3xs": "16rem",
      "2xs": "18rem",
      xs: "20rem",
      sm: "24rem",
      md: "28rem",
      lg: "32rem",
      xl: "36rem",
      "2xl": "42rem",
      "3xl": "48rem",
      "4xl": "56rem",
      "5xl": "64rem",
      "6xl": "72rem",
      "7xl": "80rem",
      ...bareIntegers,
    },
    container: {},
    content: {
      none: "none",
    },
    contrast: {
      0: "0",
      50: ".5",
      75: ".75",
      100: "1",
      125: "1.25",
      150: "1.5",
      200: "2",
      ...barePercentages,
    },
    cursor: {
      auto: "auto",
      default: "default",
      pointer: "pointer",
      wait: "wait",
      text: "text",
      move: "move",
      help: "help",
      "not-allowed": "not-allowed",
      none: "none",
      "context-menu": "context-menu",
      progress: "progress",
      cell: "cell",
      crosshair: "crosshair",
      "vertical-text": "vertical-text",
      alias: "alias",
      copy: "copy",
      "no-drop": "no-drop",
      grab: "grab",
      grabbing: "grabbing",
      "all-scroll": "all-scroll",
      "col-resize": "col-resize",
      "row-resize": "row-resize",
      "n-resize": "n-resize",
      "e-resize": "e-resize",
      "s-resize": "s-resize",
      "w-resize": "w-resize",
      "ne-resize": "ne-resize",
      "nw-resize": "nw-resize",
      "se-resize": "se-resize",
      "sw-resize": "sw-resize",
      "ew-resize": "ew-resize",
      "ns-resize": "ns-resize",
      "nesw-resize": "nesw-resize",
      "nwse-resize": "nwse-resize",
      "zoom-in": "zoom-in",
      "zoom-out": "zoom-out",
    },
    divideColor: ({ theme: theme2 }) => theme2("borderColor"),
    divideOpacity: ({ theme: theme2 }) => theme2("borderOpacity"),
    divideWidth: ({ theme: theme2 }) => ({
      ...theme2("borderWidth"),
      ...barePixels,
    }),
    dropShadow: {
      sm: "0 1px 1px rgb(0 0 0 / 0.05)",
      DEFAULT: ["0 1px 2px rgb(0 0 0 / 0.1)", "0 1px 1px rgb(0 0 0 / 0.06)"],
      md: ["0 4px 3px rgb(0 0 0 / 0.07)", "0 2px 2px rgb(0 0 0 / 0.06)"],
      lg: ["0 10px 8px rgb(0 0 0 / 0.04)", "0 4px 3px rgb(0 0 0 / 0.1)"],
      xl: ["0 20px 13px rgb(0 0 0 / 0.03)", "0 8px 5px rgb(0 0 0 / 0.08)"],
      "2xl": "0 25px 25px rgb(0 0 0 / 0.15)",
      none: "0 0 #0000",
    },
    fill: ({ theme: theme2 }) => theme2("colors"),
    flex: {
      1: "1 1 0%",
      auto: "1 1 auto",
      initial: "0 1 auto",
      none: "none",
    },
    flexBasis: ({ theme: theme2 }) => ({
      auto: "auto",
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "2/4": "50%",
      "3/4": "75%",
      "1/5": "20%",
      "2/5": "40%",
      "3/5": "60%",
      "4/5": "80%",
      "1/6": "16.666667%",
      "2/6": "33.333333%",
      "3/6": "50%",
      "4/6": "66.666667%",
      "5/6": "83.333333%",
      "1/12": "8.333333%",
      "2/12": "16.666667%",
      "3/12": "25%",
      "4/12": "33.333333%",
      "5/12": "41.666667%",
      "6/12": "50%",
      "7/12": "58.333333%",
      "8/12": "66.666667%",
      "9/12": "75%",
      "10/12": "83.333333%",
      "11/12": "91.666667%",
      full: "100%",
      ...theme2("spacing"),
    }),
    flexGrow: {
      0: "0",
      DEFAULT: "1",
      ...bareIntegers,
    },
    flexShrink: {
      0: "0",
      DEFAULT: "1",
      ...bareIntegers,
    },
    fontFamily: {
      sans: [
        "ui-sans-serif",
        "system-ui",
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        '"Noto Color Emoji"',
      ],
      serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      mono: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        '"Liberation Mono"',
        '"Courier New"',
        "monospace",
      ],
    },
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],
      sm: ["0.875rem", { lineHeight: "1.25rem" }],
      base: ["1rem", { lineHeight: "1.5rem" }],
      lg: ["1.125rem", { lineHeight: "1.75rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.5rem", { lineHeight: "2rem" }],
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      "5xl": ["3rem", { lineHeight: "1" }],
      "6xl": ["3.75rem", { lineHeight: "1" }],
      "7xl": ["4.5rem", { lineHeight: "1" }],
      "8xl": ["6rem", { lineHeight: "1" }],
      "9xl": ["8rem", { lineHeight: "1" }],
    },
    fontWeight: {
      thin: "100",
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    },
    gap: ({ theme: theme2 }) => theme2("spacing"),
    gradientColorStops: ({ theme: theme2 }) => theme2("colors"),
    gradientColorStopPositions: {
      "0%": "0%",
      "5%": "5%",
      "10%": "10%",
      "15%": "15%",
      "20%": "20%",
      "25%": "25%",
      "30%": "30%",
      "35%": "35%",
      "40%": "40%",
      "45%": "45%",
      "50%": "50%",
      "55%": "55%",
      "60%": "60%",
      "65%": "65%",
      "70%": "70%",
      "75%": "75%",
      "80%": "80%",
      "85%": "85%",
      "90%": "90%",
      "95%": "95%",
      "100%": "100%",
      ...barePercentages,
    },
    grayscale: {
      0: "0",
      DEFAULT: "100%",
      ...barePercentages,
    },
    gridAutoColumns: {
      auto: "auto",
      min: "min-content",
      max: "max-content",
      fr: "minmax(0, 1fr)",
    },
    gridAutoRows: {
      auto: "auto",
      min: "min-content",
      max: "max-content",
      fr: "minmax(0, 1fr)",
    },
    gridColumn: {
      auto: "auto",
      "span-1": "span 1 / span 1",
      "span-2": "span 2 / span 2",
      "span-3": "span 3 / span 3",
      "span-4": "span 4 / span 4",
      "span-5": "span 5 / span 5",
      "span-6": "span 6 / span 6",
      "span-7": "span 7 / span 7",
      "span-8": "span 8 / span 8",
      "span-9": "span 9 / span 9",
      "span-10": "span 10 / span 10",
      "span-11": "span 11 / span 11",
      "span-12": "span 12 / span 12",
      "span-full": "1 / -1",
    },
    gridColumnEnd: {
      auto: "auto",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "11",
      12: "12",
      13: "13",
      ...bareIntegers,
    },
    gridColumnStart: {
      auto: "auto",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "11",
      12: "12",
      13: "13",
      ...bareIntegers,
    },
    gridRow: {
      auto: "auto",
      "span-1": "span 1 / span 1",
      "span-2": "span 2 / span 2",
      "span-3": "span 3 / span 3",
      "span-4": "span 4 / span 4",
      "span-5": "span 5 / span 5",
      "span-6": "span 6 / span 6",
      "span-7": "span 7 / span 7",
      "span-8": "span 8 / span 8",
      "span-9": "span 9 / span 9",
      "span-10": "span 10 / span 10",
      "span-11": "span 11 / span 11",
      "span-12": "span 12 / span 12",
      "span-full": "1 / -1",
    },
    gridRowEnd: {
      auto: "auto",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "11",
      12: "12",
      13: "13",
      ...bareIntegers,
    },
    gridRowStart: {
      auto: "auto",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "11",
      12: "12",
      13: "13",
      ...bareIntegers,
    },
    gridTemplateColumns: {
      none: "none",
      subgrid: "subgrid",
      1: "repeat(1, minmax(0, 1fr))",
      2: "repeat(2, minmax(0, 1fr))",
      3: "repeat(3, minmax(0, 1fr))",
      4: "repeat(4, minmax(0, 1fr))",
      5: "repeat(5, minmax(0, 1fr))",
      6: "repeat(6, minmax(0, 1fr))",
      7: "repeat(7, minmax(0, 1fr))",
      8: "repeat(8, minmax(0, 1fr))",
      9: "repeat(9, minmax(0, 1fr))",
      10: "repeat(10, minmax(0, 1fr))",
      11: "repeat(11, minmax(0, 1fr))",
      12: "repeat(12, minmax(0, 1fr))",
      ...bareRepeatValues,
    },
    gridTemplateRows: {
      none: "none",
      subgrid: "subgrid",
      1: "repeat(1, minmax(0, 1fr))",
      2: "repeat(2, minmax(0, 1fr))",
      3: "repeat(3, minmax(0, 1fr))",
      4: "repeat(4, minmax(0, 1fr))",
      5: "repeat(5, minmax(0, 1fr))",
      6: "repeat(6, minmax(0, 1fr))",
      7: "repeat(7, minmax(0, 1fr))",
      8: "repeat(8, minmax(0, 1fr))",
      9: "repeat(9, minmax(0, 1fr))",
      10: "repeat(10, minmax(0, 1fr))",
      11: "repeat(11, minmax(0, 1fr))",
      12: "repeat(12, minmax(0, 1fr))",
      ...bareRepeatValues,
    },
    height: ({ theme: theme2 }) => ({
      auto: "auto",
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "2/4": "50%",
      "3/4": "75%",
      "1/5": "20%",
      "2/5": "40%",
      "3/5": "60%",
      "4/5": "80%",
      "1/6": "16.666667%",
      "2/6": "33.333333%",
      "3/6": "50%",
      "4/6": "66.666667%",
      "5/6": "83.333333%",
      full: "100%",
      screen: "100vh",
      svh: "100svh",
      lvh: "100lvh",
      dvh: "100dvh",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      ...theme2("spacing"),
    }),
    hueRotate: {
      0: "0deg",
      15: "15deg",
      30: "30deg",
      60: "60deg",
      90: "90deg",
      180: "180deg",
      ...bareDegrees,
    },
    inset: ({ theme: theme2 }) => ({
      auto: "auto",
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "2/4": "50%",
      "3/4": "75%",
      full: "100%",
      ...theme2("spacing"),
    }),
    invert: {
      0: "0",
      DEFAULT: "100%",
      ...barePercentages,
    },
    keyframes: {
      spin: {
        to: {
          transform: "rotate(360deg)",
        },
      },
      ping: {
        "75%, 100%": {
          transform: "scale(2)",
          opacity: "0",
        },
      },
      pulse: {
        "50%": {
          opacity: ".5",
        },
      },
      bounce: {
        "0%, 100%": {
          transform: "translateY(-25%)",
          animationTimingFunction: "cubic-bezier(0.8,0,1,1)",
        },
        "50%": {
          transform: "none",
          animationTimingFunction: "cubic-bezier(0,0,0.2,1)",
        },
      },
    },
    letterSpacing: {
      tighter: "-0.05em",
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
      wider: "0.05em",
      widest: "0.1em",
    },
    lineHeight: {
      none: "1",
      tight: "1.25",
      snug: "1.375",
      normal: "1.5",
      relaxed: "1.625",
      loose: "2",
      3: ".75rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      7: "1.75rem",
      8: "2rem",
      9: "2.25rem",
      10: "2.5rem",
    },
    listStyleType: {
      none: "none",
      disc: "disc",
      decimal: "decimal",
    },
    listStyleImage: {
      none: "none",
    },
    margin: ({ theme: theme2 }) => ({
      auto: "auto",
      ...theme2("spacing"),
    }),
    lineClamp: {
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      ...bareIntegers,
    },
    maxHeight: ({ theme: theme2 }) => ({
      none: "none",
      full: "100%",
      screen: "100vh",
      svh: "100svh",
      lvh: "100lvh",
      dvh: "100dvh",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      ...theme2("spacing"),
    }),
    maxWidth: ({ theme: theme2 }) => ({
      none: "none",
      xs: "20rem",
      sm: "24rem",
      md: "28rem",
      lg: "32rem",
      xl: "36rem",
      "2xl": "42rem",
      "3xl": "48rem",
      "4xl": "56rem",
      "5xl": "64rem",
      "6xl": "72rem",
      "7xl": "80rem",
      full: "100%",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      prose: "65ch",
      ...theme2("spacing"),
    }),
    minHeight: ({ theme: theme2 }) => ({
      full: "100%",
      screen: "100vh",
      svh: "100svh",
      lvh: "100lvh",
      dvh: "100dvh",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      ...theme2("spacing"),
    }),
    minWidth: ({ theme: theme2 }) => ({
      full: "100%",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      ...theme2("spacing"),
    }),
    objectPosition: {
      bottom: "bottom",
      center: "center",
      left: "left",
      "left-bottom": "left bottom",
      "left-top": "left top",
      right: "right",
      "right-bottom": "right bottom",
      "right-top": "right top",
      top: "top",
    },
    opacity: {
      0: "0",
      5: "0.05",
      10: "0.1",
      15: "0.15",
      20: "0.2",
      25: "0.25",
      30: "0.3",
      35: "0.35",
      40: "0.4",
      45: "0.45",
      50: "0.5",
      55: "0.55",
      60: "0.6",
      65: "0.65",
      70: "0.7",
      75: "0.75",
      80: "0.8",
      85: "0.85",
      90: "0.9",
      95: "0.95",
      100: "1",
      ...barePercentages,
    },
    order: {
      first: "-9999",
      last: "9999",
      none: "0",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "11",
      12: "12",
      ...bareIntegers,
    },
    outlineColor: ({ theme: theme2 }) => theme2("colors"),
    outlineOffset: {
      0: "0px",
      1: "1px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    outlineWidth: {
      0: "0px",
      1: "1px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    padding: ({ theme: theme2 }) => theme2("spacing"),
    placeholderColor: ({ theme: theme2 }) => theme2("colors"),
    placeholderOpacity: ({ theme: theme2 }) => theme2("opacity"),
    ringColor: ({ theme: theme2 }) => ({
      DEFAULT: "currentcolor",
      ...theme2("colors"),
    }),
    ringOffsetColor: ({ theme: theme2 }) => theme2("colors"),
    ringOffsetWidth: {
      0: "0px",
      1: "1px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    ringOpacity: ({ theme: theme2 }) => ({
      DEFAULT: "0.5",
      ...theme2("opacity"),
    }),
    ringWidth: {
      DEFAULT: "3px",
      0: "0px",
      1: "1px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    rotate: {
      0: "0deg",
      1: "1deg",
      2: "2deg",
      3: "3deg",
      6: "6deg",
      12: "12deg",
      45: "45deg",
      90: "90deg",
      180: "180deg",
      ...bareDegrees,
    },
    saturate: {
      0: "0",
      50: ".5",
      100: "1",
      150: "1.5",
      200: "2",
      ...barePercentages,
    },
    scale: {
      0: "0",
      50: ".5",
      75: ".75",
      90: ".9",
      95: ".95",
      100: "1",
      105: "1.05",
      110: "1.1",
      125: "1.25",
      150: "1.5",
      ...barePercentages,
    },
    screens: {
      sm: "40rem",
      md: "48rem",
      lg: "64rem",
      xl: "80rem",
      "2xl": "96rem",
    },
    scrollMargin: ({ theme: theme2 }) => theme2("spacing"),
    scrollPadding: ({ theme: theme2 }) => theme2("spacing"),
    sepia: {
      0: "0",
      DEFAULT: "100%",
      ...barePercentages,
    },
    skew: {
      0: "0deg",
      1: "1deg",
      2: "2deg",
      3: "3deg",
      6: "6deg",
      12: "12deg",
      ...bareDegrees,
    },
    space: ({ theme: theme2 }) => theme2("spacing"),
    spacing: {
      px: "1px",
      0: "0px",
      0.5: "0.125rem",
      1: "0.25rem",
      1.5: "0.375rem",
      2: "0.5rem",
      2.5: "0.625rem",
      3: "0.75rem",
      3.5: "0.875rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      7: "1.75rem",
      8: "2rem",
      9: "2.25rem",
      10: "2.5rem",
      11: "2.75rem",
      12: "3rem",
      14: "3.5rem",
      16: "4rem",
      20: "5rem",
      24: "6rem",
      28: "7rem",
      32: "8rem",
      36: "9rem",
      40: "10rem",
      44: "11rem",
      48: "12rem",
      52: "13rem",
      56: "14rem",
      60: "15rem",
      64: "16rem",
      72: "18rem",
      80: "20rem",
      96: "24rem",
    },
    stroke: ({ theme: theme2 }) => ({
      none: "none",
      ...theme2("colors"),
    }),
    strokeWidth: {
      0: "0",
      1: "1",
      2: "2",
      ...bareIntegers,
    },
    supports: {},
    data: {},
    textColor: ({ theme: theme2 }) => theme2("colors"),
    textDecorationColor: ({ theme: theme2 }) => theme2("colors"),
    textDecorationThickness: {
      auto: "auto",
      "from-font": "from-font",
      0: "0px",
      1: "1px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    textIndent: ({ theme: theme2 }) => theme2("spacing"),
    textOpacity: ({ theme: theme2 }) => theme2("opacity"),
    textUnderlineOffset: {
      auto: "auto",
      0: "0px",
      1: "1px",
      2: "2px",
      4: "4px",
      8: "8px",
      ...barePixels,
    },
    transformOrigin: {
      center: "center",
      top: "top",
      "top-right": "top right",
      right: "right",
      "bottom-right": "bottom right",
      bottom: "bottom",
      "bottom-left": "bottom left",
      left: "left",
      "top-left": "top left",
    },
    transitionDelay: {
      0: "0s",
      75: "75ms",
      100: "100ms",
      150: "150ms",
      200: "200ms",
      300: "300ms",
      500: "500ms",
      700: "700ms",
      1e3: "1000ms",
      ...bareMilliseconds,
    },
    transitionDuration: {
      DEFAULT: "150ms",
      0: "0s",
      75: "75ms",
      100: "100ms",
      150: "150ms",
      200: "200ms",
      300: "300ms",
      500: "500ms",
      700: "700ms",
      1e3: "1000ms",
      ...bareMilliseconds,
    },
    transitionProperty: {
      none: "none",
      all: "all",
      DEFAULT:
        "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter",
      colors: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
      opacity: "opacity",
      shadow: "box-shadow",
      transform: "transform",
    },
    transitionTimingFunction: {
      DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      linear: "linear",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    },
    translate: ({ theme: theme2 }) => ({
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "2/4": "50%",
      "3/4": "75%",
      full: "100%",
      ...theme2("spacing"),
    }),
    size: ({ theme: theme2 }) => ({
      auto: "auto",
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "2/4": "50%",
      "3/4": "75%",
      "1/5": "20%",
      "2/5": "40%",
      "3/5": "60%",
      "4/5": "80%",
      "1/6": "16.666667%",
      "2/6": "33.333333%",
      "3/6": "50%",
      "4/6": "66.666667%",
      "5/6": "83.333333%",
      "1/12": "8.333333%",
      "2/12": "16.666667%",
      "3/12": "25%",
      "4/12": "33.333333%",
      "5/12": "41.666667%",
      "6/12": "50%",
      "7/12": "58.333333%",
      "8/12": "66.666667%",
      "9/12": "75%",
      "10/12": "83.333333%",
      "11/12": "91.666667%",
      full: "100%",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      ...theme2("spacing"),
    }),
    width: ({ theme: theme2 }) => ({
      auto: "auto",
      "1/2": "50%",
      "1/3": "33.333333%",
      "2/3": "66.666667%",
      "1/4": "25%",
      "2/4": "50%",
      "3/4": "75%",
      "1/5": "20%",
      "2/5": "40%",
      "3/5": "60%",
      "4/5": "80%",
      "1/6": "16.666667%",
      "2/6": "33.333333%",
      "3/6": "50%",
      "4/6": "66.666667%",
      "5/6": "83.333333%",
      "1/12": "8.333333%",
      "2/12": "16.666667%",
      "3/12": "25%",
      "4/12": "33.333333%",
      "5/12": "41.666667%",
      "6/12": "50%",
      "7/12": "58.333333%",
      "8/12": "66.666667%",
      "9/12": "75%",
      "10/12": "83.333333%",
      "11/12": "91.666667%",
      full: "100%",
      screen: "100vw",
      svw: "100svw",
      lvw: "100lvw",
      dvw: "100dvw",
      min: "min-content",
      max: "max-content",
      fit: "fit-content",
      ...theme2("spacing"),
    }),
    willChange: {
      auto: "auto",
      scroll: "scroll-position",
      contents: "contents",
      transform: "transform",
    },
    zIndex: {
      auto: "auto",
      0: "0",
      10: "10",
      20: "20",
      30: "30",
      40: "40",
      50: "50",
      ...bareIntegers,
    },
  };

  // ../tailwindcss/src/compat/config/create-compat-config.ts
  function createCompatConfig(cssTheme) {
    return {
      theme: {
        ...default_theme_default,
        // In the defaultTheme config, the `colors` key is not a function but a
        // shallow object. We don't want to define the color namespace unless it
        // is in the CSS theme so here we explicitly overwrite the defaultTheme
        // and only allow colors from the CSS theme.
        colors: ({ theme: theme2 }) => theme2("color", {}),
        extend: {
          fontSize: ({ theme: theme2 }) => ({
            ...theme2("text", {}),
          }),
          boxShadow: ({ theme: theme2 }) => ({
            ...theme2("shadow", {}),
          }),
          animation: ({ theme: theme2 }) => ({
            ...theme2("animate", {}),
          }),
          aspectRatio: ({ theme: theme2 }) => ({
            ...theme2("aspect", {}),
          }),
          borderRadius: ({ theme: theme2 }) => ({
            ...theme2("radius", {}),
          }),
          screens: ({ theme: theme2 }) => ({
            ...theme2("breakpoint", {}),
          }),
          letterSpacing: ({ theme: theme2 }) => ({
            ...theme2("tracking", {}),
          }),
          lineHeight: ({ theme: theme2 }) => ({
            ...theme2("leading", {}),
          }),
          transitionDuration: {
            DEFAULT: cssTheme.get(["--default-transition-duration"]) ?? null,
          },
          transitionTimingFunction: {
            DEFAULT: cssTheme.get(["--default-transition-timing-function"]) ?? null,
          },
          maxWidth: ({ theme: theme2 }) => ({
            ...theme2("container", {}),
          }),
        },
      },
    };
  }

  // ../tailwindcss/src/compat/config/resolve-config.ts
  var minimal = {
    blocklist: [],
    future: {},
    prefix: "",
    important: false,
    darkMode: null,
    theme: {},
    plugins: [],
    content: {
      files: [],
    },
  };
  function resolveConfig(design, files) {
    let ctx = {
      design,
      configs: [],
      plugins: [],
      content: {
        files: [],
      },
      theme: {},
      extend: {},
      // Start with a minimal valid, but empty config
      result: structuredClone(minimal),
    };
    for (let file of files) {
      extractConfigs(ctx, file);
    }
    for (let config of ctx.configs) {
      if ("darkMode" in config && config.darkMode !== void 0) {
        ctx.result.darkMode = config.darkMode ?? null;
      }
      if ("prefix" in config && config.prefix !== void 0) {
        ctx.result.prefix = config.prefix ?? "";
      }
      if ("blocklist" in config && config.blocklist !== void 0) {
        ctx.result.blocklist = config.blocklist ?? [];
      }
      if ("important" in config && config.important !== void 0) {
        ctx.result.important = config.important ?? false;
      }
    }
    let replacedThemeKeys = mergeTheme(ctx);
    return {
      resolvedConfig: {
        ...ctx.result,
        content: ctx.content,
        theme: ctx.theme,
        plugins: ctx.plugins,
      },
      replacedThemeKeys,
    };
  }
  function mergeThemeExtension(themeValue, extensionValue) {
    if (Array.isArray(themeValue) && isPlainObject(themeValue[0])) {
      return themeValue.concat(extensionValue);
    }
    if (Array.isArray(extensionValue) && isPlainObject(extensionValue[0]) && isPlainObject(themeValue)) {
      return [themeValue, ...extensionValue];
    }
    if (Array.isArray(extensionValue)) {
      return extensionValue;
    }
    return void 0;
  }
  function extractConfigs(ctx, { config, base, path, reference }) {
    let plugins = [];
    for (let plugin of config.plugins ?? []) {
      if ("__isOptionsFunction" in plugin) {
        plugins.push({ ...plugin(), reference });
      } else if ("handler" in plugin) {
        plugins.push({ ...plugin, reference });
      } else {
        plugins.push({ handler: plugin, reference });
      }
    }
    if (Array.isArray(config.presets) && config.presets.length === 0) {
      throw new Error(
        "Error in the config file/plugin/preset. An empty preset (`preset: []`) is not currently supported."
      );
    }
    for (let preset of config.presets ?? []) {
      extractConfigs(ctx, { path, base, config: preset, reference });
    }
    for (let plugin of plugins) {
      ctx.plugins.push(plugin);
      if (plugin.config) {
        extractConfigs(ctx, {
          path,
          base,
          config: plugin.config,
          reference: !!plugin.reference,
        });
      }
    }
    let content = config.content ?? [];
    let files = Array.isArray(content) ? content : content.files;
    for (let file of files) {
      ctx.content.files.push(typeof file === "object" ? file : { base, pattern: file });
    }
    ctx.configs.push(config);
  }
  function mergeTheme(ctx) {
    let replacedThemeKeys = /* @__PURE__ */ new Set();
    let themeFn = createThemeFn(ctx.design, () => ctx.theme, resolveValue);
    let theme2 = Object.assign(themeFn, {
      theme: themeFn,
      colors: colors_default,
    });
    function resolveValue(value2) {
      if (typeof value2 === "function") {
        return value2(theme2) ?? null;
      }
      return value2 ?? null;
    }
    for (let config of ctx.configs) {
      let theme3 = config.theme ?? {};
      let extend = theme3.extend ?? {};
      for (let key in theme3) {
        if (key === "extend") {
          continue;
        }
        replacedThemeKeys.add(key);
      }
      Object.assign(ctx.theme, theme3);
      for (let key in extend) {
        ctx.extend[key] ??= [];
        ctx.extend[key].push(extend[key]);
      }
    }
    delete ctx.theme.extend;
    for (let key in ctx.extend) {
      let values = [ctx.theme[key], ...ctx.extend[key]];
      ctx.theme[key] = () => {
        let v = values.map(resolveValue);
        let result = deepMerge({}, v, mergeThemeExtension);
        return result;
      };
    }
    for (let key in ctx.theme) {
      ctx.theme[key] = resolveValue(ctx.theme[key]);
    }
    if (ctx.theme.screens && typeof ctx.theme.screens === "object") {
      for (let key of Object.keys(ctx.theme.screens)) {
        let screen = ctx.theme.screens[key];
        if (!screen) continue;
        if (typeof screen !== "object") continue;
        if ("raw" in screen) continue;
        if ("max" in screen) continue;
        if (!("min" in screen)) continue;
        ctx.theme.screens[key] = screen.min;
      }
    }
    return replacedThemeKeys;
  }

  // ../tailwindcss/src/compat/container.ts
  function registerContainerCompat(userConfig, designSystem) {
    let container = userConfig.theme.container || {};
    if (typeof container !== "object" || container === null) {
      return;
    }
    let rules = buildCustomContainerUtilityRules(container, designSystem);
    if (rules.length === 0) {
      return;
    }
    designSystem.utilities.static("container", () => structuredClone(rules));
  }
  function buildCustomContainerUtilityRules({ center, padding, screens }, designSystem) {
    let rules = [];
    let breakpointOverwrites = null;
    if (center) {
      rules.push(decl("margin-inline", "auto"));
    }
    if (typeof padding === "string" || (typeof padding === "object" && padding !== null && "DEFAULT" in padding)) {
      rules.push(decl("padding-inline", typeof padding === "string" ? padding : padding.DEFAULT));
    }
    if (typeof screens === "object" && screens !== null) {
      breakpointOverwrites = /* @__PURE__ */ new Map();
      let breakpoints = Array.from(designSystem.theme.namespace("--breakpoint").entries());
      breakpoints.sort((a, z) => compareBreakpoints(a[1], z[1], "asc"));
      if (breakpoints.length > 0) {
        let [key] = breakpoints[0];
        rules.push(atRule("@media", `(width >= --theme(--breakpoint-${key}))`, [decl("max-width", "none")]));
      }
      for (let [key, value2] of Object.entries(screens)) {
        if (typeof value2 === "object") {
          if ("min" in value2) {
            value2 = value2.min;
          } else {
            continue;
          }
        }
        breakpointOverwrites.set(key, atRule("@media", `(width >= ${value2})`, [decl("max-width", value2)]));
      }
    }
    if (typeof padding === "object" && padding !== null) {
      let breakpoints = Object.entries(padding)
        .filter(([key]) => key !== "DEFAULT")
        .map(([key, value2]) => {
          return [key, designSystem.theme.resolveValue(key, ["--breakpoint"]), value2];
        })
        .filter(Boolean);
      breakpoints.sort((a, z) => compareBreakpoints(a[1], z[1], "asc"));
      for (let [key, , value2] of breakpoints) {
        if (breakpointOverwrites && breakpointOverwrites.has(key)) {
          let overwrite = breakpointOverwrites.get(key);
          overwrite.nodes.push(decl("padding-inline", value2));
        } else if (breakpointOverwrites) {
          continue;
        } else {
          rules.push(atRule("@media", `(width >= theme(--breakpoint-${key}))`, [decl("padding-inline", value2)]));
        }
      }
    }
    if (breakpointOverwrites) {
      for (let [, rule2] of breakpointOverwrites) {
        rules.push(rule2);
      }
    }
    return rules;
  }

  // ../tailwindcss/src/compat/dark-mode.ts
  function darkModePlugin({ addVariant, config }) {
    let darkMode = config("darkMode", null);
    let [mode, selector2 = ".dark"] = Array.isArray(darkMode) ? darkMode : [darkMode];
    if (mode === "variant") {
      let formats;
      if (Array.isArray(selector2)) {
        formats = selector2;
      } else if (typeof selector2 === "function") {
        formats = selector2;
      } else if (typeof selector2 === "string") {
        formats = [selector2];
      }
      if (Array.isArray(formats)) {
        for (let format of formats) {
          if (format === ".dark") {
            mode = false;
            console.warn(
              'When using `variant` for `darkMode`, you must provide a selector.\nExample: `darkMode: ["variant", ".your-selector &"]`'
            );
          } else if (!format.includes("&")) {
            mode = false;
            console.warn(
              'When using `variant` for `darkMode`, your selector must contain `&`.\nExample `darkMode: ["variant", ".your-selector &"]`'
            );
          }
        }
      }
      selector2 = formats;
    }
    if (mode === null) {
    } else if (mode === "selector") {
      addVariant("dark", `&:where(${selector2}, ${selector2} *)`);
    } else if (mode === "media") {
      addVariant("dark", "@media (prefers-color-scheme: dark)");
    } else if (mode === "variant") {
      addVariant("dark", selector2);
    } else if (mode === "class") {
      addVariant("dark", `&:is(${selector2} *)`);
    }
  }

  // ../tailwindcss/src/compat/legacy-utilities.ts
  function registerLegacyUtilities(designSystem) {
    for (let [value2, direction] of [
      ["t", "top"],
      ["tr", "top right"],
      ["r", "right"],
      ["br", "bottom right"],
      ["b", "bottom"],
      ["bl", "bottom left"],
      ["l", "left"],
      ["tl", "top left"],
    ]) {
      designSystem.utilities.static(`bg-gradient-to-${value2}`, () => [
        decl("--tw-gradient-position", `to ${direction} in oklab`),
        decl("background-image", `linear-gradient(var(--tw-gradient-stops))`),
      ]);
    }
    designSystem.utilities.static("bg-left-top", () => [decl("background-position", "left top")]);
    designSystem.utilities.static("bg-right-top", () => [decl("background-position", "right top")]);
    designSystem.utilities.static("bg-left-bottom", () => [decl("background-position", "left bottom")]);
    designSystem.utilities.static("bg-right-bottom", () => [decl("background-position", "right bottom")]);
    designSystem.utilities.static("object-left-top", () => [decl("object-position", "left top")]);
    designSystem.utilities.static("object-right-top", () => [decl("object-position", "right top")]);
    designSystem.utilities.static("object-left-bottom", () => [decl("object-position", "left bottom")]);
    designSystem.utilities.static("object-right-bottom", () => [decl("object-position", "right bottom")]);
    designSystem.utilities.functional("max-w-screen", (candidate) => {
      if (!candidate.value) return;
      if (candidate.value.kind === "arbitrary") return;
      let value2 = designSystem.theme.resolve(candidate.value.value, ["--breakpoint"]);
      if (!value2) return;
      return [decl("max-width", value2)];
    });
    designSystem.utilities.static(`overflow-ellipsis`, () => [decl("text-overflow", `ellipsis`)]);
    designSystem.utilities.static(`decoration-slice`, () => [
      decl("-webkit-box-decoration-break", `slice`),
      decl("box-decoration-break", `slice`),
    ]);
    designSystem.utilities.static(`decoration-clone`, () => [
      decl("-webkit-box-decoration-break", `clone`),
      decl("box-decoration-break", `clone`),
    ]);
    designSystem.utilities.functional("flex-shrink", (candidate) => {
      if (candidate.modifier) return;
      if (!candidate.value) {
        return [decl("flex-shrink", "1")];
      }
      if (candidate.value.kind === "arbitrary") {
        return [decl("flex-shrink", candidate.value.value)];
      }
      if (isPositiveInteger(candidate.value.value)) {
        return [decl("flex-shrink", candidate.value.value)];
      }
    });
    designSystem.utilities.functional("flex-grow", (candidate) => {
      if (candidate.modifier) return;
      if (!candidate.value) {
        return [decl("flex-grow", "1")];
      }
      if (candidate.value.kind === "arbitrary") {
        return [decl("flex-grow", candidate.value.value)];
      }
      if (isPositiveInteger(candidate.value.value)) {
        return [decl("flex-grow", candidate.value.value)];
      }
    });
  }

  // ../tailwindcss/src/compat/screens-config.ts
  function registerScreensConfig(userConfig, designSystem) {
    let screens = userConfig.theme.screens || {};
    let coreOrder = designSystem.variants.get("min")?.order ?? 0;
    let additionalVariants = [];
    for (let [name, value2] of Object.entries(screens)) {
      let insert2 = function (order) {
        designSystem.variants.static(
          name,
          (ruleNode) => {
            ruleNode.nodes = [atRule("@media", query, ruleNode.nodes)];
          },
          { order }
        );
      };
      var insert = insert2;
      let coreVariant = designSystem.variants.get(name);
      let cssValue = designSystem.theme.resolveValue(name, ["--breakpoint"]);
      if (coreVariant && cssValue && !designSystem.theme.hasDefault(`--breakpoint-${name}`)) {
        continue;
      }
      let deferInsert = true;
      if (typeof value2 === "string") {
        deferInsert = false;
      }
      let query = buildMediaQuery(value2);
      if (deferInsert) {
        additionalVariants.push(insert2);
      } else {
        insert2(coreOrder);
      }
    }
    if (additionalVariants.length === 0) return;
    for (let [, variant] of designSystem.variants.variants) {
      if (variant.order > coreOrder) variant.order += additionalVariants.length;
    }
    designSystem.variants.compareFns = new Map(
      Array.from(designSystem.variants.compareFns).map(([key, value2]) => {
        if (key > coreOrder) key += additionalVariants.length;
        return [key, value2];
      })
    );
    for (let [index, callback] of additionalVariants.entries()) {
      callback(coreOrder + index + 1);
    }
  }
  function buildMediaQuery(values) {
    let list = Array.isArray(values) ? values : [values];
    return list
      .map((value2) => {
        if (typeof value2 === "string") {
          return { min: value2 };
        }
        if (value2 && typeof value2 === "object") {
          return value2;
        }
        return null;
      })
      .map((screen) => {
        if (screen === null) return null;
        if ("raw" in screen) {
          return screen.raw;
        }
        let query = "";
        if (screen.max !== void 0) {
          query += `${screen.max} >= `;
        }
        query += "width";
        if (screen.min !== void 0) {
          query += ` >= ${screen.min}`;
        }
        return `(${query})`;
      })
      .filter(Boolean)
      .join(", ");
  }

  // ../tailwindcss/src/compat/theme-variants.ts
  function registerThemeVariantOverrides(config, designSystem) {
    let ariaVariants = config.theme.aria || {};
    let supportsVariants = config.theme.supports || {};
    let dataVariants = config.theme.data || {};
    if (Object.keys(ariaVariants).length > 0) {
      let coreAria = designSystem.variants.get("aria");
      let applyFn = coreAria?.applyFn;
      let compounds = coreAria?.compounds;
      designSystem.variants.functional(
        "aria",
        (ruleNode, variant) => {
          let value2 = variant.value;
          if (value2 && value2.kind === "named" && value2.value in ariaVariants) {
            return applyFn?.(ruleNode, {
              ...variant,
              value: { kind: "arbitrary", value: ariaVariants[value2.value] },
            });
          }
          return applyFn?.(ruleNode, variant);
        },
        { compounds }
      );
    }
    if (Object.keys(supportsVariants).length > 0) {
      let coreSupports = designSystem.variants.get("supports");
      let applyFn = coreSupports?.applyFn;
      let compounds = coreSupports?.compounds;
      designSystem.variants.functional(
        "supports",
        (ruleNode, variant) => {
          let value2 = variant.value;
          if (value2 && value2.kind === "named" && value2.value in supportsVariants) {
            return applyFn?.(ruleNode, {
              ...variant,
              value: {
                kind: "arbitrary",
                value: supportsVariants[value2.value],
              },
            });
          }
          return applyFn?.(ruleNode, variant);
        },
        { compounds }
      );
    }
    if (Object.keys(dataVariants).length > 0) {
      let coreData = designSystem.variants.get("data");
      let applyFn = coreData?.applyFn;
      let compounds = coreData?.compounds;
      designSystem.variants.functional(
        "data",
        (ruleNode, variant) => {
          let value2 = variant.value;
          if (value2 && value2.kind === "named" && value2.value in dataVariants) {
            return applyFn?.(ruleNode, {
              ...variant,
              value: { kind: "arbitrary", value: dataVariants[value2.value] },
            });
          }
          return applyFn?.(ruleNode, variant);
        },
        { compounds }
      );
    }
  }

  // ../tailwindcss/src/compat/apply-compat-hooks.ts
  var IS_VALID_PREFIX = /^[a-z]+$/;
  async function applyCompatibilityHooks({ designSystem, base, ast, loadModule: loadModule2, sources }) {
    let features = 0; /* None */
    let pluginPaths = [];
    let configPaths = [];
    walk2(ast, (node, { parent, replaceWith, context: context2 }) => {
      if (node.kind !== "at-rule") return;
      if (node.name === "@plugin") {
        if (parent !== null) {
          throw new Error("`@plugin` cannot be nested.");
        }
        let pluginPath = node.params.slice(1, -1);
        if (pluginPath.length === 0) {
          throw new Error("`@plugin` must have a path.");
        }
        let options = {};
        for (let decl2 of node.nodes ?? []) {
          if (decl2.kind !== "declaration") {
            throw new Error(
              `Unexpected \`@plugin\` option:

${toCss2([decl2])}

\`@plugin\` options must be a flat list of declarations.`
            );
          }
          if (decl2.value === void 0) continue;
          let value2 = decl2.value;
          let parts = segment(value2, ",").map((part) => {
            part = part.trim();
            if (part === "null") {
              return null;
            } else if (part === "true") {
              return true;
            } else if (part === "false") {
              return false;
            } else if (!Number.isNaN(Number(part))) {
              return Number(part);
            } else if (
              (part[0] === '"' && part[part.length - 1] === '"') ||
              (part[0] === "'" && part[part.length - 1] === "'")
            ) {
              return part.slice(1, -1);
            } else if (part[0] === "{" && part[part.length - 1] === "}") {
              throw new Error(
                `Unexpected \`@plugin\` option: Value of declaration \`${toCss2([decl2]).trim()}\` is not supported.

Using an object as a plugin option is currently only supported in JavaScript configuration files.`
              );
            }
            return part;
          });
          options[decl2.property] = parts.length === 1 ? parts[0] : parts;
        }
        pluginPaths.push([
          {
            id: pluginPath,
            base: context2.base,
            reference: !!context2.reference,
          },
          Object.keys(options).length > 0 ? options : null,
        ]);
        replaceWith([]);
        features |= 4 /* JsPluginCompat */;
        return;
      }
      if (node.name === "@config") {
        if (node.nodes.length > 0) {
          throw new Error("`@config` cannot have a body.");
        }
        if (parent !== null) {
          throw new Error("`@config` cannot be nested.");
        }
        configPaths.push({
          id: node.params.slice(1, -1),
          base: context2.base,
          reference: !!context2.reference,
        });
        replaceWith([]);
        features |= 4 /* JsPluginCompat */;
        return;
      }
    });
    registerLegacyUtilities(designSystem);
    let resolveThemeVariableValue = designSystem.resolveThemeValue;
    designSystem.resolveThemeValue = function resolveThemeValue2(path, forceInline) {
      if (path.startsWith("--")) {
        return resolveThemeVariableValue(path, forceInline);
      }
      features |= upgradeToFullPluginSupport({
        designSystem,
        base,
        ast,
        sources,
        configs: [],
        pluginDetails: [],
      });
      return designSystem.resolveThemeValue(path, forceInline);
    };
    if (!pluginPaths.length && !configPaths.length) return 0 /* None */;
    let [configs, pluginDetails] = await Promise.all([
      Promise.all(
        configPaths.map(async ({ id, base: base2, reference }) => {
          let loaded = await loadModule2(id, base2, "config");
          return {
            path: id,
            base: loaded.base,
            config: loaded.module,
            reference,
          };
        })
      ),
      Promise.all(
        pluginPaths.map(async ([{ id, base: base2, reference }, pluginOptions]) => {
          let loaded = await loadModule2(id, base2, "plugin");
          return {
            path: id,
            base: loaded.base,
            plugin: loaded.module,
            options: pluginOptions,
            reference,
          };
        })
      ),
    ]);
    features |= upgradeToFullPluginSupport({
      designSystem,
      base,
      ast,
      sources,
      configs,
      pluginDetails,
    });
    return features;
  }
  function upgradeToFullPluginSupport({ designSystem, base, ast, sources, configs, pluginDetails }) {
    let features = 0; /* None */
    let pluginConfigs = pluginDetails.map((detail) => {
      if (!detail.options) {
        return {
          config: { plugins: [detail.plugin] },
          base: detail.base,
          reference: detail.reference,
        };
      }
      if ("__isOptionsFunction" in detail.plugin) {
        return {
          config: { plugins: [detail.plugin(detail.options)] },
          base: detail.base,
          reference: detail.reference,
        };
      }
      throw new Error(`The plugin "${detail.path}" does not accept options`);
    });
    let userConfig = [...pluginConfigs, ...configs];
    let { resolvedConfig } = resolveConfig(designSystem, [
      { config: createCompatConfig(designSystem.theme), base, reference: true },
      ...userConfig,
      { config: { plugins: [darkModePlugin] }, base, reference: true },
    ]);
    let { resolvedConfig: resolvedUserConfig, replacedThemeKeys } = resolveConfig(designSystem, userConfig);
    let defaultResolveThemeValue = designSystem.resolveThemeValue;
    designSystem.resolveThemeValue = function resolveThemeValue2(path, forceInline) {
      if (path[0] === "-" && path[1] === "-") {
        return defaultResolveThemeValue(path, forceInline);
      }
      let resolvedValue = pluginApi.theme(path, void 0);
      if (Array.isArray(resolvedValue) && resolvedValue.length === 2) {
        return resolvedValue[0];
      } else if (Array.isArray(resolvedValue)) {
        return resolvedValue.join(", ");
      } else if (typeof resolvedValue === "string") {
        return resolvedValue;
      }
    };
    let pluginApiConfig = {
      designSystem,
      ast,
      resolvedConfig,
      featuresRef: {
        set current(value2) {
          features |= value2;
        },
      },
    };
    let pluginApi = buildPluginApi({
      ...pluginApiConfig,
      referenceMode: false,
    });
    let referenceModePluginApi = void 0;
    for (let { handler, reference } of resolvedConfig.plugins) {
      if (reference) {
        referenceModePluginApi ||= buildPluginApi({
          ...pluginApiConfig,
          referenceMode: true,
        });
        handler(referenceModePluginApi);
      } else {
        handler(pluginApi);
      }
    }
    applyConfigToTheme(designSystem, resolvedUserConfig, replacedThemeKeys);
    applyKeyframesToTheme(designSystem, resolvedUserConfig, replacedThemeKeys);
    registerThemeVariantOverrides(resolvedUserConfig, designSystem);
    registerScreensConfig(resolvedUserConfig, designSystem);
    registerContainerCompat(resolvedUserConfig, designSystem);
    if (!designSystem.theme.prefix && resolvedConfig.prefix) {
      if (resolvedConfig.prefix.endsWith("-")) {
        resolvedConfig.prefix = resolvedConfig.prefix.slice(0, -1);
        console.warn(
          `The prefix "${resolvedConfig.prefix}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only and is written as a variant before all utilities. We have fixed up the prefix for you. Remove the trailing \`-\` to silence this warning.`
        );
      }
      if (!IS_VALID_PREFIX.test(resolvedConfig.prefix)) {
        throw new Error(
          `The prefix "${resolvedConfig.prefix}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only.`
        );
      }
      designSystem.theme.prefix = resolvedConfig.prefix;
    }
    if (!designSystem.important && resolvedConfig.important === true) {
      designSystem.important = true;
    }
    if (typeof resolvedConfig.important === "string") {
      let wrappingSelector = resolvedConfig.important;
      walk2(ast, (node, { replaceWith, parent }) => {
        if (node.kind !== "at-rule") return;
        if (node.name !== "@tailwind" || node.params !== "utilities") return;
        if (parent?.kind === "rule" && parent.selector === wrappingSelector) {
          return 2 /* Stop */;
        }
        replaceWith(styleRule(wrappingSelector, [node]));
        return 2 /* Stop */;
      });
    }
    for (let candidate of resolvedConfig.blocklist) {
      designSystem.invalidCandidates.add(candidate);
    }
    for (let file of resolvedConfig.content.files) {
      if ("raw" in file) {
        throw new Error(
          `Error in the config file/plugin/preset. The \`content\` key contains a \`raw\` entry:

${JSON.stringify(file, null, 2)}

This feature is not currently supported.`
        );
      }
      let negated = false;
      if (file.pattern[0] == "!") {
        negated = true;
        file.pattern = file.pattern.slice(1);
      }
      sources.push({ ...file, negated });
    }
    return features;
  }

  // ../tailwindcss/src/source-maps/line-table.ts
  var LINE_BREAK2 = 10;
  function createLineTable(source) {
    let table = [0];
    for (let i = 0; i < source.length; i++) {
      if (source.charCodeAt(i) === LINE_BREAK2) {
        table.push(i + 1);
      }
    }
    function find(offset) {
      let line = 0;
      let count = table.length;
      while (count > 0) {
        let mid = (count | 0) >> 1;
        let i = line + mid;
        if (table[i] <= offset) {
          line = i + 1;
          count = count - mid - 1;
        } else {
          count = mid;
        }
      }
      line -= 1;
      let column = offset - table[line];
      return {
        line: line + 1,
        column,
      };
    }
    function findOffset({ line, column }) {
      line -= 1;
      line = Math.min(Math.max(line, 0), table.length - 1);
      let offsetA = table[line];
      let offsetB = table[line + 1] ?? offsetA;
      return Math.min(Math.max(offsetA + column, 0), offsetB);
    }
    return {
      find,
      findOffset,
    };
  }

  // ../tailwindcss/src/source-maps/source-map.ts
  function createSourceMap({ ast }) {
    let lineTables = new DefaultMap((src) => createLineTable(src.code));
    let sourceTable = new DefaultMap((src) => ({
      url: src.file,
      content: src.code,
      ignore: false,
    }));
    let map = {
      file: null,
      sources: [],
      mappings: [],
    };
    walk2(ast, (node) => {
      if (!node.src || !node.dst) return;
      let originalSource = sourceTable.get(node.src[0]);
      if (!originalSource.content) return;
      let originalTable = lineTables.get(node.src[0]);
      let generatedTable = lineTables.get(node.dst[0]);
      let originalSlice = originalSource.content.slice(node.src[1], node.src[2]);
      let offset = 0;
      for (let line of originalSlice.split("\n")) {
        if (line.trim() !== "") {
          let originalStart = originalTable.find(node.src[1] + offset);
          let generatedStart = generatedTable.find(node.dst[1]);
          map.mappings.push({
            name: null,
            originalPosition: {
              source: originalSource,
              ...originalStart,
            },
            generatedPosition: generatedStart,
          });
        }
        offset += line.length;
        offset += 1;
      }
      let originalEnd = originalTable.find(node.src[2]);
      let generatedEnd = generatedTable.find(node.dst[2]);
      map.mappings.push({
        name: null,
        originalPosition: {
          source: originalSource,
          ...originalEnd,
        },
        generatedPosition: generatedEnd,
      });
    });
    for (let source of lineTables.keys()) {
      map.sources.push(sourceTable.get(source));
    }
    map.mappings.sort((a, b) => {
      return (
        a.generatedPosition.line - b.generatedPosition.line ||
        a.generatedPosition.column - b.generatedPosition.column ||
        (a.originalPosition?.line ?? 0) - (b.originalPosition?.line ?? 0) ||
        (a.originalPosition?.column ?? 0) - (b.originalPosition?.column ?? 0)
      );
    });
    return map;
  }

  // ../tailwindcss/src/utils/brace-expansion.ts
  var NUMERICAL_RANGE = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/;
  function expand(pattern) {
    let index = pattern.indexOf("{");
    if (index === -1) return [pattern];
    let result = [];
    let pre = pattern.slice(0, index);
    let rest = pattern.slice(index);
    let depth = 0;
    let endIndex = rest.lastIndexOf("}");
    for (let i = 0; i < rest.length; i++) {
      let char = rest[i];
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
    if (endIndex === -1) {
      throw new Error(`The pattern \`${pattern}\` is not balanced.`);
    }
    let inside = rest.slice(1, endIndex);
    let post = rest.slice(endIndex + 1);
    let parts;
    if (isSequence(inside)) {
      parts = expandSequence(inside);
    } else {
      parts = segment(inside, ",");
    }
    parts = parts.flatMap((part) => expand(part));
    let expandedTail = expand(post);
    for (let tail of expandedTail) {
      for (let part of parts) {
        result.push(pre + part + tail);
      }
    }
    return result;
  }
  function isSequence(str) {
    return NUMERICAL_RANGE.test(str);
  }
  function expandSequence(seq) {
    let seqMatch = seq.match(NUMERICAL_RANGE);
    if (!seqMatch) {
      return [seq];
    }
    let [, start, end, stepStr] = seqMatch;
    let step = stepStr ? parseInt(stepStr, 10) : void 0;
    let result = [];
    if (/^-?\d+$/.test(start) && /^-?\d+$/.test(end)) {
      let startNum = parseInt(start, 10);
      let endNum = parseInt(end, 10);
      if (step === void 0) {
        step = startNum <= endNum ? 1 : -1;
      }
      if (step === 0) {
        throw new Error("Step cannot be zero in sequence expansion.");
      }
      let increasing = startNum < endNum;
      if (increasing && step < 0) step = -step;
      if (!increasing && step > 0) step = -step;
      for (let i = startNum; increasing ? i <= endNum : i >= endNum; i += step) {
        result.push(i.toString());
      }
    }
    return result;
  }

  // ../tailwindcss/src/index.ts
  var IS_VALID_PREFIX2 = /^[a-z]+$/;
  function throwOnLoadModule() {
    throw new Error("No `loadModule` function provided to `compile`");
  }
  function throwOnLoadStylesheet() {
    throw new Error("No `loadStylesheet` function provided to `compile`");
  }
  function parseThemeOptions(params) {
    let options = 0; /* NONE */
    let prefix = null;
    for (let option of segment(params, " ")) {
      if (option === "reference") {
        options |= 2 /* REFERENCE */;
      } else if (option === "inline") {
        options |= 1 /* INLINE */;
      } else if (option === "default") {
        options |= 4 /* DEFAULT */;
      } else if (option === "static") {
        options |= 8 /* STATIC */;
      } else if (option.startsWith("prefix(") && option.endsWith(")")) {
        prefix = option.slice(7, -1);
      }
    }
    return [options, prefix];
  }
  async function parseCss(
    ast,
    {
      base = "",
      from,
      loadModule: loadModule2 = throwOnLoadModule,
      loadStylesheet: loadStylesheet2 = throwOnLoadStylesheet,
    } = {}
  ) {
    let features = 0; /* None */
    ast = [context({ base }, ast)];
    features |= await substituteAtImports(ast, base, loadStylesheet2, 0, from !== void 0);
    let important = null;
    let theme2 = new Theme();
    let customVariants = [];
    let customUtilities = [];
    let firstThemeRule = null;
    let utilitiesNode = null;
    let variantNodes = [];
    let sources = [];
    let inlineCandidates = [];
    let ignoredCandidates = [];
    let root = null;
    walk2(ast, (node, { parent, replaceWith, context: context2 }) => {
      if (node.kind !== "at-rule") return;
      if (node.name === "@tailwind" && (node.params === "utilities" || node.params.startsWith("utilities"))) {
        if (utilitiesNode !== null) {
          replaceWith([]);
          return;
        }
        if (context2.reference) {
          replaceWith([]);
          return;
        }
        let params = segment(node.params, " ");
        for (let param of params) {
          if (param.startsWith("source(")) {
            let path = param.slice(7, -1);
            if (path === "none") {
              root = path;
              continue;
            }
            if (
              (path[0] === '"' && path[path.length - 1] !== '"') ||
              (path[0] === "'" && path[path.length - 1] !== "'") ||
              (path[0] !== "'" && path[0] !== '"')
            ) {
              throw new Error("`source(\u2026)` paths must be quoted.");
            }
            root = {
              base: context2.sourceBase ?? context2.base,
              pattern: path.slice(1, -1),
            };
          }
        }
        utilitiesNode = node;
        features |= 16 /* Utilities */;
      }
      if (node.name === "@utility") {
        if (parent !== null) {
          throw new Error("`@utility` cannot be nested.");
        }
        if (node.nodes.length === 0) {
          throw new Error(`\`@utility ${node.params}\` is empty. Utilities should include at least one property.`);
        }
        let utility = createCssUtility(node);
        if (utility === null) {
          throw new Error(
            `\`@utility ${node.params}\` defines an invalid utility name. Utilities should be alphanumeric and start with a lowercase letter.`
          );
        }
        customUtilities.push(utility);
      }
      if (node.name === "@source") {
        if (node.nodes.length > 0) {
          throw new Error("`@source` cannot have a body.");
        }
        if (parent !== null) {
          throw new Error("`@source` cannot be nested.");
        }
        let not = false;
        let inline = false;
        let path = node.params;
        if (path[0] === "n" && path.startsWith("not ")) {
          not = true;
          path = path.slice(4);
        }
        if (path[0] === "i" && path.startsWith("inline(")) {
          inline = true;
          path = path.slice(7, -1);
        }
        if (
          (path[0] === '"' && path[path.length - 1] !== '"') ||
          (path[0] === "'" && path[path.length - 1] !== "'") ||
          (path[0] !== "'" && path[0] !== '"')
        ) {
          throw new Error("`@source` paths must be quoted.");
        }
        let source = path.slice(1, -1);
        if (inline) {
          let destination = not ? ignoredCandidates : inlineCandidates;
          let sources2 = segment(source, " ");
          for (let source2 of sources2) {
            for (let candidate of expand(source2)) {
              destination.push(candidate);
            }
          }
        } else {
          sources.push({
            base: context2.base,
            pattern: source,
            negated: not,
          });
        }
        replaceWith([]);
        return;
      }
      if (node.name === "@variant") {
        if (parent === null) {
          if (node.nodes.length === 0) {
            node.name = "@custom-variant";
          } else {
            walk2(node.nodes, (child) => {
              if (child.kind === "at-rule" && child.name === "@slot") {
                node.name = "@custom-variant";
                return 2 /* Stop */;
              }
            });
            if (node.name === "@variant") {
              variantNodes.push(node);
            }
          }
        } else {
          variantNodes.push(node);
        }
      }
      if (node.name === "@custom-variant") {
        if (parent !== null) {
          throw new Error("`@custom-variant` cannot be nested.");
        }
        replaceWith([]);
        let [name, selector2] = segment(node.params, " ");
        if (!IS_VALID_VARIANT_NAME.test(name)) {
          throw new Error(
            `\`@custom-variant ${name}\` defines an invalid variant name. Variants should only contain alphanumeric, dashes or underscore characters.`
          );
        }
        if (node.nodes.length > 0 && selector2) {
          throw new Error(`\`@custom-variant ${name}\` cannot have both a selector and a body.`);
        }
        if (node.nodes.length === 0) {
          if (!selector2) {
            throw new Error(`\`@custom-variant ${name}\` has no selector or body.`);
          }
          let selectors = segment(selector2.slice(1, -1), ",");
          if (selectors.length === 0 || selectors.some((selector3) => selector3.trim() === "")) {
            throw new Error(`\`@custom-variant ${name} (${selectors.join(",")})\` selector is invalid.`);
          }
          let atRuleParams = [];
          let styleRuleSelectors = [];
          for (let selector3 of selectors) {
            selector3 = selector3.trim();
            if (selector3[0] === "@") {
              atRuleParams.push(selector3);
            } else {
              styleRuleSelectors.push(selector3);
            }
          }
          customVariants.push((designSystem2) => {
            designSystem2.variants.static(
              name,
              (r) => {
                let nodes = [];
                if (styleRuleSelectors.length > 0) {
                  nodes.push(styleRule(styleRuleSelectors.join(", "), r.nodes));
                }
                for (let selector3 of atRuleParams) {
                  nodes.push(rule(selector3, r.nodes));
                }
                r.nodes = nodes;
              },
              {
                compounds: compoundsForSelectors([...styleRuleSelectors, ...atRuleParams]),
              }
            );
          });
          return;
        } else {
          customVariants.push((designSystem2) => {
            designSystem2.variants.fromAst(name, node.nodes);
          });
          return;
        }
      }
      if (node.name === "@media") {
        let params = segment(node.params, " ");
        let unknownParams = [];
        for (let param of params) {
          if (param.startsWith("source(")) {
            let path = param.slice(7, -1);
            walk2(node.nodes, (child, { replaceWith: replaceWith2 }) => {
              if (child.kind !== "at-rule") return;
              if (child.name === "@tailwind" && child.params === "utilities") {
                child.params += ` source(${path})`;
                replaceWith2([context({ sourceBase: context2.base }, [child])]);
                return 2 /* Stop */;
              }
            });
          } else if (param.startsWith("theme(")) {
            let themeParams = param.slice(6, -1);
            let hasReference = themeParams.includes("reference");
            walk2(node.nodes, (child) => {
              if (child.kind !== "at-rule") {
                if (hasReference) {
                  throw new Error(
                    `Files imported with \`@import "\u2026" theme(reference)\` must only contain \`@theme\` blocks.
Use \`@reference "\u2026";\` instead.`
                  );
                }
                return 0 /* Continue */;
              }
              if (child.name === "@theme") {
                child.params += " " + themeParams;
                return 1 /* Skip */;
              }
            });
          } else if (param.startsWith("prefix(")) {
            let prefix = param.slice(7, -1);
            walk2(node.nodes, (child) => {
              if (child.kind !== "at-rule") return;
              if (child.name === "@theme") {
                child.params += ` prefix(${prefix})`;
                return 1 /* Skip */;
              }
            });
          } else if (param === "important") {
            important = true;
          } else if (param === "reference") {
            node.nodes = [context({ reference: true }, node.nodes)];
          } else {
            unknownParams.push(param);
          }
        }
        if (unknownParams.length > 0) {
          node.params = unknownParams.join(" ");
        } else if (params.length > 0) {
          replaceWith(node.nodes);
        }
      }
      if (node.name === "@theme") {
        let [themeOptions, themePrefix] = parseThemeOptions(node.params);
        if (context2.reference) {
          themeOptions |= 2 /* REFERENCE */;
        }
        if (themePrefix) {
          if (!IS_VALID_PREFIX2.test(themePrefix)) {
            throw new Error(
              `The prefix "${themePrefix}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only.`
            );
          }
          theme2.prefix = themePrefix;
        }
        walk2(node.nodes, (child) => {
          if (child.kind === "at-rule" && child.name === "@keyframes") {
            theme2.addKeyframes(child);
            return 1 /* Skip */;
          }
          if (child.kind === "comment") return;
          if (child.kind === "declaration" && child.property.startsWith("--")) {
            theme2.add(unescape(child.property), child.value ?? "", themeOptions, child.src);
            return;
          }
          let snippet = toCss2([atRule(node.name, node.params, [child])])
            .split("\n")
            .map((line, idx, all) => `${idx === 0 || idx >= all.length - 2 ? " " : ">"} ${line}`)
            .join("\n");
          throw new Error(
            `\`@theme\` blocks must only contain custom properties or \`@keyframes\`.

${snippet}`
          );
        });
        if (!firstThemeRule) {
          firstThemeRule = styleRule(":root, :host", []);
          firstThemeRule.src = node.src;
          replaceWith([firstThemeRule]);
        } else {
          replaceWith([]);
        }
        return 1 /* Skip */;
      }
    });
    let designSystem = buildDesignSystem(theme2);
    if (important) {
      designSystem.important = important;
    }
    if (ignoredCandidates.length > 0) {
      for (let candidate of ignoredCandidates) {
        designSystem.invalidCandidates.add(candidate);
      }
    }
    features |= await applyCompatibilityHooks({
      designSystem,
      base,
      ast,
      loadModule: loadModule2,
      sources,
    });
    for (let customVariant of customVariants) {
      customVariant(designSystem);
    }
    for (let customUtility of customUtilities) {
      customUtility(designSystem);
    }
    if (firstThemeRule) {
      let nodes = [];
      for (let [key, value2] of designSystem.theme.entries()) {
        if (value2.options & 2 /* REFERENCE */) continue;
        let node = decl(escape(key), value2.value);
        node.src = value2.src;
        nodes.push(node);
      }
      let keyframesRules = designSystem.theme.getKeyframes();
      for (let keyframes of keyframesRules) {
        ast.push(context({ theme: true }, [atRoot([keyframes])]));
      }
      firstThemeRule.nodes = [context({ theme: true }, nodes)];
    }
    if (utilitiesNode) {
      let node = utilitiesNode;
      node.kind = "context";
      node.context = {};
    }
    if (variantNodes.length > 0) {
      for (let variantNode of variantNodes) {
        let node = styleRule("&", variantNode.nodes);
        let variant = variantNode.params;
        let variantAst = designSystem.parseVariant(variant);
        if (variantAst === null) {
          throw new Error(`Cannot use \`@variant\` with unknown variant: ${variant}`);
        }
        let result = applyVariant(node, variantAst, designSystem.variants);
        if (result === null) {
          throw new Error(`Cannot use \`@variant\` with variant: ${variant}`);
        }
        Object.assign(variantNode, node);
      }
      features |= 32 /* Variants */;
    }
    features |= substituteFunctions(ast, designSystem);
    features |= substituteAtApply(ast, designSystem);
    walk2(ast, (node, { replaceWith }) => {
      if (node.kind !== "at-rule") return;
      if (node.name === "@utility") {
        replaceWith([]);
      }
      return 1 /* Skip */;
    });
    return {
      designSystem,
      ast,
      sources,
      root,
      utilitiesNode,
      features,
      inlineCandidates,
    };
  }
  async function compileAst(input, opts = {}) {
    let { designSystem, ast, sources, root, utilitiesNode, features, inlineCandidates } = await parseCss(input, opts);
    if (true) {
      ast.unshift(comment(`! tailwindcss v${version} | MIT License | https://tailwindcss.com `));
    }
    function onInvalidCandidate(candidate) {
      designSystem.invalidCandidates.add(candidate);
    }
    let allValidCandidates = /* @__PURE__ */ new Set();
    let compiled = null;
    let previousAstNodeCount = 0;
    let defaultDidChange = false;
    for (let candidate of inlineCandidates) {
      if (!designSystem.invalidCandidates.has(candidate)) {
        allValidCandidates.add(candidate);
        defaultDidChange = true;
      }
    }
    return {
      sources,
      root,
      features,
      build(newRawCandidates) {
        if (features === 0 /* None */) {
          return input;
        }
        if (!utilitiesNode) {
          compiled ??= optimizeAst(ast, designSystem, opts.polyfills);
          return compiled;
        }
        let didChange = defaultDidChange;
        let didAddExternalVariable = false;
        defaultDidChange = false;
        let prevSize = allValidCandidates.size;
        for (let candidate of newRawCandidates) {
          if (!designSystem.invalidCandidates.has(candidate)) {
            if (candidate[0] === "-" && candidate[1] === "-") {
              let didMarkVariableAsUsed = designSystem.theme.markUsedVariable(candidate);
              didChange ||= didMarkVariableAsUsed;
              didAddExternalVariable ||= didMarkVariableAsUsed;
            } else {
              allValidCandidates.add(candidate);
              didChange ||= allValidCandidates.size !== prevSize;
            }
          }
        }
        if (!didChange) {
          compiled ??= optimizeAst(ast, designSystem, opts.polyfills);
          return compiled;
        }
        let newNodes = compileCandidates(allValidCandidates, designSystem, {
          onInvalidCandidate,
        }).astNodes;
        if (opts.from) {
          walk2(newNodes, (node) => {
            node.src ??= utilitiesNode.src;
          });
        }
        if (!didAddExternalVariable && previousAstNodeCount === newNodes.length) {
          compiled ??= optimizeAst(ast, designSystem, opts.polyfills);
          return compiled;
        }
        previousAstNodeCount = newNodes.length;
        utilitiesNode.nodes = newNodes;
        compiled = optimizeAst(ast, designSystem, opts.polyfills);
        return compiled;
      },
    };
  }
  async function compile(css2, opts = {}) {
    let ast = parse(css2, { from: opts.from });
    let api = await compileAst(ast, opts);
    let compiledAst = ast;
    let compiledCss = css2;
    return {
      ...api,
      build(newCandidates) {
        let newAst = api.build(newCandidates);
        if (newAst === compiledAst) {
          return compiledCss;
        }
        compiledCss = toCss2(newAst, !!opts.from);
        compiledAst = newAst;
        return compiledCss;
      },
      buildSourceMap() {
        return createSourceMap({
          ast: compiledAst,
        });
      },
    };
  }

  function querySelectorAll(node, selector) {
    const nodes = [...node.querySelectorAll(selector)];
    const nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT, (node) =>
      node instanceof Element && node.shadowRoot ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    );

    let currentNode = nodeIterator.nextNode();
    while (currentNode) {
      nodes.push(...querySelectorAll(currentNode.shadowRoot, selector));
      currentNode = nodeIterator.nextNode();
    }

    return nodes;
  }

  // ../tailwindcss/index.css
  var tailwindcss_default =
    "@layer theme, base, components, utilities;\n\n@import './theme.css' layer(theme);\n@import './preflight.css' layer(base);\n@import './utilities.css' layer(utilities);\n";

  // ../tailwindcss/preflight.css
  var preflight_default =
    "/*\n  1. Prevent padding and border from affecting element width. (https://github.com/mozdevs/cssremedy/issues/4)\n  2. Remove default margins and padding\n  3. Reset all borders.\n*/\n\n*,\n::after,\n::before,\n::backdrop,\n::file-selector-button {\n  box-sizing: border-box; /* 1 */\n  margin: 0; /* 2 */\n  padding: 0; /* 2 */\n  border: 0 solid; /* 3 */\n}\n\n/*\n  1. Use a consistent sensible line-height in all browsers.\n  2. Prevent adjustments of font size after orientation changes in iOS.\n  3. Use a more readable tab size.\n  4. Use the user's configured `sans` font-family by default.\n  5. Use the user's configured `sans` font-feature-settings by default.\n  6. Use the user's configured `sans` font-variation-settings by default.\n  7. Disable tap highlights on iOS.\n*/\n\nhtml,\n:host {\n  line-height: 1.5; /* 1 */\n  -webkit-text-size-adjust: 100%; /* 2 */\n  tab-size: 4; /* 3 */\n  font-family: --theme(\n    --default-font-family,\n    ui-sans-serif,\n    system-ui,\n    sans-serif,\n    'Apple Color Emoji',\n    'Segoe UI Emoji',\n    'Segoe UI Symbol',\n    'Noto Color Emoji'\n  ); /* 4 */\n  font-feature-settings: --theme(--default-font-feature-settings, normal); /* 5 */\n  font-variation-settings: --theme(--default-font-variation-settings, normal); /* 6 */\n  -webkit-tap-highlight-color: transparent; /* 7 */\n}\n\n/*\n  1. Add the correct height in Firefox.\n  2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)\n  3. Reset the default border style to a 1px solid border.\n*/\n\nhr {\n  height: 0; /* 1 */\n  color: inherit; /* 2 */\n  border-top-width: 1px; /* 3 */\n}\n\n/*\n  Add the correct text decoration in Chrome, Edge, and Safari.\n*/\n\nabbr:where([title]) {\n  -webkit-text-decoration: underline dotted;\n  text-decoration: underline dotted;\n}\n\n/*\n  Remove the default font size and weight for headings.\n*/\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  font-size: inherit;\n  font-weight: inherit;\n}\n\n/*\n  Reset links to optimize for opt-in styling instead of opt-out.\n*/\n\na {\n  color: inherit;\n  -webkit-text-decoration: inherit;\n  text-decoration: inherit;\n}\n\n/*\n  Add the correct font weight in Edge and Safari.\n*/\n\nb,\nstrong {\n  font-weight: bolder;\n}\n\n/*\n  1. Use the user's configured `mono` font-family by default.\n  2. Use the user's configured `mono` font-feature-settings by default.\n  3. Use the user's configured `mono` font-variation-settings by default.\n  4. Correct the odd `em` font sizing in all browsers.\n*/\n\ncode,\nkbd,\nsamp,\npre {\n  font-family: --theme(\n    --default-mono-font-family,\n    ui-monospace,\n    SFMono-Regular,\n    Menlo,\n    Monaco,\n    Consolas,\n    'Liberation Mono',\n    'Courier New',\n    monospace\n  ); /* 1 */\n  font-feature-settings: --theme(--default-mono-font-feature-settings, normal); /* 2 */\n  font-variation-settings: --theme(--default-mono-font-variation-settings, normal); /* 3 */\n  font-size: 1em; /* 4 */\n}\n\n/*\n  Add the correct font size in all browsers.\n*/\n\nsmall {\n  font-size: 80%;\n}\n\n/*\n  Prevent `sub` and `sup` elements from affecting the line height in all browsers.\n*/\n\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\n\nsub {\n  bottom: -0.25em;\n}\n\nsup {\n  top: -0.5em;\n}\n\n/*\n  1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)\n  2. Correct table border color inheritance in all Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)\n  3. Remove gaps between table borders by default.\n*/\n\ntable {\n  text-indent: 0; /* 1 */\n  border-color: inherit; /* 2 */\n  border-collapse: collapse; /* 3 */\n}\n\n/*\n  Use the modern Firefox focus style for all focusable elements.\n*/\n\n:-moz-focusring {\n  outline: auto;\n}\n\n/*\n  Add the correct vertical alignment in Chrome and Firefox.\n*/\n\nprogress {\n  vertical-align: baseline;\n}\n\n/*\n  Add the correct display in Chrome and Safari.\n*/\n\nsummary {\n  display: list-item;\n}\n\n/*\n  Make lists unstyled by default.\n*/\n\nol,\nul,\nmenu {\n  list-style: none;\n}\n\n/*\n  1. Make replaced elements `display: block` by default. (https://github.com/mozdevs/cssremedy/issues/14)\n  2. Add `vertical-align: middle` to align replaced elements more sensibly by default. (https://github.com/jensimmons/cssremedy/issues/14#issuecomment-634934210)\n      This can trigger a poorly considered lint error in some tools but is included by design.\n*/\n\nimg,\nsvg,\nvideo,\ncanvas,\naudio,\niframe,\nembed,\nobject {\n  display: block; /* 1 */\n  vertical-align: middle; /* 2 */\n}\n\n/*\n  Constrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)\n*/\n\nimg,\nvideo {\n  max-width: 100%;\n  height: auto;\n}\n\n/*\n  1. Inherit font styles in all browsers.\n  2. Remove border radius in all browsers.\n  3. Remove background color in all browsers.\n  4. Ensure consistent opacity for disabled states in all browsers.\n*/\n\nbutton,\ninput,\nselect,\noptgroup,\ntextarea,\n::file-selector-button {\n  font: inherit; /* 1 */\n  font-feature-settings: inherit; /* 1 */\n  font-variation-settings: inherit; /* 1 */\n  letter-spacing: inherit; /* 1 */\n  color: inherit; /* 1 */\n  border-radius: 0; /* 2 */\n  background-color: transparent; /* 3 */\n  opacity: 1; /* 4 */\n}\n\n/*\n  Restore default font weight.\n*/\n\n:where(select:is([multiple], [size])) optgroup {\n  font-weight: bolder;\n}\n\n/*\n  Restore indentation.\n*/\n\n:where(select:is([multiple], [size])) optgroup option {\n  padding-inline-start: 20px;\n}\n\n/*\n  Restore space after button.\n*/\n\n::file-selector-button {\n  margin-inline-end: 4px;\n}\n\n/*\n  Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)\n*/\n\n::placeholder {\n  opacity: 1;\n}\n\n/*\n  Set the default placeholder color to a semi-transparent version of the current text color in browsers that do not\n  crash when using `color-mix(\u2026)` with `currentcolor`. (https://github.com/tailwindlabs/tailwindcss/issues/17194)\n*/\n\n@supports (not (-webkit-appearance: -apple-pay-button)) /* Not Safari */ or\n  (contain-intrinsic-size: 1px) /* Safari 17+ */ {\n  ::placeholder {\n    color: color-mix(in oklab, currentcolor 50%, transparent);\n  }\n}\n\n/*\n  Prevent resizing textareas horizontally by default.\n*/\n\ntextarea {\n  resize: vertical;\n}\n\n/*\n  Remove the inner padding in Chrome and Safari on macOS.\n*/\n\n::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n\n/*\n  1. Ensure date/time inputs have the same height when empty in iOS Safari.\n  2. Ensure text alignment can be changed on date/time inputs in iOS Safari.\n*/\n\n::-webkit-date-and-time-value {\n  min-height: 1lh; /* 1 */\n  text-align: inherit; /* 2 */\n}\n\n/*\n  Prevent height from changing on date/time inputs in macOS Safari when the input is set to `display: block`.\n*/\n\n::-webkit-datetime-edit {\n  display: inline-flex;\n}\n\n/*\n  Remove excess padding from pseudo-elements in date/time inputs to ensure consistent height across browsers.\n*/\n\n::-webkit-datetime-edit-fields-wrapper {\n  padding: 0;\n}\n\n::-webkit-datetime-edit,\n::-webkit-datetime-edit-year-field,\n::-webkit-datetime-edit-month-field,\n::-webkit-datetime-edit-day-field,\n::-webkit-datetime-edit-hour-field,\n::-webkit-datetime-edit-minute-field,\n::-webkit-datetime-edit-second-field,\n::-webkit-datetime-edit-millisecond-field,\n::-webkit-datetime-edit-meridiem-field {\n  padding-block: 0;\n}\n\n/*\n  Remove the additional `:invalid` styles in Firefox. (https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737)\n*/\n\n:-moz-ui-invalid {\n  box-shadow: none;\n}\n\n/*\n  Correct the inability to style the border radius in iOS Safari.\n*/\n\nbutton,\ninput:where([type='button'], [type='reset'], [type='submit']),\n::file-selector-button {\n  appearance: button;\n}\n\n/*\n  Correct the cursor style of increment and decrement buttons in Safari.\n*/\n\n::-webkit-inner-spin-button,\n::-webkit-outer-spin-button {\n  height: auto;\n}\n\n/*\n  Make elements with the HTML hidden attribute stay hidden by default.\n*/\n\n[hidden]:where(:not([hidden='until-found'])) {\n  display: none !important;\n}\n";

  // ../tailwindcss/theme.css
  var theme_default =
    "@theme default {\n  --font-sans:\n    ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',\n    'Noto Color Emoji';\n  --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;\n  --font-mono:\n    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',\n    monospace;\n\n  --color-red-50: oklch(97.1% 0.013 17.38);\n  --color-red-100: oklch(93.6% 0.032 17.717);\n  --color-red-200: oklch(88.5% 0.062 18.334);\n  --color-red-300: oklch(80.8% 0.114 19.571);\n  --color-red-400: oklch(70.4% 0.191 22.216);\n  --color-red-500: oklch(63.7% 0.237 25.331);\n  --color-red-600: oklch(57.7% 0.245 27.325);\n  --color-red-700: oklch(50.5% 0.213 27.518);\n  --color-red-800: oklch(44.4% 0.177 26.899);\n  --color-red-900: oklch(39.6% 0.141 25.723);\n  --color-red-950: oklch(25.8% 0.092 26.042);\n\n  --color-orange-50: oklch(98% 0.016 73.684);\n  --color-orange-100: oklch(95.4% 0.038 75.164);\n  --color-orange-200: oklch(90.1% 0.076 70.697);\n  --color-orange-300: oklch(83.7% 0.128 66.29);\n  --color-orange-400: oklch(75% 0.183 55.934);\n  --color-orange-500: oklch(70.5% 0.213 47.604);\n  --color-orange-600: oklch(64.6% 0.222 41.116);\n  --color-orange-700: oklch(55.3% 0.195 38.402);\n  --color-orange-800: oklch(47% 0.157 37.304);\n  --color-orange-900: oklch(40.8% 0.123 38.172);\n  --color-orange-950: oklch(26.6% 0.079 36.259);\n\n  --color-amber-50: oklch(98.7% 0.022 95.277);\n  --color-amber-100: oklch(96.2% 0.059 95.617);\n  --color-amber-200: oklch(92.4% 0.12 95.746);\n  --color-amber-300: oklch(87.9% 0.169 91.605);\n  --color-amber-400: oklch(82.8% 0.189 84.429);\n  --color-amber-500: oklch(76.9% 0.188 70.08);\n  --color-amber-600: oklch(66.6% 0.179 58.318);\n  --color-amber-700: oklch(55.5% 0.163 48.998);\n  --color-amber-800: oklch(47.3% 0.137 46.201);\n  --color-amber-900: oklch(41.4% 0.112 45.904);\n  --color-amber-950: oklch(27.9% 0.077 45.635);\n\n  --color-yellow-50: oklch(98.7% 0.026 102.212);\n  --color-yellow-100: oklch(97.3% 0.071 103.193);\n  --color-yellow-200: oklch(94.5% 0.129 101.54);\n  --color-yellow-300: oklch(90.5% 0.182 98.111);\n  --color-yellow-400: oklch(85.2% 0.199 91.936);\n  --color-yellow-500: oklch(79.5% 0.184 86.047);\n  --color-yellow-600: oklch(68.1% 0.162 75.834);\n  --color-yellow-700: oklch(55.4% 0.135 66.442);\n  --color-yellow-800: oklch(47.6% 0.114 61.907);\n  --color-yellow-900: oklch(42.1% 0.095 57.708);\n  --color-yellow-950: oklch(28.6% 0.066 53.813);\n\n  --color-lime-50: oklch(98.6% 0.031 120.757);\n  --color-lime-100: oklch(96.7% 0.067 122.328);\n  --color-lime-200: oklch(93.8% 0.127 124.321);\n  --color-lime-300: oklch(89.7% 0.196 126.665);\n  --color-lime-400: oklch(84.1% 0.238 128.85);\n  --color-lime-500: oklch(76.8% 0.233 130.85);\n  --color-lime-600: oklch(64.8% 0.2 131.684);\n  --color-lime-700: oklch(53.2% 0.157 131.589);\n  --color-lime-800: oklch(45.3% 0.124 130.933);\n  --color-lime-900: oklch(40.5% 0.101 131.063);\n  --color-lime-950: oklch(27.4% 0.072 132.109);\n\n  --color-green-50: oklch(98.2% 0.018 155.826);\n  --color-green-100: oklch(96.2% 0.044 156.743);\n  --color-green-200: oklch(92.5% 0.084 155.995);\n  --color-green-300: oklch(87.1% 0.15 154.449);\n  --color-green-400: oklch(79.2% 0.209 151.711);\n  --color-green-500: oklch(72.3% 0.219 149.579);\n  --color-green-600: oklch(62.7% 0.194 149.214);\n  --color-green-700: oklch(52.7% 0.154 150.069);\n  --color-green-800: oklch(44.8% 0.119 151.328);\n  --color-green-900: oklch(39.3% 0.095 152.535);\n  --color-green-950: oklch(26.6% 0.065 152.934);\n\n  --color-emerald-50: oklch(97.9% 0.021 166.113);\n  --color-emerald-100: oklch(95% 0.052 163.051);\n  --color-emerald-200: oklch(90.5% 0.093 164.15);\n  --color-emerald-300: oklch(84.5% 0.143 164.978);\n  --color-emerald-400: oklch(76.5% 0.177 163.223);\n  --color-emerald-500: oklch(69.6% 0.17 162.48);\n  --color-emerald-600: oklch(59.6% 0.145 163.225);\n  --color-emerald-700: oklch(50.8% 0.118 165.612);\n  --color-emerald-800: oklch(43.2% 0.095 166.913);\n  --color-emerald-900: oklch(37.8% 0.077 168.94);\n  --color-emerald-950: oklch(26.2% 0.051 172.552);\n\n  --color-teal-50: oklch(98.4% 0.014 180.72);\n  --color-teal-100: oklch(95.3% 0.051 180.801);\n  --color-teal-200: oklch(91% 0.096 180.426);\n  --color-teal-300: oklch(85.5% 0.138 181.071);\n  --color-teal-400: oklch(77.7% 0.152 181.912);\n  --color-teal-500: oklch(70.4% 0.14 182.503);\n  --color-teal-600: oklch(60% 0.118 184.704);\n  --color-teal-700: oklch(51.1% 0.096 186.391);\n  --color-teal-800: oklch(43.7% 0.078 188.216);\n  --color-teal-900: oklch(38.6% 0.063 188.416);\n  --color-teal-950: oklch(27.7% 0.046 192.524);\n\n  --color-cyan-50: oklch(98.4% 0.019 200.873);\n  --color-cyan-100: oklch(95.6% 0.045 203.388);\n  --color-cyan-200: oklch(91.7% 0.08 205.041);\n  --color-cyan-300: oklch(86.5% 0.127 207.078);\n  --color-cyan-400: oklch(78.9% 0.154 211.53);\n  --color-cyan-500: oklch(71.5% 0.143 215.221);\n  --color-cyan-600: oklch(60.9% 0.126 221.723);\n  --color-cyan-700: oklch(52% 0.105 223.128);\n  --color-cyan-800: oklch(45% 0.085 224.283);\n  --color-cyan-900: oklch(39.8% 0.07 227.392);\n  --color-cyan-950: oklch(30.2% 0.056 229.695);\n\n  --color-sky-50: oklch(97.7% 0.013 236.62);\n  --color-sky-100: oklch(95.1% 0.026 236.824);\n  --color-sky-200: oklch(90.1% 0.058 230.902);\n  --color-sky-300: oklch(82.8% 0.111 230.318);\n  --color-sky-400: oklch(74.6% 0.16 232.661);\n  --color-sky-500: oklch(68.5% 0.169 237.323);\n  --color-sky-600: oklch(58.8% 0.158 241.966);\n  --color-sky-700: oklch(50% 0.134 242.749);\n  --color-sky-800: oklch(44.3% 0.11 240.79);\n  --color-sky-900: oklch(39.1% 0.09 240.876);\n  --color-sky-950: oklch(29.3% 0.066 243.157);\n\n  --color-blue-50: oklch(97% 0.014 254.604);\n  --color-blue-100: oklch(93.2% 0.032 255.585);\n  --color-blue-200: oklch(88.2% 0.059 254.128);\n  --color-blue-300: oklch(80.9% 0.105 251.813);\n  --color-blue-400: oklch(70.7% 0.165 254.624);\n  --color-blue-500: oklch(62.3% 0.214 259.815);\n  --color-blue-600: oklch(54.6% 0.245 262.881);\n  --color-blue-700: oklch(48.8% 0.243 264.376);\n  --color-blue-800: oklch(42.4% 0.199 265.638);\n  --color-blue-900: oklch(37.9% 0.146 265.522);\n  --color-blue-950: oklch(28.2% 0.091 267.935);\n\n  --color-indigo-50: oklch(96.2% 0.018 272.314);\n  --color-indigo-100: oklch(93% 0.034 272.788);\n  --color-indigo-200: oklch(87% 0.065 274.039);\n  --color-indigo-300: oklch(78.5% 0.115 274.713);\n  --color-indigo-400: oklch(67.3% 0.182 276.935);\n  --color-indigo-500: oklch(58.5% 0.233 277.117);\n  --color-indigo-600: oklch(51.1% 0.262 276.966);\n  --color-indigo-700: oklch(45.7% 0.24 277.023);\n  --color-indigo-800: oklch(39.8% 0.195 277.366);\n  --color-indigo-900: oklch(35.9% 0.144 278.697);\n  --color-indigo-950: oklch(25.7% 0.09 281.288);\n\n  --color-violet-50: oklch(96.9% 0.016 293.756);\n  --color-violet-100: oklch(94.3% 0.029 294.588);\n  --color-violet-200: oklch(89.4% 0.057 293.283);\n  --color-violet-300: oklch(81.1% 0.111 293.571);\n  --color-violet-400: oklch(70.2% 0.183 293.541);\n  --color-violet-500: oklch(60.6% 0.25 292.717);\n  --color-violet-600: oklch(54.1% 0.281 293.009);\n  --color-violet-700: oklch(49.1% 0.27 292.581);\n  --color-violet-800: oklch(43.2% 0.232 292.759);\n  --color-violet-900: oklch(38% 0.189 293.745);\n  --color-violet-950: oklch(28.3% 0.141 291.089);\n\n  --color-purple-50: oklch(97.7% 0.014 308.299);\n  --color-purple-100: oklch(94.6% 0.033 307.174);\n  --color-purple-200: oklch(90.2% 0.063 306.703);\n  --color-purple-300: oklch(82.7% 0.119 306.383);\n  --color-purple-400: oklch(71.4% 0.203 305.504);\n  --color-purple-500: oklch(62.7% 0.265 303.9);\n  --color-purple-600: oklch(55.8% 0.288 302.321);\n  --color-purple-700: oklch(49.6% 0.265 301.924);\n  --color-purple-800: oklch(43.8% 0.218 303.724);\n  --color-purple-900: oklch(38.1% 0.176 304.987);\n  --color-purple-950: oklch(29.1% 0.149 302.717);\n\n  --color-fuchsia-50: oklch(97.7% 0.017 320.058);\n  --color-fuchsia-100: oklch(95.2% 0.037 318.852);\n  --color-fuchsia-200: oklch(90.3% 0.076 319.62);\n  --color-fuchsia-300: oklch(83.3% 0.145 321.434);\n  --color-fuchsia-400: oklch(74% 0.238 322.16);\n  --color-fuchsia-500: oklch(66.7% 0.295 322.15);\n  --color-fuchsia-600: oklch(59.1% 0.293 322.896);\n  --color-fuchsia-700: oklch(51.8% 0.253 323.949);\n  --color-fuchsia-800: oklch(45.2% 0.211 324.591);\n  --color-fuchsia-900: oklch(40.1% 0.17 325.612);\n  --color-fuchsia-950: oklch(29.3% 0.136 325.661);\n\n  --color-pink-50: oklch(97.1% 0.014 343.198);\n  --color-pink-100: oklch(94.8% 0.028 342.258);\n  --color-pink-200: oklch(89.9% 0.061 343.231);\n  --color-pink-300: oklch(82.3% 0.12 346.018);\n  --color-pink-400: oklch(71.8% 0.202 349.761);\n  --color-pink-500: oklch(65.6% 0.241 354.308);\n  --color-pink-600: oklch(59.2% 0.249 0.584);\n  --color-pink-700: oklch(52.5% 0.223 3.958);\n  --color-pink-800: oklch(45.9% 0.187 3.815);\n  --color-pink-900: oklch(40.8% 0.153 2.432);\n  --color-pink-950: oklch(28.4% 0.109 3.907);\n\n  --color-rose-50: oklch(96.9% 0.015 12.422);\n  --color-rose-100: oklch(94.1% 0.03 12.58);\n  --color-rose-200: oklch(89.2% 0.058 10.001);\n  --color-rose-300: oklch(81% 0.117 11.638);\n  --color-rose-400: oklch(71.2% 0.194 13.428);\n  --color-rose-500: oklch(64.5% 0.246 16.439);\n  --color-rose-600: oklch(58.6% 0.253 17.585);\n  --color-rose-700: oklch(51.4% 0.222 16.935);\n  --color-rose-800: oklch(45.5% 0.188 13.697);\n  --color-rose-900: oklch(41% 0.159 10.272);\n  --color-rose-950: oklch(27.1% 0.105 12.094);\n\n  --color-slate-50: oklch(98.4% 0.003 247.858);\n  --color-slate-100: oklch(96.8% 0.007 247.896);\n  --color-slate-200: oklch(92.9% 0.013 255.508);\n  --color-slate-300: oklch(86.9% 0.022 252.894);\n  --color-slate-400: oklch(70.4% 0.04 256.788);\n  --color-slate-500: oklch(55.4% 0.046 257.417);\n  --color-slate-600: oklch(44.6% 0.043 257.281);\n  --color-slate-700: oklch(37.2% 0.044 257.287);\n  --color-slate-800: oklch(27.9% 0.041 260.031);\n  --color-slate-900: oklch(20.8% 0.042 265.755);\n  --color-slate-950: oklch(12.9% 0.042 264.695);\n\n  --color-gray-50: oklch(98.5% 0.002 247.839);\n  --color-gray-100: oklch(96.7% 0.003 264.542);\n  --color-gray-200: oklch(92.8% 0.006 264.531);\n  --color-gray-300: oklch(87.2% 0.01 258.338);\n  --color-gray-400: oklch(70.7% 0.022 261.325);\n  --color-gray-500: oklch(55.1% 0.027 264.364);\n  --color-gray-600: oklch(44.6% 0.03 256.802);\n  --color-gray-700: oklch(37.3% 0.034 259.733);\n  --color-gray-800: oklch(27.8% 0.033 256.848);\n  --color-gray-900: oklch(21% 0.034 264.665);\n  --color-gray-950: oklch(13% 0.028 261.692);\n\n  --color-zinc-50: oklch(98.5% 0 0);\n  --color-zinc-100: oklch(96.7% 0.001 286.375);\n  --color-zinc-200: oklch(92% 0.004 286.32);\n  --color-zinc-300: oklch(87.1% 0.006 286.286);\n  --color-zinc-400: oklch(70.5% 0.015 286.067);\n  --color-zinc-500: oklch(55.2% 0.016 285.938);\n  --color-zinc-600: oklch(44.2% 0.017 285.786);\n  --color-zinc-700: oklch(37% 0.013 285.805);\n  --color-zinc-800: oklch(27.4% 0.006 286.033);\n  --color-zinc-900: oklch(21% 0.006 285.885);\n  --color-zinc-950: oklch(14.1% 0.005 285.823);\n\n  --color-neutral-50: oklch(98.5% 0 0);\n  --color-neutral-100: oklch(97% 0 0);\n  --color-neutral-200: oklch(92.2% 0 0);\n  --color-neutral-300: oklch(87% 0 0);\n  --color-neutral-400: oklch(70.8% 0 0);\n  --color-neutral-500: oklch(55.6% 0 0);\n  --color-neutral-600: oklch(43.9% 0 0);\n  --color-neutral-700: oklch(37.1% 0 0);\n  --color-neutral-800: oklch(26.9% 0 0);\n  --color-neutral-900: oklch(20.5% 0 0);\n  --color-neutral-950: oklch(14.5% 0 0);\n\n  --color-stone-50: oklch(98.5% 0.001 106.423);\n  --color-stone-100: oklch(97% 0.001 106.424);\n  --color-stone-200: oklch(92.3% 0.003 48.717);\n  --color-stone-300: oklch(86.9% 0.005 56.366);\n  --color-stone-400: oklch(70.9% 0.01 56.259);\n  --color-stone-500: oklch(55.3% 0.013 58.071);\n  --color-stone-600: oklch(44.4% 0.011 73.639);\n  --color-stone-700: oklch(37.4% 0.01 67.558);\n  --color-stone-800: oklch(26.8% 0.007 34.298);\n  --color-stone-900: oklch(21.6% 0.006 56.043);\n  --color-stone-950: oklch(14.7% 0.004 49.25);\n\n  --color-black: #000;\n  --color-white: #fff;\n\n  --spacing: 0.25rem;\n\n  --breakpoint-sm: 40rem;\n  --breakpoint-md: 48rem;\n  --breakpoint-lg: 64rem;\n  --breakpoint-xl: 80rem;\n  --breakpoint-2xl: 96rem;\n\n  --container-3xs: 16rem;\n  --container-2xs: 18rem;\n  --container-xs: 20rem;\n  --container-sm: 24rem;\n  --container-md: 28rem;\n  --container-lg: 32rem;\n  --container-xl: 36rem;\n  --container-2xl: 42rem;\n  --container-3xl: 48rem;\n  --container-4xl: 56rem;\n  --container-5xl: 64rem;\n  --container-6xl: 72rem;\n  --container-7xl: 80rem;\n\n  --text-xs: 0.75rem;\n  --text-xs--line-height: calc(1 / 0.75);\n  --text-sm: 0.875rem;\n  --text-sm--line-height: calc(1.25 / 0.875);\n  --text-base: 1rem;\n  --text-base--line-height: calc(1.5 / 1);\n  --text-lg: 1.125rem;\n  --text-lg--line-height: calc(1.75 / 1.125);\n  --text-xl: 1.25rem;\n  --text-xl--line-height: calc(1.75 / 1.25);\n  --text-2xl: 1.5rem;\n  --text-2xl--line-height: calc(2 / 1.5);\n  --text-3xl: 1.875rem;\n  --text-3xl--line-height: calc(2.25 / 1.875);\n  --text-4xl: 2.25rem;\n  --text-4xl--line-height: calc(2.5 / 2.25);\n  --text-5xl: 3rem;\n  --text-5xl--line-height: 1;\n  --text-6xl: 3.75rem;\n  --text-6xl--line-height: 1;\n  --text-7xl: 4.5rem;\n  --text-7xl--line-height: 1;\n  --text-8xl: 6rem;\n  --text-8xl--line-height: 1;\n  --text-9xl: 8rem;\n  --text-9xl--line-height: 1;\n\n  --font-weight-thin: 100;\n  --font-weight-extralight: 200;\n  --font-weight-light: 300;\n  --font-weight-normal: 400;\n  --font-weight-medium: 500;\n  --font-weight-semibold: 600;\n  --font-weight-bold: 700;\n  --font-weight-extrabold: 800;\n  --font-weight-black: 900;\n\n  --tracking-tighter: -0.05em;\n  --tracking-tight: -0.025em;\n  --tracking-normal: 0em;\n  --tracking-wide: 0.025em;\n  --tracking-wider: 0.05em;\n  --tracking-widest: 0.1em;\n\n  --leading-tight: 1.25;\n  --leading-snug: 1.375;\n  --leading-normal: 1.5;\n  --leading-relaxed: 1.625;\n  --leading-loose: 2;\n\n  --radius-xs: 0.125rem;\n  --radius-sm: 0.25rem;\n  --radius-md: 0.375rem;\n  --radius-lg: 0.5rem;\n  --radius-xl: 0.75rem;\n  --radius-2xl: 1rem;\n  --radius-3xl: 1.5rem;\n  --radius-4xl: 2rem;\n\n  --shadow-2xs: 0 1px rgb(0 0 0 / 0.05);\n  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);\n  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);\n  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);\n  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);\n  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);\n\n  --inset-shadow-2xs: inset 0 1px rgb(0 0 0 / 0.05);\n  --inset-shadow-xs: inset 0 1px 1px rgb(0 0 0 / 0.05);\n  --inset-shadow-sm: inset 0 2px 4px rgb(0 0 0 / 0.05);\n\n  --drop-shadow-xs: 0 1px 1px rgb(0 0 0 / 0.05);\n  --drop-shadow-sm: 0 1px 2px rgb(0 0 0 / 0.15);\n  --drop-shadow-md: 0 3px 3px rgb(0 0 0 / 0.12);\n  --drop-shadow-lg: 0 4px 4px rgb(0 0 0 / 0.15);\n  --drop-shadow-xl: 0 9px 7px rgb(0 0 0 / 0.1);\n  --drop-shadow-2xl: 0 25px 25px rgb(0 0 0 / 0.15);\n\n  --text-shadow-2xs: 0px 1px 0px rgb(0 0 0 / 0.15);\n  --text-shadow-xs: 0px 1px 1px rgb(0 0 0 / 0.2);\n  --text-shadow-sm:\n    0px 1px 0px rgb(0 0 0 / 0.075), 0px 1px 1px rgb(0 0 0 / 0.075), 0px 2px 2px rgb(0 0 0 / 0.075);\n  --text-shadow-md:\n    0px 1px 1px rgb(0 0 0 / 0.1), 0px 1px 2px rgb(0 0 0 / 0.1), 0px 2px 4px rgb(0 0 0 / 0.1);\n  --text-shadow-lg:\n    0px 1px 2px rgb(0 0 0 / 0.1), 0px 3px 2px rgb(0 0 0 / 0.1), 0px 4px 8px rgb(0 0 0 / 0.1);\n\n  --ease-in: cubic-bezier(0.4, 0, 1, 1);\n  --ease-out: cubic-bezier(0, 0, 0.2, 1);\n  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);\n\n  --animate-spin: spin 1s linear infinite;\n  --animate-ping: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;\n  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\n  --animate-bounce: bounce 1s infinite;\n\n  @keyframes spin {\n    to {\n      transform: rotate(360deg);\n    }\n  }\n\n  @keyframes ping {\n    75%,\n    100% {\n      transform: scale(2);\n      opacity: 0;\n    }\n  }\n\n  @keyframes pulse {\n    50% {\n      opacity: 0.5;\n    }\n  }\n\n  @keyframes bounce {\n    0%,\n    100% {\n      transform: translateY(-25%);\n      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);\n    }\n\n    50% {\n      transform: none;\n      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);\n    }\n  }\n\n  --blur-xs: 4px;\n  --blur-sm: 8px;\n  --blur-md: 12px;\n  --blur-lg: 16px;\n  --blur-xl: 24px;\n  --blur-2xl: 40px;\n  --blur-3xl: 64px;\n\n  --perspective-dramatic: 100px;\n  --perspective-near: 300px;\n  --perspective-normal: 500px;\n  --perspective-midrange: 800px;\n  --perspective-distant: 1200px;\n\n  --aspect-video: 16 / 9;\n\n  --default-transition-duration: 150ms;\n  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n  --default-font-family: --theme(--font-sans, initial);\n  --default-font-feature-settings: --theme(--font-sans--font-feature-settings, initial);\n  --default-font-variation-settings: --theme(--font-sans--font-variation-settings, initial);\n  --default-mono-font-family: --theme(--font-mono, initial);\n  --default-mono-font-feature-settings: --theme(--font-mono--font-feature-settings, initial);\n  --default-mono-font-variation-settings: --theme(--font-mono--font-variation-settings, initial);\n}\n\n/* Deprecated */\n@theme default inline reference {\n  --blur: 8px;\n  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);\n  --drop-shadow: 0 1px 2px rgb(0 0 0 / 0.1), 0 1px 1px rgb(0 0 0 / 0.06);\n  --radius: 0.25rem;\n  --max-width-prose: 65ch;\n}\n";

  // ../tailwindcss/utilities.css
  var utilities_default = "@tailwind utilities;\n";

  // src/assets.ts
  var css = {
    index: tailwindcss_default,
    preflight: preflight_default,
    theme: theme_default,
    utilities: utilities_default,
  };

  var STYLE_TYPE = "text/tailwindcss";
  var compiler;
  var classes = /* @__PURE__ */ new Set();
  var lastCss = "";

  async function createCompiler() {
    let stylesheets = querySelectorAll(document.documentElement, `style[type="${STYLE_TYPE}"]`);
    let css2 = "";
    for (let sheet2 of stylesheets) {
      observeSheet(sheet2);
      css2 += sheet2.textContent + "\n";
    }
    if (!css2.includes("@import")) {
      css2 = `@import "tailwindcss";${css2}`;
    }
    if (lastCss === css2) return;
    lastCss = css2;
    try {
      compiler = await compile(css2, {
        base: "/",
        loadStylesheet,
        loadModule,
      });
    } finally {
    }
    classes.clear();
  }
  async function loadStylesheet(id, base) {
    function load() {
      if (id === "tailwindcss") {
        return {
          path: "virtual:tailwindcss/index.css",
          base,
          content: css.index,
        };
      } else if (id === "tailwindcss/preflight" || id === "tailwindcss/preflight.css" || id === "./preflight.css") {
        return {
          path: "virtual:tailwindcss/preflight.css",
          base,
          content: css.preflight,
        };
      } else if (id === "tailwindcss/theme" || id === "tailwindcss/theme.css" || id === "./theme.css") {
        return {
          path: "virtual:tailwindcss/theme.css",
          base,
          content: css.theme,
        };
      } else if (id === "tailwindcss/utilities" || id === "tailwindcss/utilities.css" || id === "./utilities.css") {
        return {
          path: "virtual:tailwindcss/utilities.css",
          base,
          content: css.utilities,
        };
      }
      throw new Error(`The browser build does not support @import for "${id}"`);
    }
    try {
      let sheet2 = load();
      return sheet2;
    } catch (err) {
      throw err;
    }
  }
  async function loadModule() {
    throw new Error(`The browser build does not support plugins or config files.`);
  }

  async function build(kind) {
    if (!compiler) return;

    for (let element of querySelectorAll(document.documentElement, "[class]")) {
      if (element.tagName.endsWith("-block") && element.shadowRoot) {
        let newShadowClasses = /* @__PURE__ */ new Set();

        //setTimeout(() => {
        for (let shadowElement of element.shadowRoot.querySelectorAll("[class]")) {
          for (let c of shadowElement.classList) {
            newShadowClasses.add(c);
          }
        }

        if (newShadowClasses.size === 0 && kind === "incremental") return;

        let utilityStyleSheet = element.shadowRoot.adoptedStyleSheets.find((sheet) =>
          Array.from(sheet.rules).find((r) => r.name === "utilities")
        );
        if (utilityStyleSheet) {
          // Replace content of existing utility layer stylesheet
          utilityStyleSheet.replaceSync(compiler.build(Array.from(newShadowClasses)));
        } else {
          // Create new stylesheet with utility layer
          const styleSheet = new CSSStyleSheet();
          styleSheet.replaceSync(compiler.build(Array.from(newShadowClasses)));
          // Add to adoptedStyleSheets array
          element.shadowRoot.adoptedStyleSheets = [...element.shadowRoot.adoptedStyleSheets, styleSheet];
        }

        console.log(newShadowClasses);
      }
    }
  }
  createCompiler().then(() => {
    console.log(
      "%c✅ Tailwind Enabled!",
      "background: #D1FAE5; color: #065F46; font-size: 12px; padding: 4px 8px; border-radius: 6px; font-weight: bold;"
    );
    window.tailwindCompiler = compiler;
  });
})();
