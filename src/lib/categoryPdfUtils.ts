import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Interface for product data used in category stock reports
export interface ProductWithStock {
  id: string;
  name: string;
  sku?: string;  // Made optional since we're not using it in exports
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

/**
 * Exports category stock data to Excel format
 * @param categoryName - Name of the category
 * @param products - Array of products in the category
 * @param filename - Base name for the file
 */
export const exportToExcel = (categoryName: string, products: ProductWithStock[], filename: string) => {
  try {
    const wb = XLSX.utils.book_new();
    const isAllCategories = categoryName === 'All Categories';
    
    if (isAllCategories) {
      // Group products by category
      const categories = new Map<string, ProductWithStock[]>();
      
      products.forEach(product => {
        const category = product.category_name || 'Uncategorized';
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)?.push(product);
      });
      
      // Sort categories alphabetically
      const sortedCategories = Array.from(categories.entries())
        .sort(([catA], [catB]) => catA.localeCompare(catB));
      
      let rowOffset = 0;
      let allProductsData: (string | number)[][] = [
        ['Stock Report - All Categories'],
        ['Generated on', new Date().toLocaleString()],
        [] // Empty row for spacing
      ];
      
      // Add each category's products
      for (const [category, categoryProducts] of sortedCategories) {
        // Add category header
        allProductsData.push([`Category: ${category}`]);
        allProductsData.push(['Product Name', 'Stock', 'Price', 'Total Value']);
        
        // Add products for this category
        categoryProducts.forEach(product => {
          allProductsData.push([
            product.name,
            product.current_stock,
            product.price,
            product.current_stock * product.price
          ]);
        });
        
        // Add subtotal for the category
        const categoryStock = categoryProducts.reduce((sum, p) => sum + p.current_stock, 0);
        const categoryValue = categoryProducts.reduce((sum, p) => sum + (p.current_stock * p.price), 0);
        
        allProductsData.push([
          `Subtotal (${category})`,
          categoryStock,
          '',
          categoryValue
        ]);
        
        // Add empty row between categories
        allProductsData.push([], []);
      }
      
      // Add grand totals
      const totalProducts = products.length;
      const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0);
      const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.price), 0);
      
      allProductsData.push(
        ['GRAND TOTAL', '', '', ''],
        ['Total Products', totalProducts],
        ['Total Stock', totalStock],
        ['Total Value', '', '', totalValue]
      );
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(allProductsData);
      
      // Set column widths
      const colWidths = [
        { wch: 40 }, // Product Name
        { wch: 12 }, // Stock
        { wch: 15 }, // Price
        { wch: 15 }  // Total Value
      ];
      ws['!cols'] = colWidths;
      
      // Apply styling
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = 0; R <= range.e.r; R++) {
        const isHeader = R <= 3; // First 4 rows are headers
        const isCategoryHeader = allProductsData[R]?.[0]?.toString().startsWith('Category:');
        const isSubtotal = allProductsData[R]?.[0]?.toString().startsWith('Subtotal');
        const isGrandTotal = allProductsData[R]?.[0] === 'GRAND TOTAL';
        const isTotalRow = allProductsData[R]?.[0]?.toString().startsWith('Total ');
        
        // Format all cells in the row
        for (let C = 0; C <= range.e.c; C++) {
          const cell = XLSX.utils.encode_cell({r: R, c: C});
          if (!ws[cell]) ws[cell] = {};
          
          // Apply bold to headers and important rows
          if (isHeader || isCategoryHeader || isSubtotal || isGrandTotal || isTotalRow) {
            ws[cell].s = { font: { bold: true } };
          }
          
          // Format numbers
          if (C >= 1 && R >= 3) { // Skip headers
            if (C === 2 || C === 3) { // Price and Total Value columns
              ws[cell].t = 'n';
              ws[cell].z = '#,##0.00';
            } else if (C === 1) { // Stock column
              ws[cell].t = 'n';
            }
          }
        }
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
      
    } else {
      // Single category export (original logic)
      const worksheetData: (string | number)[][] = [
        [`Stock Report - ${categoryName}`],
        ['Generated on', new Date().toLocaleString()],
        [], // Empty row for spacing
        ['Product Name', 'Stock', 'Price', 'Total Value']
      ];

      // Add product rows
      products.forEach(product => {
        worksheetData.push([
          product.name,
          product.current_stock,
          product.price,
          product.current_stock * product.price
        ]);
      });

      // Calculate totals
      const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0);
      const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.price), 0);
      
      // Add summary rows
      worksheetData.push(
        [], // Empty row for spacing
        ['Total Products', products.length],
        ['Total Stock', totalStock],
        ['Total Value', '', '', totalValue]
      );

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      const colWidths = [
        { wch: 40 }, // Product Name
        { wch: 12 }, // Stock
        { wch: 15 }, // Price
        { wch: 15 }  // Total Value
      ];
      ws['!cols'] = colWidths;
      
      // Apply number formatting
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = 4; R <= range.e.r; R++) { // Start from row 5 (0-based index 4) to skip headers
        // Format stock column (column B, 0-based index 1)
        const stockCell = XLSX.utils.encode_cell({r: R, c: 1});
        if (!ws[stockCell]) ws[stockCell] = {};
        ws[stockCell].t = 'n';
        
        // Format price column (column C, 0-based index 2)
        const priceCell = XLSX.utils.encode_cell({r: R, c: 2});
        if (ws[priceCell]) {
          ws[priceCell].t = 'n';
          ws[priceCell].z = '#,##0.00';
        }
        
        // Format total value column (column D, 0-based index 3)
        const totalCell = XLSX.utils.encode_cell({r: R, c: 3});
        if (ws[totalCell]) {
          ws[totalCell].t = 'n';
          ws[totalCell].z = '#,##0.00';
        }
      }
      
      // Make totals bold
      for (let R = range.e.r - 3; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cell = XLSX.utils.encode_cell({r: R, c: C});
          if (!ws[cell]) ws[cell] = {};
          if (!ws[cell].s) ws[cell].s = {};
          ws[cell].s.font = { bold: true };
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, categoryName.substring(0, 31)); // Sheet name max 31 chars
    }
    
    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(data);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};
