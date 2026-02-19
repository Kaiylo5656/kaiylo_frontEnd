import React from 'react';
import { Search, SlidersHorizontal, AlertCircle, TrendingUp, Users, Euro, Calendar, Clock, BarChart2, PieChart } from 'lucide-react';

const FinancialTracking = () => {

  const clients = [
    { name: 'Théo Chomat', plan: 'Mensuel', remaining: 0, status: 'En retard', amount: '130 €', lastPayment: '3 avr. 2025' },
    { name: 'Jean Roy', plan: 'Mensuel', remaining: 0, status: 'En retard', amount: '130 €', lastPayment: '3 avr. 2025' },
    { name: 'Oscar Chomat', plan: 'Trimestriel', remaining: 2, status: 'En attente', amount: '300 €', lastPayment: '3 janv. 2025' },
    { name: 'Pauline Martin', plan: 'Mensuel', remaining: 8, status: 'Payé', amount: '130 €', lastPayment: '3 mar. 2025' },
    { name: 'Dider Lamber', plan: 'Mensuel', remaining: 5, status: 'Payé', amount: '130 €', lastPayment: '5 mar. 2025' },
    { name: 'Laura Legrand', plan: 'A la carte', remaining: 6, status: 'Payé', amount: '100 €', lastPayment: '15 mar. 2025' },
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case 'En retard':
        return 'text-red-400';
      case 'En attente':
        return 'text-yellow-400';
      case 'Payé':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="p-6 bg-background text-foreground flex gap-6">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Suivi Financier</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-6 rounded-lg">
            <p className="text-sm text-muted-foreground">Revenus nets ce mois</p>
            <p className="text-4xl font-bold mt-2">2400 €</p>
          </div>
          <div className="bg-card p-6 rounded-lg">
            <p className="text-sm text-muted-foreground">Elèves actifs</p>
            <p className="text-4xl font-bold mt-2">6</p>
          </div>
          <div className="bg-card p-6 rounded-lg">
            <p className="text-sm text-muted-foreground">Alertes de paiement</p>
            <p className="text-4xl font-bold mt-2">2</p>
          </div>
          <div className="bg-card p-6 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">Indicateurs</p>
            <div className="flex justify-between items-center text-sm">
              <span>Moyenne / clients</span>
              <span className="font-bold">300 €</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Durée moyenne d'engagement</span>
              <span className="font-bold">3,5 mois</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Prochaine échéance de paiement</span>
              <span className="font-bold">J-10</span>
            </div>
          </div>
        </div>

        {/* Client Table */}
        <div className="bg-card p-6 rounded-lg flex-1">
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search client"
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-muted-foreground border-b border-border">
                <th className="py-2 font-normal flex items-center gap-2"><Users className="h-4 w-4" />Client</th>
                <th className="py-2 font-normal">Formule</th>
                <th className="py-2 font-normal">Séances restantes</th>
                <th className="py-2 font-normal">Paiement</th>
                <th className="py-2 font-normal">Montant dû</th>
                <th className="py-2 font-normal">Dernier paiement</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={index} className="border-b border-border text-sm">
                  <td className="py-4">{client.name}</td>
                  <td className="py-4">{client.plan}</td>
                  <td className="py-4">{client.remaining}</td>
                  <td className={`py-4 font-semibold ${getStatusClass(client.status)}`}>{client.status}</td>
                  <td className="py-4">{client.amount}</td>
                  <td className="py-4">{client.lastPayment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6">
        {/* Alerts */}
        <div className="bg-card p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Alertes</h3>
            <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">3</span>
          </div>
          <ul className="space-y-3 text-sm">
            <li>Elèves en attente de paiement <span className="float-right">2</span></li>
            <li>Elèves en retard de paiement <span className="float-right">2</span></li>
            <li>Relances programmées <span className="float-right">4 avr.</span></li>
          </ul>
        </div>
        {/* Monthly Revenue */}
        <div className="bg-card p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2"><BarChart2 className="h-5 w-5" />Revenus mensuels</h3>
            <span className="text-xs bg-muted px-2 py-1 rounded">8 month</span>
          </div>
          <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            Bar Chart Placeholder
          </div>
        </div>
        {/* Global Revenue */}
        <div className="bg-card p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2"><PieChart className="h-5 w-5" />Revenus global</h3>
            <span className="text-xs bg-muted px-2 py-1 rounded">All</span>
          </div>
          <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            Donut Chart Placeholder
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialTracking;
