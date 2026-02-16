export async function fetcher<JSON = any>(input: RequestInfo, init?: RequestInit): Promise<JSON> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
  });

  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }

  return res.json();
}
