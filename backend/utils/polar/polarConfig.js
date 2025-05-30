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
  return env === 'sandbox' ? process.env[sandboxVar] : process.env[prodVar];
};

exports.makePolarConfig = (env) => {
  const sandboxTokenVar = 'POLAR_SANDBOX_ACCESS_TOKEN';
  const prodTokenVar = 'POLAR_PROD_ACCESS_TOKEN';
  const sandboxSecretVar = 'POLAR_SANDBOX_WEBHOOK_SECRET';
  const prodSecretVar = 'POLAR_PROD_WEBHOOK_SECRET';

  const accessToken = pick(env, sandboxTokenVar, prodTokenVar);
  const webhookSecret = pick(env, sandboxSecretVar, prodSecretVar);

  if (!accessToken) {
    console.error(`[PolarConfig] ${env} access token is missing. Ensure ${env === 'sandbox' ? sandboxTokenVar : prodTokenVar} is set.`);
    throw new Error(`${env} Polar access token not configured.`);
  }
  if (!webhookSecret) {
    console.error(`[PolarConfig] ${env} webhook secret is missing. Ensure ${env === 'sandbox' ? sandboxSecretVar : prodSecretVar} is set.`);
    throw new Error(`${env} Polar webhook secret not configured.`);
  }
  
  console.info(`[PolarConfig] Loaded ${env} Polar config. AccessToken length: ${accessToken.length}, WebhookSecret length: ${webhookSecret.length}`);

  return {
    environment: env,
    accessToken,
    webhookSecret,
    baseUrl: getBaseUrl(env),
    timeout: parseInt(process.env.POLAR_TIMEOUT) || 30000,
  };
};