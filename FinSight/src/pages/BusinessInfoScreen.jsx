import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { sanitizeInput, sanitizeNumeric } from '../utils/sanitize';
import { getCookie, generateCSRFToken } from '../utils/cookies';
import { generateToken, verifyToken } from '../utils/token';
import { getAuthToken } from '../utils/token';
import config from '../config/env';

const africanCurrencies = [
  // NORTH AFRICA (6 countries)
  { country: 'Algeria', currency: 'Algerian Dinar', code: 'DZD', symbol: 'د.ج', flag: '🇩🇿', region: 'North Africa' },
  { country: 'Egypt', currency: 'Egyptian Pound', code: 'EGP', symbol: 'E£', flag: '🇪🇬', region: 'North Africa' },
  { country: 'Libya', currency: 'Libyan Dinar', code: 'LYD', symbol: 'ل.د', flag: '🇱🇾', region: 'North Africa' },
  { country: 'Morocco', currency: 'Moroccan Dirham', code: 'MAD', symbol: 'MAD', flag: '🇲🇦', region: 'North Africa' },
  { country: 'Tunisia', currency: 'Tunisian Dinar', code: 'TND', symbol: 'د.ت', flag: '🇹🇳', region: 'North Africa' },
  { country: 'Western Sahara', currency: 'Moroccan Dirham', code: 'MAD', symbol: 'MAD', flag: '🇪🇭', region: 'North Africa' },

  // WEST AFRICA (16 countries)
  { country: 'Benin', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇧🇯', region: 'West Africa' },
  { country: 'Burkina Faso', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇧🇫', region: 'West Africa' },
  { country: 'Cabo Verde', currency: 'Cape Verdean Escudo', code: 'CVE', symbol: 'CVE', flag: '🇨🇻', region: 'West Africa' },
  { country: 'Côte d\'Ivoire', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇨🇮', region: 'West Africa' },
  { country: 'Gambia', currency: 'Gambian Dalasi', code: 'GMD', symbol: 'D', flag: '🇬🇲', region: 'West Africa' },
  { country: 'Ghana', currency: 'Ghanaian Cedi', code: 'GHS', symbol: '₵', flag: '🇬🇭', region: 'West Africa' },
  { country: 'Guinea', currency: 'Guinean Franc', code: 'GNF', symbol: 'FG', flag: '🇬🇳', region: 'West Africa' },
  { country: 'Guinea-Bissau', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇬🇼', region: 'West Africa' },
  { country: 'Liberia', currency: 'Liberian Dollar', code: 'LRD', symbol: 'L$', flag: '🇱🇷', region: 'West Africa' },
  { country: 'Mali', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇲🇱', region: 'West Africa' },
  { country: 'Mauritania', currency: 'Mauritanian Ouguiya', code: 'MRU', symbol: 'UM', flag: '🇲🇷', region: 'West Africa' },
  { country: 'Niger', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇳🇪', region: 'West Africa' },
  { country: 'Nigeria', currency: 'Nigerian Naira', code: 'NGN', symbol: '₦', flag: '🇳🇬', region: 'West Africa' },
  { country: 'Senegal', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇸🇳', region: 'West Africa' },
  { country: 'Sierra Leone', currency: 'Sierra Leonean Leone', code: 'SLL', symbol: 'Le', flag: '🇸🇱', region: 'West Africa' },
  { country: 'Togo', currency: 'West African CFA Franc', code: 'XOF', symbol: 'CFA', flag: '🇹🇬', region: 'West Africa' },

  // CENTRAL AFRICA (9 countries)
  { country: 'Cameroon', currency: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA', flag: '🇨🇲', region: 'Central Africa' },
  { country: 'Central African Republic', currency: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA', flag: '🇨🇫', region: 'Central Africa' },
  { country: 'Chad', currency: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA', flag: '🇹🇩', region: 'Central Africa' },
  { country: 'Congo', currency: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA', flag: '🇨🇬', region: 'Central Africa' },
  { country: 'Democratic Republic of the Congo', currency: 'Congolese Franc', code: 'CDF', symbol: 'FC', flag: '🇨🇩', region: 'Central Africa' },
  { country: 'Equatorial Guinea', currency: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA', flag: '🇬🇶', region: 'Central Africa' },
  { country: 'Gabon', currency: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA', flag: '🇬🇦', region: 'Central Africa' },
  { country: 'São Tomé and Príncipe', currency: 'São Tomé Dobra', code: 'STN', symbol: 'Db', flag: '🇸🇹', region: 'Central Africa' },
  { country: 'Rwanda', currency: 'Rwandan Franc', code: 'RWF', symbol: 'FRw', flag: '🇷🇼', region: 'Central Africa' },

  // EAST AFRICA (18 countries) - SUDAN MOVED HERE!
  { country: 'Burundi', currency: 'Burundian Franc', code: 'BIF', symbol: 'FBu', flag: '🇧🇮', region: 'East Africa' },
  { country: 'Comoros', currency: 'Comorian Franc', code: 'KMF', symbol: 'CF', flag: '🇰🇲', region: 'East Africa' },
  { country: 'Djibouti', currency: 'Djiboutian Franc', code: 'DJF', symbol: 'Fdj', flag: '🇩🇯', region: 'East Africa' },
  { country: 'Eritrea', currency: 'Eritrean Nakfa', code: 'ERN', symbol: 'Nfk', flag: '🇪🇷', region: 'East Africa' },
  { country: 'Ethiopia', currency: 'Ethiopian Birr', code: 'ETB', symbol: 'Br', flag: '🇪🇹', region: 'East Africa' },
  { country: 'Kenya', currency: 'Kenyan Shilling', code: 'KES', symbol: 'KSh', flag: '🇰🇪', region: 'East Africa' },
  { country: 'Madagascar', currency: 'Malagasy Ariary', code: 'MGA', symbol: 'Ar', flag: '🇲🇬', region: 'East Africa' },
  { country: 'Malawi', currency: 'Malawian Kwacha', code: 'MWK', symbol: 'MK', flag: '🇲🇼', region: 'East Africa' },
  { country: 'Mauritius', currency: 'Mauritian Rupee', code: 'MUR', symbol: '₨', flag: '🇲🇺', region: 'East Africa' },
  { country: 'Mozambique', currency: 'Mozambican Metical', code: 'MZN', symbol: 'MT', flag: '🇲🇿', region: 'East Africa' },
  { country: 'Seychelles', currency: 'Seychellois Rupee', code: 'SCR', symbol: 'SR', flag: '🇸🇨', region: 'East Africa' },
  { country: 'Somalia', currency: 'Somali Shilling', code: 'SOS', symbol: 'SOS', flag: '🇸🇴', region: 'East Africa' },
  { country: 'South Sudan', currency: 'South Sudanese Pound', code: 'SSP', symbol: 'SSP', flag: '🇸🇸', region: 'East Africa' },
  { country: 'Sudan', currency: 'Sudanese Pound', code: 'SDG', symbol: 'SDG', flag: '🇸🇩', region: 'East Africa' }, // ✓ MOVED HERE
  { country: 'Tanzania', currency: 'Tanzanian Shilling', code: 'TZS', symbol: 'TSh', flag: '🇹🇿', region: 'East Africa' },
  { country: 'Uganda', currency: 'Ugandan Shilling', code: 'UGX', symbol: 'USh', flag: '🇺🇬', region: 'East Africa' },
  { country: 'Zambia', currency: 'Zambian Kwacha', code: 'ZMW', symbol: 'ZK', flag: '🇿🇲', region: 'East Africa' },
  { country: 'Zimbabwe', currency: 'Zimbabwean Gold', code: 'ZWG', symbol: 'ZiG', flag: '🇿🇼', region: 'East Africa' },

  // SOUTHERN AFRICA (6 countries)
  { country: 'Angola', currency: 'Angolan Kwanza', code: 'AOA', symbol: 'Kz', flag: '🇦🇴', region: 'Southern Africa' },
  { country: 'Botswana', currency: 'Botswana Pula', code: 'BWP', symbol: 'P', flag: '🇧🇼', region: 'Southern Africa' },
  { country: 'Eswatini', currency: 'Swazi Lilangeni', code: 'SZL', symbol: 'E', flag: '🇸🇿', region: 'Southern Africa' },
  { country: 'Lesotho', currency: 'Lesotho Loti', code: 'LSL', symbol: 'L', flag: '🇱🇸', region: 'Southern Africa' },
  { country: 'Namibia', currency: 'Namibian Dollar', code: 'NAD', symbol: 'N$', flag: '🇳🇦', region: 'Southern Africa' },
  { country: 'South Africa', currency: 'South African Rand', code: 'ZAR', symbol: 'R', flag: '🇿🇦', region: 'Southern Africa' }
];

// Business sectors
const businessSectors = [
  'Retail', 'Manufacturing', 'Construction', 'Agriculture',
  'Services', 'Technology', 'Healthcare', 'Hospitality', 'Transportation',
  'Mining', 'Education', 'Finance', 'Real Estate', 'Energy'
];

// Helper text for each field
const fieldHelpers = {
  daysToSell: "How many days does it take to sell your inventory?",
  monthlyProfit: "Sales minus all expenses (profit or loss)",
  staffSalaries: "Total paid to all employees per month",
  loanPayments: "Total loan/debt repayments per month",
  totalAssets: "Equipment, inventory, property, vehicles",
  totalDebt: "All loans, credit, unpaid bills",
  businessSector: "What does your business do?",
  currency: "Select your country to set the currency"
};

const BusinessInfoScreen = () => {
  const navigate = useNavigate();
  const { setCurrency, setBusinessSector, setDiagnosisData } = useAppContext();
  const { loading: apiLoading, error: apiError, runDiagnosis } = useDiagnosis();

  const [formData, setFormData] = useState({
    country: 'Nigeria',
    businessSector: '',
    daysToSell: '',
    monthlyProfit: '',
    staffSalaries: '',
    loanPayments: '',
    totalAssets: '',
    totalDebt: ''
  });

  const [displayValues, setDisplayValues] = useState({
    daysToSell: '',
    monthlyProfit: '',
    staffSalaries: '',
    loanPayments: '',
    totalAssets: '',
    totalDebt: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeInfo, setActiveInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState({ code: 'NGN', symbol: '₦' });

  // Check authentication on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = getAuthToken();
        if (!token || !verifyToken(token)) {
          setError('Your session has expired. Please start over.');
          setTimeout(() => navigate('/welcome'), 3000);
          return;
        }

        const csrfToken = getCookie('XSRF-TOKEN');
        if (!csrfToken) {
          generateCSRFToken();
        }

        setIsAuthenticated(true);
      } catch (err) {
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [navigate]);

  // Update currency when country changes
  useEffect(() => {
    const countryData = africanCurrencies.find(c => c.country === formData.country);
    if (countryData) {
      setSelectedCurrency({ code: countryData.code, symbol: countryData.symbol });
    }
  }, [formData.country]);

  // Get current currency symbol
  const getCurrentCurrencySymbol = () => {
    return selectedCurrency.symbol;
  };

  // Format number with thousand separators
  const formatNumberWithCommas = (value) => {
    if (!value) return '';
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['daysToSell', 'monthlyProfit', 'staffSalaries', 'loanPayments', 'totalAssets', 'totalDebt'];
    
    if (numericFields.includes(name)) {
      const numericValue = value.replace(/[^\d]/g, '');
      const cleanedValue = numericValue.replace(/^0+/, '') || '';
      
      setFormData(prev => ({ ...prev, [name]: cleanedValue }));
      setDisplayValues(prev => ({ 
        ...prev, 
        [name]: cleanedValue ? formatNumberWithCommas(cleanedValue) : '' 
      }));
      
      validateField(name, cleanedValue);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle increment/decrement for days to sell
  const handleIncrement = () => {
    const currentValue = parseInt(formData.daysToSell) || 0;
    if (currentValue < 365) {
      const newValue = currentValue + 1;
      setFormData(prev => ({ ...prev, daysToSell: newValue.toString() }));
      setDisplayValues(prev => ({ 
        ...prev, 
        daysToSell: newValue.toString() 
      }));
      validateField('daysToSell', newValue.toString());
    }
  };

  const handleDecrement = () => {
    const currentValue = parseInt(formData.daysToSell) || 0;
    if (currentValue > 1) {
      const newValue = currentValue - 1;
      setFormData(prev => ({ ...prev, daysToSell: newValue.toString() }));
      setDisplayValues(prev => ({ 
        ...prev, 
        daysToSell: newValue.toString() 
      }));
      validateField('daysToSell', newValue.toString());
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    if (field === 'businessSector') {
      if (!value) {
        setErrors(prev => ({ ...prev, [field]: 'Please select a business sector' }));
        return false;
      }
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    }

    if (field === 'country') return true;

    if (!value || value === '') {
      setErrors(prev => ({ ...prev, [field]: 'This field is required' }));
      return false;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setErrors(prev => ({ ...prev, [field]: 'Please enter numbers only' }));
      return false;
    }

    if (numValue < 0) {
      setErrors(prev => ({ ...prev, [field]: 'Amount cannot be negative' }));
      return false;
    }

    if (field === 'daysToSell' && numValue > 365) {
      setErrors(prev => ({ ...prev, [field]: 'Days cannot exceed 365' }));
      return false;
    }

    setErrors(prev => ({ ...prev, [field]: '' }));
    return true;
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.businessSector) {
      newErrors.businessSector = 'Please select a business sector';
      isValid = false;
    }

    const numericFields = ['daysToSell', 'monthlyProfit', 'staffSalaries', 'loanPayments', 'totalAssets', 'totalDebt'];
    
    numericFields.forEach(field => {
      const value = formData[field];
      
      if (!value || value === '') {
        newErrors[field] = 'This field is required';
        isValid = false;
      } else {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          newErrors[field] = 'Please enter numbers only';
          isValid = false;
        } else if (numValue < 0) {
          newErrors[field] = 'Amount cannot be negative';
          isValid = false;
        } else if (field === 'daysToSell' && numValue > 365) {
          newErrors[field] = 'Days cannot exceed 365';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsButtonClicked(true);
    setTimeout(() => setIsButtonClicked(false), 200);
    
    if (!validateForm()) {
      const firstError = document.querySelector('.text-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const countryData = africanCurrencies.find(c => c.country === formData.country);
      
      // Store in context and session storage
      setCurrency(countryData?.code || 'NGN', countryData?.symbol || '₦');
      setBusinessSector(formData.businessSector);
      
      sessionStorage.setItem('country', formData.country);
      sessionStorage.setItem('currency', countryData?.code || 'NGN');
      sessionStorage.setItem('currencySymbol', countryData?.symbol || '₦');
      sessionStorage.setItem('businessSector', formData.businessSector);
      sessionStorage.setItem('formData', JSON.stringify(formData));
      
      // SECURITY: Generate CSRF token
      const csrfToken = generateCSRFToken();
      const authToken = generateToken('user-' + Date.now());
      sessionStorage.setItem('auth_token', authToken);

      if (config.features.devMode) {
        // Development mode - simulate API call
        console.log('Development mode - simulated API call', formData);
        
        // Simulate API response
        const mockResult = {
          status: 'success',
          health_score: 48,
          breakdown: {
            cash_position: { current: 15, max: 25, label: 'Cash Position' },
            profit_margin: { current: 10, max: 30, label: 'Profit & Efficiency' },
            asset_vs_debt: { current: 15, max: 25, label: 'Asset to Debt' },
            debt_coverage: { current: 10, max: 20, label: 'Debt Coverage' }
          },
          impacts: {
            high_impact: ['total_debt'],
            medium_impact: ['inventory_days', 'monthly_loan_payment'],
            low_impact: ['monthly_cash_surplus', 'total_assets', 'monthly_wages']
          },
          currency: countryData?.code || 'NGN',
          explanation: 'Your business shows signs of financial stress in key areas.'
        };
        
        setDiagnosisData(mockResult);
        navigate('/results');
      } else {
        // Production mode - call actual API
        // Format the data to match what the backend expects
        const formattedData = {
          daysToSell: formData.daysToSell,
          monthlyProfit: formData.monthlyProfit,
          staffSalaries: formData.staffSalaries,
          loanPayments: formData.loanPayments,
          totalAssets: formData.totalAssets,
          totalDebt: formData.totalDebt,
          businessSector: formData.businessSector,
          currency: selectedCurrency.code,  // ← THIS WAS MISSING!
        };

        console.log('📤 SENDING FORMATTED DATA:', formattedData);
        const result = await runDiagnosis(formattedData);
        setDiagnosisData(result);
        navigate('/results');
      }
      
    } catch (error) {
      // Error is handled by hook or show user-friendly message
      console.error('Submission error:', error);
      setError('Unable to process your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleInfo = (field) => {
    setActiveInfo(activeInfo === field ? null : field);
  };

  const hasError = (field) => {
    return touched[field] && errors[field];
  };

  const getButtonColor = () => {
    return isButtonClicked ? '#0F3E3A' : '#2C6C71';
  };

  const getPlaceholder = (field) => {
    if (field === 'daysToSell') return 'e.g., 30';
    return 'e.g., 50,000';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => navigate('/welcome')}
              className="px-4 py-2 bg-[#2C6C71] text-white rounded-[10px]"
            >
              Go to Welcome
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
      <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative">
        {/* Fixed Header */}
        <div className="bg-white pt-4 pb-2 px-4 border-b border-gray-100 sticky top-0 z-20">
          <div className="flex items-center justify-center relative">
            <button 
              onClick={() => navigate('/welcome')}
              className="absolute left-0 text-xl text-gray-500 hover:text-gray-700 transition-colors duration-200"
              style={{ fontSize: '24px', fontWeight: '300' }}
            >
              &lt;
            </button>
            <h1 className="text-xl font-semibold" style={{ color: '#01272B' }}>
              Business Information
            </h1>
          </div>
        </div>

        <div className="px-4 pt-4 pb-8 max-h-[600px] overflow-y-auto scrollbar-hide" 
             style={{ 
               scrollbarWidth: 'none',
               msOverflowStyle: 'none'
             }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Country/Currency Selector - ALL 54 African Countries */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Country</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('currency')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'currency' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.currency}
                </div>
              )}
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full p-3.5 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2d5f5d] focus:border-2 bg-white appearance-none text-gray-900"
              >
                <option value="" disabled>Select your country</option>
                
                <optgroup label="North Africa">
                  {africanCurrencies.filter(c => 
                    ['Algeria', 'Egypt', 'Libya', 'Morocco', 'Sudan', 'Tunisia', 'Western Sahara'].includes(c.country)
                  ).sort((a, b) => a.country.localeCompare(b.country)).map(c => (
                    <option key={c.country} value={c.country}>
                      {c.flag} {c.country} - {c.currency} ({c.symbol})
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="West Africa">
                  {africanCurrencies.filter(c => 
                    ['Benin', 'Burkina Faso', 'Cabo Verde', "Côte d'Ivoire", 'Gambia', 'Ghana', 'Guinea', 
                     'Guinea-Bissau', 'Liberia', 'Mali', 'Mauritania', 'Niger', 'Nigeria', 'Senegal', 
                     'Sierra Leone', 'Togo'].includes(c.country)
                  ).sort((a, b) => a.country.localeCompare(b.country)).map(c => (
                    <option key={c.country} value={c.country}>
                      {c.flag} {c.country} - {c.currency} ({c.symbol})
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Central Africa">
                  {africanCurrencies.filter(c => 
                    ['Cameroon', 'Central African Republic', 'Chad', 'Congo', 'Democratic Republic of the Congo', 
                     'Equatorial Guinea', 'Gabon', 'São Tomé and Príncipe', 'Rwanda'].includes(c.country)
                  ).sort((a, b) => a.country.localeCompare(b.country)).map(c => (
                    <option key={c.country} value={c.country}>
                      {c.flag} {c.country} - {c.currency} ({c.symbol})
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="East Africa">
                  {africanCurrencies.filter(c => 
                    ['Burundi', 'Comoros', 'Djibouti', 'Eritrea', 'Ethiopia', 'Kenya', 'Madagascar', 
                     'Malawi', 'Mauritius', 'Mozambique', 'Seychelles', 'Somalia', 'South Sudan', 
                     'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe'].includes(c.country)
                  ).sort((a, b) => a.country.localeCompare(b.country)).map(c => (
                    <option key={c.country} value={c.country}>
                      {c.flag} {c.country} - {c.currency} ({c.symbol})
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Southern Africa">
                  {africanCurrencies.filter(c => 
                    ['Angola', 'Botswana', 'Eswatini', 'Lesotho', 'Namibia', 'South Africa'].includes(c.country)
                  ).sort((a, b) => a.country.localeCompare(b.country)).map(c => (
                    <option key={c.country} value={c.country}>
                      {c.flag} {c.country} - {c.currency} ({c.symbol})
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Currency: {selectedCurrency.code} ({selectedCurrency.symbol})
              </p>
            </div>

            {/* Business Sector */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Your Business Type</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('businessSector')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'businessSector' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.businessSector}
                </div>
              )}
              <select
                name="businessSector"
                value={formData.businessSector}
                onChange={handleChange}
                onBlur={() => handleBlur('businessSector')}
                className={`w-full p-3.5 border rounded-[10px] focus:outline-none focus:border-[#2d5f5d] focus:border-2 bg-white appearance-none ${
                  hasError('businessSector') ? 'border-red-500' : 'border-gray-200'
                }`}
              >
                <option value="" disabled>Select business type</option>
                {businessSectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
              {hasError('businessSector') && (
                <p className="text-xs text-red-500 mt-1">{errors.businessSector}</p>
              )}
            </div>

            {/* Days to Sell Stock */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Days to Sell Stock</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('daysToSell')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'daysToSell' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.daysToSell}
                </div>
              )}
              <div className={`flex items-center border rounded-[10px] overflow-hidden focus-within:border-[#2d5f5d] focus-within:border-2`}
                   style={{ borderColor: hasError('daysToSell') ? '#ef4444' : '#e5e7eb' }}>
                <input
                  type="text"
                  name="daysToSell"
                  value={displayValues.daysToSell}
                  onChange={handleChange}
                  onBlur={() => handleBlur('daysToSell')}
                  placeholder={getPlaceholder('daysToSell')}
                  inputMode="numeric"
                  className="flex-1 p-3.5 outline-none border-none text-gray-900"
                />
                <div className="flex flex-col border-l border-gray-200">
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-xs font-light"
                  >
                    ^
                  </button>
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-xs font-light border-t border-gray-200"
                  >
                    v
                  </button>
                </div>
              </div>
              {hasError('daysToSell') && (
                <p className="text-xs text-red-500 mt-1">{errors.daysToSell}</p>
              )}
            </div>

            {/* Monthly Profit */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Monthly Profit</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('monthlyProfit')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'monthlyProfit' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.monthlyProfit}
                </div>
              )}
              <div className={`flex items-center border rounded-[10px] overflow-hidden focus-within:border-[#2d5f5d] focus-within:border-2 ${
                hasError('monthlyProfit') ? 'border-red-500' : 'border-gray-200'
              }`}>
                <span className="px-3 text-gray-500 bg-gray-50 py-3.5 border-r border-gray-200">
                  {getCurrentCurrencySymbol()}
                </span>
                <input
                  type="text"
                  name="monthlyProfit"
                  value={displayValues.monthlyProfit}
                  onChange={handleChange}
                  onBlur={() => handleBlur('monthlyProfit')}
                  placeholder={getPlaceholder('monthlyProfit')}
                  inputMode="numeric"
                  className="flex-1 p-3.5 outline-none border-none text-gray-900"
                />
              </div>
              {hasError('monthlyProfit') && (
                <p className="text-xs text-red-500 mt-1">{errors.monthlyProfit}</p>
              )}
            </div>

            {/* Monthly Staff Salaries */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Monthly Staff Salaries</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('staffSalaries')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'staffSalaries' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.staffSalaries}
                </div>
              )}
              <div className={`flex items-center border rounded-[10px] overflow-hidden focus-within:border-[#2d5f5d] focus-within:border-2 ${
                hasError('staffSalaries') ? 'border-red-500' : 'border-gray-200'
              }`}>
                <span className="px-3 text-gray-500 bg-gray-50 py-3.5 border-r border-gray-200">
                  {getCurrentCurrencySymbol()}
                </span>
                <input
                  type="text"
                  name="staffSalaries"
                  value={displayValues.staffSalaries}
                  onChange={handleChange}
                  onBlur={() => handleBlur('staffSalaries')}
                  placeholder={getPlaceholder('staffSalaries')}
                  inputMode="numeric"
                  className="flex-1 p-3.5 outline-none border-none text-gray-900"
                />
              </div>
              {hasError('staffSalaries') && (
                <p className="text-xs text-red-500 mt-1">{errors.staffSalaries}</p>
              )}
            </div>

            {/* Monthly Loan Payments */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Monthly Loan Payments</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('loanPayments')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'loanPayments' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.loanPayments}
                </div>
              )}
              <div className={`flex items-center border rounded-[10px] overflow-hidden focus-within:border-[#2d5f5d] focus-within:border-2 ${
                hasError('loanPayments') ? 'border-red-500' : 'border-gray-200'
              }`}>
                <span className="px-3 text-gray-500 bg-gray-50 py-3.5 border-r border-gray-200">
                  {getCurrentCurrencySymbol()}
                </span>
                <input
                  type="text"
                  name="loanPayments"
                  value={displayValues.loanPayments}
                  onChange={handleChange}
                  onBlur={() => handleBlur('loanPayments')}
                  placeholder={getPlaceholder('loanPayments')}
                  inputMode="numeric"
                  className="flex-1 p-3.5 outline-none border-none text-gray-900"
                />
              </div>
              {hasError('loanPayments') && (
                <p className="text-xs text-red-500 mt-1">{errors.loanPayments}</p>
              )}
            </div>

            {/* Total Assets */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Total Assets</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('totalAssets')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'totalAssets' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.totalAssets}
                </div>
              )}
              <div className={`flex items-center border rounded-[10px] overflow-hidden focus-within:border-[#2d5f5d] focus-within:border-2 ${
                hasError('totalAssets') ? 'border-red-500' : 'border-gray-200'
              }`}>
                <span className="px-3 text-gray-500 bg-gray-50 py-3.5 border-r border-gray-200">
                  {getCurrentCurrencySymbol()}
                </span>
                <input
                  type="text"
                  name="totalAssets"
                  value={displayValues.totalAssets}
                  onChange={handleChange}
                  onBlur={() => handleBlur('totalAssets')}
                  placeholder={getPlaceholder('totalAssets')}
                  inputMode="numeric"
                  className="flex-1 p-3.5 outline-none border-none text-gray-900"
                />
              </div>
              {hasError('totalAssets') && (
                <p className="text-xs text-red-500 mt-1">{errors.totalAssets}</p>
              )}
            </div>

            {/* Total Debt */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Total Debt</label>
                <button 
                  type="button"
                  onClick={() => toggleInfo('totalDebt')}
                  className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors bg-transparent"
                >
                  i
                </button>
              </div>
              {activeInfo === 'totalDebt' && (
                <div className="mb-2 p-2 bg-blue-50 text-xs text-blue-700 rounded-md">
                  {fieldHelpers.totalDebt}
                </div>
              )}
              <div className={`flex items-center border rounded-[10px] overflow-hidden focus-within:border-[#2d5f5d] focus-within:border-2 ${
                hasError('totalDebt') ? 'border-red-500' : 'border-gray-200'
              }`}>
                <span className="px-3 text-gray-500 bg-gray-50 py-3.5 border-r border-gray-200">
                  {getCurrentCurrencySymbol()}
                </span>
                <input
                  type="text"
                  name="totalDebt"
                  value={displayValues.totalDebt}
                  onChange={handleChange}
                  onBlur={() => handleBlur('totalDebt')}
                  placeholder={getPlaceholder('totalDebt')}
                  inputMode="numeric"
                  className="flex-1 p-3.5 outline-none border-none text-gray-900"
                />
              </div>
              {hasError('totalDebt') && (
                <p className="text-xs text-red-500 mt-1">{errors.totalDebt}</p>
              )}
            </div>

            {/* Check Health Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || apiLoading || !isAuthenticated}
                className="w-full font-semibold py-4 px-6 rounded-[10px] shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: getButtonColor(),
                  color: 'white'
                }}
              >
                {isSubmitting || apiLoading ? 'Processing...' : 'Check Health'}
              </button>
            </div>

            {/* API Error Message */}
            {apiError && (
              <p className="text-xs text-red-500 text-center mt-2">{apiError}</p>
            )}

            {Object.keys(errors).length > 0 && Object.values(errors).some(e => e) && (
              <p className="text-xs text-red-500 text-center mt-2">
                Please fix the errors above before submitting.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoScreen;