import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store';
import { 
  createShareLink, 
  getUserShareLinks, 
  deleteShareLink,
  ShareLink,
  SharePermission 
} from '../../services/sharing';

interface ShareProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export default function ShareProjectModal({ projectId, projectName, onClose }: ShareProjectModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { tabs, favoritedNames } = useAppStore();
  
  const [permission, setPermission] = useState<SharePermission>('view');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const project = tabs.find(t => t.id === projectId);

  // Load existing share links
  useEffect(() => {
    if (!user) return;
    
    const loadLinks = async () => {
      setIsLoading(true);
      try {
        const links = await getUserShareLinks(user.uid);
        setShareLinks(links.filter(l => l.projectId === projectId));
      } catch (error) {
        console.error('Error loading share links:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLinks();
  }, [user, projectId]);

  const handleCreateLink = async () => {
    if (!user || !project) return;
    
    setIsCreating(true);
    try {
      const newLink = await createShareLink(
        projectId,
        projectName,
        user.uid,
        user.displayName || 'Anonymous',
        permission,
        project,
        favoritedNames.filter(f => f.tabId === projectId)
      );
      setShareLinks(prev => [...prev, newLink]);
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLink = async (shareId: string) => {
    console.log('[ShareModal] Delete button clicked for:', shareId);
    
    const confirmed = window.confirm(t('share.confirmDelete', 'Are you sure you want to delete this share link?'));
    console.log('[ShareModal] User confirmation:', confirmed);
    
    if (!confirmed) {
      console.log('[ShareModal] Delete cancelled by user');
      return;
    }
    
    console.log('[ShareModal] Starting delete operation...');
    setDeletingId(shareId);
    setError(null);
    
    try {
      await deleteShareLink(shareId);
      console.log('[ShareModal] Delete successful, updating UI');
      setShareLinks(prev => prev.filter(l => l.id !== shareId));
    } catch (error: any) {
      console.error('[ShareModal] Delete failed:', error);
      const errorMessage = error?.message || t('share.deleteError', 'Failed to delete share link. Please try again.');
      setError(errorMessage);
      alert(errorMessage); // Show alert as backup
    } finally {
      setDeletingId(null);
      console.log('[ShareModal] Delete operation completed');
    }
  };

  const handleCopyLink = (shareId: string) => {
    const url = `${window.location.origin}/brandforge/share/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPermissionLabel = (p: SharePermission) => {
    switch (p) {
      case 'view': return t('share.viewOnly', 'View Only');
      case 'comment': return t('share.canComment', 'Can Comment');
      case 'edit': return t('share.canEdit', 'Can Edit');
    }
  };

  const getPermissionIcon = (p: SharePermission) => {
    switch (p) {
      case 'view':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'comment':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'edit':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('share.signInRequired', 'Sign In Required')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('share.signInHint', 'Please sign in with Google to share your projects')}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('actions.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('share.title', 'Share Project')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {projectName}
          </p>
        </div>

        {/* Create New Link */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('share.createLink', 'Create Share Link')}
          </h3>
          
          {/* Permission Selector */}
          <div className="flex gap-2 mb-4">
            {(['view', 'comment', 'edit'] as SharePermission[]).map(p => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  permission === p
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {getPermissionIcon(p)}
                <span className="text-sm">{getPermissionLabel(p)}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCreateLink}
            disabled={isCreating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('share.creating', 'Creating...')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {t('share.createButton', 'Create Link')}
              </>
            )}
          </button>
        </div>

        {/* Existing Links */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('share.activeLinks', 'Active Links')}
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shareLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p>{t('share.noLinks', 'No active share links')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shareLinks.map(link => (
                <div
                  key={link.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPermissionIcon(link.permission)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getPermissionLabel(link.permission)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {link.accessCount} {t('share.views', 'views')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/brandforge/share/${link.id}`}
                      className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={() => handleCopyLink(link.id)}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        copiedId === link.id
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {copiedId === link.id ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[ShareModal] Delete button clicked!', link.id);
                        handleDeleteLink(link.id);
                      }}
                      disabled={deletingId === link.id}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('share.deleteLink', 'Delete link')}
                      type="button"
                    >
                      {deletingId === link.id ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
