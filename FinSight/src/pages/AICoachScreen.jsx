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
  const [recommendationSource, setRecommendationSource] = useState('AI Model');

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const getStatusTextFromScore = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fairly Good';
    return 'At Risk';
  };

  const getStatusColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
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

        // Load simulation data
        const storedSimulation = sessionStorage.getItem('simulationResult');
        const storedUpdatedScore = sessionStorage.getItem('simulationResults');
        const storedDiagnosis = sessionStorage.getItem('diagnosisResult');
        const storedSector = sessionStorage.getItem('businessSector') || '';
        const storedCurrency = sessionStorage.getItem('currencySymbol') || '$';
        
        setCurrencySym(storedCurrency);
        setSector(storedSector);

        // Get final score from simulation data
        let score = 64;
        if (simulationData && simulationData.final_score) {
          score = simulationData.final_score;
        } else if (storedSimulation) {
          const parsed = JSON.parse(storedSimulation);
          score = parsed.final_score || 64;
        } else if (storedUpdatedScore) {
          const parsed = JSON.parse(storedUpdatedScore);
          score = parsed.newScore || 64;
        }
        setFinalScore(score);

        setIsAuthenticated(true);
        console.log('✅ AICoachScreen authenticated, score:', score);
        
      } catch (err) {
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [navigate, simulationData]);

  // Separate useEffect for fetching coach advice
  useEffect(() => {
    const fetchCoachAdvice = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        
        // Prepare payload for ML model from all available data
        const storedSimulation = sessionStorage.getItem('simulationResult');
        const storedUpdatedScore = sessionStorage.getItem('simulationResults');
        const storedDiagnosis = sessionStorage.getItem('diagnosisResult');
        
        // Build comprehensive user data for the ML model
        const userData = {
          sector: sector,
          final_score: finalScore,
          currency: currency || 'USD',
          adjusted_data: {},
          timestamp: Date.now()
        };
        
        // Add diagnosis data if available
        if (diagnosisData) {
          userData.diagnosis = diagnosisData;
          console.log('📊 Using diagnosisData from context');
        } else if (storedDiagnosis) {
          try {
            userData.diagnosis = JSON.parse(storedDiagnosis);
            console.log('📊 Using diagnosisData from sessionStorage');
          } catch (e) {
            console.log('Error parsing diagnosis:', e);
          }
        }
        
        // Add simulation data if available
        if (simulationData) {
          userData.simulation = simulationData;
          userData.adjusted_data = simulationData.adjusted_data || {};
          console.log('📊 Using simulationData from context');
        } else if (storedSimulation) {
          try {
            userData.simulation = JSON.parse(storedSimulation);
            userData.adjusted_data = userData.simulation.adjusted_data || {};
            console.log('📊 Using simulationData from sessionStorage');
          } catch (e) {
            console.log('Error parsing simulation:', e);
          }
        } else if (storedUpdatedScore) {
          try {
            userData.updatedScore = JSON.parse(storedUpdatedScore);
            console.log('📊 Using updatedScore from sessionStorage');
          } catch (e) {
            console.log('Error parsing updated score:', e);
          }
        }

        console.log('📤 Sending to ML Coach Model:', userData);
        setRecommendationSource('AI Model');

        // Call the ML model API through your hook
        const result = await getAdvice(userData);
        console.log('✅ ML Model response:', result);
        
        if (result && result.action_steps && result.growth_tips) {
          setActionSteps(result.action_steps);
          setGrowthTips(result.growth_tips);
          setCoachData(result);
        } else {
          // If result is empty but no error, use fallback
          console.log('⚠️ ML model returned empty, using fallback');
          setFallbackRecommendations();
        }
        
      } catch (err) {
        console.error('❌ Coach API failed:', err);
        setFallbackRecommendations();
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if authenticated and score is set
    if (isAuthenticated && finalScore > 0) {
      fetchCoachAdvice();
    }
  }, [isAuthenticated, finalScore, sector, currency, diagnosisData, simulationData, getAdvice]);

  // Define the fallback function inside the component
  const setFallbackRecommendations = () => {
    setRecommendationSource('Fallback');
    console.log('📝 Using fallback recommendations for score:', finalScore);
    
    if (finalScore >= 80) {
      setActionSteps([
        "Maintain your excellent financial health by continuing current strategies.",
        "Consider expanding your business or investing surplus cash.",
        "Build an emergency fund covering 6 months of expenses."
      ]);
      setGrowthTips([
        "Explore new market opportunities to leverage your strong position.",
        "Review your portfolio for diversification options.",
        "Connect with financial advisors for wealth management strategies."
      ]);
    } else if (finalScore >= 60) {
      setActionSteps([
        "Focus on reducing your single highest-cost expense within the next 30 days.",
        "Increase monthly revenue by 10% before taking on additional debt.",
        "Build a minimum cash reserve equivalent to 2 months of operating expenses."
      ]);
      setGrowthTips([
        "Negotiate longer payment terms with your top 3 suppliers this quarter.",
        "Audit your product/service pricing against current market rates.",
        "Join a local business association for access to group purchasing and training."
      ]);
    } else if (finalScore >= 40) {
      setActionSteps([
        "Immediately cut non-essential expenses by 15%.",
        "Contact lenders to negotiate lower interest rates on existing debt.",
        "Focus on collecting outstanding receivables to improve cash flow."
      ]);
      setGrowthTips([
        "Consider consolidating high-interest debt.",
        "Explore alternative revenue streams with low overhead.",
        "Create a strict budget and track every expense."
      ]);
    } else {
      setActionSteps([
        "Seek professional financial advice immediately.",
        "Create an emergency action plan to address critical issues.",
        "Consider debt restructuring or consolidation options."
      ]);
      setGrowthTips([
        "Focus on survival strategies first - cash is king.",
        "Explore government assistance programs for businesses.",
        "Communicate openly with creditors about your situation."
      ]);
    }
  };

  const handleDownloadPDF = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate before downloading');
      return;
    }

    setIsDownloading(true);
    generateCSRFToken();
    
    try {
      const reportData = {
        sector: sector,
        final_score: finalScore,
        currency: currency || 'USD',
        action_steps: actionSteps,
        growth_tips: growthTips,
        source: recommendationSource
      };
      
      await downloadPDFReport(reportData);
      console.log('PDF downloaded successfully');
      
    } catch (err) {
      console.error('Download failed:', err);
      downloadScoreAsPDF(
        finalScore || 64,
        sector || 'Business',
        new Date().toLocaleDateString(),
        { actionSteps, growthTips, source: recommendationSource }
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNewAssessment = () => {
    generateCSRFToken();
    sessionStorage.removeItem('formData');
    sessionStorage.removeItem('selectedItems');
    sessionStorage.removeItem('simulationData');
    sessionStorage.removeItem('simulationResult');
    sessionStorage.removeItem('simulationResults');
    sessionStorage.removeItem('coachAdvice');
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

  if (error || coachError) {
    return (
      <div className="min-h-screen bg-[#DCE5E6] flex justify-center p-4">
        <div className="w-[395px] bg-white rounded-[30px] shadow-xl overflow-hidden relative flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-red-500 mb-4">{error || coachError}</p>
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
          {recommendationSource === 'AI Model' ? (
            <span className="absolute right-4 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              ML Powered
            </span>
          ) : (
            <span className="absolute right-4 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              Preview Mode
            </span>
          )}
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
              {actionSteps.map((step, index) => (
                <p key={index} className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-gray-900">{index + 1}.</span> {step}
                </p>
              ))}
            </div>
          </div>

          <div className="bg-[#FFF8F8] rounded-[20px] p-5 mb-6 border-2" style={{ borderColor: '#D9D9D9' }}>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Growth Tips:</h2>
            <div className="space-y-3">
              {growthTips.map((tip, index) => (
                <p key={index} className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-gray-900">•</span> {tip}
                </p>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed mb-6 px-2">
            These recommendations are generated by our AI model based on your financial data.
            {recommendationSource === 'AI Model' ? ' Powered by machine learning.' : ' Using preview mode.'}
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