/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as ESTree from 'estree';

export type JupyterPluginKind = 'frontend' | 'service-manager';

/**
 * Gets plugin kind from a variable declaration type annotation.
 */
export function getJupyterPluginKind(
  node: ESTree.VariableDeclarator
): JupyterPluginKind | null {
  const id = node.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((id as any).typeAnnotation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typeAnnotation = (id as any).typeAnnotation;
    if (typeAnnotation.typeAnnotation) {
      const typeNode = typeAnnotation.typeAnnotation;
      if (typeNode.type === 'TSTypeReference' && typeNode.typeName) {
        if (typeNode.typeName.type === 'Identifier') {
          if (typeNode.typeName.name === 'JupyterFrontEndPlugin') {
            return 'frontend';
          }
          if (typeNode.typeName.name === 'ServiceManagerPlugin') {
            return 'service-manager';
          }
        }
      }
    }
  }
  return null;
}

/**
 * Extracts properties from an object expression
 */
export function getObjectProperties(
  obj: ESTree.ObjectExpression
): Map<string, ESTree.Property> {
  const props = new Map<string, ESTree.Property>();
  for (const prop of obj.properties) {
    if (prop.type === 'Property' && !prop.computed) {
      let keyName: string | null = null;
      if (prop.key.type === 'Identifier') {
        keyName = prop.key.name;
      } else if (
        prop.key.type === 'Literal' &&
        typeof prop.key.value === 'string'
      ) {
        keyName = prop.key.value;
      }
      if (keyName) {
        props.set(keyName, prop);
      }
    }
  }
  return props;
}

/**
 * Gets the plugin ID from an object expression
 */
export function getPluginId(obj: ESTree.ObjectExpression): string | null {
  for (const prop of obj.properties) {
    if (prop.type === 'Property') {
      let keyName: string | null = null;
      if (prop.key.type === 'Identifier') {
        keyName = prop.key.name;
      } else if (
        prop.key.type === 'Literal' &&
        typeof prop.key.value === 'string'
      ) {
        keyName = prop.key.value;
      }
      if (keyName === 'id' && prop.value.type === 'Literal') {
        const value = (prop.value as ESTree.Literal).value;
        if (typeof value === 'string') {
          return value;
        }
      }
    }
  }
  return null;
}

/**
 * Extracts element names from an array, including member expressions like JupyterFrontEnd.IPaths
 */
export function extractArrayElements(arrayExpr: ESTree.ArrayExpression): string[] {
  const names: string[] = [];

  for (const element of arrayExpr.elements) {
    if (element === null) continue;

    if (element.type === 'Identifier') {
      names.push(element.name);
    } else if (element.type === 'MemberExpression') {
      if (
        element.object.type === 'Identifier' &&
        element.property.type === 'Identifier'
      ) {
        names.push(`${element.object.name}.${element.property.name}`);
      }
    }
  }

  return names;
}
export function extractParameterType(param: ESTree.Identifier): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((param as any).typeAnnotation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotation = (param as any).typeAnnotation;
    if (annotation && annotation.typeAnnotation) {
      const typeNode = annotation.typeAnnotation;

      // Handle TSTypeReference (like JupyterFrontEnd.IPaths)
      if (typeNode.type === 'TSTypeReference' && typeNode.typeName) {
        return extractTypeName(typeNode.typeName);
      }

      if (typeNode.type === 'TSUnionType') {
        const types = typeNode.types;
        if (Array.isArray(types) && types.length > 0) {
          const nonNullType = types.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.type !== 'TSNullKeyword'
          );
          if (nonNullType && nonNullType.type === 'TSTypeReference') {
            return extractTypeName(nonNullType.typeName);
          }
        }
      }
    }
  }

  return null;
}

/**
 * Recursively extracts the full name from a TSTypeReference typeName node,
 * handling both simple Identifiers and qualified names (TSQualifiedName)
 * e.g. `IType` -> "IType", `JupyterFrontEnd.IPaths` -> "JupyterFrontEnd.IPaths"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTypeName(typeName: any): string | null {
  if (!typeName) return null;

  if (typeName.type === 'Identifier') {
    return typeName.name;
  }

  if (typeName.type === 'TSQualifiedName') {
    const left = extractTypeName(typeName.left);
    const right = typeName.right?.name;
    if (left && right) {
      return `${left}.${right}`;
    }
  }

  return null;
}
