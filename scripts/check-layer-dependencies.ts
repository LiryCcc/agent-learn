import { Lang, parse } from '@ast-grep/napi';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

type DependencyCheck = {
  allowedDependencies: Map<string, Set<string>>;
  projectRoot: string;
  sourceFile: string;
  sourceLayer: string;
  specifier: string;
  targetLayer: string | null;
};

const workspaceRoot = resolve(import.meta.dirname, '..');
const frontendRoot = resolve(workspaceRoot, 'agent-fe/src');
const agentCoreRoot = resolve(workspaceRoot, 'agent-core/src');
const sourceExtensions = new Set(['.ts', '.tsx']);

const frontendDependencies = new Map([
  ['entry', new Set(['app'])],
  ['app', new Set(['router', 'utils'])],
  ['router', new Set(['components', 'pages'])],
  ['pages', new Set(['api', 'components', 'utils'])],
  ['components', new Set(['utils'])],
  ['api', new Set<string>()],
  ['utils', new Set<string>()]
]);

const agentCoreDependencies = new Map([
  ['entry', new Set(['orchestration', 'foundation'])],
  ['orchestration', new Set(['foundation'])],
  ['foundation', new Set<string>()]
]);

const collectSourceFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
};

const getModuleSpecifiers = (filePath: string): string[] => {
  const sourceText = readFileSync(filePath, 'utf8');
  const language = filePath.endsWith('.tsx') ? Lang.Tsx : Lang.TypeScript;
  const rootNode = parse(language, sourceText).root();
  const moduleSpecifiers: string[] = [];

  rootNode
    .findAll({
      rule: {
        any: [
          { kind: 'import_statement' },
          { kind: 'export_statement' },
          {
            kind: 'call_expression',
            has: { kind: 'import', stopBy: 'neighbor' }
          }
        ]
      }
    })
    .forEach((node) => {
      const stringNode = node.find({ rule: { kind: 'string' } });

      if (stringNode) {
        moduleSpecifiers.push(stringNode.text().slice(1, -1));
      }
    });

  return moduleSpecifiers;
};

const getFrontendLayer = (filePath: string) => {
  const relativePath = relative(frontendRoot, filePath);

  if (relativePath === 'index.tsx') {
    return 'entry';
  }

  return relativePath.split(sep)[0] ?? 'unknown';
};

const getFrontendTargetLayer = (sourceFile: string, specifier: string) => {
  if (specifier.startsWith('@/')) {
    return specifier.slice(2).split('/')[0] ?? null;
  }

  if (!specifier.startsWith('.')) {
    return null;
  }

  const targetPath = resolve(dirname(sourceFile), specifier);
  const relativeTarget = relative(frontendRoot, targetPath);

  if (relativeTarget.startsWith('..')) {
    return null;
  }

  return relativeTarget.split(sep)[0] ?? null;
};

const getAgentCoreLayer = (filePath: string) => {
  const relativePath = relative(agentCoreRoot, filePath);
  const sourcePath = relativePath.replace(/\.(?:js|jsx|ts|tsx)$/, '');

  if (sourcePath === 'index') {
    return 'entry';
  }

  if (sourcePath === 'browser-agent') {
    return 'orchestration';
  }

  return 'foundation';
};

const getAgentCoreTargetLayer = (sourceFile: string, specifier: string) => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  return getAgentCoreLayer(resolve(dirname(sourceFile), specifier));
};

const checkDependency = ({
  sourceFile,
  sourceLayer,
  targetLayer,
  specifier,
  allowedDependencies,
  projectRoot
}: DependencyCheck) => {
  if (!targetLayer || sourceLayer === targetLayer) {
    return null;
  }

  const allowedTargets = allowedDependencies.get(sourceLayer);

  if (allowedTargets?.has(targetLayer)) {
    return null;
  }

  return `${relative(workspaceRoot, sourceFile)}: ${sourceLayer} cannot depend on ${targetLayer} through "${specifier}" (${relative(workspaceRoot, projectRoot)})`;
};

const checkFrontend = () => {
  return collectSourceFiles(frontendRoot).flatMap((sourceFile) => {
    const sourceLayer = getFrontendLayer(sourceFile);

    return getModuleSpecifiers(sourceFile).flatMap((specifier) => {
      if (specifier === '@liry-a/agent-core' && sourceLayer !== 'api') {
        return [`${relative(workspaceRoot, sourceFile)}: only the api layer may import @liry-a/agent-core`];
      }

      const error = checkDependency({
        sourceFile,
        sourceLayer,
        targetLayer: getFrontendTargetLayer(sourceFile, specifier),
        specifier,
        allowedDependencies: frontendDependencies,
        projectRoot: frontendRoot
      });

      return error ? [error] : [];
    });
  });
};

const checkAgentCore = () => {
  return collectSourceFiles(agentCoreRoot).flatMap((sourceFile) => {
    const sourceLayer = getAgentCoreLayer(sourceFile);

    return getModuleSpecifiers(sourceFile).flatMap((specifier) => {
      const error = checkDependency({
        sourceFile,
        sourceLayer,
        targetLayer: getAgentCoreTargetLayer(sourceFile, specifier),
        specifier,
        allowedDependencies: agentCoreDependencies,
        projectRoot: agentCoreRoot
      });

      return error ? [error] : [];
    });
  });
};

const errors = [...checkFrontend(), ...checkAgentCore()];

if (errors.length > 0) {
  console.error('Layer dependency violations:');
  errors.forEach((error) => {
    console.error(`- ${error}`);
  });
  process.exitCode = 1;
} else {
  console.log('Layer dependencies are valid.');
}
