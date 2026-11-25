import { describe, it, expect } from 'bun:test';
import {
  isValidIPv4,
  isValidIPv6,
  isValidIpAddress,
  isValidAllowedIp,
} from '../utils/networkValidation';

describe('BUG-004: Network IP Address Validation', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(isValidIPv4('13.233.163.244')).toBe(true);
    expect(isValidIPv4('10.0.1.50')).toBe(true);
    expect(isValidIPv4('127.0.0.1')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
    expect(isValidIPv4(' 192.168.1.1 ')).toBe(true);
  });

  it('rejects out-of-range and malformed IPv4 addresses', () => {
    expect(isValidIPv4('999.999.999.999')).toBe(false);
    expect(isValidIPv4('256.0.0.1')).toBe(false);
    expect(isValidIPv4('192.168.1')).toBe(false);
    expect(isValidIPv4('192.168.1.1.1')).toBe(false);
    expect(isValidIPv4('192.168.01.1')).toBe(false);
    expect(isValidIPv4('192.168.1.-1')).toBe(false);
    expect(isValidIPv4('192.168.1.1:8080')).toBe(false);
    expect(isValidIPv4('192.168.1.1/24')).toBe(false);
    expect(isValidIPv4('server.example.com')).toBe(false);
    expect(isValidIPv4('')).toBe(false);
    expect(isValidIPv4('   ')).toBe(false);
  });

  it('accepts valid IPv6 addresses including loopback, compressed, and IPv4-mapped forms', () => {
    expect(isValidIPv6('::1')).toBe(true);
    expect(isValidIPv6('::')).toBe(true);
    expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(isValidIPv6('2001:db8::1')).toBe(true);
    expect(isValidIPv6('fe80::1')).toBe(true);
    expect(isValidIPv6('::ffff:192.0.2.128')).toBe(true);
    expect(isValidIPv6('2001:db8:3:4::192.0.2.33')).toBe(true);
  });

  it('rejects invalid IPv6 addresses and non-literal strings', () => {
    expect(isValidIPv6('1:2:3')).toBe(false);
    expect(isValidIPv6('1:2:3:4:5:6:7:8:9')).toBe(false);
    expect(isValidIPv6('2001::db8::1')).toBe(false);
    expect(isValidIPv6('1:2:3:4:5:6:7::8')).toBe(false);
    expect(isValidIPv6('gggg::1')).toBe(false);
    expect(isValidIPv6('::ffff:999.0.0.1')).toBe(false);
    expect(isValidIPv6('[::1]')).toBe(false);
    expect(isValidIPv6('fe80::1%eth0')).toBe(false);
    expect(isValidIPv6('')).toBe(false);
  });

  it('validates PublicIp / PrivateIp strictly with isValidIpAddress', () => {
    expect(isValidIpAddress('13.233.163.244')).toBe(true);
    expect(isValidIpAddress('2001:db8::8a2e:370:7334')).toBe(true);
    expect(isValidIpAddress('999.999.999.999')).toBe(false);
    expect(isValidIpAddress('localhost')).toBe(false);
    expect(isValidIpAddress('not-an-ip')).toBe(false);
  });

  it('validates AllowedIp with loopback localhost support matching ShipperAuth middleware', () => {
    expect(isValidAllowedIp('103.172.4.56')).toBe(true);
    expect(isValidAllowedIp('127.0.0.1')).toBe(true);
    expect(isValidAllowedIp('::1')).toBe(true);
    expect(isValidAllowedIp('localhost')).toBe(true);
    expect(isValidAllowedIp('LOCALHOST')).toBe(false);
    expect(isValidAllowedIp('999.999.999.999')).toBe(false);
    expect(isValidAllowedIp('invalid.host')).toBe(false);
    expect(isValidAllowedIp('')).toBe(false);
  });
});
