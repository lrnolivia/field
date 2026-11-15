import * as t from '@babel/types';
import { BREAKPOINT_FILLS_ATTR } from '@/shared/managed-fill-breakpoints';
import { findAttribute, parseJSX, traverse } from '../parsing/ast-utils';
import { generate } from './generator-utils';

const READY = '__fieldFillReady';
const USE_STORE = 'useSyncExternalStore';

function readyDeclaration() {
  return t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier(READY), t.callExpression(t.memberExpression(t.identifier('React'), t.identifier(USE_STORE)), [
      t.arrowFunctionExpression([], t.arrowFunctionExpression([], t.blockStatement([]))),
      t.arrowFunctionExpression([], t.booleanLiteral(true)),
      t.arrowFunctionExpression([], t.booleanLiteral(false)),
    ])),
  ]);
}

function isReadyDeclaration(node: t.Statement): boolean {
  if (!t.isVariableDeclaration(node) || node.declarations.length !== 1) return false;
  const [declaration] = node.declarations;
  return t.isIdentifier(declaration.id, { name: READY })
    && t.isCallExpression(declaration.init)
    && t.isMemberExpression(declaration.init.callee, { computed: false })
    && t.isIdentifier(declaration.init.callee.object, { name: 'React' })
    && t.isIdentifier(declaration.init.callee.property, { name: USE_STORE });
}

/** The server and hydration render no responsive media layer. A client-only
 * Preview can render the active fill immediately. Keep the underlying media
 * queries as-is, since the same gates can also drive mount-time Motion props. */
export function protectResponsiveFillHydration(ast: t.File): boolean {
  const owners = new Set<t.BlockStatement>();
  let changed = false;
  traverse(ast, {
    JSXExpressionContainer(path) {
      const parent = path.parentPath;
      const { expression } = path.node;
      if (!parent.isJSXElement() || !findAttribute(parent.node.openingElement, BREAKPOINT_FILLS_ATTR)) return;
      if (!t.isLogicalExpression(expression, { operator: '&&' }) || !t.isJSXElement(expression.right)) return;
      const layer = expression.right.openingElement;
      const shader = findAttribute(layer, 'data-field-shader-layer');
      if (!findAttribute(layer, 'data-bg-video') && !t.isStringLiteral(shader?.value, { value: 'true' })) return;

      const ready = t.isLogicalExpression(expression.left, { operator: '&&' })
        && t.isIdentifier(expression.left.left, { name: READY });
      const condition = ready && t.isLogicalExpression(expression.left) ? expression.left.right : expression.left;
      if (!t.isConditionalExpression(condition) || !t.isIdentifier(condition.test) || !/^__mq\d+$/.test(condition.test.name)) return;
      const gate = path.scope.getBinding(condition.test.name)?.path;
      if (!gate?.isVariableDeclarator() || !t.isCallExpression(gate.node.init)
        || !t.isIdentifier(gate.node.init.callee, { name: 'useMediaQuery' })) return;
      const body = gate.getFunctionParent()?.node.body;
      if (!t.isBlockStatement(body)) return;

      owners.add(body);
      if (!ready) {
        expression.left = t.logicalExpression('&&', t.identifier(READY), condition);
        changed = true;
      }
    },
    Function: {
      exit(path) {
        const { body } = path.node;
        if (!t.isBlockStatement(body)) return;
        const existing = body.body.findIndex(isReadyDeclaration);
        if (owners.has(body) && existing < 0) {
          body.body.unshift(readyDeclaration());
          changed = true;
        } else if (!owners.has(body) && existing >= 0) {
          body.body.splice(existing, 1);
          changed = true;
        }
      },
    },
  });

  if (owners.size > 0) {
    const reactImports = ast.program.body.filter((node): node is t.ImportDeclaration =>
      t.isImportDeclaration(node) && node.source.value === 'react' && node.importKind !== 'type');
    if (!reactImports.some(node => node.specifiers.some(specifier => specifier.local.name === 'React'))) {
      const defaultSpecifier = t.importDefaultSpecifier(t.identifier('React'));
      const namedImport = reactImports.find(node => node.specifiers.every(specifier => t.isImportSpecifier(specifier)));
      if (namedImport) namedImport.specifiers.unshift(defaultSpecifier);
      else ast.program.body.unshift(t.importDeclaration([defaultSpecifier], t.stringLiteral('react')));
      changed = true;
    }
  }

  return changed;
}

export function migrateResponsiveFillHydrationFiles(files: Map<string, string>): void {
  for (const [path, source] of files) {
    if (!/\.[jt]sx$/.test(path) || !source.includes(BREAKPOINT_FILLS_ATTR)) continue;
    const ast = parseJSX(source);
    if (ast && protectResponsiveFillHydration(ast)) {
      files.set(path, generate(ast, { retainLines: true }, source).code);
    }
  }
}
