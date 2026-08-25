import type { AverageAgeStats, TopCitiesStats, UserCountStats } from '@/types/stats';
import { apiRequest } from './client';

export const getUserCount = (): Promise<UserCountStats> => apiRequest('/stats/count');
export const getAverageAge = (): Promise<AverageAgeStats> => apiRequest('/stats/average-age');
export const getTopCities = (): Promise<TopCitiesStats> => apiRequest('/stats/top-cities');
