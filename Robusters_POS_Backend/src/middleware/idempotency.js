/**
 * Idempotency-Key support for commit endpoints (order creation, package
 * assignment). A client resubmitting the same logical action — a timed-out
 * request retried, a double-tap, two tabs racing — sends the same key on
 * both attempts. The first request to claim a key runs normally; any other
 * request with that key gets the original response replayed (or a 409 if
 * the original is still in flight) instead of re-running the mutation.
 *
 * Only *successful* (2xx) responses are cached for replay. A failed attempt
 * (e.g. wrong OTP, validation error) releases the key instead, so a
 * follow-up attempt — same key, corrected payload — is processed fresh
 * rather than replaying the earlier failure. This matters here because the
 * frontend intentionally reuses one key across a whole "confirm this order"
 * attempt, including OTP re-entry after a wrong code.
 *
 * The header is optional: requests without one behave exactly as before.
 */

const db = require('../database/connection');

const idempotent = (endpoint) => {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) return next();

    try {
      // Atomically claim the key — the UNIQUE constraint on `key` means only
      // one concurrent request can win this INSERT.
      const claim = await db.query(
        `INSERT INTO idempotency_keys (key, endpoint, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING
         RETURNING key`,
        [key, endpoint, req.user?.id || null]
      );

      if (claim.rows.length === 0) {
        const existing = await db.query(
          'SELECT status_code, response_body FROM idempotency_keys WHERE key = $1',
          [key]
        );
        const record = existing.rows[0];

        if (record && record.response_body !== null) {
          return res.status(record.status_code || 200).json(record.response_body);
        }

        return res.status(409).json({
          success: false,
          message: 'This request is already being processed. Please wait before retrying.',
          error: { code: 'REQUEST_IN_PROGRESS' },
        });
      }

      // We own this key. On success, cache the response for replay. On
      // failure, release the key entirely so a corrected retry isn't stuck
      // replaying the old failure.
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          db.query(
            'UPDATE idempotency_keys SET status_code = $1, response_body = $2 WHERE key = $3',
            [res.statusCode, JSON.stringify(body), key]
          ).catch((err) => console.error('Failed to persist idempotency record:', err));
        } else {
          db.query('DELETE FROM idempotency_keys WHERE key = $1', [key])
            .catch((err) => console.error('Failed to release idempotency key:', err));
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { idempotent };
