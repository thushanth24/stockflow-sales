import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Database } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface BaseRow {
  product_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  date: string;
}

interface SalesRow extends BaseRow {}

interface DamagesRow extends BaseRow {
  reason: string;
}

interface OtherIncomeRow {
  label: string;
  amount: number;
  income_date: string;
}

interface CurrentStockRow {
  category_name: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface ExportOptions {
  table: string;
  format: 'csv' | 'json' | 'pdf';
  dateFrom: string;
  dateTo: string;
}

export function DataExport() {
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    table: '',
    format: 'csv',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  const exportTables = [
    { value: 'products', label: 'Products', dateField: 'created_at' },
    { value: 'current_stock', label: 'Current Stock', dateField: null },
    { value: 'purchases', label: 'Purchases', dateField: 'purchase_date' },
    { value: 'damages', label: 'Damage Reports', dateField: 'damage_date' },
    { value: 'other_income_entries', label: 'Other Income', dateField: 'income_date' },
    { value: 'stock_updates', label: 'Stock Updates', dateField: 'update_date' },
    { value: 'sales', label: 'Sales Data', dateField: 'sale_date' },
    { value: 'role_change_audit', label: 'Audit Logs', dateField: 'changed_at' },
  ];

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadPDF = async (data: any[], filename: string, tableName: string) => {
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Add header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tableName} Report`, pageWidth / 2, yPos, { align: 'center' });
      
      // Add date range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Date Range: ${new Date(options.dateFrom).toLocaleDateString()} - ${new Date(options.dateTo).toLocaleDateString()}`,
        pageWidth / 2,
        yPos + 10,
        { align: 'center' } as any
      );

      yPos += 30;

      // Add table headers
      const headers = Object.keys(data[0] || {});
      const columnWidth = (pageWidth - margin * 2) / Math.min(headers.length, 5);
      const headerHeight = 8; // Slightly reduced header height
      
      // Draw table header
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPos, pageWidth - margin * 2, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9); // Slightly smaller header font
      
      // Draw header cells with borders and centered text
      headers.slice(0, 5).forEach((header, i) => {
        // Draw cell border
        doc.setDrawColor(255, 255, 255);
        doc.rect(
          margin + i * columnWidth,
          yPos,
          columnWidth,
          headerHeight,
          'S'
        );
        
        // Draw header text
        doc.text(
          header,
          margin + i * columnWidth + columnWidth / 2, // Center horizontally
          yPos + headerHeight / 2 + 2, // Center vertically
          { 
            align: 'center',
            baseline: 'middle'
          } as any
        );
      });

      yPos += headerHeight + 2; // Add small gap after header

      // Add table rows with optimized spacing
      doc.setTextColor(0, 0, 0);
      const rowsToShow = data.slice(0, 100); // Increased from 50 to 100 max rows
      const rowHeight = 15; // Reduced from 10 to 8 for tighter spacing
      const maxRowsPerPage = Math.floor((doc.internal.pageSize.getHeight() - yPos - 15) / rowHeight);
      
      rowsToShow.forEach((row: any, rowIndex: number) => {
        // Check if we need a new page (leaving 15mm margin at bottom)
        if (yPos + rowHeight > doc.internal.pageSize.getHeight() - 15) {
          doc.addPage();
          yPos = 20;
        }
        
        // Draw row background for better readability (alternating colors)
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos, pageWidth - margin * 2, rowHeight, 'F');
        }
        
        // Draw cell borders and content
        headers.slice(0, 5).forEach((header, colIndex) => {
          const value = row[header] !== undefined ? String(row[header]) : '';
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          
          // Draw cell border
          doc.setDrawColor(200, 200, 200);
          doc.rect(
            margin + colIndex * columnWidth,
            yPos,
            columnWidth,
            rowHeight,
            'S'
          );
          
          // Draw text with truncation
          const textOptions = {
            maxWidth: columnWidth - 6,
            align: 'left' as const,
            baseline: 'middle' as const
          };
          
          doc.text(
            value,
            margin + colIndex * columnWidth + 3,
            yPos + rowHeight / 2 + 1,
            textOptions as any
          );
        });
        
        yPos += rowHeight; // Move to next row position

      }); // Close forEach loop for rows
      
      // Save the PDF
      const pdfOutput = doc.output('blob');
      
      // Create download link
      const url = window.URL.createObjectURL(pdfOutput);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Helper function to group and sum data by product
  const groupAndSumData = (data: any[], tableType: string) => {
    if (!data || data.length === 0) return [];
    
    const groupedData: Record<string, any> = {};
    
    data.forEach(item => {
      // Skip summary rows
      if (item.date === 'Total:') return;
      
      const key = `${item.product_name}_${item.category_name}_${item.unit_price}`;
      
      if (!groupedData[key]) {
        groupedData[key] = {
          ...item,
          quantity: 0,
          total_price: 0
        };
      }
      
      // Sum quantities and total prices
      groupedData[key].quantity += Number(item.quantity) || 0;
      groupedData[key].total_price += Number(item.total_price) || 0;
    });
    
    // Convert back to array
    const result = Object.values(groupedData);
    
    // Add summary row if we have data
    if (result.length > 0) {
      const totalQuantity = result.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalRevenue = result.reduce((sum, item) => sum + (item.total_price || 0), 0);
      
      const summaryRow: any = {
        product_name: '',
        category_name: '',
        quantity: totalQuantity,
        unit_price: 0,
        total_price: totalRevenue,
        date: 'Total:'
      };
      
      if (tableType === 'damages') {
        (summaryRow as DamagesRow).reason = 'Total';
      }
      
      result.push(summaryRow);
    }
    
    return result;
  };

  const handleExport = async () => {
    if (!options.table) {
      toast({
        title: 'Error',
        description: 'Please select a table to export',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);

    try {
      const tableInfo = exportTables.find(t => t.value === options.table);
      
      let data;

      if (options.table === 'purchases') {
        // Join purchases with products and categories to get all required fields
        let query = supabase
          .from('purchases')
          .select(`
            id,
            quantity,
            purchase_date,
            product_id,
            products (name, price, categories (name))
          `);

        // Apply date filter for purchase date
        query = query
          .gte('purchase_date', options.dateFrom)
          .lte('purchase_date', options.dateTo);

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        // First, get all purchase items
        const purchaseItems = tableData?.map(record => ({
          id: record.id,
          product_name: record.products?.name || 'N/A',
          category_name: record.products?.categories?.name || 'N/A',
          quantity: Number(record.quantity) || 0,
          unit_price: Number(record.products?.price) || 0,
          total_price: (Number(record.products?.price) || 0) * (Number(record.quantity) || 0),
          date: record.purchase_date,
          product_id: record.product_id
        })) || [];
        
        // Group by product and sum quantities
        const grouped: Record<string, any> = {};
        purchaseItems.forEach(item => {
          const key = `${item.product_id}_${item.unit_price}`;
          if (!grouped[key]) {
            grouped[key] = { ...item };
          } else {
            grouped[key].quantity += item.quantity;
            grouped[key].total_price += item.total_price;
          }
        });
        
        data = Object.values(grouped);
        
        // Add total row
        if (data.length > 0) {
          const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const totalAmount = data.reduce((sum, item) => sum + (item.total_price || 0), 0);
          
          data.push({
            id: 'total',
            product_name: '',
            category_name: '',
            quantity: totalQuantity,
            unit_price: 0,
            total_price: totalAmount,
            date: 'Total:',
            product_id: ''
          });
        }
      } else if (options.table === 'sales') {
        // Join sales with products and categories to get all required fields
        let query = supabase
          .from('sales')
          .select(`
            id,
            quantity,
            revenue,
            sale_date,
            product_id,
            products (name, price, categories (name))
          `);

        // Apply date filter for sale date
        query = query
          .gte('sale_date', options.dateFrom)
          .lte('sale_date', options.dateTo);

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        // First, get all sale items
        const saleItems = tableData?.map(record => ({
          id: record.id,
          product_name: record.products?.name || 'N/A',
          category_name: record.products?.categories?.name || 'N/A',
          quantity: Number(record.quantity) || 0,
          unit_price: Number(record.products?.price) || 0,
          total_price: Number(record.revenue) || 0,
          date: record.sale_date || '',
          product_id: record.product_id
        })) || [];
        
        // Group by product and sum quantities
        const grouped: Record<string, any> = {};
        saleItems.forEach(item => {
          const key = `${item.product_id}_${item.unit_price}`;
          if (!grouped[key]) {
            grouped[key] = { ...item };
          } else {
            grouped[key].quantity += item.quantity;
            grouped[key].total_price += item.total_price;
          }
        });
        
        data = Object.values(grouped);
        
        // Add total row
        if (data.length > 0) {
          const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const totalAmount = data.reduce((sum, item) => sum + (item.total_price || 0), 0);
          
          data.push({
            id: 'total',
            product_name: '',
            category_name: '',
            quantity: totalQuantity,
            unit_price: 0,
            total_price: totalAmount,
            date: 'Total:',
            product_id: ''
          });
        }
      } else if (options.table === 'damages') {
        // Join damages with products and categories to get all required fields
        let query = supabase
          .from('damages')
          .select(`
            id,
            quantity,
            reason,
            damage_date,
            product_id,
            products (name, price, categories (name))
          `);

        // Apply date filter for damage date
        query = query
          .gte('damage_date', options.dateFrom)
          .lte('damage_date', options.dateTo);

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        // First, get all damage items
        const damageItems = tableData?.map(record => ({
          id: record.id,
          product_name: record.products?.name || 'N/A',
          category_name: record.products?.categories?.name || 'N/A',
          quantity: Number(record.quantity) || 0,
          unit_price: Number(record.products?.price) || 0,
          total_price: (Number(record.products?.price) || 0) * (Number(record.quantity) || 0),
          reason: record.reason || 'N/A',
          date: record.damage_date || '',
          product_id: record.product_id
        })) || [];
        
        // Group by product and sum quantities
        const grouped: Record<string, any> = {};
        damageItems.forEach(item => {
          const key = `${item.product_id}_${item.unit_price}`;
          if (!grouped[key]) {
            grouped[key] = { ...item };
          } else {
            grouped[key].quantity += item.quantity;
            grouped[key].total_price += item.total_price;
          }
        });
        
        data = Object.values(grouped);
        
        // Add total row
        if (data.length > 0) {
          const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const totalAmount = data.reduce((sum, item) => sum + (item.total_price || 0), 0);
          
          data.push({
            id: 'total',
            product_name: '',
            category_name: '',
            quantity: totalQuantity,
            unit_price: 0,
            total_price: totalAmount,
            reason: 'Total',
            date: 'Total:',
            product_id: ''
          });
        }
      } else if (options.table === 'other_income_entries') {
        let query = supabase
          .from('other_income_entries')
          .select('income_date, label, amount')
          .gte('income_date', options.dateFrom)
          .lte('income_date', options.dateTo)
          .order('income_date', { ascending: false });

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        const incomeRows: OtherIncomeRow[] = (tableData ?? []).map(record => ({
          income_date: record.income_date || '',
          label: record.label || '',
          amount: Number(record.amount) || 0
        }));

        const totalIncome = incomeRows.reduce((sum, entry) => sum + (entry.amount || 0), 0);

        if (incomeRows.length > 0) {
          incomeRows.push({
            income_date: 'Total:',
            label: '',
            amount: totalIncome
          });
        }

        data = incomeRows;
      } else if (options.table === 'current_stock') {
        // Get current stock of all products with category information
        const { data: tableData, error: tableError } = await supabase
          .from('products')
          .select(`
            name,
            sku,
            price,
            current_stock,
            categories (name)
          `)
          .order('name');

        if (tableError) throw tableError;

        // Transform the data to include only required fields
        const currentStockData: CurrentStockRow[] = tableData?.map(product => ({
          category_name: product.categories?.name || 'N/A',
          product_name: product.name || 'N/A',
          price: product.price || 0,
          quantity: product.current_stock || 0
        })) || [];
        
        data = currentStockData;
      } else {
        // Handle other tables normally
        const tableName = options.table as 'products' | 'purchases' | 'damages' | 'stock_updates' | 'sales' | 'role_change_audit' | 'profiles' | 'stock_updates_archive' | 'other_income_entries';
        let query = supabase.from(tableName).select('*');

        // Apply date filter if table has date field
        if (tableInfo?.dateField) {
          query = query
            .gte(tableInfo.dateField, options.dateFrom)
            .lte(tableInfo.dateField, options.dateTo);
        }

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;
        data = tableData;
      }

      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No data found for the selected criteria',
          variant: 'destructive',
        });
        return;
      }

      // Apply grouping for purchases, sales, and damages
      if (['purchases', 'sales', 'damages'].includes(options.table)) {
        data = groupAndSumData(data, options.table);
      }

      const baseFilename = `${options.table}_${new Date().toISOString().split('T')[0]}`;
      let success = false;
      switch (options.format) {
        case 'csv':
          downloadCSV(data, `${baseFilename}.csv`);
          success = true;
          break;
        case 'json':
          downloadJSON(data, `${baseFilename}.json`);
          success = true;
          break;
        case 'pdf':
          success = await downloadPDF(data, baseFilename, tableInfo?.label || options.table);
          break;
      }
      
      if (success) {
        toast({
          title: 'Export Successful',
          description: `Exported ${data.length} records as ${options.format.toUpperCase()}`,
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table">Table</Label>
            <Select
              value={options.table}
              onValueChange={(value: string) => setOptions({ ...options, table: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {exportTables.map(table => (
                  <SelectItem key={table.value} value={table.value}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={options.format}
              onValueChange={(value: 'csv' | 'json' | 'pdf') => setOptions({ ...options, format: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    CSV (Excel Compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center">
                    <Database className="mr-2 h-4 w-4" />
                    JSON (Developer Friendly)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-red-500" />
                    PDF (Printable Report)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from">From Date</Label>
            <Input
              id="date-from"
              type="date"
              value={options.dateFrom}
              onChange={(e) => setOptions({ ...options, dateFrom: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">To Date</Label>
            <Input
              id="date-to"
              type="date"
              value={options.dateTo}
              onChange={(e) => setOptions({ ...options, dateTo: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={exporting || !options.table}
              className="flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <FileText className="h-4 w-4 animate-pulse" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExport;
