import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Shield, User, Scan, X, Printer, Camera } from "lucide-react";
import { CameraScanner } from "@/components/camera-scanner";
import {
  useListMedicines, useListCustomers, useCreateSale,
  getListSalesQueryKey, getGetDashboardSummaryQueryKey, getGetRecentSalesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ReceiptModal, type ReceiptData } from "@/components/receipt";

type Medicine = {
  id: number; name: string; genericName: string; quantity: number;
  sellingPrice: number; requiresPrescription: boolean; barcode: string | null;
};
type CartItem = Medicine & { cartQuantity: number };

export default function POS() {
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "insurance">("cash");
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<"keyboard" | "camera">("keyboard");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: medicines } = useListMedicines({ search: searchTerm || undefined });
  const { data: customers } = useListCustomers();
  const createSale = useCreateSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function addToCart(medicine: Medicine) {
    if (medicine.quantity <= 0) {
      toast({ title: "هذا الدواء نفذ من المخزون", variant: "destructive" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === medicine.id);
      if (existing) {
        if (existing.cartQuantity >= medicine.quantity) {
          toast({ title: "الكمية المتاحة في المخزون غير كافية", variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.id === medicine.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i);
      }
      return [...prev, { ...medicine, cartQuantity: 1 }];
    });
    setSearchTerm("");
  }

  function handleBarcodeSearch(barcode: string) {
    if (!barcode.trim() || !medicines) return;
    const found = medicines.find(m => m.barcode === barcode.trim());
    if (found) {
      addToCart(found as Medicine);
      setBarcodeInput("");
    } else {
      toast({ title: `لم يُعثر على دواء بالباركود: ${barcode}`, variant: "destructive" });
      setBarcodeInput("");
    }
  }

  function removeFromCart(id: number) { setCart(prev => prev.filter(i => i.id !== id)); }
  function updateQty(id: number, qty: number) {
    if (qty < 1) return;
    const item = cart.find(i => i.id === id);
    if (item && qty > item.quantity) {
      toast({ title: "الكمية المطلوبة تتجاوز المخزون", variant: "destructive" });
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, cartQuantity: qty } : i));
  }

  const subtotal = cart.reduce((acc, i) => acc + i.sellingPrice * i.cartQuantity, 0);
  const total = Math.max(0, subtotal - discount);

  function handleCheckout() {
    if (cart.length === 0) return;
    const selectedCustomer = customers?.find(c => String(c.id) === customerId);
    createSale.mutate({
      data: {
        items: cart.map(i => ({ medicineId: i.id, quantity: i.cartQuantity, unitPrice: i.sellingPrice })),
        paymentMethod,
        discount,
        customerId: customerId && customerId !== "none" ? Number(customerId) : undefined,
      }
    }, {
      onSuccess: (sale) => {
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentSalesQueryKey() });
        // Show receipt
        setReceipt({
          id: sale.id,
          createdAt: sale.createdAt,
          paymentMethod: sale.paymentMethod,
          customerName: selectedCustomer?.name ?? sale.customerName ?? null,
          items: sale.items.map(i => ({
            medicineName: i.medicineName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
          discount: sale.discount ?? 0,
          totalAmount: sale.totalAmount ?? 0,
        });
        setCart([]);
        setDiscount(0);
        setCustomerId("");
        setSearchTerm("");
      },
      onError: () => toast({ title: "حدث خطأ أثناء إتمام عملية البيع", variant: "destructive" }),
    });
  }

  useEffect(() => {
    if (showScanner) barcodeRef.current?.focus();
  }, [showScanner]);

  const displayMedicines = searchTerm ? medicines : medicines?.slice(0, 24);

  return (
    <>
      <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4">
        {/* Left panel: search + medicine grid */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden min-w-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الاسم العلمي..."
                className="pl-9 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-pos-search"
              />
            </div>
            <Button
              variant={showScanner ? "default" : "outline"}
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setShowScanner(v => !v)}
              title="مسح الباركود"
              data-testid="button-toggle-scanner"
            >
              {showScanner ? <X className="h-4 w-4" /> : <Scan className="h-4 w-4" />}
            </Button>
          </div>

          {showScanner && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Scan className="h-4 w-4" />
                    <span>مسح الباركود</span>
                  </div>
                  <div className="flex gap-1 border rounded-md p-0.5 bg-background">
                    <Button
                      size="sm"
                      variant={scanMode === "keyboard" ? "default" : "ghost"}
                      className="h-7 text-xs gap-1 px-2"
                      onClick={() => setScanMode("keyboard")}
                    >
                      <Scan className="h-3 w-3" />
                      ماسح / يدوي
                    </Button>
                    <Button
                      size="sm"
                      variant={scanMode === "camera" ? "default" : "ghost"}
                      className="h-7 text-xs gap-1 px-2"
                      onClick={() => setScanMode("camera")}
                    >
                      <Camera className="h-3 w-3" />
                      كاميرا
                    </Button>
                  </div>
                </div>

                {scanMode === "keyboard" ? (
                  <div className="flex gap-2">
                    <Input
                      ref={barcodeRef}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSearch(barcodeInput); }}
                      placeholder="6223000001 — اكتب أو امسح ثم Enter"
                      className="h-10 font-mono"
                      data-testid="input-barcode"
                    />
                    <Button onClick={() => handleBarcodeSearch(barcodeInput)} disabled={!barcodeInput.trim()} data-testid="button-barcode-search">
                      إضافة
                    </Button>
                  </div>
                ) : (
                  <CameraScanner
                    onResult={(barcode) => handleBarcodeSearch(barcode)}
                    onError={(msg) => toast({ title: `خطأ في الكاميرا: ${msg}`, variant: "destructive" })}
                  />
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2 content-start">
            {displayMedicines?.map(med => {
              const inCart = cart.find(i => i.id === med.id);
              const outOfStock = med.quantity <= 0;
              return (
                <Card
                  key={med.id}
                  onClick={() => !outOfStock && addToCart(med as Medicine)}
                  className={`cursor-pointer transition-all flex flex-col select-none ${outOfStock ? "opacity-40 cursor-not-allowed" : "hover:border-primary hover:shadow-sm active:scale-[0.98]"} ${inCart ? "border-primary bg-primary/5" : ""}`}
                  data-testid={`card-medicine-${med.id}`}
                >
                  <CardContent className="p-3 flex flex-col gap-2 h-full justify-between">
                    <div>
                      <div className="font-bold text-sm leading-tight line-clamp-2">{med.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{med.genericName}</div>
                    </div>
                    <div className="flex items-end justify-between gap-1 flex-wrap">
                      <span className="font-bold text-primary text-sm">{med.sellingPrice.toFixed(2)} ج.م</span>
                      <div className="flex flex-col items-end gap-0.5">
                        {outOfStock ? <Badge variant="destructive" className="text-xs px-1">نفد</Badge> : <Badge variant="secondary" className="text-xs px-1">{med.quantity}</Badge>}
                        {inCart && <Badge variant="default" className="text-xs px-1">+{inCart.cartQuantity}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {displayMedicines?.length === 0 && (
              <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground">لا توجد أدوية مطابقة</div>
            )}
          </div>
        </div>

        {/* Right panel: cart */}
        <div className="w-full md:w-[380px] flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden shrink-0">
          <div className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-2 font-bold">
              <ShoppingCart className="h-4 w-4" />
              سلة البيع {cart.length > 0 && <span className="text-sm opacity-70">({cart.length} صنف)</span>}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-destructive h-7 text-xs" onClick={() => setCart([])} data-testid="button-clear-cart">
                مسح الكل
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-28 text-center text-muted-foreground text-sm">السلة فارغة — اضغط على دواء لإضافته</TableCell></TableRow>
                ) : (
                  cart.map(item => (
                    <TableRow key={item.id} className="group" data-testid={`cart-item-${item.id}`}>
                      <TableCell className="px-3 py-2">
                        <div className="font-medium text-sm leading-tight">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sellingPrice.toFixed(2)} ج.م</div>
                      </TableCell>
                      <TableCell className="px-2 w-20">
                        <Input
                          type="number" min="1" max={item.quantity}
                          value={item.cartQuantity}
                          onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                          className="h-7 w-14 text-center text-sm"
                          data-testid={`cart-qty-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm px-3 whitespace-nowrap">
                        {(item.sellingPrice * item.cartQuantity).toFixed(2)} ج.م
                      </TableCell>
                      <TableCell className="px-1 w-8">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeFromCart(item.id)} data-testid={`cart-remove-${item.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-8 flex-1 text-sm" data-testid="select-pos-customer">
                  <SelectValue placeholder="اختر عميل (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون عميل</SelectItem>
                  {customers?.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي:</span>
                <span>{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground shrink-0">خصم (ج.م):</span>
                <Input
                  type="number" min="0" max={subtotal} step="0.5"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="h-7 w-24 text-right text-sm"
                  data-testid="input-discount"
                />
              </div>
            </div>

            <div className="flex gap-1.5">
              {(["cash", "card", "insurance"] as const).map(method => (
                <Button
                  key={method}
                  variant={paymentMethod === method ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1"
                  onClick={() => setPaymentMethod(method)}
                  data-testid={`button-payment-${method}`}
                >
                  {method === "cash" ? <><Banknote className="h-3 w-3" />نقدي</> :
                   method === "card" ? <><CreditCard className="h-3 w-3" />بطاقة</> :
                   <><Shield className="h-3 w-3" />تأمين</>}
                </Button>
              ))}
            </div>

            <div className="pt-1 border-t">
              <div className="flex justify-between items-baseline mb-3">
                <span className="font-bold text-base">الإجمالي</span>
                <span className="text-3xl font-bold text-primary">{total.toFixed(2)} ج.م</span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-12 text-base font-bold"
                  disabled={cart.length === 0 || createSale.isPending}
                  onClick={handleCheckout}
                  data-testid="button-checkout"
                >
                  {createSale.isPending ? "جاري المعالجة..." : `إتمام البيع — ${total.toFixed(2)} ج.م`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
