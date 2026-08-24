import { App, ItemView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { VIEW_TYPE_TODO_CALENDAR } from './constants';
import { AppView } from './components/AppView';
import { StorageManager } from './storage';
import { DEFAULT_SETTINGS, PluginSettings } from './types';
import './styles.css';

export class TodoCalendarView extends ItemView {
  private root: Root | null = null;
  private plugin: TodoCalendarPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: TodoCalendarPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_TODO_CALENDAR;
  }

  getDisplayText(): string {
    return 'TODO カレンダー';
  }

  getIcon(): string {
    return 'calendar';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('todo-calendar-view-container');

    this.root = createRoot(container);
    this.root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(AppView, {
          app: this.app,
          plugin: this.plugin,
          settings: this.plugin.settings,
        })
      )
    );
  }

  async onClose(): Promise<void> {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

export class TodoCalendarSettingTab extends PluginSettingTab {
  plugin: TodoCalendarPlugin;

  constructor(app: App, plugin: TodoCalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'TODO カレンダー 設定' });

    new Setting(containerEl)
      .setName('タイプ & テンプレート機能の有効化')
      .setDesc(
        'アクションにタイプ（リリース、見積等）を付与し、テンプレートTODOの自動セットや抜け漏れ・期日未設定の警告機能を利用可能にします。プライベート用途等で不要な場合はOFFにしてください。'
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableItemTypes).onChange(async (value) => {
          this.plugin.settings.enableItemTypes = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

export default class TodoCalendarPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private settingsListeners: Array<(settings: PluginSettings) => void> = [];

  async onload(): Promise<void> {
    console.log('Loading TODO Calendar Matrix Plugin...');
    await this.loadSettings();

    // Register view
    this.registerView(
      VIEW_TYPE_TODO_CALENDAR,
      (leaf: WorkspaceLeaf) => new TodoCalendarView(leaf, this)
    );

    // Add settings tab
    this.addSettingTab(new TodoCalendarSettingTab(this.app, this));

    // Add ribbon icon
    this.addRibbonIcon('calendar', 'TODO カレンダーを開く', () => {
      this.activateView();
    });

    // Add command palette item
    this.addCommand({
      id: 'open-todo-calendar-matrix',
      name: 'TODO カレンダーマトリクスを開く',
      callback: () => {
        this.activateView();
      },
    });

    // Ensure sample seed data exists on first load
    this.app.workspace.onLayoutReady(async () => {
      await this.ensureInitialSeedData();
    });
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TODO_CALENDAR);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf('tab');
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_TODO_CALENDAR,
          active: true,
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private async ensureInitialSeedData(): Promise<void> {
    const storage = new StorageManager(this.app);
    await storage.ensureDirectoriesExist();

    const collections = await storage.getCollections();
    if (collections.length === 0) {
      const col = await storage.createCollection(
        'サンプルプロジェクト',
        'TODOカレンダープラグインの動作確認用サンプル'
      );

      const item1 = await storage.createItem(col.id, 'UI ＆ フロントエンド実装');
      const todayStr = new Date().toISOString().split('T')[0];

      const d1 = new Date();
      d1.setDate(d1.getDate() + 1);
      const day1Str = d1.toISOString().split('T')[0];

      const d2 = new Date();
      d2.setDate(d2.getDate() + 3);
      const day2Str = d2.toISOString().split('T')[0];

      item1.todos = [
        {
          id: `todo-${Date.now()}-1`,
          title: 'カレンダーマトリクス確認',
          due: todayStr,
          status: 'done',
          description: 'セル内1行TODO表示のテスト',
        },
        {
          id: `todo-${Date.now()}-2`,
          title: '右サイド詳細フォーム動作検証',
          due: todayStr,
          status: 'todo',
          description: 'Frontmatterリアルタイム同期',
        },
        {
          id: `todo-${Date.now()}-3`,
          title: '日付移動ナビゲーション確認',
          due: day1Str,
          status: 'todo',
          description: '前週/次週への切り替え',
        },
      ];
      await storage.updateItem(item1);

      const item2 = await storage.createItem(col.id, 'バックエンド ＆ ストレージ開発');
      item2.todos = [
        {
          id: `todo-${Date.now()}-4`,
          title: 'Frontmatter YAML解析処理',
          due: todayStr,
          status: 'done',
          description: '衝突防止ファイル名生成',
        },
        {
          id: `todo-${Date.now()}-5`,
          title: 'データ保存テスト',
          due: day2Str,
          status: 'todo',
          description: '_todo-calendar/ 配下への保存確認',
        },
      ];
      await storage.updateItem(item2);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.notifySettingsChange();
  }

  onSettingsChange(listener: (settings: PluginSettings) => void): () => void {
    this.settingsListeners.push(listener);
    return () => {
      this.settingsListeners = this.settingsListeners.filter((l) => l !== listener);
    };
  }

  private notifySettingsChange(): void {
    for (const listener of this.settingsListeners) {
      listener(this.settings);
    }
  }

  onunload(): void {
    console.log('Unloading TODO Calendar Matrix Plugin...');
    this.settingsListeners = [];
  }
}
