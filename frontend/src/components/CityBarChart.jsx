import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const CityBarChart = ({ cityData }) => {

  const formattedData = cityData.map(city => ({
    city: city.city,
    totalSOS: city.totalSOS
  }));

  return (
    <div className="card shadow-lg rounded-4 p-3 mb-5">
      <h5 className="text-center mb-3">🏙 City-wise SOS Distribution</h5>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="city" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="totalSOS" fill="#dc3545" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CityBarChart;
