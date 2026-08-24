import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Plus, Calendar, Check } from 'lucide-react';
import { ItemData } from '../../types';
import { ItemTemplate, TemplateCheckResult, TemplateTodoDef } from './types';
import { checkTemplateStatus } from './templateUtils';

interface TemplateAlertBannerProps {
  item: ItemData;
  template?: ItemTemplate | null;
  onAddMissingTodo: (tplTodo: TemplateTodoDef) => void;
  onAddAllMissingTodos: (missingTodos: TemplateTodoDef[]) => void;
}

export const TemplateAlertBanner: React.FC<TemplateAlertBannerProps> = ({
  item,
  template,
  onAddMissingTodo,
  onAddAllMissingTodos,
}) => {
  if (!template) return null;

  const result: TemplateCheckResult = checkTemplateStatus(item, template);

  if (result.isComplete) {
    return (
      <div className="template-alert-banner complete">
        <div className="banner-header">
          <CheckCircle2 size={15} className="banner-icon-success" />
          <span className="banner-title">
            テンプレートTODO充足中 ({result.matchedTodosCount}/{result.totalTemplateTodosCount})
          </span>
        </div>
      </div>
    );
  }

  const hasMissingTodos = result.missingTodos.length > 0;
  const hasMissingDue = result.missingDueTodos.length > 0;

  return (
    <div className="template-alert-banner warning">
      <div className="banner-header">
        <AlertTriangle size={15} className="banner-icon-warning" />
        <span className="banner-title">
          テンプレートチェック ({result.matchedTodosCount}/{result.totalTemplateTodosCount} 充足)
        </span>
      </div>

      <div className="banner-body">
        {/* Missing Due Dates */}
        {hasMissingDue && (
          <div className="banner-issue-group">
            <div className="issue-label">
              <Calendar size={13} />
              <span>期日未設定 ({result.missingDueTodos.length}件):</span>
            </div>
            <ul className="issue-list">
              {result.missingDueTodos.map((todo) => (
                <li key={todo.id} className="issue-item">
                  <span className="issue-todo-name">「{todo.title || '無題のタスク'}」</span>
                  <span className="issue-hint">の日付が決まっていません</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Todos */}
        {hasMissingTodos && (
          <div className="banner-issue-group">
            <div className="issue-label">
              <AlertCircle size={13} />
              <span>不足しているTODO ({result.missingTodos.length}件):</span>
            </div>
            <ul className="issue-list">
              {result.missingTodos.map((missing, idx) => (
                <li key={idx} className="issue-item flex-between">
                  <span className="issue-todo-name">
                    「{missing.title}」
                    {missing.group && <span className="issue-group-tag">[{missing.group}]</span>}
                  </span>
                  <button
                    className="subtle-btn-add-single"
                    onClick={() => onAddMissingTodo(missing)}
                    title="このTODOを追加"
                  >
                    <Plus size={11} />
                    <span>追加</span>
                  </button>
                </li>
              ))}
            </ul>

            {result.missingTodos.length > 1 && (
              <div className="banner-actions">
                <button
                  className="nav-btn primary-btn sm-btn add-all-missing-btn"
                  onClick={() => onAddAllMissingTodos(result.missingTodos)}
                >
                  <Plus size={13} />
                  <span>不足TODOをすべて補完 ({result.missingTodos.length}件)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
