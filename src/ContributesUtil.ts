import path from "path";
import * as vscode from "vscode";
import { VscodeContributesIconDefinition, IconTheme, IconsAssociation, VscodeContributesCommandsIconDefinition } from "./IconTheme";
import { ManifestCommand, ManifestViewItemContext, Menu, VscodePackageJSON } from "./MenuDefinition";
import { productIcomMapping } from "webview/vscodeProductIconMapping";
import { Minimatch, minimatch } from "minimatch";

export async function loadContributesMenu(webview: vscode.Webview, extension: vscode.Extension<any>): Promise<Menu[]> {
  const packageJSON: VscodePackageJSON = extension.packageJSON;
  const commands = packageJSON.contributes.commands.reduce((p, c) => { p[c.command] = c; return p; }, {} as Record<string, ManifestCommand>);
  const contexts: ManifestViewItemContext[] = packageJSON.contributes.menus?.["view/item/context"];
  if (!contexts) {
    return [];
  }
  const menu: Menu[] = [];
  for (const context of contexts) {
    const command = commands[context.command];
    if (!command) {
      console.error(`not found command ${context.command}`);
      continue;
    }
    menu.push({
      command: context.command,
      title: command.title,
      icon: command.icon,
      iconClasses: await resolveIconClass(webview, command.icon),
      unparsedWhen: context.when,
    });
  }
  return menu;
}

export async function loadIconTheme(webviewView: vscode.WebviewView, exts: readonly vscode.Extension<any>[], iconThemeId?: string | undefined) {
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
  const uriOnDisk = vscode.Uri.joinPath(activeIconTheme.uri, path.dirname(activeIconTheme.path));
  const uriOnWebview = webviewView.webview.asWebviewUri(uriOnDisk);
  const styleContent = await toStyleSheet(iconThemeData, uriOnWebview);
  vscode.FileDecoration
  return {
    styleContent,
    uri: uriOnDisk,
  };
}

export async function toStyleSheet(iconThemeDocument: IconTheme, iconThemeBaseUri: vscode.Uri) {
  // XXX from https://github.com/microsoft/vscode/blob/14addc7735fcb99fd42c35e5d7e8e984611132b8/src/vs/workbench/services/themes/browser/fileIconThemeData.ts#L230C10-L230C3
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

  function resolvePath(path: string) {
    return vscode.Uri.joinPath(iconThemeBaseUri, path);
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

export async function resolveTreeIconClasses(treeItem: vscode.TreeItem): Promise<string> {
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

      // Detected Mode
      const detectedLanguageId = await detectLanguageId(resource);
      if (detectedLanguageId) {
        classes.push(`${cssEscape(detectedLanguageId)}-lang-file-icon`);
      }
    }
  }
  return classes.join(" ");
}

let cache: Record<string,string>;
let cachePattern: Record<string, Minimatch> = {};
async function detectLanguageId(resource: vscode.Uri): Promise<string | undefined> {
  const filesAssociations = cache || vscode.workspace.getConfiguration('files').get<Record<string,string>>('associations');
  if (filesAssociations) {
    cache = filesAssociations;
    // const matcher = (bestMatch: [string, any], [pattern, langId]: [string, any]): [string, any] => {
    //   if (pattern.length > bestMatch[0].length && minimatch(resource.path, pattern)) {
    //     return [pattern, langId];
    //   }
    //   return bestMatch;
    // };
    // const [pattern, langId] = Object.entries(filesAssociations).reduce(matcher, ["", undefined]);
    const matched = Object.entries(filesAssociations).find(([pattern, langId])=>{
      const matcher = cachePattern[pattern] || (cachePattern[pattern] = new Minimatch(pattern));
      return matcher.match(resource.path);
    });
    const langId = matched?.[1];
    if( langId ){
      return langId;
    }
  }

  try {
    // TODO: too slow
    const document = await vscode.workspace.openTextDocument(resource);
    return document.languageId;
  } catch (e) {
    return "binary";
  }
}

export async function resolveIconClass(webview: vscode.Webview, icon: VscodeContributesCommandsIconDefinition): Promise<string> {
  const colorTheme = vscode.window.activeColorTheme.kind;
  if (typeof icon === "string") {
    // productIcon expression
    if (icon.startsWith("$(") && icon.endsWith(")")) {
      const iconId = icon.slice(2, -1);
      if (productIcomMapping[iconId]) {
        return `codicon codicon-${productIcomMapping[iconId]}`;
      }

      return `codicon codicon-${iconId}`;
    }

    // TODO: file path is not supported.
    return ``;
  }
  // TODO: ColorTheme is not supported.
  return "";
}