import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'tailwindcss/tailwind.css';

const OPeakDemand = () => {
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

  const getOverallPeakDemandChartOptions = () => {
    const overallPeakData = [];
    const intervalMap = new Map();

    // Find the highest peak demand for each interval across all meters
    peakDemandData.forEach(entry => {
      const interval = entry.interval_start;
      if (!intervalMap.has(interval) || intervalMap.get(interval).peak_demand_kva < entry.peak_demand_kva) {
        intervalMap.set(interval, entry);
      }
    });

    intervalMap.forEach((entry, interval) => {
      overallPeakData.push({
        interval_start: interval,
        peak_demand_kva: entry.peak_demand_kva,
        peak_timestamp: entry.peak_timestamp
      });
    });

    return {
      chart: { type: 'line' },
      title: null,
      xAxis: {
        categories: overallPeakData.map(entry => {
          const startTime = new Date(entry.interval_start);
          const endTime = new Date(startTime.getTime() + 14 * 60 * 1000 + 59 * 1000);
          return `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`;
        }),
        title: { text: '15-Minute Interval' }
      },
      yAxis: { min: 0, title: { text: 'kVA' } },
      series: [{
        name: 'Peak Demand',
        data: overallPeakData.map(entry => parseFloat(entry.peak_demand_kva)),
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

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Peak Demand</h1>
      <div className="mb-4">
        <label className="mr-2">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          max={new Date().toISOString().split('T')[0]}
          className="border p-2 text-black"
        />
      </div>
      <div>
        <h2>Overall Peak Demand Chart</h2>
        <div className="w-full flex flex-col p-6 bg-white shadow-lg rounded-lg mb-6">
          <HighchartsReact highcharts={Highcharts} options={getOverallPeakDemandChartOptions()} />
        </div>
      </div>
    </div>
  );
};

export default OPeakDemand;