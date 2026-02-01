/**
 * Country configuration for international checkout support
 * Defines state/province requirements, postal code formats, and labels for each country
 */

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  hasStates: boolean; // Whether country uses state/province selection
  stateLabel: string; // Label for state field (State, Province, County, etc.)
  postalCodeLabel: string; // Label for postal code field (ZIP Code, Postal Code, Postcode)
  postalCodePlaceholder: string;
  postalCodePattern?: string; // Regex pattern for validation
  states?: { code: string; name: string }[]; // List of states/provinces if applicable
}

// US States
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// Canadian Provinces
const CA_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

// Australian States
const AU_STATES = [
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'WA', name: 'Western Australia' },
];

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    phoneCode: '+1',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'ZIP Code',
    postalCodePlaceholder: '12345',
    postalCodePattern: '^\\d{5}(-\\d{4})?$',
    states: US_STATES,
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    phoneCode: '+1',
    hasStates: true,
    stateLabel: 'Province',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: 'A1A 1A1',
    postalCodePattern: '^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$',
    states: CA_PROVINCES,
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    phoneCode: '+44',
    hasStates: false, // UK doesn't use states/provinces for addresses
    stateLabel: 'County (Optional)',
    postalCodeLabel: 'Postcode',
    postalCodePlaceholder: 'SW1A 1AA',
    postalCodePattern: '^[A-Za-z]{1,2}\\d[A-Za-z\\d]?\\s*\\d[A-Za-z]{2}$',
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    phoneCode: '+61',
    hasStates: true,
    stateLabel: 'State/Territory',
    postalCodeLabel: 'Postcode',
    postalCodePlaceholder: '2000',
    postalCodePattern: '^\\d{4}$',
    states: AU_STATES,
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+49',
    hasStates: false,
    stateLabel: 'State (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '10115',
    postalCodePattern: '^\\d{5}$',
  },
  FR: {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+33',
    hasStates: false,
    stateLabel: 'Region (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '75001',
    postalCodePattern: '^\\d{5}$',
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+39',
    hasStates: false,
    stateLabel: 'Province (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '00100',
    postalCodePattern: '^\\d{5}$',
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+34',
    hasStates: false,
    stateLabel: 'Province (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '28001',
    postalCodePattern: '^\\d{5}$',
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+31',
    hasStates: false,
    stateLabel: 'Province (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '1011 AB',
    postalCodePattern: '^\\d{4}\\s?[A-Za-z]{2}$',
  },
  BE: {
    code: 'BE',
    name: 'Belgium',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+32',
    hasStates: false,
    stateLabel: 'Province (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '1000',
    postalCodePattern: '^\\d{4}$',
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    currency: 'CHF',
    currencySymbol: 'CHF',
    phoneCode: '+41',
    hasStates: false,
    stateLabel: 'Canton (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '8001',
    postalCodePattern: '^\\d{4}$',
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+43',
    hasStates: false,
    stateLabel: 'State (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '1010',
    postalCodePattern: '^\\d{4}$',
  },
  SE: {
    code: 'SE',
    name: 'Sweden',
    currency: 'SEK',
    currencySymbol: 'kr',
    phoneCode: '+46',
    hasStates: false,
    stateLabel: 'County (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '111 22',
    postalCodePattern: '^\\d{3}\\s?\\d{2}$',
  },
  NO: {
    code: 'NO',
    name: 'Norway',
    currency: 'NOK',
    currencySymbol: 'kr',
    phoneCode: '+47',
    hasStates: false,
    stateLabel: 'County (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '0001',
    postalCodePattern: '^\\d{4}$',
  },
  DK: {
    code: 'DK',
    name: 'Denmark',
    currency: 'DKK',
    currencySymbol: 'kr',
    phoneCode: '+45',
    hasStates: false,
    stateLabel: 'Region (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '1000',
    postalCodePattern: '^\\d{4}$',
  },
  FI: {
    code: 'FI',
    name: 'Finland',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+358',
    hasStates: false,
    stateLabel: 'Region (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '00100',
    postalCodePattern: '^\\d{5}$',
  },
  IE: {
    code: 'IE',
    name: 'Ireland',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+353',
    hasStates: false,
    stateLabel: 'County (Optional)',
    postalCodeLabel: 'Eircode',
    postalCodePlaceholder: 'D02 XY00',
    postalCodePattern: '^[A-Za-z]\\d{2}\\s?[A-Za-z0-9]{4}$',
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+351',
    hasStates: false,
    stateLabel: 'District (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '1000-001',
    postalCodePattern: '^\\d{4}(-\\d{3})?$',
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    currency: 'PLN',
    currencySymbol: 'zł',
    phoneCode: '+48',
    hasStates: false,
    stateLabel: 'Voivodeship (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '00-001',
    postalCodePattern: '^\\d{2}-\\d{3}$',
  },
  CZ: {
    code: 'CZ',
    name: 'Czech Republic',
    currency: 'CZK',
    currencySymbol: 'Kč',
    phoneCode: '+420',
    hasStates: false,
    stateLabel: 'Region (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '100 00',
    postalCodePattern: '^\\d{3}\\s?\\d{2}$',
  },
  HU: {
    code: 'HU',
    name: 'Hungary',
    currency: 'HUF',
    currencySymbol: 'Ft',
    phoneCode: '+36',
    hasStates: false,
    stateLabel: 'County (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '1000',
    postalCodePattern: '^\\d{4}$',
  },
  GR: {
    code: 'GR',
    name: 'Greece',
    currency: 'EUR',
    currencySymbol: '€',
    phoneCode: '+30',
    hasStates: false,
    stateLabel: 'Region (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '100 00',
    postalCodePattern: '^\\d{3}\\s?\\d{2}$',
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    phoneCode: '+81',
    hasStates: false,
    stateLabel: 'Prefecture (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '100-0001',
    postalCodePattern: '^\\d{3}-\\d{4}$',
  },
  KR: {
    code: 'KR',
    name: 'South Korea',
    currency: 'KRW',
    currencySymbol: '₩',
    phoneCode: '+82',
    hasStates: false,
    stateLabel: 'Province (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '03000',
    postalCodePattern: '^\\d{5}$',
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    phoneCode: '+65',
    hasStates: false,
    stateLabel: 'District (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '018956',
    postalCodePattern: '^\\d{6}$',
  },
  HK: {
    code: 'HK',
    name: 'Hong Kong',
    currency: 'HKD',
    currencySymbol: 'HK$',
    phoneCode: '+852',
    hasStates: false,
    stateLabel: 'District (Optional)',
    postalCodeLabel: 'Postal Code (Optional)',
    postalCodePlaceholder: '',
  },
  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZD',
    currencySymbol: 'NZ$',
    phoneCode: '+64',
    hasStates: false,
    stateLabel: 'Region (Optional)',
    postalCodeLabel: 'Postcode',
    postalCodePlaceholder: '0600',
    postalCodePattern: '^\\d{4}$',
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    phoneCode: '+55',
    hasStates: false,
    stateLabel: 'State (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '01310-100',
    postalCodePattern: '^\\d{5}-?\\d{3}$',
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    currency: 'MXN',
    currencySymbol: 'MX$',
    phoneCode: '+52',
    hasStates: false,
    stateLabel: 'State (Optional)',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '01000',
    postalCodePattern: '^\\d{5}$',
  },
  // Add more countries as needed
};

/**
 * Get country configuration by country code
 */
export function getCountryConfig(countryCode: string): CountryConfig {
  return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS['US'];
}

/**
 * Check if state/province is required for a country
 */
export function isStateRequired(countryCode: string): boolean {
  const config = getCountryConfig(countryCode);
  return config.hasStates;
}

/**
 * Get list of all supported countries
 */
export function getSupportedCountries(): { code: string; name: string }[] {
  return Object.values(COUNTRY_CONFIGS).map(c => ({ code: c.code, name: c.name }));
}

/**
 * Get phone code for a country
 */
export function getPhoneCode(countryCode: string): string {
  return getCountryConfig(countryCode).phoneCode;
}

/**
 * Get currency code for a country
 */
export function getCurrencyCode(countryCode: string): string {
  return getCountryConfig(countryCode).currency;
}

/**
 * Currencies we support for conversion display
 * These are the major currencies we'll fetch rates for
 */
export const SUPPORTED_CURRENCIES = ['USD', 'GBP', 'CAD', 'AUD', 'EUR', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'JPY', 'SGD', 'HKD'] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
