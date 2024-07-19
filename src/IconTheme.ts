import path from "path";
import * as vscode from "vscode";

export type IconDefinition = FontIconDefinition & SvgIconDefinition;

export interface FontIconDefinition {
  fontCharacter: string;
  fontColor: string;
  fontSize: string;
  fontId: string;
}

export interface SvgIconDefinition {
  iconPath: string;
}
export interface FontDefinition {
  id: string;
  src: {
    path: string;
    format: string;
  }[];
  weight: string;
  style: string;
  size: string;
}
export interface IconsAssociation {
  folder?: string;
  file?: string;
  folderExpanded?: string;
  rootFolder?: string;
  rootFolderExpanded?: string;
  rootFolderNames?: { [folderName: string]: string };
  rootFolderNamesExpanded?: { [folderName: string]: string };
  folderNames?: { [folderName: string]: string };
  folderNamesExpanded?: { [folderName: string]: string };
  fileExtensions?: { [extension: string]: string };
  fileNames?: { [fileName: string]: string };
  languageIds?: { [languageId: string]: string };
}

export interface IconTheme extends IconsAssociation {
  iconDefinitions: { [key: string]: IconDefinition };
  fonts: FontDefinition[];
  light?: IconsAssociation;
  highContrast?: IconsAssociation;
  hidesExplorerArrows?: boolean;
  showLanguageModeIcons?: boolean;
}

export async function toStyleSheet(
  iconThemeDocument: IconTheme,
  iconThemeBaseUri: vscode.Uri
) {
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

  function collectSelectors(
    associations: IconsAssociation | undefined,
    baseThemeClassName?: string
  ) {
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

      const expanded =
        ".monaco-tl-twistie.collapsible:not(.collapsed) + .monaco-tl-contents";

      if (associations.folder) {
        addSelector(`${qualifier} .folder-icon::before`, associations.folder);
        result.hasFolderIcons = true;
      }

      if (associations.folderExpanded) {
        addSelector(
          `${qualifier} ${expanded} .folder-icon::before`,
          associations.folderExpanded
        );
        result.hasFolderIcons = true;
      }

      const rootFolder = associations.rootFolder || associations.folder;
      const rootFolderExpanded =
        associations.rootFolderExpanded || associations.folderExpanded;

      if (rootFolder) {
        addSelector(`${qualifier} .rootfolder-icon::before`, rootFolder);
        result.hasFolderIcons = true;
      }

      if (rootFolderExpanded) {
        addSelector(
          `${qualifier} ${expanded} .rootfolder-icon::before`,
          rootFolderExpanded
        );
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
          addSelector(
            `${qualifier} ${selectors.join("")}.folder-icon::before`,
            folderNames[key]
          );
          result.hasFolderIcons = true;
        }
      }
      const folderNamesExpanded = associations.folderNamesExpanded;
      if (folderNamesExpanded) {
        for (const key in folderNamesExpanded) {
          const selectors: string[] = [];
          const name = handleParentFolder(key.toLowerCase(), selectors);
          selectors.push(`.${escapeCSS(name)}-name-folder-icon`);
          addSelector(
            `${qualifier} ${expanded} ${selectors.join(
              ""
            )}.folder-icon::before`,
            folderNamesExpanded[key]
          );
          result.hasFolderIcons = true;
        }
      }

      const rootFolderNames = associations.rootFolderNames;
      if (rootFolderNames) {
        for (const key in rootFolderNames) {
          const name = key.toLowerCase();
          addSelector(
            `${qualifier} .${escapeCSS(
              name
            )}-root-name-folder-icon.rootfolder-icon::before`,
            rootFolderNames[key]
          );
          result.hasFolderIcons = true;
        }
      }
      const rootFolderNamesExpanded = associations.rootFolderNamesExpanded;
      if (rootFolderNamesExpanded) {
        for (const key in rootFolderNamesExpanded) {
          const name = key.toLowerCase();
          addSelector(
            `${qualifier} ${expanded} .${escapeCSS(
              name
            )}-root-name-folder-icon.rootfolder-icon::before`,
            rootFolderNamesExpanded[key]
          );
          result.hasFolderIcons = true;
        }
      }

      const languageIds = associations.languageIds;
      if (languageIds) {
        if (!languageIds.jsonc && languageIds.json) {
          languageIds.jsonc = languageIds.json;
        }
        for (const languageId in languageIds) {
          addSelector(
            `${qualifier} .${escapeCSS(
              languageId
            )}-lang-file-icon.file-icon::before`,
            languageIds[languageId]
          );
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
              selectors.push(
                `.${escapeCSS(segments.slice(i).join("."))}-ext-file-icon`
              );
            }
            selectors.push(".ext-file-icon"); // extra segment to increase file-ext score
          }
          addSelector(
            `${qualifier} ${selectors.join("")}.file-icon::before`,
            fileExtensions[key]
          );
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
              selectors.push(
                `.${escapeCSS(segments.slice(i).join("."))}-ext-file-icon`
              );
            }
            selectors.push(".ext-file-icon"); // extra segment to increase file-ext score
          }
          addSelector(
            `${qualifier} ${selectors.join("")}.file-icon::before`,
            fileNames[key]
          );
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

  const showLanguageModeIcons =
    iconThemeDocument.showLanguageModeIcons === true ||
    (hasSpecificFileIcons && iconThemeDocument.showLanguageModeIcons !== false);

  const cssRules: string[] = [];

  const fonts = iconThemeDocument.fonts;
  const fontSizes = new Map<string, string>();
  if (Array.isArray(fonts)) {
    const defaultFontSize = fonts[0].size || "150%";
    fonts.forEach((font) => {
      const src = font.src
        .map((l) => `${asCSSUrl(resolvePath(l.path))} format('${l.format}')`)
        .join(", ");
      cssRules.push(
        `@font-face { src: ${src}; font-family: '${font.id}'; font-weight: ${font.weight}; font-style: ${font.style}; font-display: block; }`
      );
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
        cssRules.push(
          `${selectors.join(", ")} { content: ' '; background-image: ${asCSSUrl(
            resolvePath(definition.iconPath)
          )}; }`
        );
      } else if (definition.fontCharacter || definition.fontColor) {
        const body = [];
        if (definition.fontColor) {
          body.push(`color: ${definition.fontColor};`);
        }
        if (definition.fontCharacter) {
          body.push(`content: '${definition.fontCharacter}';`);
        }
        const fontSize =
          definition.fontSize ??
          (definition.fontId ? fontSizes.get(definition.fontId) : undefined);
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
    throw new TypeError('`CSS.escape` requires an argument.');
  }
  var string = String(value);
  var length = string.length;
  var index = -1;
  var codeUnit;
  var result = '';
  var firstCodeUnit = string.charCodeAt(0);

  if (
    // If the character is the first character and is a `-` (U+002D), and
    // there is no second character, […]
    length == 1 &&
    firstCodeUnit == 0x002D
  ) {
    return '\\' + string;
  }

  while (++index < length) {
    codeUnit = string.charCodeAt(index);
    // Note: there’s no need to special-case astral symbols, surrogate
    // pairs, or lone surrogates.

    // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
    // (U+FFFD).
    if (codeUnit == 0x0000) {
      result += '\uFFFD';
      continue;
    }

    if (
      // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
      // U+007F, […]
      (codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
      // If the character is the first character and is in the range [0-9]
      // (U+0030 to U+0039), […]
      (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      // If the character is the second character and is in the range [0-9]
      // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
      (
        index == 1 &&
        codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
        firstCodeUnit == 0x002D
      )
    ) {
      // https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
      result += '\\' + codeUnit.toString(16) + ' ';
      continue;
    }

    // If the character is not handled by one of the above rules and is
    // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
    // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
    // U+005A), or [a-z] (U+0061 to U+007A), […]
    if (
      codeUnit >= 0x0080 ||
      codeUnit == 0x002D ||
      codeUnit == 0x005F ||
      codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
      codeUnit >= 0x0041 && codeUnit <= 0x005A ||
      codeUnit >= 0x0061 && codeUnit <= 0x007A
    ) {
      // the character itself
      result += string.charAt(index);
      continue;
    }

    // Otherwise, the escaped character.
    // https://drafts.csswg.org/cssom/#escape-a-character
    result += '\\' + string.charAt(index);
  }
  return result;
};