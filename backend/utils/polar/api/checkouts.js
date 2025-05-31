const { HttpClient } = require('../http');
const logger = require('../../logger');

class CheckoutsAPI {
  constructor(config, http) {
    this.http = http || new HttpClient(config);
    this.config = config;
  }

  async create(params) {
    logger.info('[Polar Checkouts] create called with params (SDK-aligned):', params);
    
    const payload = {
      products: [params.product_price_id], // Key change: Use 'products' array
      success_url: params.success_url,
      cancel_url: params.cancel_url ?? params.success_url,
      customer_email: params.customer_email,
      customer_external_id: params.customer_external_id,
      metadata: params.metadata,
      allow_discount_codes: params.allow_discount_codes, 
    };

    // Remove undefined keys from payload to prevent sending them
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    logger.debug('[Polar Checkouts] Sending payload to POST /v1/checkouts (SDK-aligned):', payload);
    const response = await this.http.post("/v1/checkouts", payload);
    logger.info('[Polar Checkouts] create succeeded', { checkoutId: response.id });
    return response;
  }

  async get(id) {
    logger.info('[Polar Checkouts] get called for checkout ID:', id);
    const response = await this.http.get(`/v1/checkouts/${id}`);
    logger.info('[Polar Checkouts] get succeeded for checkout ID:', { checkoutId: response.id, status: response.status });
    return response;
  }

  isSuccessful(checkout) {
    const success = checkout.status === "succeeded";
    logger.info('[Polar Checkouts] isSuccessful check:', { success, checkoutId: checkout.id, status: checkout.status });
    return success;
  }
}
module.exports = { CheckoutsAPI };