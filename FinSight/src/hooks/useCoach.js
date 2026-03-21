import { useState, useCallback } from 'react';
import { getCoachAdvice, downloadReport } from '../services/api';
import { getAuthToken, verifyToken } from '../utils/token';
import { generateCSRFToken, getCookie } from '../utils/cookies';
import { sanitizeInput } from '../utils/sanitize';
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
      // SECURITY: Validate token before any request
      const token = getAuthToken();
      if (!token || !verifyToken(token)) {
        throw new Error('Your session has expired. Please log in again.');
      }

      // SECURITY: Generate fresh CSRF token
      generateCSRFToken();
      const csrfToken = getCookie('XSRF-TOKEN');
      if (!csrfToken) {
        throw new Error('Security validation failed. Please refresh the page.');
      }

      // SECURITY: Sanitize user data before sending
      const sanitizedData = {
        sector: sanitizeInput(userData.sector),
        final_score: Math.min(100, Math.max(0, Number(userData.final_score) || 0)),
        currency: sanitizeInput(userData.currency || 'USD'),
        adjusted_data: {}
      };

      if (userData.adjusted_data) {
        Object.keys(userData.adjusted_data).forEach(key => {
          const value = Number(userData.adjusted_data[key]);
          if (!isNaN(value) && value >= 0) {
            sanitizedData.adjusted_data[sanitizeInput(key)] = value;
          }
        });
      }

      // SECURITY: Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000)
      );

      const apiPromise = getCoachAdvice(sanitizedData);
      const result = await Promise.race([apiPromise, timeoutPromise]);

      // SECURITY: Validate response structure
      if (!result || !Array.isArray(result.action_steps) || !Array.isArray(result.growth_tips)) {
        throw new Error('Invalid response from server');
      }

      // SECURITY: Sanitize response data
      const sanitizedResult = {
        action_steps: result.action_steps.map(step => sanitizeInput(step)),
        growth_tips: result.growth_tips.map(tip => sanitizeInput(tip)),
        source: 'AI Model'
      };

      // SECURITY: Store in session storage with expiration
      const storedData = {
        data: sanitizedResult,
        timestamp: Date.now(),
        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
      };
      sessionStorage.setItem('coachAdvice', JSON.stringify(storedData));
      setCoachAdvice(sanitizedResult);
      return sanitizedResult;

    } catch (err) {
      console.error('❌ getAdvice error:', err);
      
      // SECURITY: Safe error message - no stack traces
      const errorMessage = config.isDevelopment 
        ? err.message 
        : 'Unable to get AI recommendations. Please try again later.';
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPDFReport = useCallback(async (coachData) => {
    setDownloading(true);
    setError(null);

    try {
      // SECURITY: Validate token
      const token = getAuthToken();
      if (!token || !verifyToken(token)) {
        throw new Error('Your session has expired. Please log in again.');
      }

      // SECURITY: Generate fresh CSRF token
      generateCSRFToken();
      const csrfToken = getCookie('XSRF-TOKEN');
      if (!csrfToken) {
        throw new Error('Security validation failed. Please refresh the page.');
      }

      // SECURITY: Sanitize data before sending
      const sanitizedData = {
        sector: sanitizeInput(coachData.sector),
        final_score: Math.min(100, Math.max(0, Number(coachData.final_score) || 0)),
        currency: sanitizeInput(coachData.currency || 'USD'),
        action_steps: (coachData.action_steps || []).map(step => sanitizeInput(step)),
        growth_tips: (coachData.growth_tips || []).map(tip => sanitizeInput(tip))
      };

      // SECURITY: Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timeout after 10 seconds')), 10000)
      );

      const apiPromise = downloadReport(sanitizedData);
      const blob = await Promise.race([apiPromise, timeoutPromise]);
      
      // SECURITY: Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Generated report is empty');
      }
      
      if (blob.type !== 'application/pdf') {
        throw new Error('Invalid report format received');
      }

      // SECURITY: Secure download with sanitized filename
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeDate = new Date().toISOString().split('T')[0].replace(/[^0-9-]/g, '');
      const safeSector = sanitizeInput(coachData.sector || 'Business').replace(/[^a-zA-Z0-9-]/g, '_');
      link.download = `finsight-report-${safeSector}-${safeDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PDF downloaded via API');
      return true;

    } catch (err) {
      console.error('❌ Download error:', err);
      
      // SECURITY: Fallback with sanitized data
      const sanitizedData = {
        final_score: Math.min(100, Math.max(0, Number(coachData.final_score) || 64)),
        sector: sanitizeInput(coachData.sector || 'Business').replace(/[<>]/g, ''),
        actionSteps: (coachData.action_steps || []).map(step => sanitizeInput(step)),
        growthTips: (coachData.growth_tips || []).map(tip => sanitizeInput(tip))
      };
      
      // SECURITY: Use secure fallback PDF generation
      downloadScoreAsPDF(
        sanitizedData.final_score,
        sanitizedData.sector,
        new Date().toLocaleDateString(),
        { 
          actionSteps: sanitizedData.actionSteps,
          growthTips: sanitizedData.growthTips 
        }
      );
      
      console.log('📄 PDF downloaded via secure fallback');
      return true;
    } finally {
      setDownloading(false);
    }
  }, []);

  const clearCoachAdvice = useCallback(() => {
    // SECURITY: Clear sensitive data
    setCoachAdvice(null);
    setError(null);
    sessionStorage.removeItem('coachAdvice');
    
    // SECURITY: Regenerate CSRF token after clearing
    generateCSRFToken();
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