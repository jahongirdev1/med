import React, { useState, useEffect } from 'react';
import { apiService } from '@/utils/api';
import { Calendar as CalendarIcon, Package, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const AdminCalendar: React.FC = () => {
  const [dispensings, setDispensings] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDispensings();
    }
  }, [selectedDate, selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await apiService.getBranches();
      if (response.data) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchDispensings = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDispensingRecords(selectedBranch || undefined);
      if (response.data) {
        // Filter dispensings by selected date
        const filtered = response.data.filter((dispensing: any) => {
          const dispensingDate = new Date(dispensing.date).toISOString().split('T')[0];
          return dispensingDate === selectedDate;
        });
        setDispensings(filtered);
      }
    } catch (error) {
      console.error('Error fetching dispensings:', error);
      toast({ title: 'Ошибка загрузки данных', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Главный склад';
  };

  const getTotalMedicinesDispensed = () => {
    return dispensings.reduce((total, dispensing) => total + dispensing.quantity, 0);
  };

  const getUniquePatientsCount = () => {
    const uniquePatients = new Set(dispensings.map(d => d.patient_id));
    return uniquePatients.size;
  };

  // Generate calendar dates for current month
  const generateCalendarDates = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      dates.push(new Date(year, month, day));
    }
    
    return dates;
  };

  const calendarDates = generateCalendarDates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Календарь выдач</h1>
        <p className="text-muted-foreground">Календарь выдач лекарств пациентам</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего выдач</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispensings.length}</div>
            <p className="text-xs text-muted-foreground">на выбранную дату</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пациентов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniquePatientsCount()}</div>
            <p className="text-xs text-muted-foreground">уникальных пациентов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Лекарств выдано</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalMedicinesDispensed()}</div>
            <p className="text-xs text-muted-foreground">единиц препаратов</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Фильтры</CardTitle>
            <div className="flex space-x-2">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Все филиалы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все филиалы</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-7 gap-2">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <div key={day} className="text-center font-medium p-2 text-sm text-muted-foreground">
            {day}
          </div>
        ))}
        
        {calendarDates.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          
          return (
            <Button
              key={dateStr}
              variant={isSelected ? "default" : isToday ? "outline" : "ghost"}
              className="h-12 p-2"
              onClick={() => setSelectedDate(dateStr)}
            >
              <div className="text-center">
                <div className="text-sm">{date.getDate()}</div>
              </div>
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Выдачи на {new Date(selectedDate).toLocaleDateString('ru-RU')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : dispensings.length > 0 ? (
            <div className="space-y-4">
              {dispensings.map((dispensing) => (
                <div key={dispensing.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{dispensing.medicine_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Пациент: {dispensing.patient_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Сотрудник: {dispensing.employee_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Филиал: {getBranchName(dispensing.branch_id)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{dispensing.quantity} шт.</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(dispensing.date || dispensing.created_at).toLocaleTimeString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                На выбранную дату выдач не было
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCalendar;