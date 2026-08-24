import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, Layers, Check, Edit2 } from 'lucide-react';
import { ItemType, ItemTemplate, TemplateTodoDef } from './types';
import { renderTypeIcon } from './TypeBadge';

interface TemplateSettingsModalProps {
  isOpen: boolean;
  types: ItemType[];
  onClose: () => void;
  onSave: (types: ItemType[]) => Promise<void>;
}

const AVAILABLE_COLORS = ['blue', 'green', 'purple', 'orange', 'red', 'cyan'];
const AVAILABLE_ICONS = ['rocket', 'calculator', 'alert-triangle', 'check-square', 'zap', 'shield', 'bookmark', 'tag'];

export const TemplateSettingsModal: React.FC<TemplateSettingsModalProps> = ({
  isOpen,
  types,
  onClose,
  onSave,
}) => {
  const [localTypes, setLocalTypes] = useState<ItemType[]>(() => JSON.parse(JSON.stringify(types)));
  const [selectedTypeId, setSelectedTypeId] = useState<string>(types[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    types[0]?.templates[0]?.id || ''
  );

  // New item states
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoGroup, setNewTodoGroup] = useState('');

  if (!isOpen) return null;

  const currentType = localTypes.find((t) => t.id === selectedTypeId) || localTypes[0];
  const currentTemplate =
    currentType?.templates.find((tpl) => tpl.id === selectedTemplateId) ||
    currentType?.templates[0];

  const handleAddType = () => {
    const newTypeId = `type_${Date.now()}`;
    const newTemplateId = `tpl_${Date.now()}`;
    const newType: ItemType = {
      id: newTypeId,
      name: '新規タイプ',
      icon: 'tag',
      color: 'blue',
      templates: [
        {
          id: newTemplateId,
          name: '通常テンプレート',
          todos: [{ title: '新規タスク', group: '一般' }],
        },
      ],
    };

    setLocalTypes((prev) => [...prev, newType]);
    setSelectedTypeId(newTypeId);
    setSelectedTemplateId(newTemplateId);
  };

  const handleDeleteType = (typeId: string) => {
    if (localTypes.length <= 1) {
      alert('最低1つのタイプが必要です。');
      return;
    }
    if (!confirm('このタイプと関連するテンプレートを削除しますか？')) return;

    const filtered = localTypes.filter((t) => t.id !== typeId);
    setLocalTypes(filtered);
    setSelectedTypeId(filtered[0]?.id || '');
    setSelectedTemplateId(filtered[0]?.templates[0]?.id || '');
  };

  const handleUpdateType = (fields: Partial<ItemType>) => {
    if (!currentType) return;
    setLocalTypes((prev) =>
      prev.map((t) => (t.id === currentType.id ? { ...t, ...fields } : t))
    );
  };

  const handleAddTemplate = () => {
    if (!currentType) return;
    const newTemplateId = `tpl_${Date.now()}`;
    const newTpl: ItemTemplate = {
      id: newTemplateId,
      name: '新規テンプレート',
      todos: [{ title: 'タスク1', group: '' }],
    };

    const updated = {
      ...currentType,
      templates: [...currentType.templates, newTpl],
    };

    setLocalTypes((prev) => prev.map((t) => (t.id === currentType.id ? updated : t)));
    setSelectedTemplateId(newTemplateId);
  };

  const handleDeleteTemplate = (tplId: string) => {
    if (!currentType) return;
    if (currentType.templates.length <= 1) {
      alert('1つのタイプに最低1つのテンプレートが必要です。');
      return;
    }
    if (!confirm('このテンプレートを削除しますか？')) return;

    const filteredTpls = currentType.templates.filter((tpl) => tpl.id !== tplId);
    const updated = { ...currentType, templates: filteredTpls };
    setLocalTypes((prev) => prev.map((t) => (t.id === currentType.id ? updated : t)));
    setSelectedTemplateId(filteredTpls[0]?.id || '');
  };

  const handleUpdateTemplateName = (name: string) => {
    if (!currentType || !currentTemplate) return;
    const updatedTpls = currentType.templates.map((tpl) =>
      tpl.id === currentTemplate.id ? { ...tpl, name } : tpl
    );
    setLocalTypes((prev) =>
      prev.map((t) => (t.id === currentType.id ? { ...t, templates: updatedTpls } : t))
    );
  };

  const handleAddTodoToTemplate = () => {
    if (!currentType || !currentTemplate || !newTodoTitle.trim()) return;

    const newTodoDef: TemplateTodoDef = {
      title: newTodoTitle.trim(),
      group: newTodoGroup.trim() || undefined,
    };

    const updatedTpls = currentType.templates.map((tpl) => {
      if (tpl.id === currentTemplate.id) {
        return { ...tpl, todos: [...tpl.todos, newTodoDef] };
      }
      return tpl;
    });

    setLocalTypes((prev) =>
      prev.map((t) => (t.id === currentType.id ? { ...t, templates: updatedTpls } : t))
    );

    setNewTodoTitle('');
    setNewTodoGroup('');
  };

  const handleDeleteTodoFromTemplate = (index: number) => {
    if (!currentType || !currentTemplate) return;
    const updatedTodos = currentTemplate.todos.filter((_, idx) => idx !== index);

    const updatedTpls = currentType.templates.map((tpl) =>
      tpl.id === currentTemplate.id ? { ...tpl, todos: updatedTodos } : tpl
    );

    setLocalTypes((prev) =>
      prev.map((t) => (t.id === currentType.id ? { ...t, templates: updatedTpls } : t))
    );
  };

  const handleUpdateTodoInTemplate = (index: number, fields: Partial<TemplateTodoDef>) => {
    if (!currentType || !currentTemplate) return;
    const updatedTodos = currentTemplate.todos.map((todo, idx) =>
      idx === index ? { ...todo, ...fields } : todo
    );

    const updatedTpls = currentType.templates.map((tpl) =>
      tpl.id === currentTemplate.id ? { ...tpl, todos: updatedTodos } : tpl
    );

    setLocalTypes((prev) =>
      prev.map((t) => (t.id === currentType.id ? { ...t, templates: updatedTpls } : t))
    );
  };

  const handleSave = async () => {
    await onSave(localTypes);
    onClose();
  };

  return (
    <div className="todo-cal-modal-backdrop">
      <div className="todo-cal-modal-content template-settings-modal">
        <div className="modal-header">
          <h3>⚙️ タイプ & テンプレート管理</h3>
          <button className="icon-btn" onClick={onClose} title="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="template-settings-body">
          {/* Left: Types Sidebar */}
          <div className="settings-sidebar">
            <div className="sidebar-section-title">
              <span>タイプ一覧</span>
              <button className="icon-btn-sm" onClick={handleAddType} title="新規タイプ追加">
                <Plus size={14} />
              </button>
            </div>
            <div className="types-list">
              {localTypes.map((type) => (
                <div
                  key={type.id}
                  className={`type-nav-item ${type.id === currentType?.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTypeId(type.id);
                    setSelectedTemplateId(type.templates[0]?.id || '');
                  }}
                >
                  <span className={`type-color-dot dot-${type.color || 'blue'}`} />
                  <span className="type-nav-name">{type.name}</span>
                  <span className="type-tpl-count">({type.templates.length})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Main Editor Pane */}
          {currentType && (
            <div className="settings-editor-pane">
              {/* Type Metadata Editor */}
              <div className="editor-card">
                <div className="card-header-row">
                  <h4>タイプ設定</h4>
                  <button
                    className="icon-btn danger-btn"
                    onClick={() => handleDeleteType(currentType.id)}
                    title="このタイプを削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="form-row-compact">
                  <div className="form-group flex-2">
                    <label>タイプ名</label>
                    <input
                      type="text"
                      className="todo-cal-form-input"
                      value={currentType.name}
                      onChange={(e) => handleUpdateType({ name: e.target.value })}
                      placeholder="例: リリース"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>アイコン</label>
                    <select
                      className="todo-cal-form-input"
                      value={currentType.icon || 'tag'}
                      onChange={(e) => handleUpdateType({ icon: e.target.value })}
                    >
                      {AVAILABLE_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>カラー</label>
                    <select
                      className="todo-cal-form-input"
                      value={currentType.color || 'blue'}
                      onChange={(e) => handleUpdateType({ color: e.target.value })}
                    >
                      {AVAILABLE_COLORS.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Template Tabs & Editor */}
              <div className="editor-card">
                <div className="card-header-row">
                  <div className="template-tab-bar">
                    {currentType.templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        className={`template-tab-btn ${
                          tpl.id === currentTemplate?.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                      >
                        {tpl.name}
                      </button>
                    ))}
                    <button
                      className="template-tab-add-btn"
                      onClick={handleAddTemplate}
                      title="テンプレート追加"
                    >
                      <Plus size={13} />
                      <span>追加</span>
                    </button>
                  </div>

                  {currentTemplate && (
                    <button
                      className="icon-btn danger-btn"
                      onClick={() => handleDeleteTemplate(currentTemplate.id)}
                      title="このテンプレートを削除"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {currentTemplate && (
                  <div className="template-content-editor">
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label>テンプレート名</label>
                      <input
                        type="text"
                        className="todo-cal-form-input"
                        value={currentTemplate.name}
                        onChange={(e) => handleUpdateTemplateName(e.target.value)}
                        placeholder="例: 通常リリース（標準審査）"
                      />
                    </div>

                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      TODOタスク項目定義 ({currentTemplate.todos.length}件)
                    </label>

                    <div className="template-todos-list">
                      {currentTemplate.todos.map((todo, idx) => (
                        <div key={idx} className="tpl-todo-item-row">
                          <input
                            type="text"
                            className="tpl-todo-title-input"
                            value={todo.title}
                            onChange={(e) =>
                              handleUpdateTodoInTemplate(idx, { title: e.target.value })
                            }
                            placeholder="TODOタイトル..."
                          />
                          <input
                            type="text"
                            className="tpl-todo-group-input"
                            value={todo.group || ''}
                            onChange={(e) =>
                              handleUpdateTodoInTemplate(idx, { group: e.target.value })
                            }
                            placeholder="グループ(任意)"
                            title="グループ名"
                          />
                          <button
                            className="icon-btn danger-btn"
                            onClick={() => handleDeleteTodoFromTemplate(idx)}
                            title="削除"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Inline Add Todo to Template */}
                    <div className="add-tpl-todo-row">
                      <input
                        type="text"
                        className="tpl-todo-title-input"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        placeholder="＋ 新しいTODOタスク名を入力..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTodoToTemplate();
                        }}
                      />
                      <input
                        type="text"
                        className="tpl-todo-group-input"
                        value={newTodoGroup}
                        onChange={(e) => setNewTodoGroup(e.target.value)}
                        placeholder="グループ(任意)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTodoToTemplate();
                        }}
                      />
                      <button
                        type="button"
                        className="nav-btn primary-btn sm-btn"
                        onClick={handleAddTodoToTemplate}
                      >
                        <Plus size={13} />
                        <span>追加</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="todo-cal-modal-actions">
          <button type="button" className="nav-btn secondary-btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="nav-btn primary-btn" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
