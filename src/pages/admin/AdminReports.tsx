
import React, { useState, useEffect } from 'react';
import { apiService } from '@/utils/api';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
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
import { CalendarIcon, Package, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const AdminReports: React.FC = () => {
  const [reportType, setReportType] = useState('main');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [dispensings, setDispensings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchesRes, medicinesRes, transfersRes, dispensingsRes, employeesRes, patientsRes] = await Promise.all([
        apiService.getBranches(),
        apiService.getMedicines(),
        apiService.getTransfers(),
        apiService.getDispensings(),
        apiService.getEmployees(),
        apiService.getPatients(),
      ]);

      if (branchesRes.data) setBranches(branchesRes.data);
      if (medicinesRes.data) setMedicines(medicinesRes.data);
      if (transfersRes.data) setTransfers(transfersRes.data);
      if (dispensingsRes.data) setDispensings(dispensingsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (patientsRes.data) setPatients(patientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  const mainWarehouseMedicines = medicines.filter(m => !m.branch_id);
  const totalMedicinesInStock = mainWarehouseMedicines.reduce((sum, med) => sum + med.quantity, 0);
  const totalTransferred = transfers.reduce((sum, transfer) => sum + transfer.quantity, 0);

  const getFilteredTransfers = () => {
    let filtered = transfers;
    
    if (selectedBranch && selectedBranch !== 'all') {
      filtered = filtered.filter(t => t.to_branch_id === selectedBranch);
    }
    
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= dateFrom);
    }
    
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= dateTo);
    }
    
    return filtered;
  };

  const getFilteredDispensings = () => {
    let filtered = dispensings;
    
    if (selectedBranch && selectedBranch !== 'all') {
      filtered = filtered.filter(d => d.branch_id === selectedBranch);
    }
    
    if (dateFrom) {
      filtered = filtered.filter(d => new Date(d.date) >= dateFrom);
    }
    
    if (dateTo) {
      filtered = filtered.filter(d => new Date(d.date) <= dateTo);
    }
    
    return filtered;
  };

  const getBranchData = () => {
    if (!selectedBranch || selectedBranch === 'all') return null;
    
    const branch = branches.find(b => b.id === selectedBranch);
    const branchPatients = patients.filter(p => p.branch_id === selectedBranch);
    const branchEmployees = employees.filter(e => e.branch_id === selectedBranch);
    const branchTransfers = transfers.filter(t => t.to_branch_id === selectedBranch);
    const branchDispensings = dispensings.filter(d => d.branch_id === selectedBranch);
    
    return {
      branch,
      patients: branchPatients,
      employees: branchEmployees,
      transfers: branchTransfers,
      dispensings: branchDispensings
    };
  };

  const renderMainReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Лекарства на складе</h3>
              <p className="text-2xl font-bold text-blue-700">{totalMedicinesInStock} шт.</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Отправлено в филиалы</h3>
              <p className="text-2xl font-bold text-green-700">{totalTransferred} шт.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Последние отправки</h3>
        {transfers.length > 0 ? (
          <div className="space-y-3">
            {transfers.slice(-5).map((transfer) => {
              const branch = branches.find(b => b.id === transfer.to_branch_id);
              return (
                <div key={transfer.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{transfer.medicine_name}</p>
                      <p className="text-sm text-gray-600">В филиал: {branch?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{transfer.quantity} шт.</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(transfer.date), 'dd.MM.yyyy', { locale: ru })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Отправки не найдены</p>
        )}
      </div>
    </div>
  );

  const renderTransferReport = () => {
    const filteredTransfers = getFilteredTransfers();
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Отчет по отправкам</h3>
        {filteredTransfers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Дата</th>
                  <th className="text-left py-2">Лекарство</th>
                  <th className="text-left py-2">Филиал</th>
                  <th className="text-left py-2">Количество</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((transfer) => {
                  const branch = branches.find(b => b.id === transfer.to_branch_id);
                  return (
                    <tr key={transfer.id} className="border-b">
                      <td className="py-2">{format(new Date(transfer.date), 'dd.MM.yyyy HH:mm', { locale: ru })}</td>
                      <td className="py-2">{transfer.medicine_name}</td>
                      <td className="py-2">{branch?.name}</td>
                      <td className="py-2">{transfer.quantity} шт.</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Отправки не найдены за выбранный период</p>
        )}
      </div>
    );
  };

  const renderPatientReport = () => {
    const filteredDispensings = getFilteredDispensings();
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Отчет по пациентам</h3>
        {filteredDispensings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Дата</th>
                  <th className="text-left py-2">Пациент</th>
                  <th className="text-left py-2">Лекарство</th>
                  <th className="text-left py-2">Количество</th>
                  <th className="text-left py-2">Филиал</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispensings.map((dispensing) => {
                  const branch = branches.find(b => b.id === dispensing.branch_id);
                  return (
                    <tr key={dispensing.id} className="border-b">
                      <td className="py-2">{format(new Date(dispensing.date), 'dd.MM.yyyy HH:mm', { locale: ru })}</td>
                      <td className="py-2">{dispensing.patient_name}</td>
                      <td className="py-2">{dispensing.medicine_name}</td>
                      <td className="py-2">{dispensing.quantity} шт.</td>
                      <td className="py-2">{branch?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Выдачи пациентам не найдены за выбранный период</p>
        )}
      </div>
    );
  };

  const renderBranchReport = () => {
    const branchData = getBranchData();
    if (!branchData) {
      return <p className="text-gray-500">Выберите филиал для просмотра отчета</p>;
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Отчет по филиалу: {branchData.branch?.name}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Пациенты</p>
              <p className="text-2xl font-bold text-blue-600">{branchData.patients.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">Получено лекарств</p>
              <p className="text-2xl font-bold text-green-600">
                {branchData.transfers.reduce((sum, t) => sum + t.quantity, 0)} шт.
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="text-sm text-gray-600">Выдано пациентам</p>
              <p className="text-2xl font-bold text-yellow-600">
                {branchData.dispensings.reduce((sum, d) => sum + d.quantity, 0)} шт.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Последние выдачи:</h4>
            {branchData.dispensings.slice(-5).map((dispensing) => (
              <div key={dispensing.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{dispensing.patient_name}</p>
                    <p className="text-sm text-gray-600">{dispensing.medicine_name} - {dispensing.quantity} шт.</p>
                    <p className="text-xs text-gray-500">Сотрудник: {dispensing.employee_name}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {format(new Date(dispensing.date), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Отчеты</h1>
        <p className="text-gray-600 mt-2">Аналитика и отчеты по работе склада</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Фильтры отчета</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Тип отчета</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип отчета" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Общий отчет</SelectItem>
                <SelectItem value="transfers">Отчет по отправкам</SelectItem>
                <SelectItem value="patients">Отчет по пациентам</SelectItem>
                <SelectItem value="branches">Отчет по филиалам</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(reportType === 'transfers' || reportType === 'patients' || reportType === 'branches') && (
            <div>
              <label className="block text-sm font-medium mb-2">Филиал</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Все филиалы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все филиалы</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Дата с</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd.MM.yyyy', { locale: ru }) : 'Выберите дату'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Дата до</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd.MM.yyyy', { locale: ru }) : 'Выберите дату'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div>
        {reportType === 'main' && renderMainReport()}
        {reportType === 'transfers' && renderTransferReport()}
        {reportType === 'patients' && renderPatientReport()}
        {reportType === 'branches' && renderBranchReport()}
      </div>
    </div>
  );
};

export default AdminReports;
