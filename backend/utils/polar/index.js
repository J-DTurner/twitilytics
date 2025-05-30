const { makePolarConfig } = require('./polarConfig');
const { HttpClient } = require('./http');
const { CheckoutsAPI } = require('./api/checkouts');
const logger = require('../logger');

class PolarClient {
  constructor(config) {
    logger.info('[PolarClient] Initializing with env', config.environment);
    if (!config.accessToken || !config.webhookSecret) {
      logger.error('[PolarClient] Polar accessToken and webhookSecret are required.');
      throw new Error('Polar accessToken and webhookSecret are required');
    }
    this.config = config;
    this.http = new HttpClient(this.config);
    this.checkouts = new CheckoutsAPI(this.config, this.http);
  }

  async verifyAuth() {
    logger.info('[PolarClient] Verifying authentication with Polar');
    try {
      // A simple call to a lightweight Polar endpoint to check if token is valid
      await this.http.get('/v1/products?limit=1'); 
      logger.info('[PolarClient] Polar authentication successful');
      return true;
    } catch (error) {
      logger.error('[PolarClient] Polar authentication check failed', { error: error.message });
      return false;
    }
  }
}
module.exports = { PolarClient };