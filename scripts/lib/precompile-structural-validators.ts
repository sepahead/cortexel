/** Build-only projection of the exact Ajv standalone structural gate. */
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import ts from 'typescript';

interface RuntimeHelper {
  readonly binding: string;
  readonly specifier: string;
}

// These are the two pure helpers emitted by the reviewed Ajv 8 compiler.
// Every other require stays a build failure, including a new compiler dependency.
const RUNTIME_HELPERS: Readonly<Record<string, RuntimeHelper>> = Object.freeze({
  'ajv/dist/runtime/ucs2length': {
    binding: 'standaloneUcs2Length',
    specifier: 'ajv/dist/runtime/ucs2length.js',
  },
  'ajv/dist/runtime/equal': {
    binding: 'standaloneEqual',
    specifier: 'ajv/dist/runtime/equal.js',
  },
});

/**
 * Ajv emits CommonJS helper expressions even with ESM exports. Replace only exact
 * helper expression nodes. Schema strings are never searched or rewritten.
 * This is a closed compiler-output projection, not a JavaScript security sandbox.
 */
export function projectStandaloneModule(source: string): string {
  const file = ts.createSourceFile('standalone.js', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  if ((file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length > 0) {
    throw new Error('Ajv standalone output is not valid JavaScript');
  }
  const replacements: { start: number; end: number; value: string }[] = [];
  const helpers = new Map<string, RuntimeHelper>();

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      const argument = node.arguments[0];
      const parent = node.parent;
      const helper = argument && ts.isStringLiteral(argument) && Object.hasOwn(RUNTIME_HELPERS, argument.text)
        ? RUNTIME_HELPERS[argument.text]
        : undefined;
      if (node.arguments.length !== 1 || !helper || !ts.isPropertyAccessExpression(parent) ||
        parent.expression !== node || parent.name.text !== 'default') {
        throw new Error('Ajv standalone output contains an unreviewed runtime require');
      }
      helpers.set(helper.specifier, helper);
      replacements.push({ start: parent.getStart(file), end: parent.getEnd(), value: helper.binding });
    } else if ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      (ts.isIdentifier(node.expression) && ['eval', 'Function'].includes(node.expression.text) ||
        ts.isPropertyAccessExpression(node.expression) && ['eval', 'Function'].includes(node.expression.name.text) ||
        node.expression.kind === ts.SyntaxKind.ImportKeyword)) {
      throw new Error('Ajv standalone output contains runtime code generation or a dynamic import');
    } else if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node) ||
      ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      throw new Error('Ajv standalone output contains an unreviewed module dependency');
    }
    ts.forEachChild(node, visit);
  }
  visit(file);

  let projected = source;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    projected = projected.slice(0, replacement.start) + replacement.value + projected.slice(replacement.end);
  }
  const imports = [...helpers.values()].sort((left, right) =>
    left.specifier < right.specifier ? -1 : left.specifier > right.specifier ? 1 : 0,
  ).map((helper) =>
    // Native Node ESM exposes this CJS helper as {default: function}; bundlers
    // expose its function directly. Both select the same installed helper bytes.
    `import ${helper.binding}Module from ${JSON.stringify(helper.specifier)};\n` +
      `const ${helper.binding} = typeof ${helper.binding}Module === 'function'\n` +
      `  ? ${helper.binding}Module : ${helper.binding}Module.default;\n`,
  ).join('');
  return imports + projected;
}

export interface StructuralSchemaResource {
  readonly path: string;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly exportName: string;
}

export function precompileStructuralValidators(resources: readonly StructuralSchemaResource[]): string {
  const instance = new Ajv2020({
    strict: true,
    allErrors: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
    allowUnionTypes: true,
    validateFormats: false,
    strictRequired: false,
    strictTypes: false,
    code: { source: true, esm: true, lines: true },
  });
  const paths = new Set<string>();
  const exports: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const resource of resources) {
    if (paths.has(resource.path) || Object.hasOwn(exports, resource.exportName) ||
      !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(resource.exportName) || typeof resource.schema.$id !== 'string') {
      throw new Error('structural validator resources require unique paths, exports, and explicit schema identities');
    }
    paths.add(resource.path);
    instance.addSchema(resource.schema);
    exports[resource.exportName] = resource.schema.$id;
  }
  return projectStandaloneModule(standaloneCode(instance, exports));
}
