import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'tailwindcss/tailwind.css';

const MConsumption = () => {
  const [monthlyConsumptionData, setMonthlyConsumptionData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to current month (YYYY-MM)

  const fetchData = async (month) => {
    try {
      const response = await fetch(`/api/mon-cons?month=${month}`);
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
    const seriesData = Object.keys(monthlyConsumptionData).map(meterId => ({
      name: `Energy Meter ${meterId}`,
      data: categories.map(day => {
        const dayData = monthlyConsumptionData[meterId].find(data => new Date(data.day).getDate() === day);
        return dayData ? parseFloat(dayData.total_wh_difference_kwh) : 0;
      })
    }));

    return {
      chart: { type: 'column' },
      title: null,
      xAxis: {
        categories: categories,
        title: { text: 'Days of the Month' }
      },
      yAxis: { min: 0, title: { text: 'kWh' } },
      series: seriesData,
      tooltip: {
        shared: true,
        formatter: function () {
          return `<b>${this.series.name}</b><br/><b>Day ${this.x}:</b> ${this.y.toFixed(1)} kWh`;
        }
      },
      credits: { enabled: false }
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Monthly Consumption</h1>
      
      <div>
        <h2>Select Month</h2>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="mb-4 p-2 border border-gray-300 round text-black"
        />
      </div>

      <div>
        <h2>Daily Energy Consumption (kWh) for Each Day of the Month (by Meter)</h2>
        <table className="table-auto w-full mb-8">
          <thead>
            <tr>
              <th>Energy Meter ID</th>
              <th>Day</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Initial Wh Received</th>
              <th>Total Wh Received</th>
              <th>Total Consumption (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(monthlyConsumptionData).length > 0 ? (
              Object.keys(monthlyConsumptionData).map(meterId =>
                monthlyConsumptionData[meterId].map((dayData, index) => (
                  <tr key={`${meterId}-${index}`}>
                    <td>{meterId}</td>
                    <td>{new Date(dayData.day).getDate()}</td>
                    <td>{new Date(dayData.first_entry).toLocaleString()}</td>
                    <td>{new Date(dayData.last_entry).toLocaleString()}</td>
                    <td>{dayData.first_wh_received}</td>
                    <td>{dayData.last_wh_received}</td>
                    <td>{dayData.total_wh_difference_kwh.toFixed(1)} kWh</td>
                  </tr>
                ))
              )
            ) : (
              <tr>
                <td colSpan="7">Loading...</td>
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

export default MConsumption;