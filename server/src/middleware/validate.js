import { validationResult } from 'express-validator';

/**
 * Middleware to evaluate express-validator rules and return standard error format.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      data: null
    });
  }
  next();
};

export default validate;
