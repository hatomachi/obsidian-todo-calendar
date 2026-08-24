import { App, TFile } from 'obsidian';
import { ROOT_DATA_DIR } from '../../constants';
import { ItemType } from './types';
import { getDefaultItemTypes } from './templateUtils';

export const TEMPLATES_FILE_PATH = `${ROOT_DATA_DIR}/templates.json`;

export class TemplateStorage {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Load template definitions from _todo-calendar/templates.json.
   * If file does not exist, creates it with default seed templates.
   */
  async loadTemplates(): Promise<ItemType[]> {
    try {
      const adapter = this.app.vault.adapter;
      const file = this.app.vault.getAbstractFileByPath(TEMPLATES_FILE_PATH);

      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const data = JSON.parse(content);
        if (data && Array.isArray(data.types)) {
          return data.types;
        }
      }

      // If file doesn't exist, create it with defaults
      const defaults = getDefaultItemTypes();
      await this.saveTemplates(defaults);
      return defaults;
    } catch (e) {
      console.error('Failed to load templates.json, using defaults:', e);
      return getDefaultItemTypes();
    }
  }

  /**
   * Save template definitions to _todo-calendar/templates.json
   */
  async saveTemplates(types: ItemType[]): Promise<void> {
    try {
      const adapter = this.app.vault.adapter;
      if (!(await adapter.exists(ROOT_DATA_DIR))) {
        await this.app.vault.createFolder(ROOT_DATA_DIR);
      }

      const content = JSON.stringify({ types }, null, 2);
      const file = this.app.vault.getAbstractFileByPath(TEMPLATES_FILE_PATH);

      if (file instanceof TFile) {
        await this.app.vault.modify(file, content);
      } else {
        await this.app.vault.create(TEMPLATES_FILE_PATH, content);
      }
    } catch (e) {
      console.error('Failed to save templates.json:', e);
    }
  }
}
