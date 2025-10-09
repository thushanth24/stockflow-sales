import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, Plus, Minus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface Bottle {
  id: number;
  type: string;
  unit: string;
  price: number;
  quantity: number;
  date: string;
}

interface BottleType {
  id: string;
  name: string;
  unit: string;
  price: number;
}

const BOTTLE_TYPES: BottleType[] = [
  { id: 'lion_beer_750', name: 'Lion Beer', unit: '750ML', price: 100 },
  { id: 'dcsl_large', name: 'DCSL LARGE', unit: '750ML', price: 60 },
  { id: 'dcsl_small', name: 'DCSL SMALL', unit: '375ML', price: 30 },
  { id: 'dcsl_beer', name: 'DCSL BEER', unit: '750ML', price: 100 },
  { id: 'heinakan_beer', name: 'HEINAKAN BEER', unit: '625ML', price: 100 },
  { id: 'royal_sake', name: 'ROYAL SAKE', unit: '12.5', price: 60 },
  { id: 'gal', name: 'Gal', unit: '1L', price: 20 },
];

export default function BottlesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [stockSummary, setStockSummary] = useState<{
    type: string;
    unit: string;
    price: number;
    totalQuantity: number;
    totalValue: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('add');
  const [formData, setFormData] = useState({
    type: '',
    unit: '',
    price: '',
    quantity: '1',
    date: '',
  });
  const [selectedBottle, setSelectedBottle] = useState<BottleType | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  
  // Reset form when switching tabs
  const resetForm = () => {
    setFormData({
      type: '',
      unit: '',
      price: '',
      quantity: '1',
      date: '',
    });
    setSelectedBottle(null);
    setDate(null);
  };

  useEffect(() => {
    fetchBottles();
  }, []);

  const fetchBottles = async () => {
    try {
      setLoading(true);
      
      // Fetch all bottles
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setBottles(data || []);
      
      if (!data || data.length === 0) {
        setStockSummary([]);
        return;
      }
      
      // Calculate stock summary
      const summaryMap = new Map();
      
      data.forEach(bottle => {
        const key = `${bottle.type}_${bottle.unit}_${bottle.price}`.toLowerCase();
        
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            type: bottle.type,
            unit: bottle.unit,
            price: bottle.price,
            totalQuantity: 0,
            totalValue: 0
          });
        }
        
        const summary = summaryMap.get(key);
        const operation = bottle.operation_type || 'add';
        const quantity = operation === 'add' ? bottle.quantity : -bottle.quantity;
        
        summary.totalQuantity += quantity;
        summary.totalValue = summary.totalQuantity * bottle.price;
      });
      
      // Convert map to array, filter out zero quantities, and sort by type
      const summaryArray = Array.from(summaryMap.values())
        .filter(item => item.totalQuantity > 0) // Only show items with positive quantity
        .sort((a, b) => a.type.localeCompare(b.type));
      
      setStockSummary(summaryArray);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch bottles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBottleSelect = (bottleId: string) => {
    const selected = BOTTLE_TYPES.find(bottle => bottle.id === bottleId);
    if (selected) {
      setSelectedBottle(selected);
      setFormData(prev => ({
        ...prev,
        type: selected.name,
        unit: selected.unit,
        price: selected.price.toString(),
      }));
    } else {
      setSelectedBottle(null);
      setFormData(prev => ({
        ...prev,
        type: '',
        unit: '',
        price: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedBottle) return;

    try {
      setSubmitting(true);
      if (!date) {
        toast({
          title: 'Date Required',
          description: 'Please select a date',
          variant: 'destructive',
        });
        return;
      }
      
      const quantity = parseInt(formData.quantity, 10);
      const operation = activeTab === 'add' ? quantity : -quantity;

      const { data, error } = await supabase
        .from('bottles')
        .insert([
          {
            type: formData.type.trim(),
            unit: formData.unit.trim(),
            price: parseFloat(formData.price),
            quantity: operation,
            date: formData.date || format(date, 'yyyy-MM-dd'),
            user_id: profile.id,
            operation_type: activeTab,
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Bottles ${activeTab === 'add' ? 'added to' : 'removed from'} stock successfully`,
      });

      // Reset form
      resetForm();

      // Refresh the list
      fetchBottles();
    } catch (error) {
      console.error(`Error ${activeTab === 'add' ? 'adding' : 'removing'} bottles:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${activeTab === 'add' ? 'add' : 'remove'} bottles`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
        <h1 className="text-2xl font-bold">Bottles Management</h1>

      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            setActiveTab(value);
            resetForm();
          }}
          className="w-full"
        >
          <div className="flex justify-end mb-4">
            <TabsList>
              <TabsTrigger value="add" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Add Stock</span>
              </TabsTrigger>
              <TabsTrigger value="clear" className="flex items-center gap-1">
                <Minus className="h-4 w-4" />
                <span>Clear Stock</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bottle Type</Label>
                  <Select onValueChange={handleBottleSelect} value={selectedBottle?.id || ''}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a bottle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOTTLE_TYPES.map((bottle) => (
                        <SelectItem key={bottle.id} value={bottle.id}>
                          {bottle.name} - {bottle.unit} - LKR {bottle.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="e.g., 500ml, 1L"
                    required
                    readOnly
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Unit (LKR)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    readOnly
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          setDate(newDate || null);
                          setFormData(prev => ({
                            ...prev,
                            date: newDate ? format(newDate, 'yyyy-MM-dd') : '',
                          }));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex justify-end pt-2 gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  variant={activeTab === 'add' ? 'default' : 'destructive'}
                  disabled={isSubmitting || !selectedBottle || !date}
                >
                  {isSubmitting ? (
                    'Processing...'
                  ) : activeTab === 'add' ? (
                    'Add to Stock'
                  ) : (
                    'Remove from Stock'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-lg sm:text-xl font-semibold">Bottles Stock Summary</h2>
          <div className="w-full sm:w-auto flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchBottles}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading stock data...</p>
          </div>
        ) : stockSummary.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">No bottle stock data available</p>
            <p className="text-sm mt-2">Try adding some bottles using the form above.</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
              <p className="text-sm font-medium mb-2">Debug Information:</p>
              <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                {JSON.stringify({
                  bottlesCount: bottles.length,
                  lastUpdated: new Date().toISOString(),
                  hasData: bottles.length > 0
                }, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full py-2 align-middle">
              <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase sm:pl-6">Bottle</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Unit</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Price</th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stockSummary.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="font-medium">{item.type}</div>
                          <div className="text-gray-500 text-xs sm:hidden">{item.unit} • LKR {item.price.toFixed(2)}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">
                          {item.unit}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                          LKR {item.price.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">
                          {item.totalQuantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium">
                          LKR {item.totalValue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <th scope="row" colSpan={3} className="hidden pl-6 pr-3 pt-4 text-right text-sm font-semibold text-gray-900 sm:table-cell sm:pl-6">
                        Grand Total:
                      </th>
                      <th scope="row" className="pl-6 pr-3 pt-4 text-left text-sm font-semibold text-gray-900 sm:hidden">
                        Total:
                      </th>
                      <td className="px-3 pt-4 text-center text-sm font-semibold text-gray-900">
                        {stockSummary.reduce((sum, item) => sum + item.totalQuantity, 0)}
                      </td>
                      <td className="px-3 pt-4 text-right text-sm font-semibold text-gray-900">
                        LKR {stockSummary.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
