import * as vscode from 'vscode';
import { transformClassToCSSModule, Options,transformCSSModuleToClass } from 'css-module-transform';

const transform = (classStr: string, isExpression: boolean, options?: Options) => {
	if (!isExpression) {
		return transformClassToCSSModule(classStr, options);
	}
	const cssModuleRegex = new RegExp(`\\b${options?.importName}\\.(\\w+)|${options?.importName}\\[["']?(\\w+)["']?\\]`, 'g');

	const res = [transformClassToCSSModule(classStr, options)];
	if(cssModuleRegex.test(classStr)) {
		res.push(transformCSSModuleToClass(classStr, options));
	}
	
	return res;
};


function getCurrentFileContent() {
	// 获取当前激活的编辑器
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const document = activeEditor.document;
		const fileContent = document.getText();
		return fileContent;
	} else {
		return null;
	}
}


export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('cssModuleTransform');

	// 注册悬停提供者
	let disposable = vscode.languages.registerHoverProvider(['javascriptreact', 'typescriptreact'], {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position, /<\w+\s+[^>]*?className=\{[^}]+\}[^>]*?/);
			
			if (range) {
				const word = document.getText(range);
				const [preview1,preview2]=transform(word, true, { importName: config.get('cssModuleImportName') });
				
				const params = { range: JSON.stringify(range), word, file: document.uri.path };
				// 创建悬停内容
				const contents = [new vscode.MarkdownString(`**transform className preview:** \`${preview1}\` ` + `  ` + `[替换](command:css-module-transform.transform?${encodeURIComponent(JSON.stringify(params))})`)];
				preview2&&contents.push(new vscode.MarkdownString(`**transform className preview:** \`${preview2}\` ` + `  ` + `[替换](command:css-module-transform.transform?${encodeURIComponent(JSON.stringify(params))})`));
				return new vscode.Hover(contents, range);
			}
		}
	});

	vscode.commands.registerCommand('css-module-transform.transform', async (props: { range: string, word: string, file: string }) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || (editor.document.languageId !== 'javascriptreact' && editor.document.languageId !== 'typescriptreact')) {
			vscode.window.showInformationMessage('Please open a javascript or typescript file');
			return;
		}
		// 正常调用的命令
		if (!props) {
			let content = getCurrentFileContent();
			const res = content && transform(content, false, { importName: config.get('cssModuleImportName') });
			editor.edit(editBuilder => {
				// 选择整个文档内容
				const entireRange = new vscode.Range(
					editor.document.positionAt(0),
					editor.document.positionAt(editor.document.getText().length)
				);
				// 替换为“Hello, World!”
				res && editBuilder.replace(entireRange, res);
			}).then(success => {
				if (success) {
					// 格式化保存文档
					vscode.commands.executeCommand('editor.action.formatDocument');
					editor.document.save();
				} else {
					vscode.window.showErrorMessage('format Error');
				}
			});
			return;
		}

		const _range = JSON.parse(props.range);
		const range = new vscode.Range(
			new vscode.Position(_range[0].line, _range[0].character),
			new vscode.Position(_range[1].line, _range[1].character)
		);

		if (!editor) {
			vscode.window.showInformationMessage('No editor is active');
			return;
		}
		const document = editor.document;
		const edit = new vscode.WorkspaceEdit();
		edit.replace(document.uri, range, transform(props.word, true, { importName: config.get('cssModuleImportName') }));
		await vscode.workspace.applyEdit(edit);
		await document.save();
	});

	context.subscriptions.push(disposable);
}
export function deactivate() { }
