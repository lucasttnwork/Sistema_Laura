// Utilitários para compatibilidade de navegador e detecção de problemas

export interface BrowserCompatibilityInfo {
  hasKnownIssues: boolean;
  browserName: string;
  shouldUseCredentials: boolean;
  userAgent: string;
  version?: string;
}

/**
 * Detecta problemas conhecidos de compatibilidade em navegadores
 */
export const detectBrowserCompatibility = (): BrowserCompatibilityInfo => {
  if (typeof window === 'undefined') {
    return {
      hasKnownIssues: false,
      browserName: 'SSR',
      shouldUseCredentials: true,
      userAgent: ''
    };
  }

  const userAgent = window.navigator.userAgent;

  // Lista de navegadores com problemas conhecidos de CORS/credentials
  const problematicBrowsers = [
    { regex: /OPR\//, name: 'Opera GX' },
    { regex: /Opera\//, name: 'Opera' },
    // Adicionar outros navegadores problemáticos conforme necessário
  ];

  const detectedBrowser = problematicBrowsers.find(browser => browser.regex.test(userAgent));

  const browserInfo: BrowserCompatibilityInfo = {
    hasKnownIssues: !!detectedBrowser,
    browserName: detectedBrowser?.name || 'Outro',
    shouldUseCredentials: !detectedBrowser,
    userAgent,
  };

  // Log informativo apenas uma vez por sessão
  if (!sessionStorage.getItem('browser-compatibility-logged')) {
    console.info('🔍 Detecção de Compatibilidade:', {
      navegador: browserInfo.browserName,
      problemasConhecidos: browserInfo.hasKnownIssues,
      usandoCredentials: browserInfo.shouldUseCredentials,
      userAgent: browserInfo.userAgent.substring(0, 100) + '...'
    });
    sessionStorage.setItem('browser-compatibility-logged', 'true');
  }

  return browserInfo;
};

/**
 * Verifica se devemos usar modo de compatibilidade estendido
 */
export const shouldUseExtendedCompatibility = (): boolean => {
  const browserInfo = detectBrowserCompatibility();

  // Adicionar lógica adicional conforme necessário
  // Por exemplo: verificar versão específica, configurações de segurança, etc.

  return browserInfo.hasKnownIssues;
};

/**
 * Lista de navegadores recomendados para melhor experiência
 */
export const recommendedBrowsers = [
  'Google Chrome',
  'Mozilla Firefox',
  'Microsoft Edge',
  'Safari (macOS/iOS)'
];

/**
 * Gera mensagem de aviso para navegadores problemáticos
 */
export const getCompatibilityWarning = (): string | null => {
  const browserInfo = detectBrowserCompatibility();

  if (!browserInfo.hasKnownIssues) {
    return null;
  }

  return `⚠️ Detectamos que você está usando ${browserInfo.browserName}. Para a melhor experiência, recomendamos usar ${recommendedBrowsers[0]} ou ${recommendedBrowsers[1]}.`;
};
