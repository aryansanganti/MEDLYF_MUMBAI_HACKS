export const fetchHospitals = async () => {
  const base = import.meta.env.VITE_API_URL;
  const res = await fetch(`${base}/api/hospitals`);

  if (!res.ok) {
    throw new Error('Failed to fetch hospitals');
  }

  return res.json();
};
