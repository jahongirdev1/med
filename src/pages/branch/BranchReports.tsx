import React, { useState, useEffect } from 'react';
import { apiService } from '@/utils/api';
import { storage } from '@/utils/storage';
import { Calendar, Download, FileText, Package, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { asArray } from '@/lib/asArray';

const BranchReports: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [selectedReportType, setSelectedReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const reportDataArr = asArray(reportData);

  const reportTypes = [
    { value: 'stock', label: 'Отчет по остаткам', icon: Package },
    { value: 'dispensing', label: 'Отчет по выдачам', icon: Users },
    { value: 'arrivals', label: 'Отчет по поступлениям', icon: TrendingUp }
  ];

  const generateReport = async () => {
    if (!selectedReportType) {
      toast({ title: 'Выберите тип отчета', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let response;
      const params = {
        branch_id: branchId,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      };

      switch (selectedReportType) {
        case 'stock':
          response = await apiService.getMedicines(branchId);
          break;
        case 'dispensing':
          response = await apiService.getDispensings(branchId);
          break;
        case 'arrivals':
          response = await apiService.getArrivals();
          break;
        default:
          throw new Error('Unknown report type');
      }

      if (response.data) {
        setReportData(asArray(response.data));
        toast({ title: 'Отчет сформирован успешно' });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ title: 'Ошибка формирования отчета', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = asArray(reportData);
    if (data.length === 0) {
      toast({ title: 'Нет данных для экспорта', variant: 'destructive' });
      return;
    }

    const reportType = reportTypes.find(r => r.value === selectedReportType);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    
    const fileName = `${reportType?.label || 'Отчет'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ title: 'Отчет экспортирован в Excel' });
  };

  const showItemDetails = async (item: any) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

  const getReportIcon = (type: string) => {
    const reportType = reportTypes.find(r => r.value === type);
    return reportType?.icon || FileText;
  };

  const renderReportTable = () => {
    const data = asArray(reportData);
    if (data.length === 0) return <p className="text-muted-foreground text-sm">Нет данных</p>;

    const columns = Object.keys(data[0]);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className="capitalize">
                {column.replace(/_/g, ' ')}
              </TableHead>
            ))}
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column}>
                  {typeof item[column] === 'object' ?
                    JSON.stringify(item[column]) :
                    String(item[column] || '-')
                  }
                </TableCell>
              ))}
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => showItemDetails(item)}>
                  Подробнее
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Отчеты филиала</h1>
        <p className="text-muted-foreground">Формирование отчетов для текущего филиала</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры отчета</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Тип отчета</Label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип отчета" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Дата с</Label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>

            <div>
              <Label>Дата по</Label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={generateReport} disabled={loading || !selectedReportType}>
              {loading ? 'Формируется...' : 'Сформировать отчет'}
            </Button>
            <Button variant="outline" onClick={exportToExcel} disabled={asArray(reportData).length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Экспорт в Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportDataArr.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {React.createElement(getReportIcon(selectedReportType), { className: "h-5 w-5 mr-2" })}
              {reportTypes.find(r => r.value === selectedReportType)?.label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({reportDataArr.length} записей)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderReportTable()}
          </CardContent>
        </Card>
      )}

      {reportDataArr.length === 0 && selectedReportType && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Нет данных для отображения. Попробуйте изменить параметры отчета.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Подробная информация</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {Object.entries(selectedItem).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4">
                  <div className="font-medium capitalize">{key.replace(/_/g, ' ')}:</div>
                  <div>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '-')}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchReports;