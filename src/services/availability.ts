// Domain and Social Media availability checking service

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  loading: boolean;
  error?: string;
}

export interface SocialCheckResult {
  platform: 'instagram' | 'telegram' | 'x' | 'tiktok';
  handle: string;
  available: boolean | null; // null = unknown/couldn't check
  loading: boolean;
  error?: string;
  profileUrl?: string;
}

export interface AvailabilityResult {
  name: string;
  domains: DomainCheckResult[];
  socials: SocialCheckResult[];
  checkedAt: number;
}

// Normalize name for domain/handle check
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 63); // Domain label max length
};

// Check domain availability using DNS lookup via API
// Note: In production, you'd use a proper WHOIS API like Namecheap, GoDaddy, or domainavailability.io
export const checkDomainAvailability = async (
  name: string,
  tlds: string[] = ['com', 'ru', 'io']
): Promise<DomainCheckResult[]> => {
  const normalizedName = normalizeName(name);
  
  if (!normalizedName || normalizedName.length < 2) {
    return tlds.map(tld => ({
      domain: `${name}.${tld}`,
      available: false,
      loading: false,
      error: 'Name too short',
    }));
  }

  // Using a free DNS-based check (not 100% accurate but good approximation)
  // In production, integrate with a proper domain API
  const results: DomainCheckResult[] = [];

  for (const tld of tlds) {
    const domain = `${normalizedName}.${tld}`;
    
    try {
      // Try to resolve DNS - if it fails, domain might be available
      // This is a simplified check - production should use WHOIS API
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      const data = await response.json();
      
      // If there's an answer, domain is taken
      // If Status is 3 (NXDOMAIN), domain might be available
      const available = data.Status === 3 || !data.Answer;
      
      results.push({
        domain,
        available,
        loading: false,
      });
    } catch (error) {
      results.push({
        domain,
        available: false,
        loading: false,
        error: 'Check failed',
      });
    }
  }

  return results;
};

// Check social media handle availability
// Note: Most platforms don't have public APIs for this
// This uses heuristic checks that may not be 100% accurate
export const checkSocialAvailability = async (
  name: string,
  platforms: ('instagram' | 'telegram' | 'x' | 'tiktok')[] = ['instagram', 'telegram', 'x']
): Promise<SocialCheckResult[]> => {
  const handle = normalizeName(name);
  
  if (!handle || handle.length < 2) {
    return platforms.map(platform => ({
      platform,
      handle: `@${name}`,
      available: null,
      loading: false,
      error: 'Handle too short',
    }));
  }

  const results: SocialCheckResult[] = [];

  for (const platform of platforms) {
    let profileUrl: string;
    
    switch (platform) {
      case 'instagram':
        profileUrl = `https://www.instagram.com/${handle}`;
        break;
      case 'telegram':
        profileUrl = `https://t.me/${handle}`;
        break;
      case 'x':
        profileUrl = `https://x.com/${handle}`;
        break;
      case 'tiktok':
        profileUrl = `https://www.tiktok.com/@${handle}`;
        break;
    }

    // Note: Due to CORS, we can't directly check from browser
    // In production, you'd use a backend proxy or a social media checking API
    // For now, we'll show the links for manual verification
    results.push({
      platform,
      handle: `@${handle}`,
      available: null, // Unknown - requires backend check
      loading: false,
      profileUrl,
    });
  }

  return results;
};

// Batch check multiple names
export const batchCheckAvailability = async (
  names: string[],
  options?: {
    tlds?: string[];
    platforms?: ('instagram' | 'telegram' | 'x' | 'tiktok')[];
  }
): Promise<Map<string, AvailabilityResult>> => {
  const results = new Map<string, AvailabilityResult>();
  const tlds = options?.tlds || ['com', 'ru', 'io'];
  const platforms = options?.platforms || ['instagram', 'telegram', 'x'];

  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < names.length; i += batchSize) {
    const batch = names.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (name) => {
      const [domains, socials] = await Promise.all([
        checkDomainAvailability(name, tlds),
        checkSocialAvailability(name, platforms),
      ]);
      
      results.set(name, {
        name,
        domains,
        socials,
        checkedAt: Date.now(),
      });
    }));
    
    // Small delay between batches
    if (i + batchSize < names.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};

// Platform icons for UI
export const PLATFORM_ICONS = {
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  },
  telegram: {
    name: 'Telegram',
    color: '#0088CC',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  },
  x: {
    name: 'X (Twitter)',
    color: '#000000',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  },
};

// TLD info for UI
export const TLD_INFO = {
  com: { name: '.com', description: 'Global', color: '#4F46E5' },
  ru: { name: '.ru', description: 'Russia', color: '#DC2626' },
  io: { name: '.io', description: 'Tech', color: '#059669' },
  co: { name: '.co', description: 'Company', color: '#D97706' },
  net: { name: '.net', description: 'Network', color: '#7C3AED' },
};
