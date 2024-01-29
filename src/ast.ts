import * as ts from 'typescript';

function extractClassNameFromJsx(node: ts.Node): { start: number; end: number; text: string } | null {
    if (ts.isJsxOpeningElement(node) && node.attributes) {
        for (const attribute of node.attributes.properties) {
            if (
                ts.isJsxAttribute(attribute) &&
                ts.isIdentifier(attribute.name) &&
                attribute.name.text === 'className' &&
                attribute.initializer
            ) {
                if (ts.isStringLiteral(attribute.initializer)) {
                    return { start: attribute.initializer.getStart(), end: attribute.initializer.getEnd(), text: attribute.initializer.text };
                } else if (ts.isJsxExpression(attribute.initializer)) {
                    // 处理 className 中的表达式（例如，className={condition ? 'class1' : 'class2'}）
                    return { start: attribute.initializer.getStart(), end: attribute.initializer.getEnd(), text: attribute.initializer.getText() };
                }
            }
        }
    }

    return null;
}

function traverseJsx(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const className = extractClassNameFromJsx(node);
        if (className !== null) {
            return className;
        }
    }

    ts.forEachChild(node, traverseJsx);
}

export function ast(code: string) {
    const sourceFile = ts.createSourceFile(
        '',
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JSX
    );

    traverseJsx(sourceFile);
}

