/**
 * Categories for operating expenses (light bill, logistics, etc.) recorded by
 * admins and subtracted from gross profit to compute net profit. Stored as text
 * on OperatingExpense.category; this enum constrains + groups the values in the
 * app layer (validation + analytics breakdown + UI) without a DB-enum migration.
 */
export enum ExpenseCategory {
  LOGISTICS = 'LOGISTICS', // shipping, courier, delivery
  UTILITIES = 'UTILITIES', // electricity/light bill, water, internet
  RENT = 'RENT',
  SALARIES = 'SALARIES',
  MARKETING = 'MARKETING', // ads, influencers, shoots
  PACKAGING = 'PACKAGING',
  PAYMENT_FEES = 'PAYMENT_FEES', // gateway / transaction fees
  SOFTWARE = 'SOFTWARE', // SaaS, hosting, tools
  OTHER = 'OTHER',
}
