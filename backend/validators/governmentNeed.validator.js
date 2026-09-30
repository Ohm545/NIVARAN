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

const URGENCY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_VALUES  = ['DRAFT', 'SUBMITTED'];

// Rules used for both create and update (all optional on update)
const commonRules = (required = false) => {
  const opt = !required;
  return [
    body('title')
      [opt ? 'optional' : 'notEmpty']()
      .trim()
      .isLength({ min: 3, max: 300 }).withMessage('Title must be 3–300 characters.'),

    body('problemStatement')
      [opt ? 'optional' : 'notEmpty']()
      .trim()
      .isLength({ min: 10, max: 50000 }).withMessage('Problem statement must be 10–50000 characters.'),

    body('desiredOutcome')
      [opt ? 'optional' : 'notEmpty']()
      .trim()
      .isLength({ min: 10, max: 50000 }).withMessage('Desired outcome must be 10–50000 characters.'),

    body('domain')
      [opt ? 'optional' : 'notEmpty']()
      .trim()
      .isLength({ max: 100 }).withMessage('Domain must be at most 100 characters.'),

    body('currentSituation').optional().isLength({ max: 50000 }),
    body('existingProcess').optional().isLength({ max: 50000 }),
    body('successCriteria').optional().isLength({ max: 50000 }),
    body('subDomain').optional().isLength({ max: 100 }),
    body('geographicScope').optional().isLength({ max: 500 }),
    body('operationalScope').optional().isLength({ max: 500 }),
    body('affectedPopulation').optional().isLength({ max: 50000 }),
    body('affectedPopulationEstimate').optional({ nullable: true })
      .isInt({ min: 0 }).withMessage('Affected population estimate must be a positive integer.'),
    body('expectedStartDate').optional({ nullable: true })
      .isISO8601().withMessage('Expected start date must be a valid date (ISO 8601).'),
    body('expectedTargetDate').optional({ nullable: true })
      .isISO8601().withMessage('Expected target date must be a valid date (ISO 8601).'),
    body('urgency').optional({ nullable: true })
      .isIn(URGENCY_VALUES).withMessage(`Urgency must be one of: ${URGENCY_VALUES.join(', ')}.`),
    body('constraints').optional().isLength({ max: 50000 }),
    body('baselineInformation').optional().isLength({ max: 50000 }),
    body('initialKPIs').optional({ nullable: true })
      .isArray().withMessage('initialKPIs must be an array.'),
    body('initialKPIs.*.name').optional().isLength({ max: 200 }),
    body('initialKPIs.*.currentValue').optional(),
    body('initialKPIs.*.targetValue').optional(),
    body('initialKPIs.*.unit').optional().isLength({ max: 50 }),
    body('additionalContext').optional().isLength({ max: 50000 }),
  ];
};

export const createNeedRules = commonRules(true);
export const updateNeedRules = commonRules(false);

export const listNeedsQueryRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(STATUS_VALUES),
  query('domain').optional().isLength({ max: 100 }),
];
