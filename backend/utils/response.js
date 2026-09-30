/**
 * Standardised JSON response helpers.
 * All API responses go through these to ensure consistent shape.
 */

export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: { message } });
}

export function sendPaginated(res, data, pagination) {
  return res.status(200).json({ success: true, data, pagination });
}
