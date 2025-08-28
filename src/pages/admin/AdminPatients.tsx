
import React, { useState, useEffect } from 'react';
import { apiService } from '@/utils/api';
import { UserCheck, MapPin, Phone } from 'lucide-react';

const AdminPatients: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, branchesRes] = await Promise.all([
        apiService.getPatients(),
        apiService.getBranches()
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  const patientsByBranch = branches.map(branch => ({
    branch,
    patients: patients.filter(p => p.branch_id === branch.id)
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Пациенты филиалов</h1>
        <p className="text-gray-600 mt-2">Просмотр всех пациентов по филиалам</p>
      </div>

      {patientsByBranch.length > 0 ? (
        <div className="space-y-6">
          {patientsByBranch.map(({ branch, patients: branchPatients }) => (
            <div key={branch.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">{branch.name}</h2>
                <p className="text-gray-600">Пациентов: {branchPatients.length}</p>
              </div>
              <div className="p-6">
                {branchPatients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchPatients.map((patient) => (
                      <div key={patient.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start">
                          <UserCheck className="h-6 w-6 text-blue-500 mr-3 mt-1" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Диагноз: {patient.illness}
                            </p>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                {patient.phone}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-2" />
                                {patient.address}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    В этом филиале пациенты не зарегистрированы
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Филиалы и пациенты не добавлены</p>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;
