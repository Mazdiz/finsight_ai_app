import jsPDF from 'jspdf';

// Function to download score as PDF with EXACT design from screenshot
const downloadScoreAsPDF = (score, businessType, date, options = {}) => {
  // Create new PDF document with custom size for better proportions
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [820, 1150] // Increased height for more spacing
  });
  
  // Set colors
  const primaryColor = [44, 108, 113]; // #2C6C71
  const accentColor = [45, 122, 155]; // #2d7a9b for borders
  const darkBlue = [26, 46, 63]; // #1a2e3f for titles
  const lightBlue = [242, 246, 251]; // #f2f6fb for background
  const mediumBlue = [75, 95, 115]; // #4b5f73 for labels
  const lightGray = [235, 235, 235];
  
  let yPos = 40; // Increased top margin

  // Helper function to add text with wrapping
  const addWrappedText = (text, x, y, maxWidth, fontSize, options = {}) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', options.fontStyle || 'normal');
    if (options.textColor) doc.setTextColor(...options.textColor);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * (fontSize * 1.3)); // Increased line spacing
  };

  // ===== FILENAME TAG =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // #6b7280
  
  // Create filename from business type and date
  const filename = `${businessType.replace(/\s+/g, '_')}_Report_${date?.replace(/\//g, '-') || 'report'}`;
  doc.text(filename, 36, yPos);
  
  // Dashed line under filename
  yPos += 15; // More space
  doc.setDrawColor(209, 217, 230); // #d1d9e6
  doc.setLineDashPattern([5, 3], 0);
  doc.line(36, yPos, 784, yPos);
  doc.setLineDashPattern([], 0); // Reset dash pattern
  
  // ===== MAIN TITLE =====
  yPos += 25; // More space
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 46, 63); // #1a2e3f
  doc.text('FINSIGHT STRATEGY REPORT', 36, yPos);
  
  // Add colored left border
  doc.setFillColor(45, 122, 155); // #2d7a9b
  doc.rect(31, yPos - 22, 5, 34, 'F'); // Taller border
  
  // ===== SCORE & INDUSTRY ROW =====
  yPos += 40; // More space
  // Background rectangle
  doc.setFillColor(242, 246, 251); // #f2f6fb
  doc.setDrawColor(226, 234, 242); // #e2eaf2
  doc.roundedRect(36, yPos, 748, 100, 12, 12, 'FD'); // Taller box
  
  // Health Score Block
  doc.setFontSize(15);
  doc.setFont('helvetica', 'medium');
  doc.setTextColor(75, 95, 115); // #4b5f73
  doc.text('PROJECTED HEALTH SCORE', 50, yPos + 25);
  
  doc.setFontSize(52);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 59, 79); // #1b3b4f
  doc.text(score.toString(), 50, yPos + 70);
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(111, 138, 156); // #6f8a9c
  doc.text('/100', 50 + 45, yPos + 65);
  
  // Vertical divider
  doc.setDrawColor(203, 214, 228); // #cbd6e4
  doc.line(300, yPos + 20, 300, yPos + 85);
  
  // Industry Block
  doc.setFontSize(15);
  doc.setFont('helvetica', 'medium');
  doc.setTextColor(75, 95, 115);
  doc.text('INDUSTRY SECTOR', 320, yPos + 25);
  
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 76, 110); // #1d4c6e
  doc.text(businessType.toUpperCase(), 320, yPos + 70);
  
  yPos += 120; // More space after box

  // ===== IMMEDIATE ACTION PLAN =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 57, 70); // #113946
  doc.text('Immediate Action Plan', 36, yPos);
  
  // Underline
  doc.setDrawColor(203, 221, 238); // #cbddee
  doc.setLineWidth(3);
  doc.line(36, yPos + 8, 260, yPos + 8); // Longer line
  
  yPos += 30; // More space
  
  // Action items background
  doc.setFillColor(249, 252, 255); // #f9fcff
  doc.setDrawColor(221, 231, 240); // #dde7f0
  doc.roundedRect(36, yPos, 748, 160, 10, 10, 'FD'); // Taller box
  
  // Get action steps from options or use fallback
  const actionSteps = options.actionSteps || [
    'Focus on reducing your single highest-cost expense',
    'Increase monthly revenue by 10% before taking on debt',
    'Build a minimum cash reserve equivalent to 2 months of expenses'
  ];
  
  // Action item 1
  yPos += 25; // More padding inside box
  doc.setTextColor(23, 62, 79); // #173e4f
  doc.setFontSize(17);
  doc.setFont('helvetica', 'normal');
  
  // Checkmark
  doc.setTextColor(40, 126, 156); // #287e9c
  doc.text('✓', 50, yPos);
  
  doc.setTextColor(23, 62, 79);
  
  // Parse first action step and format it nicely
  const step1 = actionSteps[0] || 'Reduce expenses to improve cash flow';
  const step1Lines = doc.splitTextToSize(step1, 600);
  doc.text(step1Lines[0], 70, yPos);
  
  // Action item 2
  yPos += 40; // More space between items
  doc.setTextColor(40, 126, 156);
  doc.text('✓', 50, yPos);
  
  doc.setTextColor(23, 62, 79);
  const step2 = actionSteps[1] || 'Increase monthly revenue';
  const step2Lines = doc.splitTextToSize(step2, 600);
  doc.text(step2Lines[0], 70, yPos);
  
  // Action item 3
  yPos += 40;
  doc.setTextColor(40, 126, 156);
  doc.text('✓', 50, yPos);
  
  doc.setTextColor(23, 62, 79);
  const step3 = actionSteps[2] || 'Build cash reserve';
  const step3Lines = doc.splitTextToSize(step3, 600);
  doc.text(step3Lines[0], 70, yPos);
  
  yPos += 60; // More space after action box

  // ===== STRATEGIC GROWTH TIPS =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 57, 70);
  doc.text('Strategic Growth Tips', 36, yPos);
  
  doc.setDrawColor(203, 221, 238);
  doc.setLineWidth(3);
  doc.line(36, yPos + 8, 260, yPos + 8);
  
  yPos += 30;
  
  // Tips background
  doc.setFillColor(246, 251, 254); // #f6fbfe
  doc.setDrawColor(205, 225, 237); // #cde1ed
  doc.roundedRect(36, yPos, 748, 90, 10, 10, 'FD'); // Taller box
  
  // Get growth tips from options or use fallback
  const growthTips = options.growthTips || [
    'Monitor inventory regularly to avoid waste and overstocking',
    'Keep cash on hand for unexpected expenses',
    'Review supplier contracts for better terms'
  ];
  
  // Tip 1
  yPos += 25;
  doc.setTextColor(48, 126, 156); // #307e9c
  doc.text('▾', 50, yPos);
  
  doc.setTextColor(31, 74, 98); // #1f4a62
  doc.setFontSize(17);
  const tip1Lines = doc.splitTextToSize(growthTips[0] || 'Monitor inventory regularly', 600);
  doc.text(tip1Lines[0], 70, yPos);
  
  // Tip 2
  yPos += 35;
  doc.setTextColor(48, 126, 156);
  doc.text('▾', 50, yPos);
  
  doc.setTextColor(31, 74, 98);
  const tip2Lines = doc.splitTextToSize(growthTips[1] || 'Keep cash on hand for emergencies', 600);
  doc.text(tip2Lines[0], 70, yPos);
  
  // Tip 3 (if available)
  if (growthTips.length > 2) {
    yPos += 35;
    doc.setTextColor(48, 126, 156);
    doc.text('▾', 50, yPos);
    
    doc.setTextColor(31, 74, 98);
    const tip3Lines = doc.splitTextToSize(growthTips[2] || 'Review supplier contracts', 600);
    doc.text(tip3Lines[0], 70, yPos);
    yPos += 35;
  } else {
    yPos += 60;
  }

  // ===== DISCLAIMER =====
  doc.setFillColor(234, 240, 247); // #eaf0f7
  doc.setDrawColor(104, 147, 181); // #6893b5
  doc.roundedRect(36, yPos, 748, 70, 9, 9, 'FD'); // Taller disclaimer
  
  // Left colored border
  doc.setFillColor(104, 147, 181);
  doc.rect(36, yPos, 6, 70, 'F');
  
  doc.setTextColor(63, 84, 104); // #3f5468
  doc.setFontSize(15);
  doc.setFont('helvetica', 'italic');
  
  const disclaimerLines = doc.splitTextToSize(
    'This report provides AI-generated suggestions based on your simulation. Consult with a financial advisor for major decisions.',
    680
  );
  doc.text(disclaimerLines, 55, yPos + 25);
  
  yPos += 90;

  // ===== FOOTER =====
  doc.setDrawColor(211, 226, 240); // #d3e2f0
  doc.line(36, yPos, 784, yPos);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(183, 201, 218); // #b7c9da
  doc.text(`⚕️ ${businessType}_Report · generated by FinSight strategy engine`, 36, yPos + 25);

  // Save the PDF
  const safeDate = date?.replace(/[\/\\]/g, '-') || new Date().toISOString().split('T')[0];
  doc.save(`finsight-report-${safeDate}.pdf`);
};

// Helper function for recommendations (keep for fallback)
const getRecommendations = (score) => {
  if (score >= 80) {
    return [
      'Maintain your current financial strategy',
      'Consider expansion opportunities',
      'Build emergency fund covering 6 months'
    ];
  }
  if (score >= 60) {
    return [
      'Reduce unnecessary expenses by 10-15%',
      'Improve cash flow management',
      'Review loan terms for better rates'
    ];
  }
  if (score >= 40) {
    return [
      'Cut discretionary spending immediately',
      'Renegotiate with suppliers for better terms',
      'Seek professional financial advice'
    ];
  }
  return [
    'Urgent financial review needed',
    'Consider debt consolidation options',
    'Create emergency action plan'
  ];
};

// Function to download as JSON (keep for data export)
export const downloadScoreAsJSON = (data) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finsight-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default downloadScoreAsPDF;