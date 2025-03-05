import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'tailwindcss/tailwind.css';

const OMConsumption = () => {
  const [monthlyConsumptionData, setMonthlyConsumptionData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to current month (YYYY-MM)

  const fetchData = async (month) => {
    try {
      const response = await fetch(`/api/omon-cons?month=${month}`);
      const data = await response.json();
      setMonthlyConsumptionData(data);
      console.log("Fetched monthly consumption data:", data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const getConsumptionChartOptions = () => {
    const categories = Array.from({ length: new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate() }, (_, i) => i + 1);
    const overallConsumption = categories.map(day => {
      return Object.keys(monthlyConsumptionData).reduce((total, meterId) => {
        const dayData = monthlyConsumptionData[meterId]?.find(data => new Date(data.day).getDate() === day);
        return total + (dayData ? parseFloat(dayData.total_wh_difference_kwh) : 0);
      }, 0);
    });

    return {
      chart: { type: 'column' },
      title: null,
      xAxis: {
        categories: categories,
        title: { text: 'Days of the Month' }
      },
      yAxis: { min: 0, title: { text: 'kWh' } },
      series: [{
        name: 'Overall Energy Consumption',
        data: overallConsumption
      }],
      tooltip: {
        shared: true,
        formatter: function () {
          return `<b>Day ${this.x}:</b> ${this.y.toFixed(1)} kWh`;
        }
      },
      credits: { enabled: false }
    };
  };

  // Define the categories variable here to ensure it is accessible in the table rendering
  const categories = Array.from({ length: new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate() }, (_, i) => i + 1);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Monthly Consumption</h1>
      
      <div>
        <h2>Select Month</h2>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="mb-4 p-2 border border-gray-300 rounded text-black"
        />
      </div>

      <div>
        <h2>Daily Energy Consumption (kWh) for Each Day of the Month</h2>
        <table className="table-auto w-full mb-8">
          <thead>
            <tr>
              <th>Day</th>
              <th>Total Consumption (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(monthlyConsumptionData).length > 0 ? (
              categories.map(day => {
                const totalConsumption = Object.keys(monthlyConsumptionData).reduce((total, meterId) => {
                  const dayData = monthlyConsumptionData[meterId]?.find(data => new Date(data.day).getDate() === day);
                  return total + (dayData ? parseFloat(dayData.total_wh_difference_kwh) : 0);
                }, 0);
                return (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>{totalConsumption.toFixed(1)} kWh</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="2">Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Monthly Consumption Chart</h2>
        <div className="w-full flex flex-col p-6 bg-white shadow-lg rounded-lg mb-6">
          <HighchartsReact highcharts={Highcharts} options={getConsumptionChartOptions()} />
        </div>
      </div>
    </div>
  );
};

export default OMConsumption;