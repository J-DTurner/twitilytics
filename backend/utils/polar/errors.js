class PolarError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PolarError';
    Object.setPrototypeOf(this, PolarError.prototype);
  }
}

class PolarAPIError extends PolarError {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'PolarAPIError';
    this.statusCode = statusCode;
    this.data = data;
    Object.setPrototypeOf(this, PolarAPIError.prototype);
  }
}

class PolarAuthenticationError extends PolarError {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'PolarAuthenticationError';
    Object.setPrototypeOf(this, PolarAuthenticationError.prototype);
  }
}

module.exports = { PolarError, PolarAPIError, PolarAuthenticationError };