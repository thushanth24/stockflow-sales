import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Interface for sales and inventory items
export interface FormattedItem {
  id: string;
  quantity: number;
  reason?: string;
  return_date?: string;
  damage_date?: string;
  sale_date?: string;
  category_name: string;
  product_name: string;
  unit_price: number;
  revenue?: number;
  // Add a computed date field for display purposes
  display_date?: string;
}

const addTableSection = (doc: jsPDF, title: string, data: FormattedItem[], columns: {name: string, width: number, align?: string, key: keyof FormattedItem}[], yPos: number, pageWidth: number, margin: number) => {
  const isEmptyData = data.length === 0 || (data.length === 1 && data[0].id === 'no-returns');
  let currentY = yPos;
  
  // Add section title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue-600
  doc.text(title, margin, currentY);
  currentY += 10;

  // Calculate column positions
  let currentX = margin;
  const columnPositions = columns.map(col => {
    const pos = currentX;
    currentX += col.width;
    return { ...col, x: pos };
  });

  // Table Headers with background
  doc.setFillColor(248, 250, 252); // Cool gray-50
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 10, 2, 2, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 10, 2, 2, 'S');
  
  // Draw column headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate-800
  
  columnPositions.forEach(col => {
    const options: any = {};
    if (col.align) options.align = col.align;
    doc.text(col.name, col.x + (col.width / 2), currentY + 7, options);
  });
  
  currentY += 12;

  // Table Rows
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let totalAmount = 0;
  
  // Process data to add display_date field
  const processedData = data.map(item => ({
    ...item,
    display_date: item.sale_date || item.damage_date || item.return_date || '',
  }));
  
  processedData.forEach((item, index) => {
    // Add new page if needed
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
      // Redraw section title on new page
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`${title} (continued)`, margin, currentY);
      currentY += 20;
    }
    
    const rowTotal = item.quantity * item.unit_price;
    totalAmount += rowTotal;
    
    // Row background
    const rowBg = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), 10, 2, 2, 'F');
    
    // Row border
    doc.setDrawColor(226, 232, 240); // Gray-200
    doc.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), 10, 2, 2, 'S');
    
    // Draw cell content
    columnPositions.forEach(col => {
      let value: string | number = '';
      
      // Special handling for empty state
      if (item.id === 'no-returns') {
        if (col.key === 'category_name') {
          value = 'No returns found';
        } else {
          value = '';
        }
      } 
      // Special handling for different fields
      else if (col.key === 'unit_price' || col.key === 'revenue') {
        value = `Rs ${(item[col.key] || 0).toFixed(2)}`;
      } else if (col.key === 'quantity') {
        value = item.quantity.toString();
      } else if (col.key === 'reason') {
        value = item.reason || '';
      } else if (col.key === 'display_date') {
        value = item.display_date ? new Date(item.display_date).toLocaleDateString() : '';
      } else if (col.key in item) {
        value = String(item[col.key as keyof FormattedItem] || '');
      }
      
      const options: any = { maxWidth: col.width - 5 };
      if (col.align) options.align = col.align;
      
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(value, col.x + 5, currentY + 6, options);
    });
    
    currentY += 12;
  });

  // Add total row if there are items (and it's not the empty state)
  if (data.length > 0 && !isEmptyData) {
    currentY += 5;
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), 15, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.roundedRect(margin, currentY - 2, pageWidth - (margin * 2), 15, 2, 2, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TOTAL ${title.toUpperCase()}:`, margin + 10, currentY + 8);
    doc.setTextColor(59, 130, 246); // Blue-600
    doc.text(`Rs ${totalAmount.toFixed(2)}`, pageWidth - margin - 10, currentY + 8, { align: 'right' });
    
    currentY += 20;
  }
  
  return { yPos: currentY, totalAmount };
};

export const generateSalesReportPDF = async (salesData: FormattedItem[], damageData: FormattedItem[], date: string, returnsData: FormattedItem[] = []) => {
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
  
  // Common column definitions
  const commonColumns = [
    { name: 'CATEGORY', width: 60, key: 'category_name' as keyof FormattedItem },
    { name: 'PRODUCT', width: 80, key: 'product_name' as keyof FormattedItem },
    { name: 'QTY', width: 30, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
    { name: 'PRICE', width: 40, align: 'right' as const, key: 'unit_price' as keyof FormattedItem },
    { name: 'TOTAL', width: 50, align: 'right' as const, key: 'revenue' as keyof FormattedItem }
  ];
  
  // Sales Section
  if (salesData.length > 0) {
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
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    const damageColumns = [
      { name: 'CATEGORY', width: 50, key: 'category_name' as keyof FormattedItem },
      { name: 'PRODUCT', width: 60, key: 'product_name' as keyof FormattedItem },
      { name: 'QTY', width: 25, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
      { name: 'REASON', width: 60, key: 'reason' as keyof FormattedItem },
      { name: 'DATE', width: 40, key: 'display_date' as keyof FormattedItem },
      { name: 'LOSS', width: 50, align: 'right' as const, key: 'revenue' as keyof FormattedItem }
    ];
    
    const { yPos: newYPos } = addTableSection(
      doc,
      'DAMAGE REPORTS',
      damageData,
      damageColumns,
      yPos,
      pageWidth,
      margin
    );
    yPos = newYPos;
  }
  
  // Returns Section
  // Add page break if needed
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  const returnsColumns = [
    { name: 'CATEGORY', width: 50, key: 'category_name' as keyof FormattedItem },
    { name: 'PRODUCT', width: 60, key: 'product_name' as keyof FormattedItem },
    { name: 'QTY', width: 25, align: 'right' as const, key: 'quantity' as keyof FormattedItem },
    { name: 'REASON', width: 60, key: 'reason' as keyof FormattedItem },
    { name: 'DATE', width: 40, key: 'display_date' as keyof FormattedItem },
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
      col.key === 'category_name' || col.key === 'product_name' || col.key === 'display_date'
    ),
    yPos,
    pageWidth,
    margin
  );
  yPos = newYPos;
  
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
