import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeInput } from '../utils/sanitize';
import { getCookie, generateCSRFToken } from '../utils/cookies';
import { getAuthToken, verifyToken } from '../utils/token';
import { useAppContext } from '../context/AppContext';

const SimulationSelectionScreen = () => {
  const navigate = useNavigate();
  const { diagnosisData } = useAppContext();
  const [selected, setSelected] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [formData, setFormData] = useState({});
  const [businessSector, setBusinessSector] = useState('');
  const [healthScore, setHealthScore] = useState(58);
  const [impactItems, setImpactItems] = useState([]);

  // Map backend field names to display names
  const mapFieldToDisplay = (field) => {
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

  // Format display values
  const formatDisplayValue = (field, value, symbol) => {
    if (!value) return field === 'inventory_days' ? '0 days' : `${symbol} 0`;
    const numValue = parseInt(value, 10);
    const formattedNum = numValue.toLocaleString();
    if (field === 'inventory_days') {
      return `${formattedNum} days`;
    }
    return `${symbol} ${formattedNum}`;
  };

  // Map backend field to form field
  const getFormFieldName = (backendField) => {
    const mapping = {
      'inventory_days': 'daysToSell',
      'monthly_cash_surplus': 'monthlyProfit',
      'monthly_wages': 'staffSalaries',
      'monthly_loan_payment': 'loanPayments',
      'total_assets': 'totalAssets',
      'total_debt': 'totalDebt',
    };
    return mapping[backendField] || backendField;
  };

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  // Get status text based on score
  const getStatusText = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Warning';
    return 'At Risk';
  };

  // Get impact points based on level
  const getImpactPoints = (level) => {
    switch(level) {
      case 'high': return '15-30 points';
      case 'medium': return '8-15 points';
      case 'low': return '5-8 points';
      default: return '5-8 points';
    }
  };

  // Get impact color based on level
  const getImpactColor = (level) => {
    switch(level) {
      case 'high': return '#D20303'; // Red
      case 'medium': return '#EFB700'; // Yellow
      case 'low': return '#12AE00'; // Green
      default: return '#D9D9D9';
    }
  };

  // BUSINESS LOGIC SANITY CHECKS - Override backend if obviously wrong
  const getSanitizedImpactLevel = (field, value, backendLevel) => {
    const numValue = parseFloat(value) || 0;
    
    // Total Debt sanity check
    if (field === 'total_debt' || field === 'totalDebt') {
      if (numValue > 1000000) return 'high'; // Over 1M debt = ALWAYS high impact
      if (numValue > 500000 && backendLevel === 'low') return 'medium'; // Upgrade if backend underestimates
    }
    
    // Monthly Loan Payment sanity check
    if (field === 'monthly_loan_payment' || field === 'loanPayments') {
      if (numValue > 300000) return 'high'; // Over 300k payment = ALWAYS high impact
      if (numValue > 100000 && backendLevel === 'low') return 'medium';
    }
    
    // Total Assets sanity check (LOW assets = HIGH impact)
    if (field === 'total_assets' || field === 'totalAssets') {
      if (numValue < 100000) return 'high'; // Under 100k assets = ALWAYS high impact
      if (numValue < 500000 && backendLevel === 'low') return 'medium';
    }
    
    // Days to Sell Stock sanity check
    if (field === 'inventory_days' || field === 'daysToSell') {
      if (numValue > 180) return 'high'; // Over 180 days = ALWAYS high impact
      if (numValue > 60 && backendLevel === 'low') return 'medium';
    }
    
    // Monthly Profit sanity check (LOW profit = HIGH impact)
    if (field === 'monthly_cash_surplus' || field === 'monthlyProfit') {
      if (numValue < 50000) return 'high'; // Under 50k profit = ALWAYS high impact
      if (numValue < 200000 && backendLevel === 'low') return 'medium';
    }
    
    // Staff Salaries sanity check (HIGH salaries = HIGH impact)
    if (field === 'monthly_wages' || field === 'staffSalaries') {
      if (numValue > 500000) return 'high'; // Over 500k salaries = ALWAYS high impact
      if (numValue > 200000 && backendLevel === 'low') return 'medium';
    }
    
    // Return backend level if no override needed
    return backendLevel;
  };

  // SECURITY MEASURE 1: Authentication check on mount
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

        // Load form data from session storage
        const storedData = sessionStorage.getItem('formData');
        const storedCurrency = sessionStorage.getItem('currency') || 'USD';
        const storedSymbol = sessionStorage.getItem('currencySymbol') || '$';
        const storedSector = sessionStorage.getItem('businessSector') || '';
        
        let parsedData = {};
        if (storedData) {
          parsedData = JSON.parse(storedData);
          const sanitizedData = {};
          Object.keys(parsedData).forEach(key => {
            sanitizedData[key] = sanitizeInput(parsedData[key]);
          });
          setFormData(sanitizedData);
        }
        
        setCurrency(storedCurrency);
        setCurrencySymbol(storedSymbol);
        setBusinessSector(sanitizeInput(storedSector));

        // Get health score and impacts from diagnosis data
        let score = 58;
        if (diagnosisData && diagnosisData.health_score) {
          score = diagnosisData.health_score;
          setHealthScore(score);

          // BUILD IMPACT ITEMS FROM API RESPONSE WITH SANITY CHECKS
          if (diagnosisData.impacts) {
            const impacts = diagnosisData.impacts;
            let items = [];
            
            console.log('🎯 Raw impacts from backend:', impacts);
            console.log('📊 User data:', parsedData);

            // Process ALL fields dynamically
            const allFields = [
              ...(impacts.high_impact || []).map(f => ({ field: f, backendLevel: 'high' })),
              ...(impacts.medium_impact || []).map(f => ({ field: f, backendLevel: 'medium' })),
              ...(impacts.low_impact || []).map(f => ({ field: f, backendLevel: 'low' }))
            ];

            allFields.forEach(({ field, backendLevel }) => {
              const formField = getFormFieldName(field);
              const rawValue = parsedData[formField] || '0';
              
              // Apply sanity checks
              const finalLevel = getSanitizedImpactLevel(field, rawValue, backendLevel);
              
              items.push({
                id: items.length + 1,
                field,
                title: mapFieldToDisplay(field),
                value: rawValue,
                displayValue: formatDisplayValue(field, rawValue, storedSymbol),
                impact: finalLevel === 'high' ? 'HIGH IMPACT' :
                        finalLevel === 'medium' ? 'MEDIUM IMPACT' : 'LOW IMPACT',
                impactLevel: finalLevel,
                badgeColor: getImpactColor(finalLevel),
                points: getImpactPoints(finalLevel),
                backendLevel: backendLevel, // Keep for debugging
                sortOrder: finalLevel === 'high' ? 1 : finalLevel === 'medium' ? 2 : 3
              });
            });

            // Sort by impact level
            items.sort((a, b) => a.sortOrder - b.sortOrder);
            
            console.log('✅ Final impact items with sanity checks:', items);
            setImpactItems(items);
          }
        } else {
          // Try to get from session storage as fallback
          const storedDiagnosis = sessionStorage.getItem('diagnosisResult');
          if (storedDiagnosis) {
            const parsedDiagnosis = JSON.parse(storedDiagnosis);
            if (parsedDiagnosis.health_score) {
              setHealthScore(parsedDiagnosis.health_score);
            }
            if (parsedDiagnosis.impacts) {
              const impacts = parsedDiagnosis.impacts;
              let items = [];
              
              const allFields = [
                ...(impacts.high_impact || []).map(f => ({ field: f, backendLevel: 'high' })),
                ...(impacts.medium_impact || []).map(f => ({ field: f, backendLevel: 'medium' })),
                ...(impacts.low_impact || []).map(f => ({ field: f, backendLevel: 'low' }))
              ];

              allFields.forEach(({ field, backendLevel }) => {
                const formField = getFormFieldName(field);
                const rawValue = parsedData[formField] || '0';
                const finalLevel = getSanitizedImpactLevel(field, rawValue, backendLevel);
                
                items.push({
                  id: items.length + 1,
                  field,
                  title: mapFieldToDisplay(field),
                  value: rawValue,
                  displayValue: formatDisplayValue(field, rawValue, storedSymbol),
                  impact: finalLevel === 'high' ? 'HIGH IMPACT' :
                          finalLevel === 'medium' ? 'MEDIUM IMPACT' : 'LOW IMPACT',
                  impactLevel: finalLevel,
                  badgeColor: getImpactColor(finalLevel),
                  points: getImpactPoints(finalLevel),
                  sortOrder: finalLevel === 'high' ? 1 : finalLevel === 'medium' ? 2 : 3
                });
              });

              items.sort((a, b) => a.sortOrder - b.sortOrder);
              setImpactItems(items);
            }
          }
        }

        setIsAuthenticated(true);
      } catch (err) {
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [navigate, diagnosisData]);

  const toggleSelect = (id) => {
    generateCSRFToken();
    setSelected(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleStartSimulate = () => {
    generateCSRFToken();
    
    // Store selected items in session storage
    sessionStorage.setItem('selectedItems', JSON.stringify(selected));
    sessionStorage.setItem('selectedImpactItems', JSON.stringify(
      impactItems.filter(item => selected.includes(item.id))
    ));
    
    navigate('/simulation');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <p className="text-center text-gray-500">Loading impact analysis...</p>
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
        <div className="absolute top-6 left-0 right-0 flex items-center justify-center z-10">
          <button 
            onClick={() => {
              generateCSRFToken();
              navigate('/results');
            }}
            className="absolute left-4 text-xl text-gray-500 hover:text-gray-700 transition-colors duration-200"
            style={{ fontSize: '24px', fontWeight: '300' }}
          >
            &lt;
          </button>
          <h1 className="text-xl font-semibold" style={{ color: '#01272B' }}>
            Choose What To Improve
          </h1>
        </div>

        <div className="px-5 pt-16 pb-24">
          <div className="bg-[#FFF8F8] rounded-[20px] p-5 mb-4 text-center">
            <p className="text-sm text-gray-700 leading-relaxed">
              Based on your financial data, our AI has identified which areas impact your score the most.
            </p>
          </div>

          {/* Business Risk Score card */}
          <div className="bg-[#FFF8F8] rounded-[20px] p-5 mb-6">
            <div className="text-center mb-3">
              <span className="text-sm font-medium text-gray-700">Your Business Risk Score</span>
            </div>
            
            <div className="flex items-center justify-center gap-8 mb-0">
              <div className="flex items-center gap-1">
                <span className="text-4xl font-bold" style={{ color: getScoreColor(healthScore) }}>
                  {healthScore}
                </span>
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              
              {healthScore < 60 && (
                <span 
                  className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: getScoreColor(healthScore) }}
                >
                  {getStatusText(healthScore)}!
                </span>
              )}
            </div>
          </div>

          {/* Impact Cards - DYNAMICALLY SORTED with SANITY CHECKS */}
          <div className="space-y-3">
            {impactItems.map(item => {
              const isSelected = selected.includes(item.id);
              
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className="p-4 rounded-[15px] cursor-pointer transition-all duration-200 border-2"
                  style={{ 
                    backgroundColor: '#D9D9D9',
                    borderColor: isSelected ? '#EFB700' : '#D9D9D9'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors duration-200 bg-white flex-shrink-0"
                      style={{ 
                        borderColor: isSelected ? '#EFB700' : '#888',
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 2" stroke="#EFB700" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <h3 className="text-xs font-medium text-gray-800">
                          {item.title}
                        </h3>
                        <span 
                          className="text-[10px] px-2 py-1 rounded-full font-medium text-white whitespace-nowrap flex-shrink-0"
                          style={{ backgroundColor: item.badgeColor }}
                        >
                          {item.impact}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{item.displayValue}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {item.impactLevel === 'high' ? '🔴 Critical issue - Must address immediately' :
                         item.impactLevel === 'medium' ? '🟡 Important - Should address soon' :
                         '🟢 Minor - Can address later'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Selected: {selected.length}
            </span>
            <button
              onClick={handleStartSimulate}
              disabled={!isAuthenticated || selected.length === 0}
              className="font-semibold py-3 px-8 rounded-[10px] shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: selected.length > 0 ? '#2C6C71' : '#A0A0A0',
                color: 'white'
              }}
            >
              Start Simulate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationSelectionScreen;