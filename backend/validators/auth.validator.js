import { body, validationResult } from 'express-validator';

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.'),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

/**
 * Middleware that checks validation results and responds with errors if any.
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'Validation failed.',
        fields: errors.array().map(e => ({ field: e.path, message: e.msg })),
      },
    });
  }
  next();
}
