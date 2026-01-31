/**
 * Convert snake_case object keys to camelCase
 * @param {Object} obj - Object to convert
 * @returns {Object} Object with camelCase keys
 */
const toCamelCase = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const camelCased = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCased[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelCased;
};

module.exports = { toCamelCase };
