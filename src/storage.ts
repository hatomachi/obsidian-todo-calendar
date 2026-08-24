import { App, TFile, TFolder, parseYaml, stringifyYaml } from 'obsidian';
import { COLLECTIONS_DIR, ITEMS_DIR, ROOT_DATA_DIR } from './constants';
import { CollectionData, ItemData, TodoItem, AgendaTodoItem } from './types';

export class StorageManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Ensure required directory structure exists in vault:
   * _todo-calendar/
   * ├── collections/
   * └── items/
   */
  async ensureDirectoriesExist(): Promise<void> {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(ROOT_DATA_DIR))) {
      await this.app.vault.createFolder(ROOT_DATA_DIR);
    }
    if (!(await adapter.exists(COLLECTIONS_DIR))) {
      await this.app.vault.createFolder(COLLECTIONS_DIR);
    }
    if (!(await adapter.exists(ITEMS_DIR))) {
      await this.app.vault.createFolder(ITEMS_DIR);
    }
  }

  /**
   * Generate collision-free filename: <timestamp>_<random5>.md
   */
  private generateUniqueId(): string {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    return `${timestamp}_${rand}`;
  }

  /**
   * Helper to parse YAML frontmatter from file content
   */
  private parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (match && match[1]) {
      try {
        return parseYaml(match[1]) || {};
      } catch (e) {
        console.error('Failed to parse YAML frontmatter:', e);
      }
    }
    return {};
  }

  /**
   * Helper to encode frontmatter into markdown content
   */
  private formatMarkdownWithFrontmatter(data: Record<string, any>, bodyContent = ''): string {
    const yamlStr = stringifyYaml(data).trim();
    return `---\n${yamlStr}\n---\n${bodyContent}`;
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<CollectionData[]> {
    await this.ensureDirectoriesExist();

    const collectionsFolder = this.app.vault.getAbstractFileByPath(COLLECTIONS_DIR);
    if (!collectionsFolder || !(collectionsFolder instanceof TFolder)) {
      return [];
    }

    const collections: CollectionData[] = [];

    for (const file of collectionsFolder.children) {
      if (file instanceof TFile && file.extension === 'md') {
        const content = await this.app.vault.read(file);
        const frontmatter = this.parseFrontmatter(content);

        const id = frontmatter.id || file.basename;
        const itemCount = await this.getItemCount(id);

        collections.push({
          id,
          filePath: file.path,
          title: frontmatter.title || 'Untitled Collection',
          description: frontmatter.description || '',
          color: frontmatter.color || 'purple',
          createdAt: frontmatter.created_at || new Date(file.stat.ctime).toISOString(),
          itemCount,
        });
      }
    }

    // Sort by ctime desc
    return collections.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  /**
   * Get count of items in a collection
   */
  private async getItemCount(collectionId: string): Promise<number> {
    const folderPath = `${ITEMS_DIR}/${collectionId}`;
    const itemFolder = this.app.vault.getAbstractFileByPath(folderPath);
    if (itemFolder && itemFolder instanceof TFolder) {
      return itemFolder.children.filter((f) => f instanceof TFile && f.extension === 'md').length;
    }
    return 0;
  }

  /**
   * Create a new collection
   */
  async createCollection(title: string, description = ''): Promise<CollectionData> {
    await this.ensureDirectoriesExist();

    const id = this.generateUniqueId();
    const filePath = `${COLLECTIONS_DIR}/${id}.md`;
    const createdAt = new Date().toISOString();

    const frontmatter = {
      id,
      title: title.trim() || 'New Collection',
      description: description.trim(),
      created_at: createdAt,
    };

    const content = this.formatMarkdownWithFrontmatter(frontmatter, `# ${title}\n`);
    await this.app.vault.create(filePath, content);

    // Create item subfolder items/<collectionId>
    const itemFolderPath = `${ITEMS_DIR}/${id}`;
    if (!(await this.app.vault.adapter.exists(itemFolderPath))) {
      await this.app.vault.createFolder(itemFolderPath);
    }

    return {
      id,
      filePath,
      title: frontmatter.title,
      description: frontmatter.description,
      createdAt,
      itemCount: 0,
    };
  }

  /**
   * Delete collection and its items
   */
  async deleteCollection(collectionId: string): Promise<void> {
    const collectionPath = `${COLLECTIONS_DIR}/${collectionId}.md`;
    const file = this.app.vault.getAbstractFileByPath(collectionPath);
    if (file instanceof TFile) {
      await this.app.vault.delete(file);
    }

    const itemFolderPath = `${ITEMS_DIR}/${collectionId}`;
    const itemFolder = this.app.vault.getAbstractFileByPath(itemFolderPath);
    if (itemFolder instanceof TFolder) {
      await this.app.vault.delete(itemFolder, true);
    }
  }

  /**
   * Get items in a specific collection
   */
  async getItems(collectionId: string): Promise<ItemData[]> {
    await this.ensureDirectoriesExist();

    const itemFolderPath = `${ITEMS_DIR}/${collectionId}`;
    const itemFolder = this.app.vault.getAbstractFileByPath(itemFolderPath);

    if (!itemFolder || !(itemFolder instanceof TFolder)) {
      return [];
    }

    const items: ItemData[] = [];

    for (const file of itemFolder.children) {
      if (file instanceof TFile && file.extension === 'md') {
        const content = await this.app.vault.read(file);
        const frontmatter = this.parseFrontmatter(content);

        const todos: TodoItem[] = Array.isArray(frontmatter.todos)
          ? frontmatter.todos.map((t: any, idx: number) => ({
              id: t.id || `todo-${idx}-${Date.now()}`,
              title: t.title || 'Untitled TODO',
              due: t.due || '',
              status: t.status === 'done' ? 'done' : 'todo',
              description: t.description || '',
              group: t.group || '',
            }))
          : [];

        items.push({
          id: frontmatter.id || file.basename,
          collectionId,
          filePath: file.path,
          title: frontmatter.title || 'Untitled Item',
          type: frontmatter.type,
          template: frontmatter.template,
          status: frontmatter.status === 'done' ? 'done' : 'todo',
          description: frontmatter.description || '',
          createdAt: frontmatter.created_at || new Date(file.stat.ctime).toISOString(),
          todos,
        });
      }
    }

    return items.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  /**
   * Create a new item in a collection
   */
  async createItem(
    collectionId: string,
    title: string,
    description = '',
    type?: string,
    template?: string,
    initialTodos: TodoItem[] = []
  ): Promise<ItemData> {
    await this.ensureDirectoriesExist();

    const itemFolderPath = `${ITEMS_DIR}/${collectionId}`;
    if (!(await this.app.vault.adapter.exists(itemFolderPath))) {
      await this.app.vault.createFolder(itemFolderPath);
    }

    const id = this.generateUniqueId();
    const filePath = `${itemFolderPath}/${id}.md`;
    const createdAt = new Date().toISOString();

    const frontmatter: Record<string, any> = {
      id,
      collection_id: collectionId,
      title: title.trim() || '新規アイテム',
      status: 'todo',
      description: description.trim(),
      created_at: createdAt,
      todos: initialTodos,
    };

    if (type) frontmatter.type = type;
    if (template) frontmatter.template = template;

    const content = this.formatMarkdownWithFrontmatter(frontmatter, `# ${title}\n`);
    await this.app.vault.create(filePath, content);

    return {
      id,
      collectionId,
      filePath,
      title: frontmatter.title,
      type,
      template,
      status: 'todo',
      description: frontmatter.description,
      createdAt,
      todos: initialTodos,
    };
  }

  /**
   * Save / update item frontmatter
   */
  async updateItem(item: ItemData): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(item.filePath);
    if (!(file instanceof TFile)) {
      console.error('File not found for path:', item.filePath);
      return;
    }

    const content = await this.app.vault.read(file);
    // Keep body content intact
    const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---([\s\S]*)$/);
    const bodyContent = bodyMatch ? bodyMatch[1] : '';

    const frontmatter: Record<string, any> = {
      id: item.id,
      collection_id: item.collectionId,
      title: item.title,
      status: item.status === 'done' ? 'done' : 'todo',
      description: item.description || '',
      created_at: item.createdAt,
      todos: item.todos.map((t) => ({
        id: t.id,
        title: t.title,
        due: t.due,
        status: t.status,
        description: t.description || '',
        ...(t.group ? { group: t.group } : {}),
      })),
    };

    if (item.type) frontmatter.type = item.type;
    if (item.template) frontmatter.template = item.template;

    const newContent = this.formatMarkdownWithFrontmatter(frontmatter, bodyContent);
    await this.app.vault.modify(file, newContent);
  }

  /**
   * Delete item file
   */
  async deleteItem(item: ItemData): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(item.filePath);
    if (file instanceof TFile) {
      await this.app.vault.delete(file);
    }
  }

  /**
   * Get all items of a specific type across all collections
   */
  async getItemsByType(typeId: string): Promise<ItemData[]> {
    const collections = await this.getCollections();
    const matchedItems: ItemData[] = [];

    for (const col of collections) {
      const items = await this.getItems(col.id);
      for (const item of items) {
        if (item.type === typeId) {
          matchedItems.push(item);
        }
      }
    }

    return matchedItems.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  /**
   * Get all TODO items across all collections for Agenda view
   */
  async getAllAgendaItems(): Promise<AgendaTodoItem[]> {
    const collections = await this.getCollections();
    const agendaItems: AgendaTodoItem[] = [];

    for (const col of collections) {
      const items = await this.getItems(col.id);
      for (const item of items) {
        for (const todo of item.todos) {
          agendaItems.push({
            todo,
            item,
            collection: col,
          });
        }
      }
    }

    return agendaItems;
  }
}

