import config from '../config/env';
import { getAuthToken, refreshToken } from '../utils/token';
import { getCookie, validateCSRFToken } from '../utils/cookies';
import { sanitizeFormData } from '../utils/sanitize';

// API Base URL from environment variables
const API_BASE_URL = config.api.baseUrl();

// SECURITY MEASURE: Request interceptor for auth and CSRF
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = getAuthToken();
    const csrfToken = getCookie('XSRF-TOKEN');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    console.log('🔍 DEBUG INFO:');
    console.log('FULL URL:', `${API_BASE_URL}${endpoint}`);
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('ENDPOINT:', endpoint);
    console.log('METHOD:', options.method || 'GET');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      const newToken = refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    
    if (response.status === 422) {
      const data = await response.json();
      errorMessage = data.message || 'Invalid data provided';
    } else if (response.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (response.status === 403) {
      errorMessage = 'Access denied. Invalid CSRF token.';
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
};

// ==================== API ENDPOINTS ====================

/**
 * 1. Business Diagnosis (/diagnose)
 */
export const diagnoseBusiness = async (businessData) => {
  const sanitizedData = sanitizeFormData({
    inventory_days: parseFloat(businessData.daysToSell) || 0,
    monthly_cash_surplus: parseFloat(businessData.monthlyProfit) || 0,
    monthly_wages: parseFloat(businessData.staffSalaries) || 0,
    monthly_loan_payment: parseFloat(businessData.loanPayments) || 0,
    total_assets: parseFloat(businessData.totalAssets) || 0,
    total_debt: parseFloat(businessData.totalDebt) || 0,
    sector: businessData.businessSector,
    currency: businessData.currency,
  });

  const response = await apiRequest('/diagnose', {
    method: 'POST',
    body: JSON.stringify(sanitizedData),
  });

  return handleResponse(response);
};

/**
 * 2. Strategy Simulation (/simulate) - COMPLETELY FIXED
 */
export const simulateStrategy = async (originalData, adjustments) => {
  // Create payload WITHOUT adjustments field if empty
  const basePayload = {
    inventory_days: parseFloat(originalData.daysToSell) || 0,
    monthly_cash_surplus: parseFloat(originalData.monthlyProfit) || 0,
    monthly_wages: parseFloat(originalData.staffSalaries) || 0,
    monthly_loan_payment: parseFloat(originalData.loanPayments) || 0,
    total_assets: parseFloat(originalData.totalAssets) || 0,
    total_debt: parseFloat(originalData.totalDebt) || 0,
    sector: originalData.businessSector || '',
    currency: originalData.currency || 'USD',
  };

  // Only add adjustments if they exist and are not empty
  const payload = { ...basePayload };
  if (adjustments && Object.keys(adjustments).length > 0) {
    payload.adjustments = adjustments;
  }

  console.log('📤 FINAL SIMULATE PAYLOAD:', JSON.stringify(payload, null, 2));

  const response = await apiRequest('/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

/**
 * 3. Business Coach (/api/coach) - FIXED to match curl command
 */
export const getCoachAdvice = async (userData) => {
  const payload = {
    sector: userData.sector,
    final_score: userData.final_score,
    currency: userData.currency || 'USD',
    adjusted_data: userData.adjusted_data || {}
  };

  console.log('📤 COACH PAYLOAD:', payload);

  const COACH_API_URL = 'https://backend-ywt0.onrender.com/api/coach';
  
  const response = await fetch(COACH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      'X-CSRF-Token': getCookie('XSRF-TOKEN')
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Coach API failed');
  }

  return response.json();
};

/**
 * 4. Report Download (/api/report/download) - WITH FALLBACK
 */
export const downloadReport = async (coachData) => {
  const payload = {
    sector: coachData.sector,
    final_score: coachData.final_score,
    currency: coachData.currency,
    action_steps: coachData.action_steps,
    growth_tips: coachData.growth_tips,
  };

  console.log('📤 DOWNLOAD PAYLOAD:', payload);

  try {
    const response = await apiRequest('/api/report/download', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Download API returned ${response.status}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Download API error:', error);
    return null;
  }
};

// ==================== HELPER FUNCTIONS ====================

export const mapImpactToColor = (impact) => {
  const impactMap = {
    high_impact: '#D20303',
    medium_impact: '#EFB700',
    low_impact: '#12AE00',
  };
  return impactMap[impact] || '#D9D9D9';
};

export const mapFieldToDisplay = (field) => {
  const fieldMap = {
    inventory_days: 'Days to Sell Stock',
    monthly_cash_surplus: 'Monthly Profit',
    monthly_wages: 'Monthly Staff Salaries',
    monthly_loan_payment: 'Monthly Loan Payments',
    total_assets: 'Total Assets',
    total_debt: 'Total Debt',
  };
  return fieldMap[field] || field;
};

export const formatBreakdown = (breakdown) => {
  return [
    {
      label: breakdown.cash_position.label,
      score: breakdown.cash_position.current,
      max: breakdown.cash_position.max,
      percentage: Math.round((breakdown.cash_position.current / breakdown.cash_position.max) * 100),
    },
    {
      label: breakdown.profit_margin.label,
      score: breakdown.profit_margin.current,
      max: breakdown.profit_margin.max,
      percentage: Math.round((breakdown.profit_margin.current / breakdown.profit_margin.max) * 100),
    },
    {
      label: breakdown.asset_vs_debt.label,
      score: breakdown.asset_vs_debt.current,
      max: breakdown.asset_vs_debt.max,
      percentage: Math.round((breakdown.asset_vs_debt.current / breakdown.asset_vs_debt.max) * 100),
    },
    {
      label: breakdown.debt_coverage.label,
      score: breakdown.debt_coverage.current,
      max: breakdown.debt_coverage.max,
      percentage: Math.round((breakdown.debt_coverage.current / breakdown.debt_coverage.max) * 100),
    },
  ];
};

export const formatImpacts = (impacts, formData, currencySymbol) => {
  const allImpacts = [];
  
  impacts.high_impact?.forEach(field => {
    allImpacts.push({
      field,
      title: mapFieldToDisplay(field),
      value: formData[field] || '0',
      displayValue: formatDisplayValue(field, formData[field], currencySymbol),
      impact: 'HIGH IMPACT',
      impactLevel: 'high',
      badgeColor: '#D20303',
    });
  });
  
  impacts.medium_impact?.forEach(field => {
    allImpacts.push({
      field,
      title: mapFieldToDisplay(field),
      value: formData[field] || '0',
      displayValue: formatDisplayValue(field, formData[field], currencySymbol),
      impact: 'MEDIUM IMPACT',
      impactLevel: 'medium',
      badgeColor: '#EFB700',
    });
  });
  
  impacts.low_impact?.forEach(field => {
    allImpacts.push({
      field,
      title: mapFieldToDisplay(field),
      value: formData[field] || '0',
      displayValue: formatDisplayValue(field, formData[field], currencySymbol),
      impact: 'LOW IMPACT',
      impactLevel: 'low',
      badgeColor: '#12AE00',
    });
  });
  
  return allImpacts;
};

const formatDisplayValue = (field, value, currencySymbol) => {
  if (!value) return field === 'inventory_days' ? '0 days' : `${currencySymbol} 0`;
  
  const numValue = parseInt(value, 10);
  const formattedNum = numValue.toLocaleString();
  
  if (field === 'inventory_days') {
    return `${formattedNum} days`;
  }
  return `${currencySymbol} ${formattedNum}`;
};