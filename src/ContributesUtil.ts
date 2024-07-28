import path from "path";
import { IconTheme, IconsAssociation } from "./IconTheme";
import * as vscode from "vscode";
import { ManifestCommand, ManifestMenu, WhenClause, WhenClauseExpr } from "./MenuDefinition";
import { ContextExpr } from "./ContextExpr";

export async function loadContributesMenu(extension: vscode.Extension<any>) {
  const commands: Record<string, ManifestCommand> = extension.packageJSON.commands;
  const contexts: ManifestMenu[] = extension.packageJSON.menu?.["view/item/context"];
  if (!contexts) {
    return {};
  }
  const menu = [];
  for (const context of contexts) {
    const command = commands[context.command];
    menu.push({
      command: context.command,
      title: command.title,
      icon: command.icon,
      when: parseWhenClause(context.when),
    });
  }
  return {
    menu,
  };
}

export async function loadIconTheme(exts: readonly vscode.Extension<any>[], iconThemeId?: string | undefined) {
  let activeIconTheme: { uri: vscode.Uri; path: string } | undefined;
  for (const ext of exts) {
    const iconThemes = ext.packageJSON?.contributes?.iconThemes;
    for (const iconTheme of iconThemes ?? []) {
      if (iconTheme?.id === iconThemeId) {
        activeIconTheme = {
          uri: ext.extensionUri,
          path: iconTheme.path,
        };
      }
    }
  }
  if (!activeIconTheme) {
    return undefined;
  }
  const iconThemeJsonUri = vscode.Uri.joinPath(activeIconTheme.uri, activeIconTheme.path);
  const iconThemeJson = await vscode.workspace.fs.readFile(iconThemeJsonUri);
  const iconThemeData: IconTheme = JSON.parse(new TextDecoder().decode(iconThemeJson));
  const uri = vscode.Uri.joinPath(activeIconTheme.uri, path.dirname(activeIconTheme.path));
  const styleContent = await toStyleSheet(iconThemeData, uri);

  return {
    styleContent,
    uri,
  };
}

export async function toStyleSheet(iconThemeDocument: IconTheme, iconThemeBaseUri: vscode.Uri) {
  // XXX from https://github.com/microsoft/vscode/blob/14addc7735fcb99fd42c35e5d7e8e984611132b8/src/vs/workbench/services/themes/browser/fileIconThemeData.ts
  //
  const result = {
    content: "",
    hasFileIcons: false,
    hasFolderIcons: false,
    hidesExplorerArrows: !!iconThemeDocument.hidesExplorerArrows,
  };

  let hasSpecificFileIcons = false;

  if (!iconThemeDocument.iconDefinitions) {
    return result;
  }
  const selectorByDefinitionId: { [def: string]: string[] } = {};
  const coveredLanguages: { [languageId: string]: boolean } = {};

  const iconThemeDocumentLocationDirname = iconThemeBaseUri;
  function resolvePath(path: string) {
    return vscode.Uri.joinPath(iconThemeDocumentLocationDirname, path);
  }

  function collectSelectors(associations: IconsAssociation | undefined, baseThemeClassName?: string) {
    function addSelector(selector: string, defId: string) {
      if (defId) {
        let list = selectorByDefinitionId[defId];
        if (!list) {
          list = selectorByDefinitionId[defId] = [];
        }
        list.push(selector);
      }
    }

    if (associations) {
      let qualifier = ".show-file-icons";
      if (baseThemeClassName) {
        qualifier = baseThemeClassName + " " + qualifier;
      }

      const expanded = ".monaco-tl-twistie.collapsible:not(.collapsed) + .monaco-tl-contents";

      if (associations.folder) {
        addSelector(`${qualifier} .folder-icon::before`, associations.folder);
        result.hasFolderIcons = true;
      }

      if (associations.folderExpanded) {
        addSelector(`${qualifier} ${expanded} .folder-icon::before`, associations.folderExpanded);
        result.hasFolderIcons = true;
      }

      const rootFolder = associations.rootFolder || associations.folder;
      const rootFolderExpanded = associations.rootFolderExpanded || associations.folderExpanded;

      if (rootFolder) {
        addSelector(`${qualifier} .rootfolder-icon::before`, rootFolder);
        result.hasFolderIcons = true;
      }

      if (rootFolderExpanded) {
        addSelector(`${qualifier} ${expanded} .rootfolder-icon::before`, rootFolderExpanded);
        result.hasFolderIcons = true;
      }

      if (associations.file) {
        addSelector(`${qualifier} .file-icon::before`, associations.file);
        result.hasFileIcons = true;
      }

      const folderNames = associations.folderNames;
      if (folderNames) {
        for (const key in folderNames) {
          const selectors: string[] = [];
          const name = handleParentFolder(key.toLowerCase(), selectors);
          selectors.push(`.${escapeCSS(name)}-name-folder-icon`);
          addSelector(`${qualifier} ${selectors.join("")}.folder-icon::before`, folderNames[key]);
          result.hasFolderIcons = true;
        }
      }
      const folderNamesExpanded = associations.folderNamesExpanded;
      if (folderNamesExpanded) {
        for (const key in folderNamesExpanded) {
          const selectors: string[] = [];
          const name = handleParentFolder(key.toLowerCase(), selectors);
          selectors.push(`.${escapeCSS(name)}-name-folder-icon`);
          addSelector(`${qualifier} ${expanded} ${selectors.join("")}.folder-icon::before`, folderNamesExpanded[key]);
          result.hasFolderIcons = true;
        }
      }

      const rootFolderNames = associations.rootFolderNames;
      if (rootFolderNames) {
        for (const key in rootFolderNames) {
          const name = key.toLowerCase();
          addSelector(`${qualifier} .${escapeCSS(name)}-root-name-folder-icon.rootfolder-icon::before`, rootFolderNames[key]);
          result.hasFolderIcons = true;
        }
      }
      const rootFolderNamesExpanded = associations.rootFolderNamesExpanded;
      if (rootFolderNamesExpanded) {
        for (const key in rootFolderNamesExpanded) {
          const name = key.toLowerCase();
          addSelector(`${qualifier} ${expanded} .${escapeCSS(name)}-root-name-folder-icon.rootfolder-icon::before`, rootFolderNamesExpanded[key]);
          result.hasFolderIcons = true;
        }
      }

      const languageIds = associations.languageIds;
      if (languageIds) {
        if (!languageIds.jsonc && languageIds.json) {
          languageIds.jsonc = languageIds.json;
        }
        for (const languageId in languageIds) {
          addSelector(`${qualifier} .${escapeCSS(languageId)}-lang-file-icon.file-icon::before`, languageIds[languageId]);
          result.hasFileIcons = true;
          hasSpecificFileIcons = true;
          coveredLanguages[languageId] = true;
        }
      }
      const fileExtensions = associations.fileExtensions;
      if (fileExtensions) {
        for (const key in fileExtensions) {
          const selectors: string[] = [];
          const name = handleParentFolder(key.toLowerCase(), selectors);
          const segments = name.split(".");
          if (segments.length) {
            for (let i = 0; i < segments.length; i++) {
              selectors.push(`.${escapeCSS(segments.slice(i).join("."))}-ext-file-icon`);
            }
            selectors.push(".ext-file-icon"); // extra segment to increase file-ext score
          }
          addSelector(`${qualifier} ${selectors.join("")}.file-icon::before`, fileExtensions[key]);
          result.hasFileIcons = true;
          hasSpecificFileIcons = true;
        }
      }
      const fileNames = associations.fileNames;
      if (fileNames) {
        for (const key in fileNames) {
          const selectors: string[] = [];
          const fileName = handleParentFolder(key.toLowerCase(), selectors);
          selectors.push(`.${escapeCSS(fileName)}-name-file-icon`);
          selectors.push(".name-file-icon"); // extra segment to increase file-name score
          const segments = fileName.split(".");
          if (segments.length) {
            for (let i = 1; i < segments.length; i++) {
              selectors.push(`.${escapeCSS(segments.slice(i).join("."))}-ext-file-icon`);
            }
            selectors.push(".ext-file-icon"); // extra segment to increase file-ext score
          }
          addSelector(`${qualifier} ${selectors.join("")}.file-icon::before`, fileNames[key]);
          result.hasFileIcons = true;
          hasSpecificFileIcons = true;
        }
      }
    }
  }
  collectSelectors(iconThemeDocument);
  collectSelectors(iconThemeDocument.light, ".vs");
  collectSelectors(iconThemeDocument.highContrast, ".hc-black");
  collectSelectors(iconThemeDocument.highContrast, ".hc-light");

  if (!result.hasFileIcons && !result.hasFolderIcons) {
    return result;
  }

  const showLanguageModeIcons = iconThemeDocument.showLanguageModeIcons === true || (hasSpecificFileIcons && iconThemeDocument.showLanguageModeIcons !== false);

  const cssRules: string[] = [];

  const fonts = iconThemeDocument.fonts;
  const fontSizes = new Map<string, string>();
  if (Array.isArray(fonts)) {
    const defaultFontSize = fonts[0].size || "150%";
    fonts.forEach((font) => {
      const src = font.src.map((l) => `${asCSSUrl(resolvePath(l.path))} format('${l.format}')`).join(", ");
      cssRules.push(`@font-face { src: ${src}; font-family: '${font.id}'; font-weight: ${font.weight}; font-style: ${font.style}; font-display: block; }`);
      if (font.size !== undefined && font.size !== defaultFontSize) {
        fontSizes.set(font.id, font.size);
      }
    });
    cssRules.push(
      `.show-file-icons .file-icon::before, .show-file-icons .folder-icon::before, .show-file-icons .rootfolder-icon::before { font-family: '${fonts[0].id}'; font-size: ${defaultFontSize}; }`
    );
  }

  for (const defId in selectorByDefinitionId) {
    const selectors = selectorByDefinitionId[defId];
    const definition = iconThemeDocument.iconDefinitions[defId];
    if (definition) {
      if (definition.iconPath) {
        cssRules.push(`${selectors.join(", ")} { content: ' '; background-image: ${asCSSUrl(resolvePath(definition.iconPath))}; }`);
      } else if (definition.fontCharacter || definition.fontColor) {
        const body = [];
        if (definition.fontColor) {
          body.push(`color: ${definition.fontColor};`);
        }
        if (definition.fontCharacter) {
          body.push(`content: '${definition.fontCharacter}';`);
        }
        const fontSize = definition.fontSize ?? (definition.fontId ? fontSizes.get(definition.fontId) : undefined);
        if (fontSize) {
          body.push(`font-size: ${fontSize};`);
        }
        if (definition.fontId) {
          body.push(`font-family: ${definition.fontId};`);
        }
        if (showLanguageModeIcons) {
          body.push(`background-image: unset;`); // potentially set by the language default
        }
        cssRules.push(`${selectors.join(", ")} { ${body.join(" ")} }`);
      }
    }
  }

  if (showLanguageModeIcons) {
    for (const languageId of await vscode.languages.getLanguages()) {
      if (!coveredLanguages[languageId]) {
        // XXX can't reimplement
        /*
					const icon = this.languageService.getIcon(languageId);
					if (icon) {
						const selector = `.show-file-icons .${escapeCSS(languageId)}-lang-file-icon.file-icon::before`;
						cssRules.push(`${selector} { content: ' '; background-image: ${asCSSUrl(icon.dark)}; }`);
						cssRules.push(`.vs ${selector} { content: ' '; background-image: ${asCSSUrl(icon.light)}; }`);
					}
          */
      }
    }
  }

  result.content = cssRules.join("\n");
  return result;
}

export function asCSSUrl(uri: vscode.Uri | null | undefined): string {
  if (!uri) {
    return `url('')`;
  }
  return `url('${uri.toString(true).replace(/'/g, "%27")}')`;
}

function handleParentFolder(key: string, selectors: string[]): string {
  const lastIndexOfSlash = key.lastIndexOf("/");
  if (lastIndexOfSlash >= 0) {
    const parentFolder = key.substring(0, lastIndexOfSlash);
    selectors.push(`.${escapeCSS(parentFolder)}-name-dir-icon`);
    return key.substring(lastIndexOfSlash + 1);
  }
  return key;
}

function escapeCSS(str: string) {
  str = str.replace(/[\x11\x12\x14\x15\x40]/g, "/"); // HTML class names can not contain certain whitespace characters, use / instead, which doesn't exist in file names.
  return cssEscape(str);
}

function cssEscape(value: any) {
  if (arguments.length == 0) {
    throw new TypeError("`CSS.escape` requires an argument.");
  }
  var string = String(value);
  var length = string.length;
  var index = -1;
  var codeUnit;
  var result = "";
  var firstCodeUnit = string.charCodeAt(0);

  if (
    // If the character is the first character and is a `-` (U+002D), and
    // there is no second character, […]
    length == 1 &&
    firstCodeUnit == 0x002d
  ) {
    return "\\" + string;
  }

  while (++index < length) {
    codeUnit = string.charCodeAt(index);
    // Note: there’s no need to special-case astral symbols, surrogate
    // pairs, or lone surrogates.

    // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
    // (U+FFFD).
    if (codeUnit == 0x0000) {
      result += "\uFFFD";
      continue;
    }

    if (
      // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
      // U+007F, […]
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
      codeUnit == 0x007f ||
      // If the character is the first character and is in the range [0-9]
      // (U+0030 to U+0039), […]
      (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      // If the character is the second character and is in the range [0-9]
      // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
      (index == 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit == 0x002d)
    ) {
      // https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
      result += "\\" + codeUnit.toString(16) + " ";
      continue;
    }

    // If the character is not handled by one of the above rules and is
    // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
    // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
    // U+005A), or [a-z] (U+0061 to U+007A), […]
    if (
      codeUnit >= 0x0080 ||
      codeUnit == 0x002d ||
      codeUnit == 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      // the character itself
      result += string.charAt(index);
      continue;
    }

    // Otherwise, the escaped character.
    // https://drafts.csswg.org/cssom/#escape-a-character
    result += "\\" + string.charAt(index);
  }
  return result;
}

export async function resolveIconClasses(treeItem: vscode.TreeItem): Promise<string> {
  // from https://github.com/microsoft/vscode/blob/14addc7735fcb99fd42c35e5d7e8e984611132b8/src/vs/editor/common/services/getIconClasses.ts#L17
  const fileIconDirectoryRegex = /(?:\/|^)(?:([^\/]+)\/)?([^\/]+)$/;
  function isThemeColor(obj: any): obj is vscode.ThemeColor {
    return obj && typeof obj === "object" && typeof (<any>obj).id === "string";
  }
  function isThemeIcon(obj: any): obj is vscode.ThemeIcon {
    return obj && typeof obj === "object" && typeof (<vscode.ThemeIcon>obj).id === "string" && (typeof (<vscode.ThemeIcon>obj).color === "undefined" || isThemeColor((<vscode.ThemeIcon>obj).color));
  }
  function isUri(thing: any): thing is vscode.Uri {
    if (thing instanceof vscode.Uri) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return (
      typeof (<vscode.Uri>thing).authority === "string" &&
      typeof (<vscode.Uri>thing).fragment === "string" &&
      typeof (<vscode.Uri>thing).path === "string" &&
      typeof (<vscode.Uri>thing).query === "string" &&
      typeof (<vscode.Uri>thing).scheme === "string" &&
      typeof (<vscode.Uri>thing).fsPath === "string" &&
      typeof (<vscode.Uri>thing).with === "function" &&
      typeof (<vscode.Uri>thing).toString === "function"
    );
  }
  // maybe maskAsciiCC.
  function cssEscape(str: string) {
    return str.replace(/[\x11\x12\x14\x15\x40]/g, "/"); // HTML class names can not contain certain whitespace characters, use / instead, which doesn't exist in file names.
  }
  const icon = treeItem.iconPath;
  const resource = treeItem.resourceUri;
  if (isThemeIcon(icon) && icon.id !== vscode.ThemeIcon.File.id && icon.id !== vscode.ThemeIcon.Folder.id) {
    return `codicon-${icon.id} predefined-file-icon'`;
  }

  if (isUri(icon)) {
    return "";
  }

  const classes: string[] = [];
  if (resource) {
    const stat = await vscode.workspace.fs.stat(resource);
    const iconId = stat.type === vscode.FileType.Directory ? vscode.ThemeIcon.Folder.id : vscode.ThemeIcon.File.id;
    // we always set these base classes even if we do not have a path
    classes.push(iconId === vscode.ThemeIcon.Folder.id ? "folder-icon" : "file-icon");

    // Get the path and name of the resource. For data-URIs, we need to parse specially
    let name: string | undefined;
    if (resource.scheme === "data") {
      // data:MIME;a:AAA;b;BBB;base64,hhh scheme
      const metadata = /^data:([^;]+;.*$)/.exec(resource.path) ?? [, ""];
      name = metadata[1];
    } else {
      const match = resource.path.match(fileIconDirectoryRegex);
      if (match) {
        name = cssEscape(match[2].toLowerCase());
        if (match[1]) {
          classes.push(`${cssEscape(match[1].toLowerCase())}-name-dir-icon`); // parent directory
        }
      } else {
        name = cssEscape(resource.authority.toLowerCase());
      }
    }

    // // Root Folders
    // if (fileKind === FileKind.ROOT_FOLDER) {
    //   classes.push(`${name}-root-name-folder-icon`);
    // }

    // Folders
    if (iconId === vscode.ThemeIcon.Folder.id) {
      classes.push(`${name}-name-folder-icon`);
    }

    // Files
    else {
      // Name & Extension(s)
      if (name) {
        classes.push(`${name}-name-file-icon`);
        classes.push(`name-file-icon`); // extra segment to increase file-name score
        // Avoid doing an explosive combination of extensions for very long filenames
        // (most file systems do not allow files > 255 length) with lots of `.` characters
        // https://github.com/microsoft/vscode/issues/116199
        if (name.length <= 255) {
          const dotSegments = name.split(".");
          for (let i = 1; i < dotSegments.length; i++) {
            classes.push(`${dotSegments.slice(i).join(".")}-ext-file-icon`); // add each combination of all found extensions if more than one
          }
        }
        classes.push(`ext-file-icon`); // extra segment to increase file-ext score
      }

      async function detectLanguageId(resource: vscode.Uri): Promise<string | undefined> {
        try {
          const document = await vscode.workspace.openTextDocument(resource);
          return document.languageId;
        } catch (e) {
          return "binary";
        }
      }
      // Detected Mode
      const detectedLanguageId = await detectLanguageId(resource);
      if (detectedLanguageId) {
        classes.push(`${cssEscape(detectedLanguageId)}-lang-file-icon`);
      }
    }
  }
  return classes.join(" ");
}

type Ty = "root" | "!" | "&&" | "||" | "comparator";
const level: Record<Ty, number> = {
  "!": 1,
  "&&": 2,
  "||": 3,
  comparator: 4,
  root: 5,
};
export function parseWhenClause(when: string | undefined): WhenClauseExpr {
  if (!when) {
    return (item, context) => true;
  }

  const pattern = /!={0,2}|\(|\)|'[^']+'|===?|&&|\|\||>=?|<=?|=~|in(?!\w)|not in|[\w._-]+|\/[^/]+\/[ismu]*/g;
  let root: any[] = [];
  let index = 0;
  const recursion = (parentStack: WhenClause[], parentLevel: number, resolver?: (lt: WhenClause, rt: WhenClause) => WhenClause): WhenClause => {
    let stack: WhenClause[] = [];
    while (index < when.length) {
      const parts = pattern.exec(when);
      if (!parts) {
        index = when.length;
        break;
      }
      index = pattern.lastIndex;
      const op = parts[0][0];
      const token = parts[0];
      if (op === "'") {
        stack.push({ op: token, tree: [], expr: ContextExpr.String(token) });
      } else if (token === "(") {
        stack.push(recursion(stack, level["root"]));
      } else if (token === ")") {
        if (stack.length !== 1) {
          throw new Error(`${stack.join(",")}`);
        }
        if ( resolver) {
          const lt = parentStack.pop();
          if (!lt) {
            throw new Error("failed to parse whenClause");
          }
          return (resolver(lt, stack[0]));
        }
        return stack[0];
      } else if (token === "!") {
        const lt = recursion(stack, level["!"]);
        return { op: "not", tree: [lt], expr: (item, context) => !lt.expr(item, context) };
      } else if (token === "&&") {
        if (parentLevel < level[token] && resolver) {
          const lt = parentStack.pop();
          if (!lt) {
            throw new Error("failed to parse whenClause");
          }
          parentStack.push(resolver(lt, recursion(stack, level[token])));
        }
        const lt = stack.pop();
        if (!lt) {
          throw new Error("failed to parse whenClause");
        }
        stack.push(
          recursion(stack, level["&&"], (lt, rt) => {
            return toOperator(lt, token, rt);
          })
        );
      } else if (token === "||") {
        if (parentLevel < level[token] && resolver) {
          const lt = parentStack.pop();
          if (!lt) {
            throw new Error("failed to parse whenClause");
          }
          parentStack.push(resolver(lt, recursion(stack, level[token])));
        }
        const lt = stack.pop();
        if (!lt) {
          throw new Error("failed to parse whenClause");
        }
        stack.push(
          recursion(stack, level[token], (rt) => {
            return toOperator(lt, token, rt);
          })
        );
      } else if (isComparator(token)) {
        const rt = stack.pop();
        if (!rt) {
          throw new Error("failed to parse whenClause");
        }
        const lt = recursion(stack, level["comparator"]);
        stack.push({ op: token, tree: [rt, lt], expr: toComparator(rt.expr, token, lt.expr) });
      } else if (isInClause(token)) {
        const rt = stack.pop();
        if (!rt) {
          throw new Error("failed to parse whenClause");
        }
        const lt = recursion(stack, level["comparator"]);
        stack.push({ op: token, tree: [rt, lt], expr: toComparator(rt.expr, token, lt.expr) });
      } else {
        stack.push({ op: token, tree: [], expr: ContextExpr.Context(token) });
      }
    }
    if (stack.length !== 1) {
      throw new Error("");
    }
    return stack[0];
  };
  const clause = recursion([], level["root"]);
  const debug = (clause: WhenClause , nested: number)=>{
    console.log(`${"  ".repeat(nested)} - ${clause.op}: `);
    for( const item of clause.tree ){
      debug(item, nested+1);
    }
  };
  console.log("## "+when);
  debug(clause, 0);
  return clause.expr;
}
function isOperator(token: string) {
  switch (token) {
    case "!":
    case "||":
    case "&&":
      return true;
  }
  return false;
}
function toOperator(lt: WhenClause, token: string, rt: WhenClause): WhenClause {
  switch (token) {
    case "||":
      return { op: token, tree: [lt, rt], expr: ContextExpr.Or(lt.expr, rt.expr) };
    case "&&":
      return { op: token, tree: [lt, rt], expr: ContextExpr.And(lt.expr, rt.expr) };
  }
  throw new Error("failed to parse whenClause");
}
function isComparator(token: string) {
  switch (token) {
    case "!==":
    case "!=":
    case "===":
    case "==":
    case "=~":
    case "<":
    case "<=":
    case ">":
    case ">=":
      return true;
  }
  return false;
}

function isInClause(token: string) {
  switch (token) {
    case "in":
    case "not in":
      return true;
  }
  return false;
}

function toComparator(lt: WhenClauseExpr, token: string, rt: WhenClauseExpr): WhenClauseExpr {
  switch (token) {
    case "!==":
    case "!=":
      return (item, context) => lt(item, context) !== rt(item, context);
    case "===":
    case "==":
      return (item, context) => lt(item, context) === rt(item, context);
    case "=~":
      return ContextExpr.RegexTest(lt, rt);
    case "<":
      return (item, context) => lt(item, context) < rt(item, context);
    case "<=":
      return (item, context) => lt(item, context) <= rt(item, context);
    case ">":
      return (item, context) => lt(item, context) > rt(item, context);
    case ">=":
      return (item, context) => lt(item, context) >= rt(item, context);
    case "in":
      return (item, context) => lt(item, context) in rt(item, context);
    case "not in":
      return (item, context) => !(lt(item, context) in rt(item, context));
  }
  throw new Error("failed to parse whenClause");
}

// export function parseWhenClause2(when: string | undefined): WhenClause {
//   if (!when) {
//     return (item, context) => true;
//   }

//   const pattern = /!={0,2}|\(|\)|'[^']+'|===?|&&|\|\||>=?|<=?|=~|in(?!\w)|not in|[\w._-]+|\/[^/]+\/[ismu]*/g;
//   let root: any[] = [];
//   let index = 0;
//   const recursion = (parentStack: WhenClause[], parentLevel: number, resolver?: (lt: WhenClause, rt: WhenClause) => WhenClause): WhenClause => {
//     let stack: WhenClause[] = [];
//     while (index < when.length) {
//       const parts = pattern.exec(when);
//       if (!parts) {
//         index = when.length;
//         break;
//       }
//       index = pattern.lastIndex;
//       const op = parts[0][0];
//       const token = parts[0];
//       if (op === "'") {
//         stack.push(ContextExpr.String(token));
//       } else if (token === "(") {
//         stack.push(recursion(stack, level["root"]));
//       } else if (token === ")") {
//         if (stack.length !== 1) {
//           throw new Error(`${stack.join(",")}`);
//         }
//         return stack[0];
//       } else {
//         stack.push(ContextExpr.Context(token));
//       }
//     }
//     return ()=>true;
//   };
//   return recursion([], 0);
// }
