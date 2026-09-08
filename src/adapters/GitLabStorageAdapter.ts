import { IStorageAdapter } from './IStorageAdapter';
import { BatchSyncItem } from '../sync/types';
import { CollectionData, ItemData, AgendaTodoItem, TodoItem } from '../types';
import { ItemType } from '../features/item-types/types';
import { getDefaultItemTypes } from '../features/item-types/templateUtils';
import { parseYamlContent, stringifyFrontmatter, extractBodyContent, normalizeTags } from '../utils/yaml';
import { ROOT_DATA_DIR, COLLECTIONS_DIR, ITEMS_DIR } from '../constants';

export interface GitLabConfig {
  baseUrl: string;
  projectId: string;
  branch: string;
  token: string;
}

interface FileCacheEntry {
  sha: string;
  content: string;
}

/**
 * Normalize GitLab Base URL to support various deployment styles:
 * 1. Root URL: "https://gitlab.example.com" -> "https://gitlab.example.com/api/v4"
 * 2. API URL: "https://gitlab.example.com/api/v4" -> "https://gitlab.example.com/api/v4"
 * 3. Reverse Proxy: "https://alb-domain/todo-calendar/api" -> "https://alb-domain/todo-calendar/api"
 * 4. Relative Path: "/todo-calendar/api" -> "/todo-calendar/api"
 */
export function normalizeGitLabBaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  url = url.replace(/\/+$/, '');

  if (url.endsWith('/api/v4')) {
    return url;
  }

  if (url.startsWith('/')) {
    // Relative reverse-proxy path
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname === '' || parsed.pathname === '/') {
      return `${url}/api/v4`;
    }
    if (!parsed.pathname.includes('/api')) {
      return `${url}/api/v4`;
    }
  } catch {
    // If not a valid absolute URL, check if /api is present
    if (!url.includes('/api')) {
      return `${url}/api/v4`;
    }
  }

  return url;
}

/**
 * Encode GitLab project identifier (numeric ID or namespace/repo)
 */
export function encodeProjectId(projectId: string): string {
  const trimmed = (projectId || '').trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  try {
    return encodeURIComponent(decodeURIComponent(trimmed));
  } catch {
    return encodeURIComponent(trimmed);
  }
}

/**
 * Encode file path for GitLab API URL parameter
 */
export function encodeFilePath(filePath: string): string {
  return encodeURIComponent(filePath.replace(/^\/+/, ''));
}

/**
 * Test GitLab connectivity and project permissions
 */
export async function testGitLabConnection(
  config: GitLabConfig
): Promise<{ success: boolean; message: string; projectName?: string }> {
  const baseUrl = normalizeGitLabBaseUrl(config.baseUrl);
  const encodedId = encodeProjectId(config.projectId);
  const token = (config.token || '').trim();

  if (!baseUrl || !encodedId || !token) {
    return { success: false, message: 'GitLab URL、Project ID、Token をすべて入力してください。' };
  }

  try {
    const url = `${baseUrl}/projects/${encodedId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': token,
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const projName = data.name_with_namespace || data.name || data.path_with_namespace || config.projectId;
      const visibility = data.visibility ? ` (${data.visibility})` : '';
      return {
        success: true,
        message: `接続成功: ${projName}${visibility}`,
        projectName: projName,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, message: `認証エラー (${res.status}): Personal Access Token の権限 (api または read_repository) を確認してください。` };
    }
    if (res.status === 404) {
      return { success: false, message: `プロジェクトが見つかりません (404): URL または Project ID (${config.projectId}) を確認してください。` };
    }

    return { success: false, message: `接続失敗: HTTP ${res.status} ${res.statusText}` };
  } catch (e: any) {
    return { success: false, message: `ネットワーク通信エラー: ${e.message || '接続できませんでした'}` };
  }
}

export class GitLabStorageAdapter implements IStorageAdapter {
  private config: GitLabConfig;
  private baseUrl: string;
  private encodedProjectId: string;
  private fileShaCache = new Map<string, string>();
  private memoryCache: Record<string, FileCacheEntry> = {};
  private knownFiles = new Map<string, { sha: string; size?: number }>();
  private deletedPaths = new Set<string>();

  constructor(config: GitLabConfig) {
    this.config = {
      ...config,
      branch: config.branch?.trim() || 'main',
    };
    this.baseUrl = normalizeGitLabBaseUrl(this.config.baseUrl);
    this.encodedProjectId = encodeProjectId(this.config.projectId);
    this.memoryCache = this.loadCache();
  }

  private getCacheKey(): string {
    return `todo_cal_file_cache_gitlab_${this.config.projectId}_${this.config.branch}`;
  }

  private loadCache(): Record<string, FileCacheEntry> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.getCacheKey());
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('Failed to load GitLab file cache from localStorage:', e);
    }
    return {};
  }

  private saveCache(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.getCacheKey(), JSON.stringify(this.memoryCache));
      }
    } catch (e) {
      console.warn('Failed to save GitLab file cache to localStorage:', e);
    }
  }

  private updateCacheEntry(path: string, sha: string, content: string): void {
    this.memoryCache[path] = { sha, content };
    this.saveCache();
  }

  private deleteCacheEntry(path: string): void {
    if (this.memoryCache[path]) {
      delete this.memoryCache[path];
      this.saveCache();
    }
  }

  private generateUniqueId(): string {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    return `${timestamp}_${rand}`;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set('PRIVATE-TOKEN', this.config.token.trim());
    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Fetch all repository files and blob SHAs recursively in batch
   */
  private async fetchTree(): Promise<{ path: string; sha: string; size?: number }[]> {
    try {
      const allBlobs: { path: string; sha: string; size?: number }[] = [];
      let page = 1;

      while (true) {
        const treeUrl = `${this.baseUrl}/projects/${this.encodedProjectId}/repository/tree?ref=${encodeURIComponent(
          this.config.branch
        )}&recursive=true&per_page=100&page=${page}`;

        const res = await this.fetchWithAuth(treeUrl);
        if (!res.ok) {
          if (res.status === 404) {
            // Empty repo or branch not found
            break;
          }
          throw new Error(`GitLab tree API error: ${res.status} ${res.statusText}`);
        }

        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) {
          break;
        }

        for (const item of items) {
          if (item.type === 'blob' && item.path) {
            allBlobs.push({
              path: item.path,
              sha: item.id || '',
            });
          }
        }

        const nextPageHeader = res.headers.get('x-next-page');
        if (nextPageHeader && nextPageHeader !== '' && nextPageHeader !== `${page}`) {
          page = parseInt(nextPageHeader, 10);
        } else {
          break;
        }
      }

      // Update SHA cache & knownFiles from remote
      for (const node of allBlobs) {
        if (!this.deletedPaths.has(node.path)) {
          if (node.sha) this.fileShaCache.set(node.path, node.sha);
          this.knownFiles.set(node.path, { sha: node.sha });
        }
      }

      // Build merged tree list: remote nodes excluding deleted + locally created nodes
      const resultMap = new Map<string, { path: string; sha: string; size?: number }>();
      for (const node of allBlobs) {
        if (!this.deletedPaths.has(node.path)) {
          resultMap.set(node.path, node);
        }
      }

      for (const [path, info] of this.knownFiles.entries()) {
        if (!this.deletedPaths.has(path) && !resultMap.has(path)) {
          resultMap.set(path, { path, sha: info.sha, size: info.size });
        }
      }

      return Array.from(resultMap.values());
    } catch (e) {
      console.error('Failed to fetch GitLab git tree:', e);
      const fallbackList: { path: string; sha: string; size?: number }[] = [];
      for (const [path, info] of this.knownFiles.entries()) {
        if (!this.deletedPaths.has(path)) {
          fallbackList.push({ path, sha: info.sha, size: info.size });
        }
      }
      if (fallbackList.length > 0) return fallbackList;
      throw e;
    }
  }

  /**
   * Read raw file content from GitLab with SHA diff cache
   */
  private async readFile(path: string, sha?: string): Promise<string> {
    try {
      // 1. Cache hit if SHA matches
      if (sha && this.memoryCache[path] && this.memoryCache[path].sha === sha) {
        return this.memoryCache[path].content;
      }

      // 2. Read by blob SHA if available
      if (sha) {
        const blobUrl = `${this.baseUrl}/projects/${this.encodedProjectId}/repository/blobs/${sha}/raw`;
        const res = await this.fetchWithAuth(blobUrl);
        if (res.ok) {
          const content = await res.text();
          this.updateCacheEntry(path, sha, content);
          return content;
        }
      }

      // 3. Fallback to reading file by path
      const encodedPath = encodeFilePath(path);
      const fileUrl = `${this.baseUrl}/projects/${this.encodedProjectId}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(
        this.config.branch
      )}`;

      const res = await this.fetchWithAuth(fileUrl);
      if (res.status === 404) {
        return '';
      }
      if (!res.ok) {
        throw new Error(`Failed to read GitLab file ${path}: ${res.status} ${res.statusText}`);
      }

      const content = await res.text();
      const currentSha = this.fileShaCache.get(path) || sha || '';
      if (currentSha) {
        this.updateCacheEntry(path, currentSha, content);
      }
      return content;
    } catch (e: any) {
      console.error(`Failed to read file ${path}:`, e);
      throw e;
    }
  }

  /**
   * Write/Create/Update file via GitLab Repository Files API
   */
  private async writeFile(path: string, content: string, commitMessage: string): Promise<string> {
    const encodedPath = encodeFilePath(path);
    const fileUrl = `${this.baseUrl}/projects/${this.encodedProjectId}/repository/files/${encodedPath}`;

    // Check if file already exists in known files or remote
    let fileExists = this.knownFiles.has(path) || this.fileShaCache.has(path);

    if (!fileExists) {
      try {
        const headRes = await this.fetchWithAuth(
          `${fileUrl}?ref=${encodeURIComponent(this.config.branch)}`,
          { method: 'HEAD' }
        );
        if (headRes.ok) {
          fileExists = true;
          const blobId = headRes.headers.get('x-gitlab-blob-id');
          if (blobId) this.fileShaCache.set(path, blobId);
        }
      } catch {
        // Assume file does not exist
      }
    }

    const payload = {
      branch: this.config.branch,
      commit_message: commitMessage,
      content,
      encoding: 'text',
    };

    // If file exists, use PUT; otherwise POST
    const method = fileExists ? 'PUT' : 'POST';
    const res = await this.fetchWithAuth(fileUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // If PUT fails with 404, try POST; if POST fails with 400 (already exists), try PUT
    if (!res.ok) {
      if (method === 'PUT' && res.status === 404) {
        const retryRes = await this.fetchWithAuth(fileUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!retryRes.ok) {
          throw new Error(`GitLab create file error: ${retryRes.status} ${retryRes.statusText}`);
        }
      } else if (method === 'POST' && (res.status === 400 || res.status === 409)) {
        const retryRes = await this.fetchWithAuth(fileUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!retryRes.ok) {
          throw new Error(`GitLab update file error: ${retryRes.status} ${retryRes.statusText}`);
        }
      } else {
        const errText = await res.text().catch(() => '');
        throw new Error(`GitLab write file error: ${res.status} ${res.statusText} (${errText})`);
      }
    }

    // Attempt to get latest blob SHA or generate cache signature
    const newSha = this.generateUniqueId();
    this.fileShaCache.set(path, newSha);
    this.updateCacheEntry(path, newSha, content);
    this.knownFiles.set(path, { sha: newSha, size: content.length });
    this.deletedPaths.delete(path);
    return newSha;
  }

  /**
   * Delete file via GitLab Repository Files API
   */
  private async deleteFile(path: string, commitMessage: string): Promise<void> {
    const encodedPath = encodeFilePath(path);
    const fileUrl = `${this.baseUrl}/projects/${this.encodedProjectId}/repository/files/${encodedPath}`;

    const payload = {
      branch: this.config.branch,
      commit_message: commitMessage,
    };

    try {
      const res = await this.fetchWithAuth(fileUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 404) {
        throw new Error(`GitLab delete file error: ${res.status} ${res.statusText}`);
      }
    } finally {
      this.fileShaCache.delete(path);
      this.deleteCacheEntry(path);
      this.knownFiles.delete(path);
      this.deletedPaths.add(path);
    }
  }

  async getCollections(): Promise<CollectionData[]> {
    const tree = await this.fetchTree();
    const collectionFiles = tree.filter(
      (node) => node.path.startsWith(`${COLLECTIONS_DIR}/`) && node.path.endsWith('.md')
    );

    const collections = await Promise.all(
      collectionFiles.map(async (node) => {
        const content = await this.readFile(node.path, node.sha);
        const frontmatter = parseYamlContent(content);

        const filename = node.path.split('/').pop()?.replace(/\.md$/, '') || '';
        const id = frontmatter.id || filename;

        const prefix = `${ITEMS_DIR}/${id}/`;
        const itemCount = tree.filter((n) => n.path.startsWith(prefix) && n.path.endsWith('.md')).length;

        return {
          id,
          filePath: node.path,
          title: frontmatter.title || 'Untitled Collection',
          description: frontmatter.description || '',
          color: frontmatter.color || 'purple',
          createdAt: frontmatter.created_at || new Date().toISOString(),
          itemCount,
          tags: normalizeTags(frontmatter.tags),
        } as CollectionData;
      })
    );

    return collections.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async createCollection(title: string, description = '', tags: string[] = []): Promise<CollectionData> {
    const id = this.generateUniqueId();
    const filePath = `${COLLECTIONS_DIR}/${id}.md`;
    const createdAt = new Date().toISOString();
    const cleanTags = normalizeTags(tags);

    const frontmatter: Record<string, any> = {
      id,
      title: title.trim() || 'New Collection',
      description: description.trim(),
      created_at: createdAt,
    };
    if (cleanTags.length > 0) {
      frontmatter.tags = cleanTags;
    }

    const content = stringifyFrontmatter(frontmatter, `# ${title}\n`);
    await this.writeFile(filePath, content, `chore(todo): create collection "${title}"`);

    return {
      id,
      filePath,
      title: frontmatter.title,
      description: frontmatter.description,
      createdAt,
      itemCount: 0,
      tags: cleanTags,
    };
  }

  async updateCollection(collection: CollectionData): Promise<void> {
    const filePath = collection.filePath || `${COLLECTIONS_DIR}/${collection.id}.md`;
    const content = await this.readFile(filePath);
    const frontmatter = parseYamlContent(content);

    frontmatter.title = collection.title.trim();
    frontmatter.description = (collection.description || '').trim();
    const cleanTags = normalizeTags(collection.tags);
    if (cleanTags.length > 0) {
      frontmatter.tags = cleanTags;
    } else {
      delete frontmatter.tags;
    }
    if (collection.color) {
      frontmatter.color = collection.color;
    }

    const body = extractBodyContent(content);
    const newContent = stringifyFrontmatter(frontmatter, body);
    await this.writeFile(filePath, newContent, `chore(todo): update collection "${collection.title}"`);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const filePath = `${COLLECTIONS_DIR}/${collectionId}.md`;
    await this.deleteFile(filePath, `chore(todo): delete collection ${collectionId}`);

    const tree = await this.fetchTree();
    const prefix = `${ITEMS_DIR}/${collectionId}/`;
    const itemFiles = tree.filter((n) => n.path.startsWith(prefix));
    await Promise.all(
      itemFiles.map((itemFile) =>
        this.deleteFile(itemFile.path, `chore(todo): delete item ${itemFile.path}`)
      )
    );
  }

  async getItems(collectionId: string, passedTree?: { path: string; sha: string; size?: number }[]): Promise<ItemData[]> {
    const tree = passedTree || (await this.fetchTree());
    const prefix = `${ITEMS_DIR}/${collectionId}/`;
    const itemFiles = tree.filter((node) => node.path.startsWith(prefix) && node.path.endsWith('.md'));

    const items = await Promise.all(
      itemFiles.map(async (node) => {
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

        return {
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
        } as ItemData;
      })
    );

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
    const tree = await this.fetchTree();
    const itemFiles = tree.filter(
      (node) => node.path.startsWith(`${ITEMS_DIR}/`) && node.path.endsWith('.md')
    );

    const items = await Promise.all(
      itemFiles.map(async (node) => {
        const parts = node.path.split('/');
        const collectionId = parts.length >= 3 ? parts[parts.length - 2] : '';
        const filename = parts.pop()?.replace(/\.md$/, '') || '';

        const content = await this.readFile(node.path, node.sha);
        const frontmatter = parseYamlContent(content);

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

        return {
          id: frontmatter.id || filename,
          collectionId: frontmatter.collection_id || collectionId,
          filePath: node.path,
          title: frontmatter.title || 'Untitled Item',
          type: frontmatter.type,
          template: frontmatter.template,
          status: frontmatter.status === 'done' ? 'done' : 'todo',
          description: frontmatter.description || '',
          createdAt: frontmatter.created_at || new Date().toISOString(),
          todos,
        } as ItemData;
      })
    );

    const matchedItems = items.filter((item) => item.type === typeId);
    return matchedItems.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async getAllAgendaItems(): Promise<AgendaTodoItem[]> {
    const tree = await this.fetchTree();

    const collectionFiles = tree.filter(
      (node) => node.path.startsWith(`${COLLECTIONS_DIR}/`) && node.path.endsWith('.md')
    );

    const collections = await Promise.all(
      collectionFiles.map(async (node) => {
        const content = await this.readFile(node.path, node.sha);
        const frontmatter = parseYamlContent(content);
        const filename = node.path.split('/').pop()?.replace(/\.md$/, '') || '';
        const id = frontmatter.id || filename;
        const prefix = `${ITEMS_DIR}/${id}/`;
        const itemCount = tree.filter((n) => n.path.startsWith(prefix) && n.path.endsWith('.md')).length;

        return {
          id,
          filePath: node.path,
          title: frontmatter.title || 'Untitled Collection',
          description: frontmatter.description || '',
          color: frontmatter.color || 'purple',
          createdAt: frontmatter.created_at || new Date().toISOString(),
          itemCount,
          tags: normalizeTags(frontmatter.tags),
        } as CollectionData;
      })
    );

    const collectionMap = new Map<string, CollectionData>();
    for (const col of collections) {
      collectionMap.set(col.id, col);
    }

    const itemFiles = tree.filter(
      (node) => node.path.startsWith(`${ITEMS_DIR}/`) && node.path.endsWith('.md')
    );

    const items = await Promise.all(
      itemFiles.map(async (node) => {
        const parts = node.path.split('/');
        const collectionId = parts.length >= 3 ? parts[parts.length - 2] : '';
        const filename = parts.pop()?.replace(/\.md$/, '') || '';

        const content = await this.readFile(node.path, node.sha);
        const frontmatter = parseYamlContent(content);

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

        return {
          id: frontmatter.id || filename,
          collectionId: frontmatter.collection_id || collectionId,
          filePath: node.path,
          title: frontmatter.title || 'Untitled Item',
          type: frontmatter.type,
          template: frontmatter.template,
          status: frontmatter.status === 'done' ? 'done' : 'todo',
          description: frontmatter.description || '',
          createdAt: frontmatter.created_at || new Date().toISOString(),
          todos,
        } as ItemData;
      })
    );

    const agendaItems: AgendaTodoItem[] = [];
    for (const item of items) {
      const col = collectionMap.get(item.collectionId) || {
        id: item.collectionId,
        filePath: `${COLLECTIONS_DIR}/${item.collectionId}.md`,
        title: 'Unknown Collection',
        description: '',
        color: 'purple',
        createdAt: new Date().toISOString(),
        itemCount: 0,
        tags: [],
      };

      for (const todo of item.todos) {
        agendaItems.push({
          todo,
          item,
          collection: col,
        });
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

  /**
   * Batch synchronize multiple file changes in a single Git commit via GitLab Commits API
   */
  async batchSync(items: BatchSyncItem[], commitMessage?: string): Promise<void> {
    if (!items || items.length === 0) return;

    const defaultMsg =
      items.length === 1
        ? `chore(todo): sync 1 file (${items[0].action} ${items[0].filePath})`
        : `chore(todo): batch sync ${items.length} changes`;
    const message = commitMessage || defaultMsg;

    try {
      const commitUrl = `${this.baseUrl}/projects/${this.encodedProjectId}/repository/commits`;
      const actions: Array<{
        action: 'create' | 'update' | 'delete';
        file_path: string;
        content?: string;
        encoding?: 'text';
      }> = [];

      for (const item of items) {
        if (item.action === 'delete') {
          actions.push({
            action: 'delete',
            file_path: item.filePath.replace(/^\/+/, ''),
          });
        } else {
          const exists = this.knownFiles.has(item.filePath) || this.fileShaCache.has(item.filePath);
          actions.push({
            action: exists ? 'update' : 'create',
            file_path: item.filePath.replace(/^\/+/, ''),
            content: item.content ?? '',
            encoding: 'text',
          });
        }
      }

      const res = await this.fetchWithAuth(commitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: this.config.branch || 'main',
          commit_message: message,
          actions,
        }),
      });

      if (res.ok) {
        for (const item of items) {
          if (item.action === 'delete') {
            this.fileShaCache.delete(item.filePath);
            this.deleteCacheEntry(item.filePath);
            this.knownFiles.delete(item.filePath);
            this.deletedPaths.add(item.filePath);
          } else {
            const fakeSha = this.generateUniqueId();
            this.deletedPaths.delete(item.filePath);
            this.fileShaCache.set(item.filePath, fakeSha);
            this.updateCacheEntry(item.filePath, fakeSha, item.content || '');
            this.knownFiles.set(item.filePath, { sha: fakeSha, size: (item.content || '').length });
          }
        }
        return;
      }

      console.warn(
        `[GitLabStorageAdapter] Commits API batch commit failed (${res.status} ${res.statusText}), falling back to sequential writes`
      );
    } catch (e) {
      console.warn(
        `[GitLabStorageAdapter] Commits API batch commit error, falling back to sequential writes:`,
        e
      );
    }

    // Fallback: execute one by one
    for (const item of items) {
      if (item.action === 'delete') {
        await this.deleteFile(item.filePath, `chore(todo): delete ${item.filePath}`);
      } else {
        await this.writeFile(
          item.filePath,
          item.content || '',
          `chore(todo): update ${item.filePath}`
        );
      }
    }
  }
}
