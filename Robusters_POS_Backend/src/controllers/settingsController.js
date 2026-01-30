/**
 * Settings Controller
 * Handles application settings operations.
 */

const Settings = require('../models/Settings');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const getAllSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findAll();

    const settingsMap = {};
    for (const setting of settings) {
      settingsMap[setting.key] = {
        value: setting.value,
        description: setting.description,
        updated_at: setting.updated_at,
      };
    }

    res.json({
      success: true,
      data: { settings: settingsMap },
    });
  } catch (error) {
    next(error);
  }
};

const getPublicSettings = async (req, res, next) => {
  try {
    const [tierThresholds, vipThreshold] = await Promise.all([
      Settings.getTierThresholds(),
      Settings.getVipThreshold(),
    ]);

    res.json({
      success: true,
      data: {
        tier_thresholds: tierThresholds,
        vip_order_threshold: vipThreshold,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      throw new BadRequestError('Setting value is required');
    }

    validateSettingValue(key, value);

    const updated = await Settings.updateByKey(key, value);

    if (!updated) {
      throw new NotFoundError(`Setting "${key}" not found`);
    }

    res.json({
      success: true,
      data: { setting: updated },
      message: 'Setting updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

function validateSettingValue(key, value) {
  switch (key) {
    case 'loyalty_points_ratio': {
      if (typeof value.spend_amount !== 'number' || value.spend_amount <= 0) {
        throw new BadRequestError('spend_amount must be a positive number');
      }
      if (typeof value.points_earned !== 'number' || value.points_earned <= 0) {
        throw new BadRequestError('points_earned must be a positive number');
      }
      break;
    }
    case 'tier_thresholds': {
      const { bronze, silver, gold, platinum } = value;
      for (const [name, val] of Object.entries({ bronze, silver, gold, platinum })) {
        if (typeof val !== 'number' || val < 0) {
          throw new BadRequestError(`${name} threshold must be a non-negative number`);
        }
      }
      if (!(bronze <= silver && silver <= gold && gold <= platinum)) {
        throw new BadRequestError('Tier thresholds must be in ascending order: bronze <= silver <= gold <= platinum');
      }
      break;
    }
    case 'vip_order_threshold': {
      if (typeof value.min_orders !== 'number' || value.min_orders < 1 || !Number.isInteger(value.min_orders)) {
        throw new BadRequestError('min_orders must be a positive integer');
      }
      break;
    }
    default:
      throw new BadRequestError(`Unknown setting key: "${key}"`);
  }
}

module.exports = {
  getAllSettings,
  updateSetting,
  getPublicSettings,
};
