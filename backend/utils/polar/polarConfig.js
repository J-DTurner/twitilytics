const getBaseUrl = (environment) => {
  switch (environment) {
    case 'sandbox':
      return 'https://sandbox-api.polar.sh';
    case 'production':
    default:
      return 'https://api.polar.sh';
  }
};

const pick = (env, sandboxVar, prodVar) => {
  const value = env === 'sandbox' ? process.env[sandboxVar] : process.env[prodVar];
  if (!value) {
    console.warn(`[PolarConfig] Environment variable missing for ${env}: ${env === 'sandbox' ? sandboxVar : prodVar}`);
  }
  return value;
};

exports.makePolarConfig = (env) => {
  const sandboxTokenVar = 'POLAR_SANDBOX_ACCESS_TOKEN';
  const prodTokenVar = 'POLAR_PROD_ACCESS_TOKEN';
  const sandboxSecretVar = 'POLAR_SANDBOX_WEBHOOK_SECRET';
  const prodSecretVar = 'POLAR_PROD_WEBHOOK_SECRET';

  const accessToken = pick(env, sandboxTokenVar, prodTokenVar);
  const webhookSecret = pick(env, sandboxSecretVar, prodSecretVar);

  // Price IDs - ensure these match your environment variable names exactly
  const premiumAnalysisPriceId = pick(env, 'POLAR_PRICE_ID_PREMIUM_ANALYSIS_SANDBOX', 'POLAR_PRICE_ID_PREMIUM_ANALYSIS_PROD');
  const scrapePackagePriceId = pick(env, 'POLAR_PRICE_ID_SCRAPE_PACKAGE_SANDBOX', 'POLAR_PRICE_ID_SCRAPE_PACKAGE_PROD');


  if (!accessToken) {
    console.error(`[PolarConfig] ${env} access token is missing. Ensure ${env === 'sandbox' ? sandboxTokenVar : prodTokenVar} is set.`);
    // In a real app, you might throw an error here or handle it more gracefully
    // For now, logging and continuing allows the server to start but payments will fail.
  }
  if (!webhookSecret) {
    console.error(`[PolarConfig] ${env} webhook secret is missing. Ensure ${env === 'sandbox' ? sandboxSecretVar : prodSecretVar} is set.`);
  }
  if (!premiumAnalysisPriceId) {
    console.error(`[PolarConfig] ${env} premium analysis price ID is missing. Ensure POLAR_PRICE_ID_PREMIUM_ANALYSIS_${env.toUpperCase()} is set.`);
  }
  if (!scrapePackagePriceId) {
    console.error(`[PolarConfig] ${env} scrape package price ID is missing. Ensure POLAR_PRICE_ID_SCRAPE_PACKAGE_${env.toUpperCase()} is set.`);
  }
  
  const config = {
    environment: env,
    accessToken,
    webhookSecret,
    baseUrl: getBaseUrl(env),
    timeout: parseInt(process.env.POLAR_TIMEOUT) || 30000,
    priceIds: {
      premiumAnalysis: premiumAnalysisPriceId,
      scrapePackage: scrapePackagePriceId,
    }
  };
  
  console.info(`[PolarConfig] Loaded ${env} Polar config. AccessToken: ${accessToken ? 'Loaded' : 'MISSING'}, WebhookSecret: ${webhookSecret ? 'Loaded' : 'MISSING'}`);
  console.info(`[PolarConfig] ${env} Price IDs - Premium: ${config.priceIds.premiumAnalysis || 'MISSING'}, Scrape: ${config.priceIds.scrapePackage || 'MISSING'}`);

  return config;
};