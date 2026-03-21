import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeInput } from '../utils/sanitize';
import { getCookie, generateCSRFToken } from '../utils/cookies';
import { getAuthToken, verifyToken } from '../utils/token';
import { useAppContext } from '../context/AppContext';
import { useCoach } from '../hooks/useCoach';
import downloadScoreAsPDF from '../utils/download';

const AICoachScreen = () => {
  const navigate = useNavigate();
  const { simulationData, diagnosisData, currency, currencySymbol } = useAppContext();
  const { loading: coachLoading, error: coachError, getAdvice, downloadPDFReport } = useCoach();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [coachData, setCoachData] = useState(null);
  const [isDownloadHovered, setIsDownloadHovered] = useState(false);
  const [isAssessmentHovered, setIsAssessmentHovered] = useState(false);
  
  const [actionSteps, setActionSteps] = useState([]);
  const [growthTips, setGrowthTips] = useState([]);
  const [finalScore, setFinalScore] = useState(0);
  const [sector, setSector] = useState('');
  const [currencySym, setCurrencySym] = useState('$');

  // SECURITY: Get score color with validation
  const getScoreColor = (score) => {
    const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
    if (safeScore >= 80) return '#10B981';
    if (safeScore >= 60) return '#F59E0B';
    if (safeScore >= 40) return '#F97316';
    return '#EF4444';
  };

  // SECURITY: Get status text with validation
  const getStatusTextFromScore = (score) => {
    const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
    if (safeScore >= 80) return 'Excellent';
    if (safeScore >= 60) return 'Good';
    if (safeScore >= 40) return 'Fairly Good';
    return 'At Risk';
  };

  const getStatusColor = (score) => {
    return getScoreColor(score);
  };

  // SECURITY: Authentication check on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        // SECURITY: Validate token
        const token = getAuthToken();
        if (!token || !verifyToken(token)) {
          setError('Your session has expired. Please start over.');
          setTimeout(() => navigate('/welcome'), 3000);
          return;
        }

        // SECURITY: Check and generate CSRF token
        const csrfToken = getCookie('XSRF-TOKEN');
        if (!csrfToken) {
          generateCSRFToken();
        }

        // SECURITY: Load and sanitize data from session storage
        const storedSimulation = sessionStorage.getItem('simulationResult');
        const storedUpdatedScore = sessionStorage.getItem('simulationResults');
        const storedSector = sessionStorage.getItem('businessSector') || '';
        const storedCurrency = sessionStorage.getItem('currencySymbol') || '$';
        
        setCurrencySym(sanitizeInput(storedCurrency));
        setSector(sanitizeInput(storedSector));

        // SECURITY: Validate and parse score
        let score = 64;
        if (simulationData && simulationData.final_score) {
          score = Math.min(100, Math.max(0, parseInt(simulationData.final_score) || 64));
        } else if (storedSimulation) {
          try {
            const parsed = JSON.parse(storedSimulation);
            score = Math.min(100, Math.max(0, parsed.final_score || 64));
          } catch (e) {
            console.error('Failed to parse simulation data:', e);
          }
        } else if (storedUpdatedScore) {
          try {
            const parsed = JSON.parse(storedUpdatedScore);
            score = Math.min(100, Math.max(0, parsed.newScore || 64));
          } catch (e) {
            console.error('Failed to parse updated score:', e);
          }
        }
        setFinalScore(score);

        setIsAuthenticated(true);
        console.log('✅ AICoachScreen authenticated, score:', score);
        
      } catch (err) {
        console.error('❌ Validation error:', err);
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [navigate, simulationData]);

  // SECURITY: Fetch coach advice with timeout and sanitization
  useEffect(() => {
    const fetchCoachAdvice = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        
        // SECURITY: Get and validate stored data
        const storedSimulation = sessionStorage.getItem('simulationResult');
        const storedUpdatedScore = sessionStorage.getItem('simulationResults');
        
        // SECURITY: Validate and parse adjusted data
        let adjustedData = {};
        
        if (simulationData && simulationData.adjusted_data) {
          adjustedData = simulationData.adjusted_data;
        } else if (storedSimulation) {
          try {
            const parsed = JSON.parse(storedSimulation);
            adjustedData = parsed.adjusted_data || {};
          } catch (e) {
            console.error('Failed to parse simulation:', e);
          }
        } else if (storedUpdatedScore) {
          try {
            const parsed = JSON.parse(storedUpdatedScore);
            adjustedData = parsed.adjusted_data || {};
          } catch (e) {
            console.error('Failed to parse updated score:', e);
          }
        }

        // SECURITY: Sanitize all data before sending
        const sanitizedAdjustedData = {};
        Object.keys(adjustedData).forEach(key => {
          const value = Number(adjustedData[key]);
          if (!isNaN(value) && value >= 0) {
            sanitizedAdjustedData[sanitizeInput(key)] = value;
          }
        });

        const userData = {
          sector: sanitizeInput(sector),
          final_score: Math.min(100, Math.max(0, finalScore)),
          currency: sanitizeInput(currency || 'NGN'),
          adjusted_data: sanitizedAdjustedData
        };

        console.log('📤 Sending to ML Coach API (sanitized)');
        
        // SECURITY: Call with timeout via hook
        const result = await getAdvice(userData);
        
        // SECURITY: Validate and sanitize response
        if (result && Array.isArray(result.action_steps) && Array.isArray(result.growth_tips)) {
          setActionSteps(result.action_steps.map(step => sanitizeInput(step)));
          setGrowthTips(result.growth_tips.map(tip => sanitizeInput(tip)));
          setCoachData(result);
        } else {
          throw new Error('Invalid response format');
        }
        
      } catch (err) {
        console.error('❌ Coach API failed:', err);
        setError(err.message || 'Failed to get AI recommendations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && finalScore > 0) {
      fetchCoachAdvice();
    }
  }, [isAuthenticated, finalScore, sector, currency, simulationData, getAdvice]);

  // SECURITY: Download handler with CSRF regeneration
  const handleDownloadPDF = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate before downloading');
      return;
    }

    setIsDownloading(true);
    
    // SECURITY: Regenerate CSRF token for download
    generateCSRFToken();
    
    try {
      // SECURITY: Sanitize report data
      const reportData = {
        sector: sanitizeInput(sector),
        final_score: Math.min(100, Math.max(0, finalScore)),
        currency: sanitizeInput(currency || 'NGN'),
        action_steps: actionSteps.map(step => sanitizeInput(step)),
        growth_tips: growthTips.map(tip => sanitizeInput(tip))
      };
      
      await downloadPDFReport(reportData);
      console.log('PDF downloaded successfully');
      
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // SECURITY: New assessment with data cleanup
  const handleNewAssessment = () => {
    // SECURITY: Regenerate CSRF token
    generateCSRFToken();
    
    // SECURITY: Clear all sensitive data
    sessionStorage.removeItem('formData');
    sessionStorage.removeItem('selectedItems');
    sessionStorage.removeItem('simulationData');
    sessionStorage.removeItem('simulationResult');
    sessionStorage.removeItem('simulationResults');
    sessionStorage.removeItem('coachAdvice');
    sessionStorage.removeItem('diagnosisResult');
    
    navigate('/business-info');
  };

  if (isLoading || coachLoading) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C6C71] mx-auto mb-4"></div>
            <p className="text-gray-500">AI Coach is analyzing your financial data...</p>
          </div>
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
              onClick={() => navigate('/updated-score')}
              className="px-4 py-2 bg-[#2C6C71] text-white rounded-[10px] mr-2"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded-[10px]"
            >
              Try Again
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
              // SECURITY: Regenerate CSRF token on navigation
              generateCSRFToken();
              navigate('/updated-score');
            }}
            className="absolute left-4 text-xl text-gray-500 hover:text-gray-700"
            style={{ fontSize: '24px', fontWeight: '300' }}
          >
            &lt;
          </button>
          <h1 className="text-xl font-semibold" style={{ color: '#01272B' }}>
            AI Coach Recommendations
          </h1>
        </div>

        <div className="px-5 pt-20 pb-6">
          <p className="text-xs text-gray-500 text-center mb-6">
            Personalized guidance based on your financial profile
          </p>

          <div className="bg-[#FFF8F8] rounded-[20px] p-5 mb-8 border-2" style={{ borderColor: '#D9D9D9' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: '#998F8F' }}>Projected Score</span>
              <span className="text-sm" style={{ color: getStatusColor(finalScore) }}>{getStatusTextFromScore(finalScore)}</span>
            </div>
            <div className="text-left">
              <span className="text-3xl font-bold" style={{ color: getScoreColor(finalScore) }}>{finalScore || 64}</span>
              <span className="text-xl text-gray-400">/100</span>
            </div>
          </div>

          <div className="bg-[#FFF8F8] rounded-[20px] p-5 mb-6 border-2" style={{ borderColor: '#D9D9D9' }}>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Action Steps:</h2>
            <div className="space-y-3">
              {actionSteps.length > 0 ? actionSteps.map((step, index) => (
                <p key={index} className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-gray-900">{index + 1}.</span> {step}
                </p>
              )) : (
                <p className="text-xs text-gray-500 italic">Loading recommendations...</p>
              )}
            </div>
          </div>

          <div className="bg-[#FFF8F8] rounded-[20px] p-5 mb-6 border-2" style={{ borderColor: '#D9D9D9' }}>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Growth Tips:</h2>
            <div className="space-y-3">
              {growthTips.length > 0 ? growthTips.map((tip, index) => (
                <p key={index} className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-gray-900">•</span> {tip}
                </p>
              )) : (
                <p className="text-xs text-gray-500 italic">Loading tips...</p>
              )}
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed mb-6 px-2">
            These recommendations are generated by our AI model based on your financial data.
            They do not constitute professional financial advice.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleDownloadPDF}
              onMouseEnter={() => setIsDownloadHovered(true)}
              onMouseLeave={() => setIsDownloadHovered(false)}
              disabled={!isAuthenticated || isDownloading}
              className="w-full font-semibold py-3 px-4 rounded-[10px] shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: isDownloadHovered ? '#1A4A4A' : '#2C6C71',
                color: 'white'
              }}
            >
              {isDownloading ? 'Downloading...' : 'Download Report'}
            </button>

            <button
              onClick={handleNewAssessment}
              onMouseEnter={() => setIsAssessmentHovered(true)}
              onMouseLeave={() => setIsAssessmentHovered(false)}
              disabled={!isAuthenticated}
              className="w-full font-semibold py-3 px-4 rounded-[15px] transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2"
              style={{ 
                backgroundColor: isAssessmentHovered ? '#F5F5F5' : 'white',
                color: '#2C6C71',
                borderColor: '#2C6C71',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              Start New Assessment
            </button>
          </div>

          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
};

export default AICoachScreen;