import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createTranslator } from "next-intl";
import { expect, it } from "vitest";
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

function flatten(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      typeof child === "string"
        ? [[`${prefix}${key}`, child]]
        : Object.entries(flatten(child, `${prefix}${key}.`)),
    ),
  );
}
const english = flatten(en),
  turkish = flatten(tr);
const placeholders = (message: string) =>
  [
    ...new Set(
      [...message.matchAll(/\{(\w+)(?:\}|,)/g)].map((match) => match[1]!),
    ),
  ].sort();
it("translates every message with identical placeholders", () => {
  expect(Object.keys(turkish).sort()).toEqual(Object.keys(english).sort());
  for (const [key, message] of Object.entries(english))
    expect(placeholders(turkish[key]!), key).toEqual(placeholders(message));
});
it("formats every message without invalid ICU syntax", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["tr", tr],
  ] as const) {
    const errors: string[] = [];
    const translate = createTranslator({
      locale,
      messages,
      onError: (error) => errors.push(error.message),
    });
    for (const [key, message] of Object.entries(flatten(messages))) {
      translate(
        key as "meta.appName",
        Object.fromEntries(placeholders(message).map((name) => [name, 2])),
      );
    }
    expect(errors, locale).toEqual([]);
  }
});
it("supplies the placeholders used by statically translated UI labels", () => {
  const failures: string[] = [];
  function scan(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(file);
        continue;
      }
      if (!/\.tsx?$/.test(file) || file.includes(".test.")) continue;
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node: ts.Node, inherited: Map<string, string>) {
        const bindings = ts.isFunctionLike(node)
          ? new Map(inherited)
          : inherited;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
          let init = node.initializer;
          if (init && ts.isAwaitExpression(init)) init = init.expression;
          if (
            init &&
            ts.isCallExpression(init) &&
            /^(getTranslations|useTranslations)$/.test(
              init.expression.getText(source),
            ) &&
            init.arguments[0] &&
            ts.isStringLiteral(init.arguments[0])
          )
            bindings.set(node.name.text, init.arguments[0].text);
        }
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          bindings.has(node.expression.text) &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const key = `${bindings.get(node.expression.text)}.${node.arguments[0].text}`;
          const message = english[key];
          if (!message) failures.push(`Missing ${key}`);
          else {
            const args = node.arguments[1];
            if (!args || ts.isObjectLiteralExpression(args)) {
              const supplied = args
                ? args.properties.map((prop) =>
                    prop.name?.getText(source).replaceAll('"', ""),
                  )
                : [];
              for (const name of placeholders(message))
                if (!supplied.includes(name))
                  failures.push(`${key} requires ${name}`);
            }
          }
        }
        ts.forEachChild(node, (child) => visit(child, bindings));
      }
      visit(source, new Map());
    }
  }
  scan(path.resolve("src"));
  expect(failures).toEqual([]);
});
