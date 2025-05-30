import React, { useState, useEffect } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Twitter Activity Chart Component
 * 
 * This component renders the activity charts from the Twitter data.
 * It utilizes the useChartGeneration hook to handle the legacy chart code.
 */
const TwitterActivityChart = () => {
  const { processedData } = useTweetData();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!processedData?.temporalData) return;
    setLoading(true);
    setError(null);
    try {
      const { temporalData, allTweets = [], mediaItems = [] } = processedData;

      const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const dailyLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

      const monthlyRaw = temporalData.monthlyActivity || {};
      const months = Object.keys(monthlyRaw).sort();
      const monthlyLabels = months.map(m => {
        const [y, mo] = m.split('-');
        return new Date(+y, +mo-1).toLocaleDateString('en-US',{month:'short',year:'numeric'});
      });

      const dataSets = {
        hourlyActivity: {
          labels: hourlyLabels,
          datasets: [{ label:'Tweets per Hour', data:temporalData.hourlyActivity, backgroundColor:'#3b82f6', borderRadius:4 }]
        },
        dailyActivity: {
          labels: dailyLabels,
          datasets: [{ label:'Tweets per Day', data:temporalData.dailyActivity, backgroundColor:'#10b981', borderRadius:4 }]
        },
        monthlyActivity: {
          labels: monthlyLabels,
          datasets: [{ label:'Tweets per Month', data:months.map(m=>monthlyRaw[m]), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.1)', tension:0.3, fill:true }]
        },
        hourlyEngagement: {
          labels: hourlyLabels,
          datasets: [{ label:'Avg Eng per Hour', data:temporalData.avgHourlyEngagement, borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.1)', tension:0.3, fill:true }]
        },
        dailyEngagement: {
          labels: dailyLabels,
          datasets: [{ label:'Avg Eng per Day', data:temporalData.avgDailyEngagement, backgroundColor:'#f59e0b', borderRadius:4 }]
        },
        mediaUsage: (() => {
          const withMedia = new Set(mediaItems.map(i=>i.tweetId)).size;
          const withoutMedia = allTweets.length - withMedia;
          return {
            labels:['With Media','Without Media'],
            datasets:[{ data:[withMedia,withoutMedia], backgroundColor:['#3b82f6','#d1d5db'], borderColor:'#fff', borderWidth:2 }]
          };
        })()
      };

      setChartData(dataSets);
      setLoading(false);
    } catch (e) {
      console.error('Error preparing chart data:', e);
      setError('Failed to prepare chart data.');
      setLoading(false);
    }
  }, [processedData]);

  const barOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,ticks:{precision:0}}}};
  const lineOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}};
  const pieOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'right'}}};

  if (loading) return <div>Loading charts...</div>;
  if (error) return <div className="error-container">{error}</div>;
  if (!chartData) return null;

  return (
    <section className="report-section twitter-charts mb-12">
      <div className="section-header bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg">
        <h2 className="text-xl font-semibold text-gray-800">Twitter Activity Charts</h2>
      </div>
      <div className="section-content bg-white p-6 rounded-b-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="chart-container" style={{height:300}}><Bar data={chartData.hourlyActivity} options={barOpts}/></div>
          <div className="chart-container" style={{height:300}}><Bar data={chartData.dailyActivity} options={barOpts}/></div>
          <div className="chart-container" style={{height:300}}><Line data={chartData.hourlyEngagement} options={lineOpts}/></div>
          <div className="chart-container" style={{height:300}}><Bar data={chartData.dailyEngagement} options={barOpts}/></div>
          <div className="chart-container md:col-span-2" style={{height:300}}><Line data={chartData.monthlyActivity} options={lineOpts}/></div>
          <div className="chart-container md:col-span-2 flex justify-center" style={{height:300}}><Pie data={chartData.mediaUsage} options={pieOpts}/></div>
        </div>
      </div>
    </section>
  );
};

export default TwitterActivityChart;