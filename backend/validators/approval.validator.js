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

export const approveRules = [
  body('comment').optional().isLength({ max: 2000 }).withMessage('Comment must be at most 2000 characters.'),
];

export const rejectRules = [
  body('reason')
    .notEmpty().withMessage('Rejection reason is required.')
    .isLength({ min: 10, max: 2000 }).withMessage('Reason must be between 10 and 2000 characters.'),
];

export const sendBackRules = [
  body('reason')
    .notEmpty().withMessage('Send-back reason is required.')
    .isLength({ min: 10, max: 2000 }).withMessage('Reason must be between 10 and 2000 characters.'),
];

export const listApprovalsQueryRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['SUBMITTED', 'APPROVED', 'REJECTED', 'SENT_BACK']),
];
