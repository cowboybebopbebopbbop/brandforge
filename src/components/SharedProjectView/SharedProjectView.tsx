import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSharedProject, SharedProject } from '../../services/sharing';
import { GeneratedName } from '../../store';
import BrandPreview from '../BrandPreview/BrandPreview';
import ClientFeedback from '../ClientFeedback/ClientFeedback';

interface SharedProjectViewProps {
  shareId: string;
}

export default function SharedProjectView({ shareId }: SharedProjectViewProps) {
  const { t } = useTranslation();
  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackName, setFeedbackName] = useState<GeneratedName | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const sharedProject = await getSharedProject(shareId);
        
        if (!sharedProject) {
          setError(t('share.notFound', 'Shared project not found or has been deleted'));
          return;
        }

        if (!sharedProject.shareInfo.isActive) {
          setError(t('share.inactive', 'This share link has been deactivated'));
          return;
        }

        setProject(sharedProject);
      } catch (err) {
        console.error('Error loading shared project:', err);
        setError(t('share.loadError', 'Failed to load shared project'));
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [shareId, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('share.loading', 'Loading shared project...')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('share.oops', 'Oops!')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('share.goHome', 'Go to BrandForge')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.shareInfo.projectName}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  project.shareInfo.shareType === 'favorites-only'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                }`}>
                  {project.shareInfo.shareType === 'favorites-only' ? '⭐ Client View' : '💼 Full Project'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('share.sharedBy', 'Shared by')} {project.shareInfo.ownerName}
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {t('share.createYourOwn', 'Create your own')} →
            </a>
          </div>
        </div>
      </div>

      {/* Names Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client View - Favorites Only */}
        {project.shareInfo.shareType === 'favorites-only' ? (
          project.favorites.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <p className="text-gray-500 dark:text-gray-400">
                {t('share.noFavorites', 'No favorites selected yet')}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('share.selectedNames', 'Selected Names for Your Review')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('share.clientInstructions', 'Please review these names and provide your feedback.')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {project.favorites.map((name) => (
                  <div
                    key={name.name}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {name.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        ⭐
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {name.type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {name.rationale}
                    </p>

                    <BrandPreview name={name.name} />
                    
                    {/* Client Feedback Button */}
                    {project.shareInfo.permission === 'comment' && (
                      <button
                        onClick={() => setFeedbackName(name)}
                        className="mt-4 w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        {name.clientFeedback?.status
                          ? t('share.updateFeedback', 'Update Feedback')
                          : t('share.giveFeedback', 'Give Feedback')}
                      </button>
                    )}
                    
                    {/* Show existing feedback status */}
                    {name.clientFeedback?.status && (
                      <div className={`mt-3 p-2 rounded-lg text-xs ${
                        name.clientFeedback.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : name.clientFeedback.status === 'rejected'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                      }`}>
                        {t(`clientFeedback.${name.clientFeedback.status}`, name.clientFeedback.status)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          /* Full Project View - Everything */
          <>
            {(!project.project.generatedNames || project.project.generatedNames.length === 0) && project.favorites.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  {t('share.noNames', 'No names in this project')}
                </p>
              </div>
            ) : (
              <>
                {/* Brief Section for Full Project */}
                {project.project.name && (
                  <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t('share.projectBrief', 'Project Brief')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {t('share.projectName', 'Project')}:
                        </span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {project.project.name}
                        </span>
                      </div>
                      {project.project.config.industry && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {t('wizard.industry', 'Industry')}:
                          </span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {project.project.config.industry}
                          </span>
                        </div>
                      )}
                      {project.project.config.northStar && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {t('wizard.northStar', 'North Star')}:
                          </span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {project.project.config.northStar}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Show favorited names first */}
                  {project.favorites.map((name) => (
                    <div
                      key={name.name}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {name.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          ⭐ {t('share.favorited', 'Favorited')}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {name.type}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {name.rationale}
                      </p>

                      <BrandPreview name={name.name} />
                    </div>
                  ))}
                  
                  {/* Then show other names */}
                  {project.project.generatedNames?.filter((name: GeneratedName) => 
                    !project.favorites.some(fav => fav.name === name.name)
                  ).map((name: GeneratedName) => (
                    <div
                      key={name.name}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {name.name}
                        </h3>
                      </div>
                      
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {name.type}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {name.rationale}
                      </p>

                      <BrandPreview name={name.name} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Client Feedback Modal */}
      {feedbackName && (
        <ClientFeedback
          name={feedbackName}
          onUpdate={(updates) => {
            // Update would need to sync back to Firebase in real implementation
            console.log('Feedback update:', updates);
            setFeedbackName(null);
          }}
          onClose={() => setFeedbackName(null)}
        />
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {t('share.viewOnly', 'View-only mode')} • {project.shareInfo.permission}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('share.accessCount', 'Viewed')} {project.shareInfo.accessCount} {t('share.times', 'times')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
