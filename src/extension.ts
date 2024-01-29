import { Options, transformCSSModuleToClass, transformClassToCSSModule } from 'css-module-transform';
import * as vscode from 'vscode';
import { classRegExp, getClassSyntaxType, getCurrentFileContent, getJSXTagRange, getMultilineClassName } from './util';
import { ast } from './ast';


const transform = (classStr: string, isExpression: boolean, options?: Options) => {
	const wrapper = `
		<div ${classStr}></div>
	`;
	const res = [transformClassToCSSModule(wrapper, options), transformCSSModuleToClass(wrapper, options)];
	return res;
};

const editContent = (content: string, range?: vscode.Range) => {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	editor.edit(editBuilder => {
		// 选择整个文档内容
		const entireRange = range || new vscode.Range(
			editor.document.positionAt(0),
			editor.document.positionAt(editor.document.getText().length)
		);
		// const start = new vscode.Position(2, 5); // 行号从 0 开始
		// const end = new vscode.Position(4, 8);

		// const _range = new vscode.Range(start, end);
		editBuilder.replace(entireRange, content);
	}).then(success => {
		if (success) {
			// 格式化保存文档
			// vscode.commands.executeCommand('editor.action.formatDocument');
			editor.document.save();
		} else {
			vscode.window.showErrorMessage('format Error');
		}
	}, err => {
		console.log(err);
	});
};

const devLog = (...args: any) => {
	console.log('CSS Module Transform===', ...args);
};

export function activate(context: vscode.ExtensionContext) {

	const config = vscode.workspace.getConfiguration('classTransform');

	let cssModuleCode = '';
	let classNameCode = '';

	const getConfig = () => {
		return {
			importName: config.get<string>('importName'),
			supportClassnames: config.get<boolean>('supportClassnames'),
			ignorePrefix: config.get<string[]>('ignorePrefix'),
			exactMatch: config.get<boolean>('exactMatch'),
		};
	};

	const transformCommandToClassCommand = vscode.commands.registerCommand('css-module-transform.transformToClass', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || (editor.document.languageId !== 'javascriptreact' && editor.document.languageId !== 'typescriptreact')) {
			vscode.window.showInformationMessage('Please open a javascript or typescript file');
			return;
		}
		let content = getCurrentFileContent(editor);
		const res = transformCSSModuleToClass(content, getConfig());
		// editContent(res);
	});

	const transformToCssModuleCommand = vscode.commands.registerCommand('css-module-transform.transformToCssModule', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || (editor.document.languageId !== 'javascriptreact' && editor.document.languageId !== 'typescriptreact')) {
			vscode.window.showInformationMessage('Please open a javascript or typescript file');
			return;
		}
		let content = getCurrentFileContent(editor);
		const res = transformClassToCSSModule(content, getConfig());
		// editContent(res);
	});

	const codeTransformCommand = vscode.commands.registerCommand('class-transform.codeTransform', async (props) => {
		const range = props.range;
		const type = props.type;
		const _range = new vscode.Range(new vscode.Position(range[0].line, range[0].character), new vscode.Position(range[1].line, range[1].character));
		editContent(type === 'cssModule' ? cssModuleCode : classNameCode, _range);

	});

	const generateCommandUri = (params?: Record<string, any>) => {
		return vscode.Uri.parse(`command:class-transform.codeTransform?${encodeURIComponent(JSON.stringify(params))}`);
	};

	const hoverProvider = vscode.languages.registerHoverProvider(['javascriptreact', 'typescriptreact'], {
		provideHover(document, position) {
			let hoverLine = position.line;
			let currentLine = hoverLine;
			let source = document.lineAt(currentLine).text;
			const startStr = /className\s*=\s*(['"{])/.exec(source);
			if (!startStr) {
				return;
			}
			const index = startStr?.index;

			if (startStr[1] === '"' || startStr[1] === "'") {
				while (true) {
					const match = source.match(classRegExp);
					if (match) {
						devLog(hoverLine, currentLine);

						const transform = transformClassToCSSModule(match?.[1], { onlyClassName: true });

						devLog(transform);

						if (transform) {
							return new vscode.Hover(transform?.replaceAll('\n', '').trim());
						}
					}
					// 如果当前行没有匹配到，则尝试增加下一行的内容 
					if (++currentLine >= document.lineCount) {
						break; // 已经到达文件末尾，跳出循环 }
					}
					source += '\n' + document.lineAt(currentLine).text;
				}
			} else {
				// 遍历匹配成对的{}
				while (true) {
					let stack = [];
					let start = false;
					let startIndex = 0;
					let endIndex = 0;
					for (let i = index; i < source.length; i++) {
						if (source[i] === '{') {
							stack.push(source[i]);
							if (!start) {
								start = true;
								startIndex = i;
							}
						} else if (source[i] === '}') {
							stack.pop();
						}
						if (start && stack.length === 0) {
							devLog(hoverLine, currentLine);
							const transform = transformClassToCSSModule(source.substring(startIndex, i + 1), { onlyClassName: true });
							devLog(transform);

							return transform ? new vscode.Hover(transform.replaceAll('\n', '').trim()) : null;
						}
					}

					// 如果当前行没有匹配到，则尝试增加下一行的内容 
					if (++currentLine >= document.lineCount) {
						break; // 已经到达文件末尾，跳出循环 
					}
					source += '\n' + document.lineAt(currentLine).text;
				}
			}

			return null;
		}
		// 	// 获取鼠标悬停位置所在的 JSX 标签范围
		// 	const tagRange = getJSXTagRange(document, position);

		// 	console.log(tagRange);
		// 	if (tagRange) {
		// 		// 获取整个 JSX 标签的文本
		// 		const tagText = document.getText(tagRange);

		// 		const classNameText = ast(tagText);

		// 		if (!classNameText) {
		// 			return null;
		// 		}
		// 		const type = getClassSyntaxType(classNameText.text, config.get('importName') || 'style');

		// 		const wrapper = `<div className=${classNameText.text}> </div>`;


		// 		const cssModulePreview = transformClassToCSSModule(wrapper, getConfig());
		// 		const classNamePreview = transformCSSModuleToClass(wrapper, getConfig());

		// 		classNameCode = classNamePreview;
		// 		cssModuleCode = cssModulePreview;

		// 		const params = { range: tagRange };

		// 		let contents: vscode.MarkdownString[] = [];

		// 		if (type === 'className') {
		// 			contents = [
		// 				new vscode.MarkdownString(`**cssModule preview:** \`${cssModulePreview.match(classRegExp)?.[0]}\` ` + `  ` + `[替换](${generateCommandUri({ ...params, type: 'cssModule' })})`),
		// 			];
		// 		} else {
		// 			contents = [
		// 				new vscode.MarkdownString(`**className preview:** \`${classNamePreview.match(classRegExp)?.[0]}\` ` + `  ` + `[替换](${generateCommandUri({ ...params, type: 'className' })})`),
		// 				new vscode.MarkdownString(`**cssModule preview:** \`${cssModulePreview.match(classRegExp)?.[0]}\` ` + `  ` + `[替换](${generateCommandUri({ ...params, type: 'cssModule' })})`),
		// 			];
		// 		}
		// 		contents.forEach(item => item.isTrusted = true);
		// 		return new vscode.Hover(contents);
		// 	}

		// 	return null;
		// }
	});

	context.subscriptions.push(hoverProvider);




	// 注册悬停提供者
	// let disposable = vscode.languages.registerHoverProvider(['javascriptreact', 'typescriptreact'], {
	// 	provideHover(document, position, token) {
	// 		// const range = document.getWordRangeAtPosition(position, /className\s*=\s*(?:{[^}]*}|'[^']*'|"[^"]*"|[\w-]+)/);

	// 		// if (range) {
	// 		// 	const word = document.getText(range)
	// 		// 	// const word = getMultiLineContentAtCursor(position.line, classRegExp, 5);

	// 		// 	if (!word) {
	// 		// 		return;
	// 		// 	}

	// 		// 	const [preview1, preview2] = transform(word, true, { importName: config.get('cssModuleImportName') });

	// 		// 	const params = { range: JSON.stringify(range), word, file: document.uri.path };
	// 		// 	// 创建悬停内容
	// 		// 	const commentCommandUri = vscode.Uri.parse(`command:css-module-transform.transform?${encodeURIComponent(JSON.stringify(params))}`);
	// 		// 	const contents = [
	// 		// 		new vscode.MarkdownString(`**cssModule preview:** \`${preview1}\` ` + `  ` + `[替换](${commentCommandUri})`),
	// 		// 		new vscode.MarkdownString(`**className preview:** \`${preview2}\` ` + `  ` + `[替换](${commentCommandUri})`)
	// 		// 	];
	// 		// 	contents.forEach(item => item.isTrusted = true);
	// 		// 	return new vscode.Hover(contents, range);
	// 		// }
	// 		// 获取鼠标悬停位置的文本
	// 		const tagRange = getJSXTagRange(document, position);

	// 		if (tagRange) {
	// 			// 获取整个 JSX 标签的文本
	// 			const tagText = document.getText(tagRange);
	// 			return new vscode.Hover(tagText);
	// 		}

	// 		return null;
	// 	}
	// });



	context.subscriptions.push(...[transformCommandToClassCommand, transformToCssModuleCommand, codeTransformCommand]);
}
export function deactivate() { }
