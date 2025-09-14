import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generateSalesReportPDF = async (salesData: any[], damageData: any[], date: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const lineHeight = 7;
  let yPos = 20;

  // Add header with background color
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('REGAL SALES REPORT', pageWidth / 2, 25, { align: 'center' });
  
  // Subtitle with date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Period: ${new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, pageWidth / 2, 33, { align: 'center' });
  
  // Reset text color for content
  doc.setTextColor(0, 0, 0);
  yPos = 55;

  // Sales Table Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue-600
  doc.text('SALES DETAILS', margin, yPos);
  yPos += 10;

  // Column widths
  const col1 = margin + 2;
  const col2 = col1 + 60;
  const col3 = pageWidth - margin - 120;
  const col4 = pageWidth - margin - 70;
  const col5 = pageWidth - margin - 10;

  // Table Headers with background
  doc.setFillColor(248, 250, 252); // Cool gray-50
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('CATEGORY', col1, yPos + 7);
  doc.text('PRODUCT', col2, yPos + 7);
  doc.text('QTY', col3, yPos + 7, { align: 'right' });
  doc.text('PRICE', col4, yPos + 7, { align: 'right' });
  doc.text('TOTAL', col5, yPos + 7, { align: 'right' });
  yPos += 12;

  // Table Rows
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let totalSales = 0;
  
  salesData.forEach((sale, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      // Redraw header if new page
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('SALES DETAILS (continued)', margin, yPos);
      yPos += 20;
    }
    
    const rowTotal = sale.quantity * sale.unit_price;
    totalSales += rowTotal;
    
    // Row background
    const rowBg = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), lineHeight + 2, 1, 1, 'F');
    
    // Row border
    doc.setDrawColor(226, 232, 240); // Cool gray-200
    doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), lineHeight + 2, 1, 1, 'S');
    
    // Row content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // Slate-800
    
    // Category (with ellipsis if too long)
    const category = sale.category_name || 'UNCATEGORIZED';
    doc.text(category.length > 15 ? category.substring(0, 15) + '...' : category, col1, yPos + 4);
    
    // Product (with ellipsis if too long)
    const product = sale.product_name || 'N/A';
    doc.text(product.length > 20 ? product.substring(0, 20) + '...' : product, col2, yPos + 4);
    
    // Numeric values
    doc.setFont('helvetica', 'normal');
    doc.text(sale.quantity.toString(), col3, yPos + 4, { align: 'right' });
    doc.text(sale.unit_price.toFixed(2), col4, yPos + 4, { align: 'right' });
    
    // Highlight total in blue
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(rowTotal.toFixed(2), col5, yPos + 4, { align: 'right' });
    
    yPos += lineHeight + 2;
  });

  // Total Sales Section
  yPos += 10;
  
  // Total row with accent color
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 12, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 12, 2, 2, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('TOTAL SALES:', col4 - 5, yPos + 7, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setTextColor(59, 130, 246); // Blue-600
  doc.text(totalSales.toFixed(2), col5, yPos + 7, { align: 'right' });
  
  yPos += 20;

  // Damage Report Header
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 10;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68); // Red-500
  doc.text('DAMAGE REPORTS', margin, yPos);
  yPos += 12;

  // Damage Table Headers with background
  doc.setFillColor(255, 247, 237); // Orange-50
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(253, 186, 116); // Orange-300
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(194, 65, 12); // Orange-900
  doc.text('CATEGORY', col1, yPos + 7);
  doc.text('PRODUCT', col2, yPos + 7);
  doc.text('QTY', col3, yPos + 7, { align: 'right' });
  doc.text('PRICE', col4, yPos + 7, { align: 'right' });
  doc.text('TOTAL', col5, yPos + 7, { align: 'right' });
  yPos += 12;

  // Damage Table Rows
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let totalDamages = 0;
  
  damageData.forEach((damage, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      // Redraw header if new page
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('DAMAGE REPORTS (continued)', margin, yPos);
      yPos += 20;
    }
    
    const rowTotal = damage.quantity * damage.unit_price;
    totalDamages += rowTotal;
    
    // Row background
    const rowBg = index % 2 === 0 ? [255, 255, 255] : [255, 247, 237];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), lineHeight + 2, 1, 1, 'F');
    
    // Row border
    doc.setDrawColor(253, 186, 116); // Orange-300
    doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), lineHeight + 2, 1, 1, 'S');
    
    // Row content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // Slate-800
    
    // Category (with ellipsis if too long)
    const category = damage.category_name || 'UNCATEGORIZED';
    doc.text(category.length > 15 ? category.substring(0, 15) + '...' : category, col1, yPos + 4);
    
    // Product (with ellipsis if too long)
    const product = damage.product_name || 'N/A';
    doc.text(product.length > 20 ? product.substring(0, 20) + '...' : product, col2, yPos + 4);
    
    // Numeric values
    doc.setFont('helvetica', 'normal');
    doc.text(damage.quantity.toString(), col3, yPos + 4, { align: 'right' });
    doc.text(damage.unit_price.toFixed(2), col4, yPos + 4, { align: 'right' });
    
    // Highlight total in orange
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12); // Orange-700
    doc.text(rowTotal.toFixed(2), col5, yPos + 4, { align: 'right' });
    
    yPos += lineHeight + 2;
    
    // Add reason if it exists
    if (damage.reason) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 113, 108); // Stone-500
      doc.text(`Reason: ${damage.reason}`, col1, yPos + 2);
      doc.setFont('normal');
      yPos += lineHeight;
    }
  });

  // Total Damages Section
  yPos += 10;
  
  // Total row with accent color
  doc.setFillColor(255, 247, 237); // Orange-50
  doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 12, 2, 2, 'F');
  doc.setDrawColor(253, 186, 116); // Orange-300
  doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 12, 2, 2, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(124, 45, 18); // Orange-900
  doc.text('TOTAL DAMAGES:', col4 - 5, yPos + 7, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12); // Orange-700
  doc.text(totalDamages.toFixed(2), col5, yPos + 7, { align: 'right' });

  // Add footer with page numbers and timestamp
  const pageCount = doc.getNumberOfPages();
  const formattedDate = new Date().toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(226, 232, 240); // Cool gray-200
    doc.setLineWidth(0.3);
    doc.line(margin, 285, pageWidth - margin, 285);
    
    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate-500
    
    // Left side - Report generated timestamp
    doc.text(
      `Generated: ${formattedDate}`,
      margin,
      290,
      { align: 'left' }
    );
    
    // Right side - Page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      290,
      { align: 'right' }
    );
    
    // Company info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      'Regal - Inventory Management System',
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};
