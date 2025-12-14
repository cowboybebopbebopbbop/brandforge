import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  generateLogoPreview, 
  generateMockup,
  LogoPreview,
  MOCKUP_TEMPLATES 
} from '../../services/brandPreview';
import { useAppStore } from '../../store';

interface BrandPreviewProps {
  name: string;
  industry?: string;
  keywords?: string[];
}

export default function BrandPreview({ name, industry, keywords }: BrandPreviewProps) {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const [logos, setLogos] = useState<LogoPreview[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<LogoPreview | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<'modern' | 'classic' | 'playful' | 'minimal' | 'bold'>('modern');

  const styles: Array<{ id: 'modern' | 'classic' | 'playful' | 'minimal' | 'bold'; label: string; icon: string }> = [
    { id: 'modern', label: 'Modern', icon: '◆' },
    { id: 'classic', label: 'Classic', icon: '♔' },
    { id: 'playful', label: 'Playful', icon: '★' },
    { id: 'minimal', label: 'Minimal', icon: '○' },
    { id: 'bold', label: 'Bold', icon: '■' },
  ];

  const handleGenerate = async () => {
    if (!name) return;
    
    setIsGenerating(true);
    try {
      const preview = await generateLogoPreview(
        {
          brandName: name,
          style: selectedStyle,
          industry,
          keywords,
        },
        settings.apiKey,
        settings.provider
      );
      
      if (preview) {
        setLogos(prev => [...prev, preview]);
        setSelectedLogo(preview);
      }
    } catch (error) {
      console.error('Failed to generate logo:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMockup = (templateId: string) => {
    if (!selectedLogo) return;
    
    const template = MOCKUP_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    const mockupUrl = generateMockup(template, selectedLogo, name);
    setSelectedMockup(mockupUrl);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('brandPreview.title', 'Brand Identity Preview')}
        </h3>
        
        {/* Style Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {styles.map(style => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                selectedStyle === style.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{style.icon}</span>
              <span>{style.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !name}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('brandPreview.generating', 'Generating...')}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('brandPreview.generate', 'Generate Logo Preview')}
            </>
          )}
        </button>
      </div>

      {/* Logo Grid */}
      {logos.length > 0 && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('brandPreview.variations', 'Logo Variations')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {logos.map((logo) => (
              <button
                key={logo.id}
                onClick={() => setSelectedLogo(logo)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedLogo?.id === logo.id
                    ? 'border-purple-500 ring-2 ring-purple-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <img 
                  src={logo.imageUrl} 
                  alt={`${name} logo - ${logo.style}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Logo Preview */}
      {selectedLogo && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-6">
            <div className="w-48 h-48 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
              <img 
                src={selectedLogo.imageUrl} 
                alt={`${name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Style: {selectedLogo.style}
              </p>
              
              {/* Mockup Buttons */}
              <div className="flex flex-wrap gap-2">
                {MOCKUP_TEMPLATES.slice(0, 3).map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleGenerateMockup(template.id)}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mockup Preview */}
      {selectedMockup && (
        <div className="p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('brandPreview.mockup', 'Mockup Preview')}
          </h4>
          <div className="rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-700">
            <img 
              src={selectedMockup} 
              alt="Brand mockup"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {logos.length === 0 && !isGenerating && (
        <div className="p-12 text-center text-gray-500">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('brandPreview.hint', 'Select a style and click "Generate Logo Preview" to see your brand identity')}
          </p>
        </div>
      )}
    </div>
  );
}
