// Brand Identity Preview - AI Logo Generation Service

export interface LogoGenerationRequest {
  brandName: string;
  style?: 'modern' | 'classic' | 'playful' | 'minimal' | 'bold';
  colorScheme?: string[];
  industry?: string;
  keywords?: string[];
}

export interface LogoPreview {
  id: string;
  brandName: string;
  imageUrl: string;
  prompt: string;
  generatedAt: number;
  style: string;
}

// Generate logo preview using AI
// Note: This uses the same API key as the main app
// In production, you might want to use a dedicated image generation API
export const generateLogoPreview = async (
  request: LogoGenerationRequest,
  apiKey: string,
  provider: 'gemini' | 'openai' | 'claude' = 'gemini'
): Promise<LogoPreview | null> => {
  const { brandName, style = 'modern', colorScheme, industry, keywords } = request;

  // Build the prompt for logo generation
  const prompt = buildLogoPrompt(brandName, style, colorScheme, industry, keywords);

  try {
    if (provider === 'gemini') {
      // Use Gemini 3 Pro Image (Imagen) for logo generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{
              prompt: prompt,
            }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '1:1',
              negativePrompt: 'blurry, low quality, distorted, text, watermark',
              safetySetting: 'block_some',
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', await response.text());
        throw new Error('Failed to generate logo with Gemini');
      }

      const data = await response.json();
      
      // Extract base64 image from response
      if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
        const imageUrl = `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
        return {
          id: `logo-${Date.now()}`,
          brandName,
          imageUrl,
          prompt,
          generatedAt: Date.now(),
          style,
        };
      }
      
      throw new Error('No image data in Gemini response');
    }

    if (provider === 'openai') {
      // Use DALL-E for image generation
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate logo');
      }

      const data = await response.json();
      return {
        id: `logo-${Date.now()}`,
        brandName,
        imageUrl: data.data[0].url,
        prompt,
        generatedAt: Date.now(),
        style,
      };
    }

    // Fallback to text-based preview
    return generateTextLogoPreview(brandName, style, prompt);
  } catch (error) {
    console.error('Error generating logo:', error);
    return generateTextLogoPreview(brandName, style, prompt);
  }
};

// Build prompt for logo generation
const buildLogoPrompt = (
  brandName: string,
  style: string,
  colorScheme?: string[],
  industry?: string,
  keywords?: string[]
): string => {
  const styleDescriptions: Record<string, string> = {
    modern: 'clean, contemporary, minimalist with geometric shapes',
    classic: 'timeless, elegant, serif typography, traditional',
    playful: 'fun, colorful, rounded shapes, friendly',
    minimal: 'ultra-simple, single color, maximum whitespace',
    bold: 'strong, impactful, thick lines, high contrast',
  };

  let prompt = `Create a professional logo for a brand called "${brandName}". `;
  prompt += `Style: ${styleDescriptions[style] || style}. `;
  
  if (industry) {
    prompt += `Industry: ${industry}. `;
  }
  
  if (colorScheme && colorScheme.length > 0) {
    prompt += `Color palette: ${colorScheme.join(', ')}. `;
  }
  
  if (keywords && keywords.length > 0) {
    prompt += `Key concepts: ${keywords.join(', ')}. `;
  }
  
  prompt += 'The logo should be suitable for business cards, websites, and social media. ';
  prompt += 'Vector-style, scalable, professional quality. White or transparent background.';
  
  return prompt;
};

// Generate a text-based logo preview (CSS/SVG)
const generateTextLogoPreview = (
  brandName: string,
  style: string,
  prompt: string
): LogoPreview => {
  // Create a data URL with an SVG logo
  const colors = getStyleColors(style);
  const fontFamily = getStyleFont(style);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="white"/>
      <circle cx="200" cy="150" r="80" fill="url(#grad)"/>
      <text x="200" y="165" font-family="${fontFamily}" font-size="48" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${brandName.charAt(0).toUpperCase()}
      </text>
      <text x="200" y="280" font-family="${fontFamily}" font-size="36" font-weight="600" fill="${colors.primary}" text-anchor="middle">
        ${brandName}
      </text>
      <text x="200" y="320" font-family="Arial, sans-serif" font-size="12" fill="#666" text-anchor="middle">
        AI-generated preview
      </text>
    </svg>
  `.trim();

  const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  return {
    id: `logo-${Date.now()}`,
    brandName,
    imageUrl: dataUrl,
    prompt,
    generatedAt: Date.now(),
    style,
  };
};

const getStyleColors = (style: string): { primary: string; secondary: string } => {
  const colorMap: Record<string, { primary: string; secondary: string }> = {
    modern: { primary: '#6366F1', secondary: '#8B5CF6' },
    classic: { primary: '#1F2937', secondary: '#374151' },
    playful: { primary: '#F59E0B', secondary: '#EC4899' },
    minimal: { primary: '#111827', secondary: '#374151' },
    bold: { primary: '#DC2626', secondary: '#EA580C' },
  };
  return colorMap[style] || colorMap.modern;
};

const getStyleFont = (style: string): string => {
  const fontMap: Record<string, string> = {
    modern: 'Inter, system-ui, sans-serif',
    classic: 'Georgia, serif',
    playful: 'Comic Sans MS, cursive',
    minimal: 'Helvetica, Arial, sans-serif',
    bold: 'Impact, sans-serif',
  };
  return fontMap[style] || fontMap.modern;
};

// Generate multiple logo variations
export const generateLogoVariations = async (
  request: LogoGenerationRequest,
  apiKey: string,
  provider: 'gemini' | 'openai' | 'claude' = 'gemini',
  count: number = 4
): Promise<LogoPreview[]> => {
  const styles: Array<'modern' | 'classic' | 'playful' | 'minimal' | 'bold'> = 
    ['modern', 'classic', 'playful', 'minimal', 'bold'];
  
  const previews: LogoPreview[] = [];
  
  for (let i = 0; i < Math.min(count, styles.length); i++) {
    const preview = await generateLogoPreview(
      { ...request, style: styles[i] },
      apiKey,
      provider
    );
    if (preview) {
      previews.push(preview);
    }
  }
  
  return previews;
};

// Mockup templates
export interface MockupTemplate {
  id: string;
  name: string;
  type: 'business-card' | 'website' | 'social' | 'packaging' | 'signage';
  previewUrl: string;
}

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  { id: 'bc-1', name: 'Business Card', type: 'business-card', previewUrl: '' },
  { id: 'web-1', name: 'Website Header', type: 'website', previewUrl: '' },
  { id: 'social-1', name: 'Social Profile', type: 'social', previewUrl: '' },
  { id: 'pkg-1', name: 'Product Packaging', type: 'packaging', previewUrl: '' },
];

// Generate mockup with logo
export const generateMockup = (
  template: MockupTemplate,
  logo: LogoPreview,
  brandName: string
): string => {
  // Generate SVG mockup based on template type
  switch (template.type) {
    case 'business-card':
      return generateBusinessCardMockup(logo, brandName);
    case 'website':
      return generateWebsiteMockup(logo, brandName);
    case 'social':
      return generateSocialMockup(logo, brandName);
    default:
      return logo.imageUrl;
  }
};

const generateBusinessCardMockup = (_logo: LogoPreview, brandName: string): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="450" height="250" viewBox="0 0 450 250">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.2"/>
        </filter>
      </defs>
      <rect x="25" y="25" width="400" height="200" rx="8" fill="white" filter="url(#shadow)"/>
      <rect x="25" y="25" width="400" height="200" rx="8" fill="white"/>
      <text x="60" y="80" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#1F2937">
        ${brandName}
      </text>
      <text x="60" y="110" font-family="Inter, sans-serif" font-size="12" fill="#6B7280">
        Your Name
      </text>
      <text x="60" y="130" font-family="Inter, sans-serif" font-size="10" fill="#9CA3AF">
        Position Title
      </text>
      <text x="60" y="180" font-family="Inter, sans-serif" font-size="10" fill="#6B7280">
        contact@${brandName.toLowerCase().replace(/\s/g, '')}.com
      </text>
      <text x="60" y="200" font-family="Inter, sans-serif" font-size="10" fill="#6B7280">
        +1 (555) 123-4567
      </text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const generateWebsiteMockup = (_logo: LogoPreview, brandName: string): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#F9FAFB"/>
      <rect y="0" width="600" height="60" fill="white"/>
      <text x="30" y="38" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#1F2937">
        ${brandName}
      </text>
      <text x="400" y="38" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">Products</text>
      <text x="470" y="38" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">About</text>
      <text x="520" y="38" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">Contact</text>
      <rect x="40" y="100" width="520" height="200" rx="12" fill="white"/>
      <text x="80" y="170" font-family="Inter, sans-serif" font-size="32" font-weight="700" fill="#1F2937">
        Welcome to ${brandName}
      </text>
      <text x="80" y="210" font-family="Inter, sans-serif" font-size="14" fill="#6B7280">
        Your tagline goes here. We help you achieve your goals.
      </text>
      <rect x="80" y="240" width="120" height="40" rx="6" fill="#6366F1"/>
      <text x="110" y="266" font-family="Inter, sans-serif" font-size="14" font-weight="500" fill="white">
        Get Started
      </text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const generateSocialMockup = (_logo: LogoPreview, brandName: string): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#F3F4F6"/>
      <circle cx="200" cy="120" r="60" fill="#6366F1"/>
      <text x="200" y="135" font-family="Inter, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">
        ${brandName.charAt(0).toUpperCase()}
      </text>
      <text x="200" y="220" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#1F2937" text-anchor="middle">
        ${brandName}
      </text>
      <text x="200" y="250" font-family="Inter, sans-serif" font-size="14" fill="#6B7280" text-anchor="middle">
        @${brandName.toLowerCase().replace(/\s/g, '')}
      </text>
      <text x="200" y="290" font-family="Inter, sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">
        Official Account • Verified
      </text>
      <rect x="130" y="320" width="140" height="36" rx="18" fill="#6366F1"/>
      <text x="200" y="343" font-family="Inter, sans-serif" font-size="14" font-weight="500" fill="white" text-anchor="middle">
        Follow
      </text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};
