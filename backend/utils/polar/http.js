const axios = require('axios');
const { PolarError, PolarAPIError, PolarAuthenticationError } = require('./errors');
const logger = require('../logger'); // Assuming logger is in backend/utils

class HttpClient {
  constructor(config) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    this.client.interceptors.request.use(request => {
      logger.debug(`[Polar HTTP] Request ${request.method?.toUpperCase()} ${request.url}`, { data: request.data || request.params });
      return request;
    });

    this.client.interceptors.response.use(
      response => {
        logger.debug(`[Polar HTTP] Response ${response.config.method?.toUpperCase()} ${response.config.url} status ${response.status}`);
        return response;
      },
      error => this.handleError(error)
    );
  }

  async get(url, config) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url, data, config) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async patch(url, data, config) {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete(url, config) {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  handleError(error) {
    if (error.response) {
      const { data, status } = error.response;
      logger.error(`[Polar HTTP] Error response ${status}`, { responseData: data, requestUrl: error.config?.url });
      if (status === 401) {
        throw new PolarAuthenticationError(
          data?.detail || 'Polar authentication failed. Please check your access token.'
        );
      }
      let detailedMessage = 'Polar API Error';
      const errorDetail = data?.detail; // This is often where Polar puts validation errors

      if (Array.isArray(errorDetail)) {
        detailedMessage = errorDetail.map(err => {
          const loc = err.loc && Array.isArray(err.loc) ? err.loc.join(' -> ') : 'field';
          return `${loc}: ${err.msg} (type: ${err.type})`;
        }).join('; ');
      } else if (typeof errorDetail === 'string') {
        detailedMessage = errorDetail;
      } else if (data?.message && typeof data.message === 'string') { // Fallback to a general message field
        detailedMessage = data.message;
      }
      throw new PolarAPIError(detailedMessage, status, data);
    } else if (error.request) {
      logger.error('[Polar HTTP] No response received from Polar server', { requestUrl: error.config?.url, requestData: error.request });
      throw new PolarError('No response received from Polar server');
    } else {
      logger.error('[Polar HTTP] Request setup failed', { message: error.message });
      throw new PolarError(error.message || 'Request setup failed');
    }
  }
}

module.exports = { HttpClient };