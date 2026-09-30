import { body, validationResult } from 'express-validator';

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

export const createOrganizationRules = [
  body('name').trim().notEmpty().withMessage('Organization name is required.').isLength({ max: 200 }),
  body('code').trim().notEmpty().withMessage('Organization code is required.').isLength({ max: 20 }).matches(/^[A-Z0-9_]+$/i).withMessage('Code may only contain letters, numbers, and underscores.'),
  body('description').optional().isLength({ max: 500 }),
];

export const updateOrganizationRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

export const createUnitRules = [
  body('name').trim().notEmpty().withMessage('Unit name is required.').isLength({ max: 200 }),
  body('code').trim().notEmpty().withMessage('Unit code is required.').isLength({ max: 20 }).matches(/^[A-Z0-9_]+$/i),
  body('description').optional().isLength({ max: 500 }),
];
