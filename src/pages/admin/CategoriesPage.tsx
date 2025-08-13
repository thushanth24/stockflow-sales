import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Package } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  product_count?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const { toast } = useToast();

  const {
    currentData: paginatedCategories,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: categories, itemsPerPage: 10 });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Get categories with product count
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;

      // Get product counts for each category
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (category) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id);

          return { ...category, product_count: count || 0 };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({
            name: formData.name,
            description: formData.description || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      setFormData({ name: "", description: "" });
      setEditingCategory(null);
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Categories</h1>
          <p className="text-blue-100">
            Organize your inventory with categories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md transition-all hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl border-0 shadow-2xl bg-gradient-to-b from-white to-gray-50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingCategory
                  ? "Update the category information."
                  : "Create a new category to organize your products."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Category name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Category description (optional)"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Category List</CardTitle>
          <p className="text-sm text-indigo-600">{categories.length} categories in total</p>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Package className="h-16 w-16 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700">No categories found</h3>
                <p className="text-sm text-gray-500">
                  Get started by creating your first category.
                </p>
                <Button 
                  onClick={openCreateDialog}
                  className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table className="divide-y divide-gray-200">
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category Name</TableHead>
                    <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Products</TableHead>
                    <TableHead className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200">
                  {paginatedCategories.map((category) => (
                    <TableRow 
                      key={category.id}
                      className="hover:bg-blue-50 transition-colors duration-150"
                    >
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                          className="text-blue-600 hover:text-white hover:bg-blue-600 border-blue-200 hover:border-blue-600 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 border-t">
                <div className="text-sm text-gray-600 font-medium">
                  Showing page {currentPage} of {totalPages} • {categories.length} total categories
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!canGoPrevious}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!canGoNext}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}