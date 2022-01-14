import { JWK } from 'jose';
import { TypeCheck, isBoolean, isObject, isString } from '@digita-ai/dgt-utils-core';

const maybe = <T> (check: TypeCheck<T>) =>
  (value: unknown): value is T | undefined => value === undefined || check(value);

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isArrayOf = <T> (check: TypeCheck<T>) =>
  (value: unknown): value is T[] => isArray(value) && value.every((element) => check(element));

export const isJwk: TypeCheck<JWK> = (value: unknown): value is JWK => isObject(value)
    && maybe(isString)(value.alg)
    && maybe(isString)(value.crv)
    && maybe(isString)(value.d)
    && maybe(isString)(value.dp)
    && maybe(isString)(value.dq)
    && maybe(isString)(value.e)
    && maybe(isBoolean)(value.ext)
    && maybe(isString)(value.k)
    && maybe(isArrayOf(isString))(value.key_ops)
    && maybe(isString)(value.kid)
    && maybe(isString)(value.kty)
    && maybe(isString)(value.n)
    && maybe(isArrayOf((v: unknown): v is {
      d?: string;
      r?: string;
      t?: string;
    } => isObject(v)
        && maybe(isString)(v.d)
        && maybe(isString)(v.r)
        && maybe(isString)(v.t)))(value.oth)
    && maybe(isString)(value.p)
    && maybe(isString)(value.q)
    && maybe(isString)(value.qi)
    && maybe(isString)(value.use)
    && maybe(isString)(value.x)
    && maybe(isString)(value.y)
    && maybe(isString)(value.crv)
    && maybe(isArrayOf(isString))(value.x5c)
    && maybe(isString)(value.x5t)
    && maybe(isString)(value['x5t#S256'])
    && maybe(isString)(value.x5u);
