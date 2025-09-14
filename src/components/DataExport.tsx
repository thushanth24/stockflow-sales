import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Database } from 'lucide-react';

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

interface CurrentStockRow {
  category_name: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface ExportOptions {
  table: string;
  format: 'csv' | 'json';
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
            quantity,
            purchase_date,
            products (name, price, categories (name))
          `);

        // Apply date filter for purchase date
        query = query
          .gte('purchase_date', options.dateFrom)
          .lte('purchase_date', options.dateTo);

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        // Transform the data to include category and product details
        data = tableData?.map(record => ({
          product_name: record.products?.name || 'N/A',
          category_name: record.products?.categories?.name || 'N/A',
          quantity: record.quantity,
          unit_price: record.products?.price || 0,
          total_price: (record.products?.price || 0) * record.quantity,
          date: record.purchase_date
        })) || [];
      } else if (options.table === 'sales') {
        // Join sales with products and categories to get all required fields
        let query = supabase
          .from('sales')
          .select(`
            quantity,
            revenue,
            sale_date,
            products (name, price, categories (name))
          `);

        // Apply date filter for sale date
        query = query
          .gte('sale_date', options.dateFrom)
          .lte('sale_date', options.dateTo);

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        // Transform the data to include category and product details
        const salesData: SalesRow[] = tableData?.map(record => ({
          product_name: record.products?.name || 'N/A',
          category_name: record.products?.categories?.name || 'N/A',
          quantity: record.quantity,
          unit_price: record.products?.price || 0,
          total_price: record.revenue || 0,
          date: record.sale_date || ''
        })) || [];

        // Calculate overall total
        const overallTotal = salesData.reduce((sum, item) => sum + (item.total_price || 0), 0);
        
        // Add a summary row
        if (salesData.length > 0) {
          const summaryRow: SalesRow = {
            product_name: '',
            category_name: '',
            quantity: 0,
            unit_price: 0,
            total_price: overallTotal,
            date: 'Total:'
          };
          salesData.push(summaryRow);
        }

        data = salesData;
      } else if (options.table === 'damages') {
        // Join damages with products and categories to get all required fields
        let query = supabase
          .from('damages')
          .select(`
            quantity,
            reason,
            damage_date,
            products (name, price, categories (name))
          `);

        // Apply date filter for damage date
        query = query
          .gte('damage_date', options.dateFrom)
          .lte('damage_date', options.dateTo);

        const { data: tableData, error: tableError } = await query;
        if (tableError) throw tableError;

        // Transform the data to include category and product details
        const damagesData: DamagesRow[] = tableData?.map(record => ({
          product_name: record.products?.name || 'N/A',
          category_name: record.products?.categories?.name || 'N/A',
          quantity: record.quantity,
          unit_price: record.products?.price || 0,
          total_price: (record.products?.price || 0) * record.quantity,
          reason: record.reason || 'N/A',
          date: record.damage_date || ''
        })) || [];

        // Calculate overall total
        const overallTotal = damagesData.reduce((sum, item) => sum + (item.total_price || 0), 0);
        
        // Add a summary row
        if (damagesData.length > 0) {
          const summaryRow: DamagesRow = {
            product_name: '',
            category_name: '',
            quantity: 0,
            unit_price: 0,
            total_price: overallTotal,
            reason: '',
            date: 'Total:'
          };
          damagesData.push(summaryRow);
        }

        data = damagesData;
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
        const tableName = options.table as 'products' | 'purchases' | 'damages' | 'stock_updates' | 'sales' | 'role_change_audit' | 'profiles' | 'stock_updates_archive';
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

      const filename = `${options.table}_${options.dateFrom}_to_${options.dateTo}.${options.format}`;

      if (options.format === 'csv') {
        downloadCSV(data, filename);
      } else {
        downloadJSON(data, filename);
      }

      toast({
        title: 'Export Successful',
        description: `Exported ${data.length} records as ${options.format.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="table">Select Table</Label>
            <Select
              value={options.table}
              onValueChange={(value) => setOptions({ ...options, table: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose data to export" />
              </SelectTrigger>
              <SelectContent>
                {exportTables.map((table) => (
                  <SelectItem key={table.value} value={table.value}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={options.format}
              onValueChange={(value: 'csv' | 'json') => setOptions({ ...options, format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                <SelectItem value="json">JSON (Developer Friendly)</SelectItem>
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

       
      </CardContent>
    </Card>
  );
}