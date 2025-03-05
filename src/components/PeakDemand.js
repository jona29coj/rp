import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'tailwindcss/tailwind.css';

const PeakDemand = () => {
  const [peakDemandData, setPeakDemandData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const peakDemandResponse = await fetch(`/api/peak-dem?date=${selectedDate}`);
        const peakDemandData = await peakDemandResponse.json();
        setPeakDemandData(peakDemandData);
        console.log("Fetched peak demand data:", peakDemandData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedDate]);

  const getPeakDemandChartOptions = (meterId) => {
    const meterData = peakDemandData.filter(entry => entry.energy_meter_id === meterId);
    return {
      chart: { type: 'line' },
      title: { text: `Peak Demand (kVA) for Energy Meter ${meterId}` },
      xAxis: {
        categories: meterData.map(entry => {
          const startTime = new Date(entry.interval_start);
          const endTime = new Date(startTime.getTime() + 14 * 60 * 1000 + 59 * 1000);
          return `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`;
        }),
        title: { text: '15-Minute Interval' }
      },
      yAxis: { min: 0, title: { text: 'kVA' } },
      series: [{
        name: 'Peak Demand',
        data: meterData.map(entry => parseFloat(entry.peak_demand_kva)),
        tooltip: { valueSuffix: ' kVA' }
      }],
      tooltip: {
        shared: true,
        formatter: function () {
          return `<b>${this.x}</b><br/><b>Peak Demand:</b> ${this.y.toFixed(1)} kVA`;
        }
      },
      credits: { enabled: false }
    };
  };

  const uniqueMeterIds = [...new Set(peakDemandData.map(entry => entry.energy_meter_id))];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Peak Demand</h1>
      <div className="mb-4">
        <label className="mr-2">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="text-black"
        />
      </div>
      <div>
        <h2>Peak Demand (kVA) for Each 15-Minute Interval (by Meter)</h2>
        <table>
          <thead>
            <tr>
              <th>Energy Meter ID</th>
              <th>15-Minute Interval</th>
              <th>Peak Demand (kVA)</th>
              <th>Timestamp of Highest Apparent Power</th>
            </tr>
          </thead>
          <tbody>
            {peakDemandData.length > 0 ? (
              peakDemandData.map((entry, index) => {
                const startTime = new Date(entry.interval_start);
                const endTime = new Date(startTime.getTime() + 14 * 60 * 1000 + 59 * 1000);
                return (
                  <tr key={index}>
                    <td>{entry.energy_meter_id}</td>
                    <td>
                      {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
                    </td>
                    <td>
                      { !isNaN(Number(entry.peak_demand_kva))
                        ? Number(entry.peak_demand_kva).toFixed(1)
                        : "N/A" } kVA
                    </td>
                    <td>
                      {entry.peak_timestamp
                        ? new Date(entry.peak_timestamp).toLocaleTimeString()
                        : "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4">Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div>
        <h2>Peak Demand Charts (by Meter)</h2>
        {uniqueMeterIds.map(meterId => (
          <div key={meterId} className="w-full flex flex-col p-6 bg-white shadow-lg rounded-lg mb-6">
            <HighchartsReact highcharts={Highcharts} options={getPeakDemandChartOptions(meterId)} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeakDemand;