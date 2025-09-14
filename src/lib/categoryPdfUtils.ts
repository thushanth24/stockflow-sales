import { jsPDF } from 'jspdf';

// Interface for product data used in category stock reports
export interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  price: number;
  current_stock: number;
  category_name?: string;
}

/**
 * Generates a PDF report for a specific category's stock
 * @param categoryName - Name of the category
 * @param products - Array of products in the category
 * @returns jsPDF document
 */
export const generateCategoryStockPDF = (categoryName: string, products: ProductWithStock[]) => {
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
  doc.text(`CATEGORY STOCK REPORT: ${categoryName.toUpperCase()}`, pageWidth / 2, 25, { align: 'center' });
  
  // Subtitle with date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, pageWidth / 2, 33, { align: 'center' });
  
  // Reset text color for content
  doc.setTextColor(0, 0, 0);
  yPos = 60;

  // Column widths
  const col1 = margin + 2; // Product name
  const col2 = pageWidth - margin - 120; // Stock
  const col3 = pageWidth - margin - 10; // Price

  // Table Headers with background
  doc.setFillColor(248, 250, 252); // Cool gray-50
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('PRODUCT', col1, yPos + 7);
  doc.text('STOCK', col2, yPos + 7, { align: 'right' });
  doc.text('PRICE', col3, yPos + 7, { align: 'right' });
  yPos += 12;

  // Table Rows
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  products.forEach((product, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Row background
    const rowBg = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 10, 2, 2, 'F');
    
    // Row border
    doc.setDrawColor(226, 232, 240); // Gray-200
    doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 10, 2, 2, 'S');
    
    // Product name
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(product.name, col1, yPos + 6, { maxWidth: 150 });
    
    // Stock
    doc.text(product.current_stock.toString(), col2, yPos + 6, { align: 'right' });
    
    // Price
    doc.text(`Rs ${product.price.toFixed(2)}`, col3, yPos + 6, { align: 'right' });
    
    yPos += 12;
  });

  // Add summary section
  yPos += 10;
  
  // Calculate totals
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + product.current_stock, 0);
  const totalValue = products.reduce((sum, product) => sum + (product.current_stock * product.price), 0);
  
  // Total row with accent color
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 30, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.roundedRect(margin, yPos - 2, pageWidth - (margin * 2), 30, 2, 2, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate-900
  
  // Total Products
  doc.text(`Total Products:`, margin + 10, yPos + 8);
  doc.text(totalProducts.toString(), col3, yPos + 8, { align: 'right' });
  
  // Total Stock
  doc.text(`Total Stock:`, margin + 10, yPos + 16);
  doc.text(totalStock.toString(), col3, yPos + 16, { align: 'right' });
  
  // Total Value
  doc.setFontSize(11);
  doc.text(`Total Value:`, margin + 10, yPos + 26);
  doc.setTextColor(59, 130, 246); // Blue-600
  doc.text(`Rs ${totalValue.toFixed(2)}`, col3, yPos + 26, { align: 'right' });
  
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

/**
 * Downloads a PDF document
 * @param doc - The jsPDF document to download
 * @param filename - Base name for the file
 */
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
