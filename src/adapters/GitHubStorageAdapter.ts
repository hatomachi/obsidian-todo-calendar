import { Octokit } from '@octokit/rest';
import { IStorageAdapter } from './IStorageAdapter';
import { CollectionData, ItemData, AgendaTodoItem, TodoItem } from '../types';
import { ItemType } from '../features/item-types/types';
import { getDefaultItemTypes } from '../features/item-types/templateUtils';
import { parseYamlContent, stringifyFrontmatter, extractBodyContent } from '../utils/yaml';
import { ROOT_DATA_DIR, COLLECTIONS_DIR, ITEMS_DIR } from '../constants';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

/**
 * Multi-byte safe Base64 encoder/decoder for browser
 */
function utf8ToBase64(str: string): string {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(str: string): string {
  return decodeURIComponent(escape(window.atob(str)));
}

export class GitHubStorageAdapter implements IStorageAdapter {
  private octokit: Octokit;
  private config: GitHubConfig;
  private fileShaCache = new Map<string, string>();

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  private generateUniqueId(): string {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    return `${timestamp}_${rand}`;
  }

  /**
   * Fetch repository tree recursively to get all file paths and SHAs in 1 request
   */
  private async fetchTree(): Promise<{ path: string; sha: string; size?: number }[]> {
    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner: this.config.owner,
        repo: this.config.repo,
        tree_sha: this.config.branch || 'main',
        recursive: '1',
      });

      const tree = (data.tree || []).filter((node) => node.path && node.type === 'blob') as {
        path: string;
        sha: string;
        size?: number;
      }[];

      // Update SHA cache
      for (const node of tree) {
        this.fileShaCache.set(node.path, node.sha);
      }

      return tree;
    } catch (e) {
      console.error('Failed to fetch git tree:', e);
      throw e;
    }
  }

  /**
   * Read file content via GitHub Contents API / Blob API
   */
  private async readFile(path: string, sha?: string): Promise<string> {
    try {
      if (sha) {
        const { data } = await this.octokit.rest.git.getBlob({
          owner: this.config.owner,
          repo: this.config.repo,
          file_sha: sha,
        });
        return base64ToUtf8(data.content.replace(/\n/g, ''));
      }

      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if ('content' in data && data.content) {
        if (data.sha) this.fileShaCache.set(path, data.sha);
        return base64ToUtf8(data.content.replace(/\n/g, ''));
      }
      return '';
    } catch (e: any) {
      if (e.status === 404) return '';
      console.error(`Failed to read file ${path}:`, e);
      throw e;
    }
  }

  /**
   * Write/Create/Update file via GitHub Contents API
   */
  private async writeFile(path: string, content: string, commitMessage: string): Promise<string> {
    let sha = this.fileShaCache.get(path);

    if (!sha) {
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: this.config.owner,
          repo: this.config.repo,
          path,
          ref: this.config.branch,
        });
        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (e: any) {
        // 404 is normal for new files
        if (e.status !== 404) throw e;
      }
    }

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      branch: this.config.branch,
      message: commitMessage,
      content: utf8ToBase64(content),
      sha: sha || undefined,
    });

    if (data.content?.sha) {
      this.fileShaCache.set(path, data.content.sha);
      return data.content.sha;
    }
    return '';
  }

  /**
   * Delete file via GitHub Contents API
   */
  private async deleteFile(path: string, commitMessage: string): Promise<void> {
    let sha = this.fileShaCache.get(path);
    if (!sha) {
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: this.config.owner,
          repo: this.config.repo,
          path,
          ref: this.config.branch,
        });
        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (e: any) {
        if (e.status === 404) return;
        throw e;
      }
    }

    if (sha) {
      await this.octokit.rest.repos.deleteFile({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        branch: this.config.branch,
        message: commitMessage,
        sha,
      });
      this.fileShaCache.delete(path);
    }
  }

  async getCollections(): Promise<CollectionData[]> {
    const tree = await this.fetchTree();
    const collectionFiles = tree.filter(
      (node) => node.path.startsWith(`${COLLECTIONS_DIR}/`) && node.path.endsWith('.md')
    );

    const collections: CollectionData[] = [];

    for (const node of collectionFiles) {
      const content = await this.readFile(node.path, node.sha);
      const frontmatter = parseYamlContent(content);

      const filename = node.path.split('/').pop()?.replace(/\.md$/, '') || '';
      const id = frontmatter.id || filename;

      // Count items in this collection
      const prefix = `${ITEMS_DIR}/${id}/`;
      const itemCount = tree.filter((n) => n.path.startsWith(prefix) && n.path.endsWith('.md')).length;

      collections.push({
        id,
        filePath: node.path,
        title: frontmatter.title || 'Untitled Collection',
        description: frontmatter.description || '',
        color: frontmatter.color || 'purple',
        createdAt: frontmatter.created_at || new Date().toISOString(),
        itemCount,
      });
    }

    return collections.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async createCollection(title: string, description = ''): Promise<CollectionData> {
    const id = this.generateUniqueId();
    const filePath = `${COLLECTIONS_DIR}/${id}.md`;
    const createdAt = new Date().toISOString();

    const frontmatter = {
      id,
      title: title.trim() || 'New Collection',
      description: description.trim(),
      created_at: createdAt,
    };

    const content = stringifyFrontmatter(frontmatter, `# ${title}\n`);
    await this.writeFile(filePath, content, `chore(todo): create collection "${title}"`);

    return {
      id,
      filePath,
      title: frontmatter.title,
      description: frontmatter.description,
      createdAt,
      itemCount: 0,
    };
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const filePath = `${COLLECTIONS_DIR}/${collectionId}.md`;
    await this.deleteFile(filePath, `chore(todo): delete collection ${collectionId}`);

    // Also delete any items in this collection
    const tree = await this.fetchTree();
    const prefix = `${ITEMS_DIR}/${collectionId}/`;
    const itemFiles = tree.filter((n) => n.path.startsWith(prefix));
    for (const itemFile of itemFiles) {
      await this.deleteFile(itemFile.path, `chore(todo): delete item ${itemFile.path}`);
    }
  }

  async getItems(collectionId: string): Promise<ItemData[]> {
    const tree = await this.fetchTree();
    const prefix = `${ITEMS_DIR}/${collectionId}/`;
    const itemFiles = tree.filter((node) => node.path.startsWith(prefix) && node.path.endsWith('.md'));

    const items: ItemData[] = [];

    for (const node of itemFiles) {
      const content = await this.readFile(node.path, node.sha);
      const frontmatter = parseYamlContent(content);
      const filename = node.path.split('/').pop()?.replace(/\.md$/, '') || '';

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
        id: frontmatter.id || filename,
        collectionId,
        filePath: node.path,
        title: frontmatter.title || 'Untitled Item',
        type: frontmatter.type,
        template: frontmatter.template,
        status: frontmatter.status === 'done' ? 'done' : 'todo',
        description: frontmatter.description || '',
        createdAt: frontmatter.created_at || new Date().toISOString(),
        todos,
      });
    }

    return items.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async createItem(
    collectionId: string,
    title: string,
    description = '',
    type?: string,
    template?: string,
    initialTodos: TodoItem[] = []
  ): Promise<ItemData> {
    const id = this.generateUniqueId();
    const filePath = `${ITEMS_DIR}/${collectionId}/${id}.md`;
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

    const content = stringifyFrontmatter(frontmatter, `# ${title}\n`);
    await this.writeFile(filePath, content, `chore(todo): create item "${title}"`);

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

  async updateItem(item: ItemData): Promise<void> {
    const oldContent = await this.readFile(item.filePath);
    const bodyContent = extractBodyContent(oldContent);

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

    const newContent = stringifyFrontmatter(frontmatter, bodyContent);
    await this.writeFile(item.filePath, newContent, `chore(todo): update "${item.title}"`);
  }

  async deleteItem(item: ItemData): Promise<void> {
    await this.deleteFile(item.filePath, `chore(todo): delete item "${item.title}"`);
  }

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

  async loadTemplates(): Promise<ItemType[]> {
    try {
      const path = `${ROOT_DATA_DIR}/templates.json`;
      const content = await this.readFile(path);
      if (content) {
        const data = JSON.parse(content);
        if (data && Array.isArray(data.types)) {
          return data.types;
        }
      }
      return getDefaultItemTypes();
    } catch {
      return getDefaultItemTypes();
    }
  }

  async saveTemplates(types: ItemType[]): Promise<void> {
    const path = `${ROOT_DATA_DIR}/templates.json`;
    const content = JSON.stringify({ types }, null, 2);
    await this.writeFile(path, content, 'chore(todo): update templates.json');
  }
}
