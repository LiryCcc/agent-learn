import { Lang, parse, type SgNode } from '@ast-grep/napi';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, relative, resolve, sep } from 'node:path';

type SourceLanguage = (typeof Lang)[keyof typeof Lang];

const workspaceRoot = resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set(['.git', '.pnpm-store', 'dist', 'node_modules']);
const scriptExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const sourceExtensions = new Set([...scriptExtensions, '.css']);
const functionKinds = new Set([
  'function_declaration',
  'function_expression',
  'generator_function',
  'generator_function_declaration',
  'method_definition'
]);
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const collectSourceFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectSourceFiles(entryPath);
    }

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
};

const getLanguage = (filePath: string): SourceLanguage | null => {
  if (filePath.endsWith('.tsx')) {
    return Lang.Tsx;
  }

  if (filePath.endsWith('.jsx')) {
    return Lang.JavaScript;
  }

  if (filePath.endsWith('.ts')) {
    return Lang.TypeScript;
  }

  if (filePath.endsWith('.js')) {
    return Lang.JavaScript;
  }

  if (filePath.endsWith('.css')) {
    return Lang.Css;
  }

  return null;
};

const formatLocation = (filePath: string, node: SgNode) => {
  const position = node.range().start;

  return `${relative(workspaceRoot, filePath)}:${position.line + 1}:${position.column + 1}`;
};

const checkPathNaming = (filePath: string) => {
  const relativePath = relative(workspaceRoot, filePath);
  const pathParts = relativePath.split(sep);
  const fileName = pathParts.pop() ?? '';
  const fileNameParts = basename(fileName, extname(fileName)).split('.');
  const invalidParts = [...pathParts, ...fileNameParts].filter(
    (part) => !part.startsWith('.') && !kebabCasePattern.test(part)
  );

  if (invalidParts.length === 0) {
    return [];
  }

  return [`${relativePath}: project source file and directory names must use kebab-case`];
};

const checkScriptConventions = (filePath: string, language: SourceLanguage) => {
  const rootNode = parse(language, readFileSync(filePath, 'utf8')).root();
  const errors: string[] = [];

  rootNode.findAll({ rule: { any: [...functionKinds].map((kind) => ({ kind })) } }).forEach((node) => {
    errors.push(`${formatLocation(filePath, node)}: define functions with const arrow functions`);
  });

  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    rootNode.findAll({ rule: { kind: 'jsx_text' } }).forEach((node) => {
      if (node.text().trim().length > 0) {
        errors.push(`${formatLocation(filePath, node)}: JSX visible text must use an expression`);
      }
    });
  }

  return errors;
};

const checkCssConventions = (filePath: string) => {
  const rootNode = parse(Lang.Css, readFileSync(filePath, 'utf8')).root();
  const errors: string[] = [];

  rootNode.findAll({ rule: { kind: 'class_name' } }).forEach((node) => {
    if (!kebabCasePattern.test(node.text())) {
      errors.push(`${formatLocation(filePath, node)}: CSS class names must use kebab-case`);
    }
  });

  return errors;
};

const checkSourceFile = (filePath: string) => {
  const language = getLanguage(filePath);
  const errors = checkPathNaming(filePath);

  if (!language) {
    return errors;
  }

  if (scriptExtensions.has(extname(filePath))) {
    return [...errors, ...checkScriptConventions(filePath, language)];
  }

  return [...errors, ...checkCssConventions(filePath)];
};

const errors = collectSourceFiles(workspaceRoot).flatMap(checkSourceFile);

if (errors.length > 0) {
  console.error('Source convention violations:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Source conventions are valid.');
}
