/**
 * Obsidian API Shim for Web / Browser environments
 */
export class App {}
export class TFile {
  path = '';
  basename = '';
  extension = '';
  stat = { ctime: 0, mtime: 0, size: 0 };
}
export class TFolder {
  path = '';
  children: any[] = [];
}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Notice {
  constructor(public message: string) {
    console.log('[Notice]', message);
  }
}
export class ItemView {}
export class WorkspaceLeaf {}

export function parseYaml(yaml: string): any {
  return {};
}

export function stringifyYaml(obj: any): string {
  return '';
}
