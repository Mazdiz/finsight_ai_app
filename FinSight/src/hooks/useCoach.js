import { useState, useCallback } from 'react';
import { getCoachAdvice, downloadReport } from '../services/api';
import { getAuthToken } from '../utils/token';
import { generateCSRFToken } from '../utils/cookies';
import downloadScoreAsPDF from '../utils/download';
import config from '../config/env';

export const useCoach = () => {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [coachAdvice, setCoachAdvice] = useState(null);

  const getAdvice = useCallback(async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      generateCSRFToken();

      const result = await getCoachAdvice(userData);

      if (!result || !result.action_steps) {
        throw new Error('Invalid response from server');
      }

      sessionStorage.setItem('coachAdvice', JSON.stringify(result));
      setCoachAdvice(result);
      return result;
    } catch (err) {
      const errorMessage = config.isDevelopment 
        ? err.message 
        : 'Unable to get coach advice. Please try again.';
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPDFReport = useCallback(async (coachData) => {
    setDownloading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      generateCSRFToken();

      // Try API first
      const blob = await downloadReport(coachData);
      
      if (blob) {
        // API succeeded
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `finsight-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // API failed (returned null), use fallback
        console.log('Using local PDF generation fallback');
        downloadScoreAsPDF(
          coachData.final_score || 64,
          coachData.sector || 'Business',
          new Date().toLocaleDateString(),
          { 
            actionSteps: coachData.action_steps || [],
            growthTips: coachData.growth_tips || [] 
          }
        );
      }

      return true;
    } catch (err) {
      const errorMessage = config.isDevelopment 
        ? err.message 
        : 'Unable to download report. Please try again.';
      
      setError(errorMessage);
      throw err;
    } finally {
      setDownloading(false);
    }
  }, []);

  const clearCoachAdvice = useCallback(() => {
    setCoachAdvice(null);
    setError(null);
    sessionStorage.removeItem('coachAdvice');
  }, []);

  return {
    loading,
    downloading,
    error,
    coachAdvice,
    getAdvice,
    downloadPDFReport,
    clearCoachAdvice,
  };
};