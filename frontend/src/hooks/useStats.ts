import { useQuery } from '@tanstack/react-query';
import { getAverageAge, getTopCities, getUserCount } from '@/api/stats';

export const useUserCount = () => useQuery({ queryKey: ['stats', 'count'], queryFn: getUserCount });
export const useAverageAge = () =>
  useQuery({ queryKey: ['stats', 'average-age'], queryFn: getAverageAge });
export const useTopCities = () =>
  useQuery({ queryKey: ['stats', 'top-cities'], queryFn: getTopCities });
