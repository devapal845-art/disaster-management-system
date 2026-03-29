import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from "react-native";

import { BarChart, PieChart } from "react-native-chart-kit";
import API from "../../services/api";

const screenWidth = Dimensions.get("window").width;

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await API.get("/rescue-analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.log("Analytics fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: "#fff" }}>
          No analytics data available
        </Text>
      </View>
    );
  }

  /* ================= SAFE DATA ================= */

  const barData = {
    labels: ["Total", "Pending", "Rescued"],
    datasets: [
      {
        data: [
          analytics?.totalSOS || 0,
          analytics?.pendingCount || 0,
          analytics?.rescuedCount || 0
        ]
      }
    ]
  };

  const pieData = [
    {
      name: "Pending",
      population: analytics?.pendingCount || 0,
      color: "#f59e0b",
      legendFontColor: "#fff",
      legendFontSize: 14
    },
    {
      name: "Rescued",
      population: analytics?.rescuedCount || 0,
      color: "#16a34a",
      legendFontColor: "#fff",
      legendFontSize: 14
    }
  ];

  return (
    <ScrollView style={styles.container}>

      {/* BAR CHART */}
      <Text style={styles.title}>📊 SOS Overview</Text>

      <BarChart
        data={barData}
        width={screenWidth - 20}
        height={250}
        fromZero
        showValuesOnTopOfBars
        chartConfig={chartConfig}
        style={styles.chart}
      />

      {/* PIE CHART */}
      <Text style={styles.title}>🥧 Rescue Distribution</Text>

      <PieChart
        data={pieData}
        width={screenWidth - 20}
        height={220}
        chartConfig={chartConfig}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"15"}
        absolute
      />

    </ScrollView>
  );
}

/* ================= CHART CONFIG ================= */

const chartConfig = {
  backgroundGradientFrom: "#1e293b",
  backgroundGradientTo: "#1e293b",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  labelColor: () => "#fff",
  propsForBackgroundLines: {
    stroke: "#334155"
  }
};

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 10
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 15
  },
  chart: {
    borderRadius: 16,
    marginBottom: 20
  }
});