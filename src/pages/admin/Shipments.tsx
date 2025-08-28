import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiService } from "@/utils/api";
import { Loader2, Plus, Truck, Package, AlertTriangle, RefreshCw, X, CheckCircle } from "lucide-react";

const Shipments = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    to_branch_id: '',
    medicines: [{ medicine_id: '', quantity: 0 }],
    medical_devices: [{ device_id: '', quantity: 0 }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipmentsRes, medicinesRes, devicesRes, branchesRes] = await Promise.all([
        apiService.getShipments(),
        apiService.getMedicines(),
        apiService.getMedicalDevices(),
        apiService.getBranches()
      ]);

      if (shipmentsRes.data) setShipments(shipmentsRes.data);
      if (medicinesRes.data) setMedicines(medicinesRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMedicineItem = () => {
    setFormData({
      ...formData,
      medicines: [...formData.medicines, { medicine_id: '', quantity: 0 }]
    });
  };

  const addDeviceItem = () => {
    setFormData({
      ...formData,
      medical_devices: [...formData.medical_devices, { device_id: '', quantity: 0 }]
    });
  };

  const updateMedicineItem = (index: number, field: string, value: any) => {
    const newMedicines = [...formData.medicines];
    newMedicines[index] = { ...newMedicines[index], [field]: value };
    setFormData({ ...formData, medicines: newMedicines });
  };

  const updateDeviceItem = (index: number, field: string, value: any) => {
    const newDevices = [...formData.medical_devices];
    newDevices[index] = { ...newDevices[index], [field]: value };
    setFormData({ ...formData, medical_devices: newDevices });
  };

  const removeMedicineItem = (index: number) => {
    const newMedicines = formData.medicines.filter((_, i) => i !== index);
    setFormData({ ...formData, medicines: newMedicines });
  };

  const removeDeviceItem = (index: number) => {
    const newDevices = formData.medical_devices.filter((_, i) => i !== index);
    setFormData({ ...formData, medical_devices: newDevices });
  };

  const handleCreateShipment = async () => {
    if (!formData.to_branch_id) {
      toast({
        title: "Ошибка",
        description: "Выберите филиал назначения",
        variant: "destructive",
      });
      return;
    }

    const validMedicines = formData.medicines.filter(m => m.medicine_id && m.quantity > 0);
    const validDevices = formData.medical_devices.filter(d => d.device_id && d.quantity > 0);

    if (validMedicines.length === 0 && validDevices.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы одно лекарство или ИМН",
        variant: "destructive",
      });
      return;
    }

    try {
      const shipmentData = {
        to_branch_id: formData.to_branch_id,
        medicines: validMedicines,
        medical_devices: validDevices
      };

      const response = await apiService.createShipment(shipmentData);
      if (response.data) {
        await fetchData();
        resetForm();
        setDialogOpen(false);
        toast({
          title: "Отправка создана",
          description: "Отправка успешно создана и отправлена в филиал",
        });
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать отправку",
        variant: "destructive",
      });
    }
  };

  const handleRetryShipment = async (shipmentId: string) => {
    try {
      const response = await apiService.retryShipment(shipmentId);
      if (response.data || !response.error) {
        await fetchData();
        toast({
          title: "Отправка повторена",
          description: "Отправка отправлена повторно",
        });
      }
    } catch (error) {
      console.error('Error retrying shipment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось повторить отправку",
        variant: "destructive",
      });
    }
  };

  const handleCancelShipment = async (shipmentId: string) => {
    if (!confirm('Вы уверены, что хотите отменить отправку?')) return;
    
    try {
      const response = await apiService.cancelShipment(shipmentId);
      if (response.data || !response.error) {
        await fetchData();
        toast({
          title: "Отправка отменена",
          description: "Отправка успешно отменена",
        });
      }
    } catch (error) {
      console.error('Error canceling shipment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отменить отправку",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      to_branch_id: '',
      medicines: [{ medicine_id: '', quantity: 0 }],
      medical_devices: [{ device_id: '', quantity: 0 }]
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">В ожидании</Badge>;
      case 'accepted':
        return <Badge variant="default">Принято</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Отклонено</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Отменено</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Неизвестный филиал';
  };

  const getMedicineName = (medicineId: string) => {
    const medicine = medicines.find(m => m.id === medicineId);
    return medicine ? medicine.name : 'Неизвестное лекарство';
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : 'Неизвестное ИМН';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Отправки в филиалы</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать отправку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новую отправку</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="branch">Филиал назначения</Label>
                <Select value={formData.to_branch_id} onValueChange={(value) => setFormData({...formData, to_branch_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="medicines" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="medicines">Лекарства</TabsTrigger>
                  <TabsTrigger value="devices">ИМН</TabsTrigger>
                </TabsList>
                
                <TabsContent value="medicines" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Лекарства для отправки</h3>
                    <Button onClick={addMedicineItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить лекарство
                    </Button>
                  </div>
                  
                  {formData.medicines.map((medicine, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label>Лекарство</Label>
                        <Select 
                          value={medicine.medicine_id} 
                          onValueChange={(value) => updateMedicineItem(index, 'medicine_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите лекарство" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicines.map((med) => (
                              <SelectItem key={med.id} value={med.id}>
                                {med.name} (Остаток: {med.quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Label>Количество</Label>
                        <Input
                          type="number"
                          min="1"
                          value={medicine.quantity}
                          onChange={(e) => updateMedicineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeMedicineItem(index)}
                        disabled={formData.medicines.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="devices" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">ИМН для отправки</h3>
                    <Button onClick={addDeviceItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить ИМН
                    </Button>
                  </div>
                  
                  {formData.medical_devices.map((device, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label>ИМН</Label>
                        <Select 
                          value={device.device_id} 
                          onValueChange={(value) => updateDeviceItem(index, 'device_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите ИМН" />
                          </SelectTrigger>
                          <SelectContent>
                            {devices.map((dev) => (
                              <SelectItem key={dev.id} value={dev.id}>
                                {dev.name} (Остаток: {dev.quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Label>Количество</Label>
                        <Input
                          type="number"
                          min="1"
                          value={device.quantity}
                          onChange={(e) => updateDeviceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeDeviceItem(index)}
                        disabled={formData.medical_devices.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateShipment} className="flex-1">
                  Отправить
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {shipments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Нет отправок</p>
            <p className="text-sm text-muted-foreground">Создайте первую отправку в филиал</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Отправка в {getBranchName(shipment.to_branch_id)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Создано: {new Date(shipment.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(shipment.status)}
                    {shipment.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelShipment(shipment.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Отменить
                      </Button>
                    )}
                    {shipment.status === 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryShipment(shipment.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Отправить заново
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipment.medicines && shipment.medicines.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Лекарства:</h4>
                      <div className="grid gap-2">
                        {shipment.medicines.map((med: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{getMedicineName(med.medicine_id)}</span>
                            <Badge variant="outline">{med.quantity} шт.</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {shipment.medical_devices && shipment.medical_devices.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">ИМН:</h4>
                      <div className="grid gap-2">
                        {shipment.medical_devices.map((dev: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{getDeviceName(dev.device_id)}</span>
                            <Badge variant="outline">{dev.quantity} шт.</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {shipment.rejection_reason && (
                    <div className="p-3 bg-destructive/10 rounded border border-destructive/20">
                      <p className="text-sm font-medium text-destructive mb-1">Причина отклонения:</p>
                      <p className="text-sm">{shipment.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shipments;