import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/utils/api';
import { asArray } from '@/lib/asArray';
import { Download, FileText, Eye, BarChart, Package, Users, Activity, TrendingUp } from 'lucide-react';
import { Branch } from '@/types';
import * as XLSX from 'xlsx';

const Reports: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<any>(null);
  const { toast } = useToast();

  const branchesArr = asArray(branches);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const result = await apiService.getBranches();
      if (result.data) setBranches(asArray(result.data));
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить филиалы",
        variant: "destructive"
      });
    }
  };

  const reportTypes = [
    { value: 'inventory', label: 'Отчет по остаткам', icon: Package },
    { value: 'dispensing', label: 'Отчет по выдачам', icon: Activity },
    { value: 'patients', label: 'Отчет по пациентам', icon: Users },
    { value: 'arrivals', label: 'Отчет по поступлениям', icon: TrendingUp },
    { value: 'transfers', label: 'Отчет по переводам', icon: BarChart },
    { value: 'medical_devices', label: 'Отчет по ИМН', icon: FileText }
  ];

  const generateReport = async () => {
    if (!reportType) {
      toast({
        title: "Ошибка",
        description: "Выберите тип отчета",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.generateReport({
        type: reportType,
        branch_id: selectedBranch || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      });

      if (result.data) {
        setReportData(asArray(result.data));
        toast({
          title: "Успешно",
          description: "Отчет сгенерирован"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать отчет",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = asArray(reportData);
    if (data.length === 0) {
      toast({
        title: "Ошибка",
        description: "Нет данных для экспорта",
        variant: "destructive"
      });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    const fileName = `report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Успешно",
      description: "Отчет экспортирован в Excel"
    });
  };

  const showDetails = async (item: any) => {
    try {
      const result = await apiService.getReportDetails(reportType, item.id);
      if (result.data) {
        setSelectedItemDetails(result.data);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить детали",
        variant: "destructive"
      });
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branchesArr.find(b => b.id === branchId);
    return branch?.name || 'Главный склад';
  };

  const getReportIcon = (type: string) => {
    const reportType = reportTypes.find(rt => rt.value === type);
    return reportType?.icon || FileText;
  };

  const renderReportTable = () => {
    const data = asArray(reportData);
    if (data.length === 0) return <p className="text-muted-foreground text-sm">Нет данных</p>;

    const firstItem = data[0];
    const columns = Object.keys(firstItem);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column}>
                  {typeof item[column] === 'object'
                    ? JSON.stringify(item[column])
                    : item[column]?.toString() || '—'
                  }
                </TableCell>
              ))}
              <TableCell>
                {item.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showDetails(item)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Подробнее
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Отчеты</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры отчета</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Тип отчета</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип отчета" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Филиал</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Все филиалы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все филиалы</SelectItem>
                  {branchesArr.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Дата с</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label>Дата по</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="flex-1"
            >
              <BarChart className="h-4 w-4 mr-2" />
              {loading ? 'Генерируется...' : 'Сгенерировать отчет'}
            </Button>
            
            {asArray(reportData).length > 0 && (
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {asArray(reportData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = getReportIcon(reportType);
                return <Icon className="h-5 w-5" />;
              })()}
              Результаты отчета
              {selectedBranch && (
                <span className="text-sm font-normal text-gray-600">
                  - {getBranchName(selectedBranch)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderReportTable()}
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Подробная информация</DialogTitle>
          </DialogHeader>
          {selectedItemDetails && (
            <div className="space-y-4">
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(selectedItemDetails, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {asArray(reportData).length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Выберите параметры и нажмите "Сгенерировать отчет" для просмотра данных
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;