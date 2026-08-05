import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Category = { id: number; name: string; description: string | null; createdAt: string };

function CategoryDialog({
  open, onClose, category,
}: {
  open: boolean; onClose: () => void; category?: Category;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPending = createCategory.isPending || updateCategory.isPending;

  function handleOpen() {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
  }

  function handleSubmit() {
    if (!name.trim()) return;
    const onSuccess = () => {
      toast({ title: category ? "تم تعديل الفئة" : "تمت إضافة الفئة" });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      onClose();
    };
    const onError = () => toast({ title: "حدث خطأ", variant: "destructive" });
    if (category) {
      updateCategory.mutate({ id: category.id, data: { name, description } }, { onSuccess, onError });
    } else {
      createCategory.mutate({ data: { name, description } }, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="cat-name">اسم الفئة *</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مسكنات الألم" data-testid="input-category-name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-desc">الوصف</Label>
            <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="input-category-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()} data-testid="button-save-category">
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | undefined>(undefined);

  function handleEdit(cat: Category) {
    setEditTarget(cat);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditTarget(undefined);
    setDialogOpen(true);
  }

  function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه الفئة؟")) return;
    deleteCategory.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "تم حذف الفئة" });
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: () => toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories (الفئات)</h1>
          <p className="text-muted-foreground">إدارة فئات الأدوية.</p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-category">
          <Plus className="mr-2 h-4 w-4" /> إضافة فئة
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
              ) : !categories?.length ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">لا توجد فئات بعد.</TableCell></TableRow>
              ) : (
                categories.map((cat: any) => (
                  <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                    <TableCell className="text-muted-foreground">{cat.id}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.description || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cat as Category)} data-testid={`button-edit-category-${cat.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)} data-testid={`button-delete-category-${cat.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        category={editTarget}
      />
    </div>
  );
}
