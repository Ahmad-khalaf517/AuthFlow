import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEY, ERROR_MESSAGES } from '@/utils/constants';
import { api } from '@/test/handlers';
import { server } from '@/test/server';
import { ApiError, apiRequest } from './client';

describe('apiRequest', () => {
  it('adds JSON headers and a persisted bearer token', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { token: 'secret-token' }, version: 0 }),
    );
    server.use(
      http.post(`${api}/inspect`, async ({ request }) => {
        expect(request.headers.get('accept')).toBe('application/json');
        expect(request.headers.get('content-type')).toBe('application/json');
        expect(request.headers.get('authorization')).toBe('Bearer secret-token');
        expect(await request.json()).toEqual({ name: 'Ahmad' });
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      apiRequest('/inspect', { method: 'POST', body: JSON.stringify({ name: 'Ahmad' }) }),
    ).resolves.toEqual({ ok: true });
  });

  it('does not add content-type or authorization when they are unnecessary', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'not-json');
    server.use(
      http.get(`${api}/inspect`, ({ request }) => {
        expect(request.headers.get('content-type')).toBeNull();
        expect(request.headers.get('authorization')).toBeNull();
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(apiRequest('/inspect')).resolves.toEqual({ ok: true });
  });

  it('converts text and validation error payloads to ApiError', async () => {
    server.use(
      http.get(`${api}/detail`, () =>
        HttpResponse.json({ detail: 'Email already exists' }, { status: 409 }),
      ),
      http.get(`${api}/validation`, () =>
        HttpResponse.json(
          { detail: [{ loc: ['body', 'email'], msg: 'Invalid email', type: 'value_error' }] },
          { status: 422 },
        ),
      ),
    );
    await expect(apiRequest('/detail')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Email already exists',
      status: 409,
    });
    const error = await apiRequest('/validation').catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Invalid email', status: 422 });
    expect((error as ApiError).validationErrors).toHaveLength(1);
  });

  it('uses generic and unauthorized fallback messages', async () => {
    server.use(
      http.get(`${api}/generic`, () => new HttpResponse(null, { status: 500 })),
      http.get(`${api}/unauthorized`, () => new HttpResponse(null, { status: 401 })),
    );
    await expect(apiRequest('/generic')).rejects.toMatchObject({ message: ERROR_MESSAGES.generic });
    await expect(apiRequest('/unauthorized')).rejects.toMatchObject({
      message: ERROR_MESSAGES.unauthorized,
      status: 401,
    });
  });

  it('clears persisted authentication when an authenticated request expires', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { token: 'expired-token' }, version: 0 }),
    );
    server.use(
      http.get(`${api}/expired`, () =>
        HttpResponse.json({ detail: 'Session expired' }, { status: 401 }),
      ),
    );
    await expect(apiRequest('/expired')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('reports network failures as offline', async () => {
    server.use(http.get(`${api}/offline`, () => HttpResponse.error()));
    await expect(apiRequest('/offline')).rejects.toMatchObject({
      message: ERROR_MESSAGES.offline,
      status: 0,
    });
  });
});
