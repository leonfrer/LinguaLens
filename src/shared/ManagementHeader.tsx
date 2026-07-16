import { t } from './i18n';
import './management.css';

type ManagementPage = 'saved' | 'settings';

export function ManagementHeader({ activePage }: { activePage: ManagementPage }) {
  return (
    <div className="managementTopbar">
      <a className="managementBrand" href="saved.html">
        <img src="icons/icon48.png" alt="" />
        <span>LinguaLens</span>
      </a>
      <nav className="managementNav" aria-label={t('managementNavAriaLabel')}>
        <a
          aria-current={activePage === 'saved' ? 'page' : undefined}
          className="managementNavLink"
          href="saved.html"
        >
          {t('savedPageTitle')}
        </a>
        <a
          aria-current={activePage === 'settings' ? 'page' : undefined}
          className="managementNavLink"
          href="settings.html"
        >
          {t('settingsTitle')}
        </a>
      </nav>
    </div>
  );
}
