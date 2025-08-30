
import React, { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { Package, Calendar, TrendingUp, Eye, Bell, CheckCircle, AlertTriangle, Check, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { asArray } from '@/lib/asArray';
import { fdt } from '@/lib/fdt';

const Arrivals: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(true);
  const [modalData, setModalData] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const qc = useQueryClient();

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    if (!branchId) {
      console.log('No branch ID found');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching arrivals data for branch:', branchId);
      const [medicinesRes, transfersRes, shipmentsRes] = await Promise.all([
        apiService.getMedicines(branchId),
        apiService.getTransfers(branchId),
        apiService.getShipments(branchId)
      ]);

      if (medicinesRes && medicinesRes.data) {
        const medicinesData = asArray(medicinesRes.data);
        setMedicines(medicinesData);
      } else {
        setMedicines([]);
      }

      if (transfersRes && transfersRes.data) {
        const transfersData = asArray(transfersRes.data);
        setTransfers(transfersData);
      } else {
        setTransfers([]);
      }

      if (shipmentsRes && shipmentsRes.data) {
        const shipmentsData = asArray(shipmentsRes.data);
        setShipments(shipmentsData);
      } else {
        setShipments([]);
      }
    } catch (error) {
      console.error('Error fetching arrivals data:', error);
      setMedicines([]);
      setTransfers([]);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Группируем поступления одинаковых лекарств
  const getGroupedTransfers = () => {
    const grouped = transfers.reduce((acc: Record<string, any>, transfer) => {
      const key = transfer.medicine_name;
      if (!acc[key]) {
        acc[key] = {
          medicine_name: transfer.medicine_name,
          medicine_id: transfer.medicine_id,
          total_quantity: 0,
          transfers: []
        };
      }
      acc[key].total_quantity += (transfer.quantity || 0);
      acc[key].transfers.push(transfer);
      return acc;
    }, {});
    
    return Object.values(grouped);
  };

  const getTotalReceived = () => {
    return transfers.reduce((sum, transfer) => sum + (transfer.quantity || 0), 0);
  };

  const getTotalMedicinesInStock = () => {
    return medicines.reduce((sum, medicine) => sum + (medicine.quantity || 0), 0);
  };

  const getLowStockMedicines = () => {
    return medicines.filter(medicine => medicine.quantity <= 5);
  };

  const getOutOfStockMedicines = () => {
    return medicines.filter(medicine => medicine.quantity === 0);
  };

  const markAsRead = () => {
    setShowNotifications(false);
    toast({ title: 'Уведомления отмечены как прочитанные' });
  };

  const refreshData = () => {
    setLoading(true);
    fetchData();
    toast({ title: 'Данные обновлены' });
  };

  const acceptMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const res = await apiService.acceptShipment(shipmentId);
      if (res.error) {
        const err: any = new Error(res.error);
        err.status = res.status;
        throw err;
      }
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-shipments'] });
      fetchData();
      setOpen(false);
      setModalData(null);
      toast({ title: 'Поступление принято' });
    },
    onError: (err: any) => {
      toast({ title: err?.message || 'Ошибка при принятии', variant: 'destructive' });
      if (err?.status === 409) {
        setOpen(false);
        setModalData(null);
      }
    },
  });

  const onAcceptClick = () => {
    if (!modalData?.id || acceptMutation.isLoading) return;
    acceptMutation.mutate(modalData.id);
  };

  const handleRejectShipment = async (shipmentId: string) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Укажите причину отклонения', variant: 'destructive' });
      return;
    }

    try {
      await apiService.rejectShipment(shipmentId, rejectionReason);
      toast({ title: 'Поступление отклонено' });
      setOpen(false);
      setModalData(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      toast({ title: 'Ошибка отклонения поступления', variant: 'destructive' });
    }
  };

  const getPendingShipmentsCount = () => {
    return shipments.filter(s => s.status === 'pending').length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Загрузка данных поступлений...</div>
      </div>
    );
  }

  const groupedTransfers = getGroupedTransfers();
  const totalReceived = getTotalReceived();
  const totalInStock = getTotalMedicinesInStock();
  const lowStockMedicines = getLowStockMedicines();
  const outOfStockMedicines = getOutOfStockMedicines();
  const pendingShipmentsCount = getPendingShipmentsCount();

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Поступления от главного склада</h1>
            <p className="text-gray-600 mt-2">История поступлений лекарств в филиал</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Обновить
            </Button>
            {showNotifications && (lowStockMedicines.length > 0 || outOfStockMedicines.length > 0) && (
              <Button onClick={markAsRead} variant="default">
                <Bell className="h-4 w-4 mr-2" />
                Отметить как прочитанное
              </Button>
            )}
            {pendingShipmentsCount > 0 && (
              <Badge variant="destructive" className="px-3 py-1">
                {pendingShipmentsCount} новых поступлений
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Уведомления о низких остатках */}
      {showNotifications && (lowStockMedicines.length > 0 || outOfStockMedicines.length > 0) && (
        <div className="mb-6 space-y-4">
          {outOfStockMedicines.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <h3 className="text-lg font-medium text-red-800">
                  Закончились лекарства ({outOfStockMedicines.length})
                </h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {outOfStockMedicines.map(medicine => (
                  <Badge key={medicine.id} variant="destructive">
                    {medicine.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {lowStockMedicines.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-medium text-yellow-800">
                  Мало лекарств в наличии ({lowStockMedicines.length})
                </h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockMedicines.map(medicine => (
                  <Badge key={medicine.id} variant="secondary">
                    {medicine.name} - {medicine.quantity} шт.
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Уведомления о новых поступлениях */}
      {pendingShipmentsCount > 0 && (
        <div className="mb-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-blue-400 mr-2" />
                <h3 className="text-lg font-medium text-blue-800">
                  Новые поступления от главного склада ({pendingShipmentsCount})
                </h3>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Посмотреть все
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {shipments.filter(s => s.status === 'pending').map((shipment) => {
                const items = asArray(shipment.items);
                const medCount = items.filter((i: any) => i.type === 'medicine').length;
                const deviceCount = items.filter((i: any) => i.type === 'medical_device').length;
                return (
                  <div key={shipment.id} className="bg-white p-4 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{fdt(shipment.created_at)}</p>
                        {medCount > 0 && (
                          <p className="text-sm">Лекарств: {medCount} видов</p>
                        )}
                        {deviceCount > 0 && (
                          <p className="text-sm">ИМН: {deviceCount} видов</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setModalData(shipment); setOpen(true); }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Посмотреть
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setModalData(shipment); setOpen(true); }}
                          disabled={open || acceptMutation.isLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Принять
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Всего получено</h3>
              <p className="text-2xl font-bold text-blue-700">{totalReceived} шт.</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">В наличии сейчас</h3>
              <p className="text-2xl font-bold text-green-700">{totalInStock} шт.</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-purple-900">Видов лекарств</h3>
              <p className="text-2xl font-bold text-purple-700">{medicines.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current medicines */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Лекарства в наличии ({medicines.length})</h2>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {medicines.length > 0 ? (
              <div className="space-y-4">
                {medicines.map((medicine) => (
                  <div key={medicine.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <Package className="h-6 w-6 text-blue-500 mr-3" />
                      <div>
                        <h3 className="font-semibold">{medicine.name}</h3>
                        <p className="text-sm text-gray-600">
                          Цена продажи: {medicine.sell_price?.toFixed(2)} ₸
                        </p>
                        {medicine.purchase_price && (
                          <p className="text-sm text-gray-600">
                            Цена закупки: {medicine.purchase_price?.toFixed(2)} ₸
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      medicine.quantity > 10 ? 'bg-green-100 text-green-800' :
                      medicine.quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {medicine.quantity} шт.
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Лекарства не поступали</p>
              </div>
            )}
          </div>
        </div>

        {/* Transfer history grouped by medicine */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">История поступлений ({transfers.length} записей)</h2>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {groupedTransfers.length > 0 ? (
              <div className="space-y-4">
                {groupedTransfers.map((group: any, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-green-500 mr-3" />
                        <div>
                          <h3 className="font-semibold">{group.medicine_name}</h3>
                          <p className="text-sm text-gray-600">
                            Всего получено: <span className="font-medium text-green-600">{group.total_quantity} шт.</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Количество поступлений: {group.transfers.length}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetails(showDetails === group.medicine_name ? null : group.medicine_name)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {showDetails === group.medicine_name ? 'Скрыть' : 'Подробнее'}
                      </Button>
                    </div>
                    
                    {showDetails === group.medicine_name && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="font-medium mb-3">История поступлений:</h5>
                        <div className="space-y-2">
                          {group.transfers.map((transfer: any, transferIndex: number) => (
                            <div key={`${transfer.id}-${transferIndex}`} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">
                                  {format(new Date(transfer.created_at || transfer.date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                                </p>
                                <p className="text-xs text-gray-600">ID: {transfer.id}</p>
                              </div>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                                +{transfer.quantity} шт.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">История поступлений пуста</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопка обновления */}
      <div className="mt-6 flex justify-center">
        <Button onClick={fetchData} variant="outline" className="flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          Обновить данные
        </Button>
      </div>

      {/* Диалог просмотра поступления */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setModalData(null); } }}>
        {modalData && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Поступление</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{fdt(modalData.created_at)}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Состав:</h4>
                <div className="space-y-2">
                  {asArray(modalData.items).map((it: any) => (
                    <div key={`${it.type}-${it.id}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{it.name}</span>
                      <Badge variant="outline">{it.quantity} шт.</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="rejection-reason">Причина отклонения (если отклоняете)</Label>
                <Input
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Укажите причину отклонения..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => modalData && handleRejectShipment(modalData.id)}
                  disabled={!rejectionReason.trim() || acceptMutation.isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Отклонить
                </Button>
                <Button onClick={onAcceptClick} disabled={acceptMutation.isLoading}>
                  <Check className="h-4 w-4 mr-2" />
                  {acceptMutation.isLoading ? 'Принятие…' : 'Принять'}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Arrivals;
