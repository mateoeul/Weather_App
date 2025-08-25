import axios from "axios";

const API_URL = "https://api.openweathermap.org/data/2.5/";
const API_KEY = "308c64a55aeb85f7b5fc87b877c327a9";
const DEFAULT_CITY = "Buenos Aires,AR";

const weatherService = {
	async getCurrentWeather(city = DEFAULT_CITY, units = "metric") {
		try {
			const response = await axios.get(`${API_URL}weather`, {
				params: { q: city, appid: API_KEY, units },
			});
			return response.data;
		} catch (error) {
			const message = error.response?.data?.message || "Failed to fetch current weather";
			throw new Error(message);
		}
	},

	async getHourlyForecast24h(city = DEFAULT_CITY, units = "metric") {
		try {
			const response = await axios.get(`${API_URL}forecast`, {
				params: { q: city, appid: API_KEY, units },
			});
			const data = response.data;
			return { ...data, list: Array.isArray(data.list) ? data.list.slice(0, 8) : [] };
		} catch (error) {
			const message = error.response?.data?.message || "Failed to fetch 24h forecast";
			throw new Error(message);
		}
	},

	async getDailyForecast5d(city = DEFAULT_CITY, units = "metric") {
		try {
			const response = await axios.get(`${API_URL}forecast`, {
				params: { q: city, appid: API_KEY, units },
			});
			const { city: cityMeta, list } = response.data;
			if (!Array.isArray(list)) return { city: cityMeta, days: [] };

			const groups = list.reduce((acc, item) => {
				const dateText = item.dt_txt?.split(" ")[0] || "";
				if (!acc[dateText]) acc[dateText] = [];
				acc[dateText].push(item);
				return acc;
			}, {});

			const days = Object.entries(groups)
				.slice(0, 5)
				.map(([date, entries]) => {
					let min = Number.POSITIVE_INFINITY;
					let max = Number.NEGATIVE_INFINITY;
					let noonEntry = null;
					for (const e of entries) {
						const tempMin = e.main?.temp_min;
						const tempMax = e.main?.temp_max;
						if (typeof tempMin === "number") min = Math.min(min, tempMin);
						if (typeof tempMax === "number") max = Math.max(max, tempMax);
						if (e.dt_txt?.includes("12:00:00")) noonEntry = e;
					}
					const representative = noonEntry || entries[Math.floor(entries.length / 2)] || entries[0];
					const weather = representative?.weather?.[0] || {};
					return {
						date,
						min,
						max,
						weather: {
							id: weather.id,
							main: weather.main,
							description: weather.description,
							icon: weather.icon,
						},
					};
				});

			return { city: cityMeta, days };
		} catch (error) {
			const message = error.response?.data?.message || "Failed to fetch 5d forecast";
			throw new Error(message);
		}
	},

	async getCityWeatherSummaries(cities, units = "metric") {
		try {
			if (!Array.isArray(cities) || cities.length === 0) return [];
			const results = await Promise.all(
				cities.map((city) =>
					this.getCurrentWeather(city, units).catch(() => null)
				)
			);
			return results.filter(Boolean);
		} catch (error) {
			const message = error.response?.data?.message || "Failed to fetch city summaries";
			throw new Error(message);
		}
	},
};

export default weatherService;

