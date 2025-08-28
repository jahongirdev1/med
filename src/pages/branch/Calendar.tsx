import React, { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const Calendar: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dispensingData, setDispensingData] = useState<any>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayDetails, setDayDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, selectedPatient]);

  const fetchData = async () => {
    if (!branchId) return;
    
    try {
      const patientsRes = await apiService.getPatients(branchId);
      setPatients(patientsRes?.data || []);
    } catch (error) {
      toast({ title: 'Ошибка загрузки данных', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    if (!branchId) return;

    try {
      const response = await apiService.getDispensingCalendar(branchId);
      setDispensingData(response?.data || {});
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Пустые дни в начале месяца
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const hasDispensings = (day: number) => {
    return dispensingData[day] && dispensingData[day].length > 0;
  };

  const handleDayClick = (day: number) => {
    if (hasDispensings(day)) {
      setSelectedDay(day);
      setDayDetails(dispensingData[day] || []);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка календаря...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Календарь выдач</h1>
          <p className="text-muted-foreground">Отслеживание выдач лекарств пациентам</p>
        </div>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Пациенты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Все пациенты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все пациенты</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name || patient.firstName} {patient.last_name || patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((day, index) => (
                  <div key={index} className="aspect-square">
                    {day && (
                      <Button
                        variant={hasDispensings(day) ? "default" : "ghost"}
                        className={`w-full h-full p-1 text-sm ${
                          hasDispensings(day) 
                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                            : ''
                        }`}
                        onClick={() => handleDayClick(day)}
                        disabled={!hasDispensings(day)}
                      >
                        {day}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Есть выдачи</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span>Нет выдач</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Выдачи {selectedDay} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dayDetails.map((detail, index) => (
              <div key={index} className="border rounded p-3">
                <div className="font-medium">
                  {detail.patientName}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Время: {detail.time} | Сотрудник: {detail.employeeName}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Выдано:</div>
                  {detail.items.map((item: any, i: number) => (
                    <div key={i} className="text-sm text-muted-foreground ml-2">
                      • {item.name}: {item.quantity} {item.unit || 'шт'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;