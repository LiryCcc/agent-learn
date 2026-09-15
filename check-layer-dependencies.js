import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

const workspaceRoot = import.meta.dirname;
const frontendRoot = resolve(workspaceRoot, 'agent-fe/src');
const agentCoreRoot = resolve(workspaceRoot, 'agent-core/src');
const sourceExtensions = new Set(['.ts', '.tsx']);

const frontendDependencies = new Map([
  ['entry', new Set(['app'])],
  ['app', new Set(['router', 'utils'])],
  ['router', new Set(['components', 'pages'])],
  ['pages', new Set(['api', 'components', 'utils'])],
  ['components', new Set(['utils'])],
  ['api', new Set()],
  ['utils', new Set()]
]);

const agentCoreDependencies = new Map([
  ['entry', new Set(['orchestration', 'foundation'])],
  ['orchestration', new Set(['foundation'])],
  ['foundation', new Set()]
]);

const collectSourceFiles = (directory) => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
};

const getModuleSpecifiers = (filePath) => {
  const sourceText = readFileSync(filePath, 'utf8');
  const staticModulePattern = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;
  const dynamicModulePattern = /\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g;

  return [
    ...Array.from(sourceText.matchAll(staticModulePattern), (match) => match[1]),
    ...Array.from(sourceText.matchAll(dynamicModulePattern), (match) => match[1])
  ];
};

const getFrontendLayer = (filePath) => {
  const relativePath = relative(frontendRoot, filePath);

  if (relativePath === 'index.tsx') {
    return 'entry';
  }

  return relativePath.split(sep)[0];
};

const getFrontendTargetLayer = (sourceFile, specifier) => {
  if (specifier.startsWith('@/')) {
    return specifier.slice(2).split('/')[0];
  }

  if (!specifier.startsWith('.')) {
    return null;
  }

  const targetPath = resolve(dirname(sourceFile), specifier);
  const relativeTarget = relative(frontendRoot, targetPath);

  if (relativeTarget.startsWith('..')) {
    return null;
  }

  return relativeTarget.split(sep)[0];
};

const getAgentCoreLayer = (filePath) => {
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

const getAgentCoreTargetLayer = (sourceFile, specifier) => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  return getAgentCoreLayer(resolve(dirname(sourceFile), specifier));
};

const checkDependency = ({ sourceFile, sourceLayer, targetLayer, specifier, allowedDependencies, projectRoot }) => {
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
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Layer dependencies are valid.');
}
