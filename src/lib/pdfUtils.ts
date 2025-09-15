import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Interface for sales and inventory items
export interface FormattedItem {
  // Common fields
  id: string | number;
  quantity: number;
  reason?: string;
  display_date?: string;
  
  // Sales/Damage/Returns fields
  return_date?: string;
  damage_date?: string;
  sale_date?: string;
  category_name?: string;
  product_name?: string;
  unit_price?: number;
  revenue?: number;
  
  // Bottle fields
  type?: string;
  unit?: string;
  price?: number;
  date?: string;
  operation_type?: string;
  total_value?: number;
}

const addTableSection = (doc: jsPDF, title: string, data: FormattedItem[], columns: {name: string, width: number, align?: string, key: keyof FormattedItem}[], yPos: number, pageWidth: number, margin: number) => {
  const isEmptyData = data.length === 0 || (data.length === 1 && data[0].id === 'no-returns');
  // Calculate the starting Y position for the table
  let currentY = yPos + 25; // Space for the title
  
  // Add title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue-600
  doc.text(title, margin, yPos + 10);
  
  // Draw title underline
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.5);
  doc.line(margin, yPos + 15, margin + 100, yPos + 15);
  
  // Calculate column positions
  const columnPositions: number[] = [];
  let currentX = margin;
  
  columns.forEach(column => {
    columnPositions.push(currentX);
    currentX += column.width;
  });
  
  // Function to draw table header
  const drawTableHeader = (y: number) => {
    doc.setFillColor(248, 250, 252); // Cool gray-50
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 12, 2, 2, 'F');
    doc.setDrawColor(209, 213, 219); // Gray-300
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 12, 2, 2, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    columns.forEach((column, index) => {
      const xPos = columnPositions[index] + 5;
      // Convert alignment to valid jsPDF alignment
      let align: 'left' | 'center' | 'right' | 'justify' = 'left';
      if (column.align === 'right' || column.align === 'center' || column.align === 'justify') {
        align = column.align;
      }
      doc.text(column.name, xPos, y + 8, { align });
    });
    return y + 15; // Return new Y position after header
  };
  
  // Draw initial table header
  currentY = drawTableHeader(currentY);
  
  // Draw table rows
  doc.setFont('helvetica', 'normal');
  let totalAmount = 0;
  
  data.forEach((item, rowIndex) => {
    const rowHeight = 10; // Height of each row
    
    // Check if we need a new page for this row (including header if needed)
    if (currentY + rowHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      currentY = 20;
      // Redraw header on new page
      currentY = drawTableHeader(currentY);
    }
    
    // Alternate row colors
    const rowBg = rowIndex % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), rowHeight, 1, 1, 'F');
    
    // Row border
    doc.setDrawColor(226, 232, 240); // Gray-200
    doc.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), rowHeight, 1, 1, 'S');
    
    // Draw cell content
    doc.setFontSize(9);
    columns.forEach((column, colIndex) => {
      const value = item[column.key];
      if (value !== undefined) {
        const xPos = columnPositions[colIndex] + 5;
        // Convert alignment to valid jsPDF alignment
        let align: 'left' | 'center' | 'right' | 'justify' = 'left';
        if (column.align === 'right' || column.align === 'center' || column.align === 'justify') {
          align = column.align;
        } else if (column.key === 'revenue' || column.key === 'unit_price' || column.key === 'quantity') {
          // Default to right align for numeric columns
          align = 'right';
        }
        
        const displayValue = column.key === 'revenue' || column.key === 'unit_price' 
          ? `Rs ${Number(value).toFixed(2)}` 
          : String(value);
        
        doc.text(displayValue, xPos, currentY + 6, { align });
      }
    });
    
    // Add to total if this is a revenue column
    if (columns.some(col => col.key === 'revenue')) {
      totalAmount += Number(item.revenue || 0);
    }
    
    currentY += rowHeight; // Move to next row
  });
  
  // Add total row if there's revenue data
  if (totalAmount > 0) {
    const totalRowHeight = 35; // Height of total row + spacing
    
    // Check if we need a new page for the total row
    if (currentY + totalRowHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFillColor(241, 245, 249); // Slate-50
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 15, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 15, 2, 2, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TOTAL ${title.toUpperCase()}:`, margin + 10, currentY + 8);
    doc.setTextColor(59, 130, 246); // Blue-600
    doc.text(`Rs ${totalAmount.toFixed(2)}`, pageWidth - margin - 10, currentY + 8, { align: 'right' });
    
    // Add space after the total row
    currentY += 15;
    
    // Add a subtle separator line between sections
    doc.setDrawColor(226, 232, 240); // Light gray
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    // Add space after the separator
    currentY += 20;
  }
  
  return { yPos: currentY, totalAmount };
};

export const generateSalesReportPDF = async (
  salesData: FormattedItem[], 
  damageData: FormattedItem[], 
  date: string, 
  returnsData: FormattedItem[] = [],
  bottlesData: FormattedItem[] = []
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Add header with background color
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SALES AND INVENTORY REPORT', pageWidth / 2, 25, { align: 'center' });
  
  // Format the date or date range for display
  let dateDisplay = 'All Time';
  
  if (date) {
    if (date.includes(' to ')) {
      // Handle date range (format: 'YYYY-MM-DD to YYYY-MM-DD')
      const [startDateStr, endDateStr] = date.split(' to ');
      const formatDate = (dateStr: string) => 
        new Date(dateStr).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      
      dateDisplay = `${formatDate(startDateStr)} - ${formatDate(endDateStr)}`;
    } else {
      // Handle single date
      dateDisplay = new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
  
  // Subtitle with date or date range
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Period: ${dateDisplay}`, pageWidth / 2, 33, { align: 'center' });
  
  // Reset text color for content
  doc.setTextColor(0, 0, 0);
  yPos = 55;
  
  // Common column definitions
  const commonColumns = [
    { name: 'CATEGORY', width: 45, key: 'category_name' as keyof FormattedItem },
    { name: 'PRODUCT', width: 60, key: 'product_name' as keyof FormattedItem },
    { name: 'QTY', width: 20, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
    { name: 'PRICE', width: 30, align: 'right' as const, key: 'unit_price' as keyof FormattedItem },
    { name: 'TOTAL', width: 35, align: 'right' as const, key: 'revenue' as keyof FormattedItem }
  ];
  
  // Bottles column definitions
  const bottlesColumns = [
    { name: 'TYPE', width: 50, key: 'type' as keyof FormattedItem },
    { name: 'UNIT', width: 30, key: 'unit' as keyof FormattedItem },
    { name: 'QTY', width: 25, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
    { name: 'PRICE', width: 30, align: 'right' as const, key: 'price' as keyof FormattedItem },
    { name: 'DATE', width: 40, align: 'right' as const, key: 'display_date' as keyof FormattedItem },
    { name: 'TOTAL', width: 35, align: 'right' as const, key: 'total_value' as keyof FormattedItem }
  ];
  
  // Sales Section
  if (salesData.length > 0) {
    // Check if we need a new page before adding sales section
    if (yPos > doc.internal.pageSize.getHeight() - 150) {
      doc.addPage();
      yPos = 20;
    } else if (yPos > 20) {
      // Add extra space at the top if not at the start of the page
      yPos += 15;
    }
    
    const { yPos: newYPos } = addTableSection(
      doc,
      'SALES DETAILS',
      salesData,
      commonColumns,
      yPos,
      pageWidth,
      margin
    );
    yPos = newYPos;
  }
  
  // Damage Section
  if (damageData.length > 0) {
    // Add page break if needed
    if (yPos > doc.internal.pageSize.getHeight() - 150) {
      doc.addPage();
      yPos = 20;
    } else {
      // Add extra space between sections
      yPos += 25;
    }
    
    const damageColumns = [
      { name: 'CATEGORY', width: 45, key: 'category_name' as keyof FormattedItem },
      { name: 'PRODUCT', width: 80, key: 'product_name' as keyof FormattedItem },
      { name: 'QTY', width: 25, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
      { name: 'VALUE', width: 40, align: 'right' as const, key: 'revenue' as keyof FormattedItem }
    ];
    
    // Format the damage data to include the total value
    const formattedDamageData = damageData.map(item => ({
      ...item,
      revenue: (item.unit_price || 0) * item.quantity
    }));
    
    const { yPos: newYPos } = addTableSection(
      doc,
      'DAMAGE REPORTS',
      formattedDamageData,
      damageColumns,
      yPos,
      pageWidth,
      margin
    );
    yPos = newYPos;
  }
  
  // Returns Section
  // Add page break if needed
  if (yPos > doc.internal.pageSize.getHeight() - 150) {
    doc.addPage();
    yPos = 20;
  } else if (damageData.length > 0 || salesData.length > 0) {
    // Add extra space between sections if there was a previous section
    yPos += 25;
  }

  const returnsColumns = [
    { name: 'CATEGORY', width: 60, key: 'category_name' as keyof FormattedItem },
    { name: 'PRODUCT', width: 80, key: 'product_name' as keyof FormattedItem },
    { name: 'QTY', width: 25, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
    { name: 'VALUE', width: 50, align: 'right' as const, key: 'revenue' as keyof FormattedItem }
  ];

  // Always show returns section, even if empty
  const { yPos: newYPos } = addTableSection(
    doc,
    'RETURN REPORTS',
    returnsData.length > 0 ? returnsData : [{
      id: 'no-returns',
      category_name: 'No returns found',
      product_name: '',
      quantity: 0,
      unit_price: 0,
      display_date: ''
    }],
    returnsData.length > 0 ? returnsColumns : returnsColumns.filter(col => 
      col.key === 'category_name' || col.key === 'product_name'
    ),
    yPos,
    pageWidth,
    margin
  );
  yPos = newYPos;
  
  // Bottles Section
  if (bottlesData.length > 0) {
    // Add page break if needed
    if (yPos > doc.internal.pageSize.getHeight() - 150) {
      doc.addPage();
      yPos = 20;
    } else {
      // Add extra space between sections
      yPos += 25;
    }
    
    const { yPos: newYPos, totalAmount: totalBottles } = addTableSection(
      doc,
      'BOTTLE REPORTS (ADDED)',
      bottlesData,
      bottlesColumns,
      yPos,
      pageWidth,
      margin
    );
    yPos = newYPos;
  }
  
  // Calculate required height for summary section
  const summaryHeaderHeight = 15; // Space for "SUMMARY" header
  const summaryContentHeight = bottlesData.length > 0 ? 80 : 60; // Height based on content
  const totalSummaryHeight = summaryHeaderHeight + summaryContentHeight;
  
  // Check if we need a new page for the summary
  if (yPos + totalSummaryHeight > doc.internal.pageSize.getHeight() - margin) {
    doc.addPage();
    yPos = 20;
  } else {
    // Add some space before the summary if we're not at the top of the page
    yPos += 20;
  }
  
  // Calculate totals (use 0 if no data)
  const totalSales = salesData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalDamages = damageData.reduce((sum, item) => sum + ((item.unit_price || 0) * item.quantity), 0);
  const totalReturns = returnsData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalBottles = bottlesData.reduce((sum, item) => sum + (item.total_value || 0), 0);
  
  // Summary Section
  const summaryY = doc.internal.pageSize.getHeight() - summaryContentHeight;
  yPos = summaryY;
  
  // Add summary section background
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.rect(margin, summaryY - 10, pageWidth - (margin * 2), summaryContentHeight, 'F');
  doc.roundedRect(margin, summaryY - 10, pageWidth - (margin * 2), summaryContentHeight, 3, 3, 'S');
  
  // Summary title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Gray-800
  doc.text('SUMMARY', margin + 10, summaryY + 5);
  
  // If no data at all, show a message
  if (salesData.length === 0 && damageData.length === 0 && returnsData.length === 0 && bottlesData.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No data available for the selected period.', margin + 10, summaryY + 25);
    return doc;
  }
  
  // Summary values
  doc.setFont('helvetica', 'normal');
  let currentY = summaryY + 20;
  
  // Total Sales
  doc.text('Total Sales:', margin + 20, currentY);
  doc.text(`Rs ${totalSales.toFixed(2)}`, pageWidth - margin - 20, currentY, { align: 'right' });
  
  // Returns (if any)
  if (totalReturns > 0) {
    currentY += 10;
    doc.text('Total Returns:', margin + 20, currentY);
    doc.text(`- Rs ${totalReturns.toFixed(2)}`, pageWidth - margin - 20, currentY, { align: 'right' });
  }
  
  // Bottles (if any)
  if (totalBottles > 0) {
    currentY += 10;
    doc.text('Bottles Added:', margin + 20, currentY);
    doc.text(`- Rs ${totalBottles.toFixed(2)}`, pageWidth - margin - 20, currentY, { align: 'right' });
  }
  
  // Damages (if any)
  if (damageData.length > 0) {
    currentY += 10;
    doc.text('Damages:', margin + 20, currentY);
    doc.text(`- Rs ${totalDamages.toFixed(2)}`, pageWidth - margin - 20, currentY, { align: 'right' });
  }
  
  // Net Total
  currentY += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Net Total:', margin + 20, currentY);
  const netTotal = totalSales - totalReturns - totalBottles;
  doc.text(`Rs ${netTotal.toFixed(2)}`, pageWidth - margin - 20, currentY, { align: 'right' });
  
  // Add a line above the summary
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.setLineWidth(0.5);
  doc.line(margin, summaryY - 15, pageWidth - margin, summaryY - 15);
  
  // Add footer with timestamp
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(
    `Generated on ${new Date().toLocaleString()}`, 
    pageWidth / 2, 
    doc.internal.pageSize.getHeight() - 10, 
    { align: 'center' }
  );
  
  return doc;
};

// Function to download a PDF document
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
