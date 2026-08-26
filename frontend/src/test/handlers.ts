import { http, HttpResponse } from 'msw';
import { createUser, createUsersResponse } from './factories';

const api = 'http://localhost:8000/api/v1';

export const handlers = [
  http.post(`${api}/auth/login`, () =>
    HttpResponse.json({ access_token: 'test-token', token_type: 'bearer' }),
  ),
  http.post(`${api}/auth/register`, () => HttpResponse.json(createUser(), { status: 201 })),
  http.get(`${api}/users/me`, () => HttpResponse.json(createUser())),
  http.put(`${api}/users/me`, async ({ request }) =>
    HttpResponse.json(createUser((await request.json()) as Partial<ReturnType<typeof createUser>>)),
  ),
  http.get(`${api}/users`, () => HttpResponse.json(createUsersResponse())),
  http.post(`${api}/users`, async ({ request }) =>
    HttpResponse.json(
      createUser((await request.json()) as Partial<ReturnType<typeof createUser>>),
      { status: 201 },
    ),
  ),
  http.put(`${api}/users/:id`, async ({ params, request }) =>
    HttpResponse.json(
      createUser({
        id: String(params.id),
        ...((await request.json()) as Partial<ReturnType<typeof createUser>>),
      }),
    ),
  ),
  http.delete(`${api}/users/:id`, ({ params }) =>
    HttpResponse.json(createUser({ id: String(params.id), is_deleted: true })),
  ),
  http.get(`${api}/stats/count`, () => HttpResponse.json({ total_users: 12 })),
  http.get(`${api}/stats/average-age`, () => HttpResponse.json({ average_age: 31.5 })),
  http.get(`${api}/stats/top-cities`, () =>
    HttpResponse.json({ cities: [{ city: 'Beirut', count: 7 }] }),
  ),
];

export { api };
