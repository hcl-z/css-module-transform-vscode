import * as vscode from 'vscode';
export function getCurrentFileContent(editor: vscode.TextEditor, range?: [number, number]) {
    const _range =
        range ? new vscode.Range(new vscode.Position(range[0], 0), new vscode.Position(range[1], 0)) : undefined;

    // 获取当前激活的编辑器
    const document = editor.document;
    const fileContent = document.getText(_range);
    return fileContent;
}

export function getMultilineClassName(document: vscode.TextDocument, position: vscode.Position): string | null {
    const lineText = document.lineAt(position.line).text;
    const match = lineText.match(/className\s*=\s*(.*)/);

    if (match) {
        let classNameValue = match[1].trim();

        // 从下一行开始查找
        let currentLine = position.line + 1;
        while (currentLine < document.lineCount) {
            const currentLineText = document.lineAt(currentLine).text;
            classNameValue += currentLineText.trim();

            // 如果当前行没有闭合的引号（'或"），则继续查找下一行
            if (!/['"]\s*$/.test(currentLineText)) {
                currentLine++;
            } else {
                break;
            }
        }

        return classNameValue;
    }

    return null;
}

export function getMultiLineContentAtCursor(currentLine: number, regex: RegExp, maxLines: number) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let contentToCheck = '';

    let count = 0;

    for (let i = 0; i < maxLines; i++) {
        if (currentLine + i < editor.document.lineCount) {
            // 拼接行内容
            contentToCheck += editor.document.lineAt(currentLine + i).text;

            // 检查正则表达式
            if (regex.test(contentToCheck)) {
                return contentToCheck.match(regex)?.[0];
            }
        } else {
            break;
        }
    }
    return null;
}


export function getJSXTagRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range | null {
    // 从当前行向上查找 JSX 开始标签
    const tagStartLine = findJSXTagStartLine(document, position);
    const tagEndLine = findJSXTagEndLine(document, tagStartLine);

    if (tagStartLine !== -1 && tagEndLine !== -1) {
        const tagStartText = document.lineAt(tagStartLine).text;
        const tagEndText = document.lineAt(tagEndLine).text;
        const start = new vscode.Position(tagStartLine, tagStartText.indexOf('<'));
        const end = new vscode.Position(tagEndLine, tagEndText.indexOf('>') + 1);
        return new vscode.Range(start, end);
    }

    return null;
}

function findJSXTagStartLine(document: vscode.TextDocument, position: vscode.Position): number {
    let currentLine = position.line;

    while (currentLine >= 0) {
        const lineText = document.lineAt(currentLine).text;

        if (/<\s*\w+/.test(lineText)) {
            return currentLine;
        }

        currentLine--;
    }

    return -1;
}

function findJSXTagEndLine(document: vscode.TextDocument, startLine: number): number {
    let currentLine = startLine;

    while (currentLine < document.lineCount) {
        const lineText = document.lineAt(currentLine).text;

        // 匹配两种情况的结束标签
        if (/.*>|\s*\/>/.test(lineText)) {
            return currentLine;
        }

        currentLine++;
    }

    return -1;
}

export function getClassSyntaxType(className: string, importName: string) {
    console.log(importName);
    const classSyntaxRegExp = new RegExp(`\\{.*${importName}\\..*\\}|\\{.*${importName}\\[.*\\].*\\}`);
    if (classSyntaxRegExp.test(className)) {
        return 'cssModule';
    } else {
        return 'className';
    }
}

// export const classSyntaxRegExp = /\{.* style\..*}| style\[.*\]/
export const classRegExp = /className\s*=(\s*(?:{[^}]*}|'[^']*'|"[^"]*"|[\w-]+))/;
export const tagRegExp = /<\w+\s+[^>]*?className\s*=\s*(["'](?:\\.|[^"'])*["']|\{(?:\\.|[^}])*\})[^>]*?>/;