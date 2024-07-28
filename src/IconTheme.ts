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

