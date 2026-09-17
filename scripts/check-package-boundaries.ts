import { Lang, parse, type SgNode } from '@ast-grep/napi';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';

type ModuleReference = {
  column: number;
  line: number;
  specifier: string;
};

type SourceLanguage = (typeof Lang)[keyof typeof Lang];

const workspaceRoot = resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set(['.git', '.pnpm-store', 'dist', 'node_modules']);
const sourceExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

const collectSourceFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectSourceFiles(entryPath);
    }

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
};

const collectPackageRoots = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) {
      return [];
    }

    const entryPath = resolve(directory, entry.name);
    const nestedPackageRoots = collectPackageRoots(entryPath);

    return existsSync(resolve(entryPath, 'package.json')) ? [entryPath, ...nestedPackageRoots] : nestedPackageRoots;
  });
};

const getLanguage = (filePath: string): SourceLanguage => {
  if (filePath.endsWith('.tsx')) {
    return Lang.Tsx;
  }

  if (filePath.endsWith('.jsx')) {
    return Lang.JavaScript;
  }

  if (filePath.endsWith('.ts') || filePath.endsWith('.mts') || filePath.endsWith('.cts')) {
    return Lang.TypeScript;
  }

  return Lang.JavaScript;
};

const getStringReference = (node: SgNode): ModuleReference | null => {
  const stringNode = node.find({ rule: { kind: 'string' } });

  if (!stringNode) {
    return null;
  }

  const position = stringNode.range().start;

  return {
    column: position.column + 1,
    line: position.line + 1,
    specifier: stringNode.text().slice(1, -1)
  };
};

const getModuleReferences = (filePath: string) => {
  const rootNode = parse(getLanguage(filePath), readFileSync(filePath, 'utf8')).root();
  const references: ModuleReference[] = [];

  rootNode
    .findAll({
      rule: {
        any: [
          { kind: 'import_statement' },
          { kind: 'export_statement' },
          {
            kind: 'call_expression',
            any: [{ has: { kind: 'import', stopBy: 'neighbor' } }, { has: { regex: '^require$', stopBy: 'neighbor' } }]
          }
        ]
      }
    })
    .forEach((node) => {
      const reference = getStringReference(node);

      if (reference) {
        references.push(reference);
      }
    });

  return references;
};

const isPathInside = (parentPath: string, targetPath: string) => {
  const relativePath = relative(parentPath, targetPath);

  return (
    relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
};

const packageRoots = collectPackageRoots(workspaceRoot).sort(
  (leftPath, rightPath) => rightPath.length - leftPath.length
);

const getPackageRoot = (filePath: string) => {
  return packageRoots.find((packageRoot) => isPathInside(packageRoot, filePath)) ?? null;
};

const checkModuleReference = (sourceFile: string, reference: ModuleReference) => {
  if (!reference.specifier.startsWith('.')) {
    return null;
  }

  const targetPath = resolve(dirname(sourceFile), reference.specifier);
  const sourcePackageRoot = getPackageRoot(sourceFile);
  const targetPackageRoot = getPackageRoot(targetPath);
  const location = `${relative(workspaceRoot, sourceFile)}:${String(reference.line)}:${String(reference.column)}`;

  if (sourcePackageRoot && !isPathInside(sourcePackageRoot, targetPath)) {
    return `${location}: relative module paths must not leave package ${relative(workspaceRoot, sourcePackageRoot)}`;
  }

  if (!sourcePackageRoot && targetPackageRoot) {
    return `${location}: root code must import ${relative(workspaceRoot, targetPackageRoot)} by its package name`;
  }

  return null;
};

const errors = collectSourceFiles(workspaceRoot).flatMap((sourceFile) => {
  return getModuleReferences(sourceFile).flatMap((reference) => {
    const error = checkModuleReference(sourceFile, reference);

    return error ? [error] : [];
  });
});

if (errors.length > 0) {
  console.error('Workspace package boundary violations:');
  errors.forEach((error) => {
    console.error(`- ${error}`);
  });
  process.exitCode = 1;
} else {
  console.log('Workspace package boundaries are valid.');
}
