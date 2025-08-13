import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Database } from 'lucide-react';

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
            return `"Rs{value.replace(/"/g, '""')}"`;
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
      
      // Use a type assertion to ensure proper table name
      const tableName = options.table as 'products' | 'purchases' | 'damages' | 'stock_updates' | 'sales' | 'role_change_audit' | 'profiles' | 'stock_updates_archive';
      let query = supabase.from(tableName).select('*');

      // Apply date filter if table has date field
      if (tableInfo?.dateField) {
        query = query
          .gte(tableInfo.dateField, options.dateFrom)
          .lte(tableInfo.dateField, options.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No data found for the selected criteria',
          variant: 'destructive',
        });
        return;
      }

      const filename = `Rs{options.table}_Rs{options.dateFrom}_to_Rs{options.dateTo}.Rs{options.format}`;

      if (options.format === 'csv') {
        downloadCSV(data, filename);
      } else {
        downloadJSON(data, filename);
      }

      toast({
        title: 'Export Successful',
        description: `Exported Rs{data.length} records as Rs{options.format.toUpperCase()}`,
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