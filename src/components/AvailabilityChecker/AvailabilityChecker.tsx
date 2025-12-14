import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  checkDomainAvailability, 
  checkSocialAvailability,
  DomainCheckResult,
  SocialCheckResult,
  PLATFORM_ICONS
} from '../../services/availability';

interface AvailabilityCheckerProps {
  name: string;
  compact?: boolean;
  onCheck?: (domains: DomainCheckResult[], socials: SocialCheckResult[]) => void;
}

export default function AvailabilityChecker({ name, compact = false, onCheck }: AvailabilityCheckerProps) {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<DomainCheckResult[]>([]);
  const [socials, setSocials] = useState<SocialCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const runCheck = async () => {
    if (!name || name.length < 2) return;
    
    setIsChecking(true);
    try {
      const [domainResults, socialResults] = await Promise.all([
        checkDomainAvailability(name, ['com', 'ru', 'io']),
        checkSocialAvailability(name, ['instagram', 'telegram', 'x']),
      ]);
      
      setDomains(domainResults);
      setSocials(socialResults);
      setHasChecked(true);
      onCheck?.(domainResults, socialResults);
    } catch (error) {
      console.error('Availability check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check in compact mode when name changes
  useEffect(() => {
    if (compact && name) {
      const timer = setTimeout(runCheck, 1000);
      return () => clearTimeout(timer);
    }
  }, [name, compact]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Domain indicators */}
        {domains.map((d) => (
          <a
            key={d.domain}
            href={`https://www.namecheap.com/domains/registration/results/?domain=${d.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
              d.available 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
            title={d.available ? 'Possibly available' : 'Likely taken'}
          >
            .{d.domain.split('.').pop()}
          </a>
        ))}
        
        {/* Social indicators */}
        {socials.map((s) => {
          const platform = PLATFORM_ICONS[s.platform];
          return (
            <a
              key={s.platform}
              href={s.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Check @${name.toLowerCase().replace(/[^a-z0-9]/g, '')} on ${platform.name}`}
              style={{ color: platform.color }}
            >
              <span 
                className="w-4 h-4 block"
                dangerouslySetInnerHTML={{ __html: platform.icon }}
              />
            </a>
          );
        })}
        
        {!hasChecked && !isChecking && (
          <button
            onClick={runCheck}
            className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400"
          >
            Check
          </button>
        )}
        
        {isChecking && (
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('availability.title', 'Availability Check')}
        </h3>
        <button
          onClick={runCheck}
          disabled={isChecking || !name}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isChecking ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('availability.checking', 'Checking...')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('availability.check', 'Check Availability')}
            </>
          )}
        </button>
      </div>

      {/* Domain Results */}
      {domains.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('availability.domains', 'Domain Names')}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {domains.map((d) => {
              return (
                <a
                  key={d.domain}
                  href={`https://www.namecheap.com/domains/registration/results/?domain=${d.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    d.available
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {d.domain}
                    </span>
                    {d.available ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {d.available 
                      ? t('availability.available', 'Possibly available')
                      : t('availability.taken', 'Likely taken')}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Social Results */}
      {socials.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('availability.socials', 'Social Media Handles')}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {socials.map((s) => {
              const platform = PLATFORM_ICONS[s.platform];
              
              return (
                <a
                  key={s.platform}
                  href={s.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-md bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="w-5 h-5"
                      style={{ color: platform.color }}
                      dangerouslySetInnerHTML={{ __html: platform.icon }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {platform.name}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {s.handle}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    {t('availability.clickToCheck', 'Click to verify →')}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {!hasChecked && !isChecking && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <p>{t('availability.hint', 'Click "Check Availability" to see domain and social media availability')}</p>
        </div>
      )}
    </div>
  );
}
