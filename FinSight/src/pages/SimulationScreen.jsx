import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeInput } from '../utils/sanitize';
import { getCookie, generateCSRFToken } from '../utils/cookies';
import { getAuthToken, verifyToken } from '../utils/token';
import { useAppContext } from '../context/AppContext';
import { useSimulation } from '../hooks/useSimulation';

const SimulationScreen = () => {
  const navigate = useNavigate();
  const { diagnosisData, setSimulationData } = useAppContext();
  const { loading: simulationLoading, error: simulationError, runSimulation } = useSimulation();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState('NGN');
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  const [formData, setFormData] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedImpactItems, setSelectedImpactItems] = useState([]);
  const [healthScore, setHealthScore] = useState(58);
  const [currentScore, setCurrentScore] = useState(58);
  const [scoreImpact, setScoreImpact] = useState(0);
  
  // Slider states
  const [sliders, setSliders] = useState({});

  // FUNCTION TO CLEAN NUMBER (REMOVES CURRENCY SYMBOLS AND COMMAS)
  const cleanNumber = (value) => {
    if (!value) return 0;
    // Remove everything except numbers, decimal points, and minus signs
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // FUNCTION TO FORMAT NUMBER WITH COMMAS
  const formatNumber = (num) => {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // FUNCTION TO GET REAL-TIME DISPLAY VALUE - COMPLETE MAPPING
  const getDisplayValue = (item, percentage) => {
    // Get raw value from formData
    let rawValue = 0;
    let unit = '';
    let isCurrency = false;

    console.log('🔍 Processing item:', item);
    console.log('📊 FormData available:', formData);

    // Get the item title and field name
    const title = (item.title || '').toLowerCase();
    const field = (item.field || '').toLowerCase();
    
    // ===== DAYS TO SELL STOCK =====
    if (title.includes('days') || field.includes('days') || field.includes('inventory')) {
      rawValue = cleanNumber(formData.daysToSell);
      rawValue = Math.min(365, Math.max(0, rawValue));
      unit = ' days';
      console.log('📅 Days to Sell:', rawValue);
    }
    
    // ===== TOTAL DEBT =====
    else if (title.includes('debt') || field.includes('debt')) {
      rawValue = cleanNumber(formData.totalDebt);
      isCurrency = true;
      console.log('💰 Total Debt:', rawValue);
    }
    
    // ===== MONTHLY PROFIT/REVENUE =====
    else if (title.includes('profit') || title.includes('revenue') || field.includes('profit') || field.includes('revenue')) {
      rawValue = cleanNumber(formData.monthlyProfit);
      isCurrency = true;
      console.log('📈 Monthly Profit:', rawValue);
    }
    
    // ===== STAFF SALARIES =====
    else if (title.includes('salary') || title.includes('staff') || field.includes('salary') || field.includes('staff')) {
      rawValue = cleanNumber(formData.staffSalaries);
      isCurrency = true;
      console.log('👥 Staff Salaries:', rawValue);
    }
    
    // ===== MONTHLY LOAN PAYMENTS =====
    else if (title.includes('loan') || field.includes('loan') || title.includes('payment') || field.includes('payment')) {
      // Try to get from formData - if not present, calculate from totalDebt
      if (formData.monthlyLoanPayments) {
        rawValue = cleanNumber(formData.monthlyLoanPayments);
      } else {
        // Estimate monthly payment as 10% of total debt (typical loan term)
        const totalDebt = cleanNumber(formData.totalDebt);
        rawValue = totalDebt * 0.1; // Rough estimate
        console.log('⚠️ Monthly loan payments not found, estimating from total debt:', rawValue);
      }
      isCurrency = true;
      console.log('💳 Monthly Loan Payments:', rawValue);
    }
    
    // ===== TOTAL ASSETS =====
    else if (title.includes('asset') || field.includes('asset')) {
      rawValue = cleanNumber(formData.totalAssets);
      isCurrency = true;
      console.log('🏦 Total Assets:', rawValue);
    }
    
    // ===== CASH RESERVES =====
    else if (title.includes('cash') || field.includes('cash')) {
      rawValue = cleanNumber(formData.cashReserves) || cleanNumber(formData.totalAssets) * 0.2; // Estimate if not present
      isCurrency = true;
      console.log('💵 Cash Reserves:', rawValue);
    }
    
    // ===== PROFIT MARGIN =====
    else if (title.includes('margin') || field.includes('margin')) {
      // Calculate from profit and revenue if not directly available
      if (formData.profitMargin) {
        rawValue = cleanNumber(formData.profitMargin);
      } else {
        const profit = cleanNumber(formData.monthlyProfit);
        const revenue = cleanNumber(formData.monthlyProfit); // Assuming profit is the revenue
        rawValue = revenue > 0 ? (profit / revenue) * 100 : 20; // Default 20%
      }
      unit = '%';
      console.log('📊 Profit Margin:', rawValue);
    }
    
    // ===== CUSTOMER SATISFACTION =====
    else if (title.includes('satisfaction') || field.includes('satisfaction')) {
      rawValue = cleanNumber(formData.customerSatisfaction) || 75; // Default 75%
      unit = '%';
      console.log('😊 Customer Satisfaction:', rawValue);
    }
    
    // ===== EMPLOYEE TURNOVER =====
    else if (title.includes('turnover') || field.includes('turnover')) {
      rawValue = cleanNumber(formData.employeeTurnover) || 15; // Default 15%
      unit = '%';
      console.log('🔄 Employee Turnover:', rawValue);
    }
    
    // ===== UNKNOWN =====
    else {
      console.warn('❓ Unknown item type:', item);
      rawValue = 100000; // Default fallback
      isCurrency = true;
    }

    // Calculate new value based on percentage change
    const newValue = rawValue + (rawValue * (percentage / 100));
    
    // Apply business rules
    let finalValue;
    if (unit === ' days') {
      // Days must be between 1 and 365
      finalValue = Math.min(365, Math.max(1, Math.round(newValue)));
    } else if (unit === '%') {
      // Percentages between 0-100
      finalValue = Math.min(100, Math.max(0, Math.round(newValue * 10) / 10));
    } else {
      finalValue = Math.round(newValue);
    }
    
    // Format and return
    if (isCurrency) {
      return `${currencySymbol}${formatNumber(finalValue)}`;
    } else {
      return `${formatNumber(finalValue)}${unit}`;
    }
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

  // Calculate real-time score impact based on selected items
  const calculateScoreImpact = () => {
    let impact = 0;
    
    selectedImpactItems.forEach(item => {
      const sliderValue = sliders[`slider_${item.id}`] || 0;
      
      // Different impact weights based on impact level
      if (item.impactLevel === 'high') {
        impact += (sliderValue * -0.25);
      } else if (item.impactLevel === 'medium') {
        impact += (sliderValue * -0.15);
      } else {
        impact += (sliderValue * -0.08);
      }
    });
    
    return Math.round(impact);
  };

  // Generate fallback benefits if API fails
  const generateFallbackBenefits = (oldScore, newScore) => {
    const improvement = newScore - oldScore;
    
    if (improvement > 15) {
      return "By making significant adjustments to your finances, your business shows major improvement in liquidity and stability. This strategy moves you toward a healthier financial position.";
    } else if (improvement > 5) {
      return "Your strategic adjustments have moved your business toward a more stable financial position. Continue focusing on key areas for further improvement.";
    } else if (improvement > 0) {
      return "Minor improvements to your financial metrics have been applied, showing slight progress in your business health. Consider more aggressive adjustments for better results.";
    } else if (improvement < 0) {
      return "Your adjustments have reduced your score. Consider different strategies or smaller adjustments to improve your business health.";
    } else {
      return "No significant changes detected. Try adjusting the sliders to see how different strategies might impact your business health.";
    }
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

        // Load form data and selected items from session storage
        const storedData = sessionStorage.getItem('formData');
        const storedCurrency = sessionStorage.getItem('currency') || 'NGN';
        const storedSymbol = sessionStorage.getItem('currencySymbol') || '₦';
        const storedSelected = sessionStorage.getItem('selectedItems');
        const storedImpactItems = sessionStorage.getItem('selectedImpactItems');
        const storedDiagnosis = sessionStorage.getItem('diagnosisResult');
        
        console.log('LOADING FROM SESSION:', {
          storedData,
          storedCurrency,
          storedSymbol,
          storedSelected,
          storedImpactItems
        });
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const sanitizedData = {};
          Object.keys(parsedData).forEach(key => {
            sanitizedData[key] = sanitizeInput(parsedData[key]);
          });
          setFormData(sanitizedData);
          console.log('✅ FORMDATA SET:', sanitizedData);
        } else {
          console.warn('⚠️ NO FORMDATA FOUND!');
          if (diagnosisData && diagnosisData.formData) {
            setFormData(diagnosisData.formData);
            console.log('✅ FORMDATA FROM DIAGNOSIS:', diagnosisData.formData);
          }
        }
        
        if (storedSelected) {
          setSelectedItems(JSON.parse(storedSelected));
        }
        
        if (storedImpactItems) {
          const items = JSON.parse(storedImpactItems);
          setSelectedImpactItems(items);
          
          // Initialize sliders for each selected item
          const initialSliders = {};
          items.forEach((item) => {
            initialSliders[`slider_${item.id}`] = 0;
          });
          setSliders(initialSliders);
          
          console.log('✅ Loaded selected impact items:', items);
        }
        
        // Get health score from diagnosis data
        let score = 58;
        if (diagnosisData && diagnosisData.health_score) {
          score = diagnosisData.health_score;
        } else if (storedDiagnosis) {
          const parsed = JSON.parse(storedDiagnosis);
          score = parsed.health_score || 58;
        }
        
        setHealthScore(score);
        setCurrentScore(score);
        
        setCurrency(storedCurrency);
        setCurrencySymbol(storedSymbol);

        setIsAuthenticated(true);
      } catch (err) {
        console.error('❌ Validation error:', err);
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [navigate, diagnosisData]);

  // Update score in real-time whenever any slider changes
  useEffect(() => {
    const impact = calculateScoreImpact();
    setScoreImpact(impact);
    const newScore = Math.min(100, Math.max(0, healthScore + impact));
    setCurrentScore(newScore);
  }, [sliders, healthScore, selectedImpactItems]);

  const handleSliderChange = (sliderId, value) => {
    generateCSRFToken();
    setSliders(prev => ({ ...prev, [sliderId]: parseInt(value) }));
  };

  // Handle See Impact with potential_benefits
  const handleSeeImpact = async () => {
    generateCSRFToken();
    
    try {
      const impact = calculateScoreImpact();
      const newScore = Math.min(100, Math.max(0, healthScore + impact));
      
      const potentialBenefits = generateFallbackBenefits(healthScore, newScore);
      
      const results = {
        baseScore: healthScore,
        newScore: newScore,
        scoreImpact: impact,
        selectedItems: selectedImpactItems,
        potentialBenefits: potentialBenefits,
        currency: currency,
        timestamp: Date.now()
      };
      
      console.log('💾 SAVING RESULTS:', results);
      sessionStorage.setItem('simulationResults', JSON.stringify(results));
      
      navigate('/updated-score');
      
    } catch (err) {
      console.log('❌ Error in handleSeeImpact:', err);
      
      const impact = calculateScoreImpact();
      const newScore = Math.min(100, Math.max(0, healthScore + impact));
      const fallbackBenefits = generateFallbackBenefits(healthScore, newScore);
      
      sessionStorage.setItem('simulationResults', JSON.stringify({
        baseScore: healthScore,
        newScore: newScore,
        scoreImpact: impact,
        selectedItems: selectedImpactItems,
        potentialBenefits: fallbackBenefits,
        currency: currency,
        timestamp: Date.now()
      }));
      
      navigate('/updated-score');
    }
  };

  // Get slider color based on value
  const getSliderTrackStyle = (value) => {
    const percentage = ((value + 100) / 200) * 100;
    
    if (value < 0) {
      return {
        background: `linear-gradient(90deg, #ef4444 0%, #fca5a5 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
      };
    } else if (value > 0) {
      return {
        background: `linear-gradient(90deg, #e5e7eb 0%, #e5e7eb 50%, #86efac ${percentage}%, #22c55e 100%)`
      };
    } else {
      return {
        background: '#e5e7eb'
      };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <p className="text-center text-gray-500">Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (error || simulationError) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-red-500 mb-4">{error || simulationError}</p>
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
        {/* Header with back arrow */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-center z-10">
          <button 
            onClick={() => {
              generateCSRFToken();
              navigate('/simulation-selection');
            }}
            className="absolute left-4 text-xl text-gray-500 hover:text-gray-700 transition-colors duration-200"
            style={{ fontSize: '24px', fontWeight: '300' }}
          >
            &lt;
          </button>
          <h1 className="text-2xl font-semibold" style={{ color: '#01272B' }}>
            Adjust & Simulate
          </h1>
        </div>

        <div className="px-6 pt-20 pb-8">
          {/* Instruction text */}
          <p className="text-sm text-gray-500 mb-8 text-center">
            Drag each slider to see how improvements affect your score in real time.
          </p>
          
          {/* DYNAMIC SLIDERS - REAL TIME UPDATES */}
          {selectedImpactItems.map(item => {
            const percentageValue = sliders[`slider_${item.id}`] || 0;
            // THIS UPDATES IN REAL TIME WHEN SLIDER MOVES
            const displayValue = getDisplayValue(item, percentageValue);
            
            return (
              <div key={item.id} className="border-2 rounded-[15px] p-4 mb-4" style={{ borderColor: '#998F8F' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-semibold text-gray-800">{item.title}</span>
                  <span className="text-base font-medium text-gray-900">
                    {percentageValue > 0 ? '+' : ''}{percentageValue}% 
                    <span className="text-sm text-gray-600 ml-1">
                      ({displayValue})
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={percentageValue}
                  onChange={(e) => handleSliderChange(`slider_${item.id}`, e.target.value)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={getSliderTrackStyle(percentageValue)}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>-100%</span>
                  <span>0%</span>
                  <span>+100%</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  {item.impactLevel === 'high' ? '🔴 High Impact - Dramatic effect' :
                   item.impactLevel === 'medium' ? '🟡 Medium Impact - Moderate effect' :
                   '🟢 Low Impact - Slight effect'}
                </p>
              </div>
            );
          })}

          {/* Business Health Score Card */}
          <div 
            className="bg-[#FFF8F8] rounded-[20px] p-5 mt-2 mb-6 border-2"
            style={{ borderColor: '#D9D9D9' }}
          >
            <div className="mb-3">
              <span className="text-sm font-medium" style={{ color: '#998F8F' }}>
                Business Health Score
              </span>
            </div>
            
            <div className="flex items-start justify-between px-2">
              <div>
                <div className="flex items-center gap-1">
                  <span 
                    className="text-4xl font-bold" 
                    style={{ color: getScoreColor(currentScore) }}
                  >
                    {currentScore}
                  </span>
                  <span className="text-2xl text-gray-400">/100</span>
                </div>
                <div className="text-left mt-0">
                  <span 
                    className="text-xs font-medium" 
                    style={{ color: getScoreColor(currentScore) }}
                  >
                    {getStatusText(currentScore)}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div>
                  <span 
                    className="text-3xl font-bold" 
                    style={{ color: scoreImpact >= 0 ? '#12AE00' : '#EF4444' }}
                  >
                    {scoreImpact >= 0 ? '+' : ''}{scoreImpact}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium text-black">points</span>
                </div>
              </div>
            </div>
          </div>

          {/* See Impact Button */}
          <button
            onClick={handleSeeImpact}
            disabled={!isAuthenticated || simulationLoading || selectedImpactItems.length === 0}
            className="w-full font-semibold py-4 px-6 rounded-[10px] shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: '#2C6C71',
              color: 'white'
            }}
          >
            {simulationLoading ? 'Calculating...' : 'See Impact'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationScreen;