import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { deleteSavedItem, getSavedItems, getSettings, updateSettings } from '../shared/storage';
import type { SavedItem, TargetLanguage } from '../shared/types';
import './styles.css';

function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('zh-CN');
  const [isLoading, setIsLoading] = useState(true);
  const recentItems = useMemo(() => items.slice(0, 20), [items]);

  useEffect(() => {
    let isMounted = true;

    async function loadPopupData() {
      const [savedItems, settings] = await Promise.all([getSavedItems(), getSettings()]);

      if (!isMounted) {
        return;
      }

      setItems(savedItems);
      setTargetLanguage(settings.targetLanguage);
      setIsLoading(false);
    }

    void loadPopupData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleTargetLanguageChange(nextLanguage: TargetLanguage) {
    setTargetLanguage(nextLanguage);
    await updateSettings({ targetLanguage: nextLanguage });
  }

  async function handleDelete(itemId: string) {
    await deleteSavedItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  return (
    <main className="popup">
      <header className="header">
        <div>
          <h1>LinguaLens</h1>
          <p>最近保存</p>
        </div>
        <label className="languageControl">
          <span>目标</span>
          <select
            value={targetLanguage}
            onChange={(event) => {
              void handleTargetLanguageChange(event.target.value as TargetLanguage);
            }}
          >
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </label>
      </header>

      {isLoading ? <p className="empty">加载中...</p> : null}

      {!isLoading && recentItems.length === 0 ? (
        <p className="empty">在网页中选中文本即可查看模拟翻译并保存。</p>
      ) : null}

      <section className="savedList" aria-label="最近保存的内容">
        {recentItems.map((item) => (
          <article className="savedItem" key={item.id}>
            <div className="savedText">
              <p className="sourceText">{item.text}</p>
              <p className="translationText">{item.translation}</p>
              <p className="metaText">
                {item.sourceTitle || new URL(item.sourceUrl).hostname}
              </p>
            </div>
            <button
              aria-label={`删除 ${item.text}`}
              className="deleteButton"
              type="button"
              onClick={() => {
                void handleDelete(item.id);
              }}
            >
              x
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
