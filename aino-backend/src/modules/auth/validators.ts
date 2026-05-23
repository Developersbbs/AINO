import { body } from 'express-validator';

// Matches E.164 international phone numbers: +<country code><number>
const phoneRule = body('phone')
  .trim()
  .matches(/^\+[1-9]\d{6,14}$/)
  .withMessage('phone must be a valid international number (e.g. +919876543210)');

export const sendOtpValidator = [phoneRule];

export const verifyOtpValidator = [
  body('phone')
    .optional()
    .trim()
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('phone must be a valid international number'),

  body('otp')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('otp must be a 6-digit number'),

  body('firebaseIdToken').optional().isString(),
];

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('name is required'),

  phoneRule,

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('email must be a valid email address'),

  body('role')
    .isIn(['Agent', 'Owner'])
    .withMessage('role must be Agent or Owner'),
];

export const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];
