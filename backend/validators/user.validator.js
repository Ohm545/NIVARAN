import { body, query, validationResult } from 'express-validator';

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

export const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 120 }),
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('A valid email is required.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
  body('organizationId').optional().isUUID().withMessage('Invalid organization ID.'),
  body('organizationalUnitId').optional().isUUID().withMessage('Invalid organizational unit ID.'),
  body('roleIds').optional().isArray().withMessage('roleIds must be an array.'),
  body('roleIds.*').optional().isUUID().withMessage('Each role ID must be a valid UUID.'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Status must be ACTIVE or INACTIVE.'),
];

export const updateUserRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 120 }),
  body('email').optional().trim().isEmail().withMessage('A valid email is required.'),
  body('organizationId').optional({ nullable: true }).isUUID().withMessage('Invalid organization ID.'),
  body('organizationalUnitId').optional({ nullable: true }).isUUID().withMessage('Invalid organizational unit ID.'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Status must be ACTIVE or INACTIVE.'),
];

export const assignRolesRules = [
  body('roleIds').isArray({ min: 0 }).withMessage('roleIds must be an array.'),
  body('roleIds.*').isUUID().withMessage('Each role ID must be a valid UUID.'),
];
