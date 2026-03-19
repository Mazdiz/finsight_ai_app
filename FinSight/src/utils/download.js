import jsPDF from 'jspdf';

// SECURITY MEASURE 1: Input sanitization function
const sanitizeInput = (input, type = 'text') => {
  if (input === null || input === undefined) return '';
  
  let sanitized = String(input);
  
  // Remove any script tags or HTML
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Type-specific sanitization
  switch(type) {
    case 'filename':
      // Allow only safe filename characters
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s_-]/g, '');
      break;
    case 'text':
      // Escape special characters that could be interpreted
      sanitized = sanitized.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
      });
      break;
    default:
      // Remove any non-printable characters
      sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }
  
  return sanitized;
};

// SECURITY MEASURE 2: Input validation
const validateInputs = (score, businessType, date, options) => {
  // Validate score
  if (typeof score !== 'number' || isNaN(score)) {
    try {
      score = parseFloat(score);
    } catch {
      score = 0;
    }
  }
  // Clamp score between 0-100
  score = Math.min(100, Math.max(0, score));
  
  // Validate and sanitize business type
  businessType = sanitizeInput(businessType, 'text');
  if (!businessType || businessType.trim() === '') {
    businessType = 'Business';
  }
  
  // Validate date
  if (date) {
    // Basic date format validation (MM/DD/YYYY or YYYY-MM-DD)
    const dateRegex = /^(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2})$/;
    if (!dateRegex.test(date)) {
      date = new Date().toLocaleDateString();
    }
  } else {
    date = new Date().toLocaleDateString();
  }
  
  // Validate and sanitize options
  options = options || {};
  if (options.actionSteps && Array.isArray(options.actionSteps)) {
    options.actionSteps = options.actionSteps
      .filter(step => step && typeof step === 'string')
      .map(step => sanitizeInput(step, 'text').substring(0, 500)); // Limit length
  }
  
  if (options.growthTips && Array.isArray(options.growthTips)) {
    options.growthTips = options.growthTips
      .filter(tip => tip && typeof tip === 'string')
      .map(tip => sanitizeInput(tip, 'text').substring(0, 500)); // Limit length
  }
  
  return { score, businessType, date, options };
};

// SECURITY MEASURE 3: Safe filename generation
const generateSafeFilename = (businessType, date) => {
  // Sanitize business type for filename
  const safeBusinessType = sanitizeInput(businessType, 'filename')
    .replace(/\s+/g, '_')
    .substring(0, 50); // Limit length
  
  // Sanitize date for filename
  let safeDate = date;
  if (date) {
    safeDate = date.replace(/[\/\\:*?"<>|]/g, '-'); // Remove invalid filename chars
  } else {
    safeDate = new Date().toISOString().split('T')[0];
  }
  
  return `finsight-report-${safeBusinessType}-${safeDate}.pdf`.replace(/\s+/g, '_');
};

const downloadScoreAsPDF = (score, businessType, date, options = {}) => {
  // SECURITY MEASURE 4: Wrap entire function in try-catch
  try {
    // SECURITY MEASURE 5: Validate all inputs first
    const validated = validateInputs(score, businessType, date, options);
    score = validated.score;
    businessType = validated.businessType;
    date = validated.date;
    options = validated.options;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [820, 1150]
    });

    const darkBlue = [26, 46, 63];
    const lightBlue = [242, 246, 251];
    const mediumBlue = [75, 95, 115];

    let yPos = 40;

    // ===== FILENAME =====
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);

    // SECURITY MEASURE 6: Use safe filename generation
    const filename = generateSafeFilename(businessType, date).replace('.pdf', '');
    doc.text(filename, 36, yPos);

    yPos += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(36, yPos, 784, yPos);

    // ===== HEADER =====
    yPos += 25;

    doc.setFillColor(...darkBlue);
    doc.rect(36, yPos - 20, 748, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FINSIGHT STRATEGY REPORT', 50, yPos + 5);

    yPos += 50;

    // ===== SCORE BOX =====
    doc.setFillColor(...lightBlue);
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(36, yPos, 748, 80, 8, 8, 'FD');

    doc.setFontSize(13);
    doc.setTextColor(...mediumBlue);
    doc.text('PROJECTED HEALTH SCORE', 50, yPos + 20);

    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 60, 80);
    doc.text(score.toString(), 50, yPos + 55);

    doc.setFontSize(16);
    doc.setTextColor(120, 140, 160);
    doc.text('/100', 90, yPos + 52);

    doc.setDrawColor(200, 210, 220);
    doc.line(300, yPos + 15, 300, yPos + 65);

    doc.setFontSize(13);
    doc.setTextColor(...mediumBlue);
    doc.text('INDUSTRY SECTOR', 320, yPos + 20);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 70, 100);
    doc.text(businessType.toUpperCase(), 320, yPos + 55);

    yPos += 110;

    // ===== HELPER: CALCULATE BOX HEIGHT =====
    const calculateBoxHeight = (items) => {
      if (!items || !Array.isArray(items)) return 50; // Default height
      
      let total = 0;
      items.forEach(item => {
        if (item && typeof item === 'string') {
          const lines = doc.splitTextToSize(item, 600);
          total += lines.length * 18;
        }
      });
      return total + 30; // padding
    };

    // ===== IMMEDIATE ACTION PLAN =====
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 80);
    doc.text('Immediate Action Plan', 36, yPos);

    doc.setDrawColor(200, 220, 240);
    doc.line(36, yPos + 6, 220, yPos + 6);

    yPos += 20;

    // SECURITY MEASURE 7: Use validated action steps
    const actionSteps = options.actionSteps && options.actionSteps.length > 0 
      ? options.actionSteps 
      : [
          'Focus on reducing your single highest-cost expense',
          'Increase monthly revenue by 10% before taking on debt',
          'Build a minimum cash reserve equivalent to 2 months of expenses'
        ];

    const actionBoxHeight = calculateBoxHeight(actionSteps);

    doc.setFillColor(249, 252, 255);
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(36, yPos, 748, actionBoxHeight, 8, 8, 'FD');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 70, 90);

    let itemY = yPos + 25;

    actionSteps.forEach((step) => {
      if (step && typeof step === 'string') {
        const lines = doc.splitTextToSize(step, 600);

        doc.circle(50, itemY - 4, 2, 'F');
        doc.text(lines, 70, itemY);

        itemY += lines.length * 18;
      }
    });

    yPos += actionBoxHeight + 20;

    // ===== STRATEGIC GROWTH =====
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 80);
    doc.text('Strategic Growth Tips', 36, yPos);

    doc.setDrawColor(200, 220, 240);
    doc.line(36, yPos + 6, 220, yPos + 6);

    yPos += 20;

    // SECURITY MEASURE 8: Use validated growth tips
    const growthTips = options.growthTips && options.growthTips.length > 0
      ? options.growthTips
      : [
          'Monitor inventory regularly to avoid waste and overstocking',
          'Keep cash on hand for unexpected expenses'
        ];

    const growthBoxHeight = calculateBoxHeight(growthTips);

    doc.setFillColor(246, 251, 254);
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(36, yPos, 748, growthBoxHeight, 8, 8, 'FD');

    doc.setFontSize(14);
    doc.setTextColor(30, 70, 90);

    let tipY = yPos + 25;

    growthTips.forEach((tip) => {
      if (tip && typeof tip === 'string') {
        const lines = doc.splitTextToSize(tip, 600);

        doc.circle(50, tipY - 4, 2, 'F');
        doc.text(lines, 70, tipY);

        tipY += lines.length * 18;
      }
    });

    yPos += growthBoxHeight + 30;

    // ===== FOOTER =====
    doc.setDrawColor(220, 230, 240);
    doc.line(36, yPos, 784, yPos);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);

    // SECURITY MEASURE 9: Sanitize footer text
    const footerText = sanitizeInput(
      'This report provides AI-generated suggestions based on your simulation. Consult with a financial advisor for major decisions.',
      'text'
    );
    
    doc.text(footerText, 36, yPos + 20);

    // SECURITY MEASURE 10: Use safe filename for saving
    const safeFilename = generateSafeFilename(businessType, date);
    doc.save(safeFilename);
    
    console.log('PDF generated successfully with security measures');
    
  } catch (error) {
    // SECURITY MEASURE 11: Error handling without exposing internals
    console.error('PDF generation failed:', error);
    
    // Create a minimal fallback PDF
    try {
      const fallbackDoc = new jsPDF();
      fallbackDoc.setFontSize(16);
      fallbackDoc.text('Error generating report', 20, 20);
      fallbackDoc.setFontSize(12);
      fallbackDoc.text('Please try again or contact support.', 20, 40);
      fallbackDoc.save('error-report.pdf');
    } catch (fallbackError) {
      console.error('Even fallback PDF failed:', fallbackError);
    }
    
    // Re-throw a user-friendly error (don't expose internal details)
    throw new Error('Unable to generate PDF. Please try again.');
  }
};

export default downloadScoreAsPDF;