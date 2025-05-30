const { PolarClient } = require('./index');
const { makePolarConfig } = require('./polarConfig');
const logger = require('../logger');

const cache = new Map();

exports.getPolarClient = (env) => {
  logger.debug('[PolarClientCache] getPolarClient called for env', env);
  if (cache.has(env)) {
    logger.debug('[PolarClientCache] returning cached client for env', env);
    return cache.get(env);
  }
  logger.info('[PolarClientCache] creating new Polar client for env', env);
  const client = new PolarClient(makePolarConfig(env));
  cache.set(env, client);
  return client;
};