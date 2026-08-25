export interface UserCountStats {
  total_users: number;
}

export interface AverageAgeStats {
  average_age: number;
}

export interface CityStat {
  city: string;
  count: number;
}

export interface TopCitiesStats {
  cities: CityStat[];
}
