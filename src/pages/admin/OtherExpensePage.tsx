import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface ExpenseField {
  label: string;
  amount: string;
}

interface OtherExpenseRecord {
  id: number;
  expense_date: string;
  label: string;
  amount: number;
  created_at: string;
}

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
});

const OtherExpensePage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [expenseDate, setExpenseDate] = useState("");
  const [fields, setFields] = useState<ExpenseField[]>([{ label: "", amount: "" }]);
  const [filterDate, setFilterDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<OtherExpenseRecord[]>([]);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("other_expense_entries")
        .select("id, expense_date, label, amount, created_at")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries(data ?? []);
    } catch (error: any) {
      console.error("Error fetching other expense entries", error);
      toast({
        title: "Failed to load records",
        description: error.message ?? "Unexpected error while loading expense records.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (index: number, key: keyof ExpenseField, value: string) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addField = () => {
    setFields((prev) => [...prev, { label: "", amount: "" }]);
  };

  const removeField = (index: number) => {
    setFields((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const sanitizedFields = useMemo(() => {
    return fields
      .map((field) => ({
        label: field.label.trim(),
        amount: field.amount.trim(),
      }))
      .filter((field) => field.label.length > 0 || field.amount.length > 0);
  }, [fields]);

  const totalForCurrentForm = useMemo(() => {
    return sanitizedFields.reduce((sum, field) => {
      const numericAmount = Number(field.amount);
      if (!Number.isNaN(numericAmount)) {
        return sum + numericAmount;
      }
      return sum;
    }, 0);
  }, [sanitizedFields]);

  const filteredEntries = useMemo(() => {
    if (!filterDate) {
      return entries;
    }
    return entries.filter((entry) => entry.expense_date === filterDate);
  }, [entries, filterDate]);

  const totalForFilteredEntries = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
  }, [filteredEntries]);

  const resetForm = () => {
    setFields([{ label: "", amount: "" }]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.id) {
      toast({
        title: "Not authenticated",
        description: "You need to be signed in to record expense entries.",
        variant: "destructive",
      });
      return;
    }

    if (!expenseDate) {
      toast({
        title: "Missing date",
        description: "Please select the expense date.",
        variant: "destructive",
      });
      return;
    }

    if (sanitizedFields.length === 0) {
      toast({
        title: "No expense entries",
        description: "Add at least one expense field with a description and amount.",
        variant: "destructive",
      });
      return;
    }

    const invalidField = sanitizedFields.find((field) => {
      if (!field.label || !field.amount) {
        return true;
      }
      const value = Number(field.amount);
      return Number.isNaN(value) || value < 0;
    });

    if (invalidField) {
      toast({
        title: "Invalid entry",
        description: "Each expense entry needs a label and a non-negative amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = sanitizedFields.map((field) => ({
        expense_date: expenseDate,
        label: field.label,
        amount: Number(field.amount),
        user_id: profile.id,
      }));

      const { error } = await supabase.from("other_expense_entries").insert(payload);

      if (error) {
        throw error;
      }

      toast({
        title: "Expense recorded",
        description: payload.length === 1
          ? "The expense entry has been saved."
          : `${payload.length} expense entries have been saved.`,
      });

      resetForm();
      fetchEntries();
    } catch (error: any) {
      console.error("Error saving expense entries", error);
      toast({
        title: "Failed to save",
        description: error.message ?? "Unexpected error while saving expense entries.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 py-4 md:py-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Other Expenses</h1>
</div>

      <Card className="border-blue-100 shadow-sm">
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-date">Expense Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  className="md:w-60"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Total (current form)</Label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium">
                  {currencyFormatter.format(totalForCurrentForm)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm p-4 md:p-5 space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`expense-label-${index}`}>Field label</Label>
                      <Input
                        id={`expense-label-${index}`}
                        placeholder="e.g. Delivery charges"
                        value={field.label}
                        onChange={(event) => handleFieldChange(index, "label", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`expense-amount-${index}`}>Amount (LKR)</Label>
                      <Input
                        id={`expense-amount-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={field.amount}
                        onChange={(event) => handleFieldChange(index, "amount", event.target.value)}
                      />
                    </div>
                  </div>

                  {fields.length > 1 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove field
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600"
                onClick={addField}
              >
                <Plus className="mr-2 h-4 w-4" /> Add another field
              </Button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-600">
                Make sure each field contains a description and amount before submitting.
              </p>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-lg font-semibold text-slate-900">Recent expense entries</CardTitle>
          <CardDescription className="text-slate-600">
            Review up to the 50 most recent entries. Filter by date to focus on a specific day.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-date">Filter by date</Label>
              <Input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total for selection</Label>
              <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium">
                {currencyFormatter.format(totalForFilteredEntries)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Loading entries
                  </>
                ) : (
                  <>
                    {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"} shown
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/80">
                  <TableHead className="text-slate-700">Date</TableHead>
                  <TableHead className="text-slate-700">Field</TableHead>
                  <TableHead className="text-slate-700 text-right">Amount (LKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && filteredEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                      No expense records found for the selected range.
                    </TableCell>
                  </TableRow>
                )}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                      Loading expense records...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-medium text-slate-800">
                      {entry.expense_date}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {entry.label}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {currencyFormatter.format(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OtherExpensePage;









