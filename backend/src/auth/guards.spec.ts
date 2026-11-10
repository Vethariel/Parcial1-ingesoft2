import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from './auth.types.js';
import { JwtGuard } from './jwt.guard.js';
import type { Role } from '../users/user.types.js';
import { RolesGuard } from './roles.guard.js';

const jwt = new JwtService({ secret: 'test-secret' });

/** Contexto falso: lo mínimo que los guards leen de una petición. */
function contextFor(request: Partial<AuthenticatedRequest>, roles?: Role[]) {
  const handler = () => undefined;
  const reflector = new Reflector();
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
  if (roles) {
    // Simula @Roles(roles) sobre el endpoint.
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  }
  return { context, reflector };
}

describe('JwtGuard', () => {
  const guard = new JwtGuard(jwt);

  it('acepta un token válido y deja el usuario en request.user', async () => {
    const token = await jwt.signAsync({ sub: 'user-1', role: 'CUSTOMER' });
    const request = { headers: { authorization: `Bearer ${token}` } };
    const { context } = contextFor(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as AuthenticatedRequest).user).toEqual({
      id: 'user-1',
      role: 'CUSTOMER',
    });
  });

  it('rechaza una petición sin token', async () => {
    const { context } = contextFor({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token firmado con otra clave (falsificado)', async () => {
    const forged = await new JwtService({ secret: 'otra-clave' }).signAsync({
      sub: 'user-1',
      role: 'ADMIN',
    });
    const { context } = contextFor({
      headers: { authorization: `Bearer ${forged}` },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token expirado', async () => {
    const expired = await jwt.signAsync(
      { sub: 'user-1', role: 'CUSTOMER' },
      { expiresIn: -1 },
    );
    const { context } = contextFor({
      headers: { authorization: `Bearer ${expired}` },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('RolesGuard', () => {
  it('deja pasar si el endpoint no exige rol', () => {
    const { context, reflector } = contextFor({});

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('deja pasar si el rol del usuario está permitido', () => {
    const { context, reflector } = contextFor(
      { user: { id: 'a', role: 'ADMIN' } },
      ['ADMIN'],
    );

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('rechaza con 403 si el rol no está permitido', () => {
    const { context, reflector } = contextFor(
      { user: { id: 'c', role: 'CUSTOMER' } },
      ['ADMIN'],
    );

    expect(() => new RolesGuard(reflector).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
