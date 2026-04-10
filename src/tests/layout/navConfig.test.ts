import { describe, expect, it } from 'vitest';
import {
  isForcePublicPath,
  isHomePath,
} from '../../components/layout/navbar/navConfig';

describe('navConfig', () => {
  describe('isHomePath', () => {
    it('matches root and /home only', () => {
      expect(isHomePath('/')).toBe(true);
      expect(isHomePath('/home')).toBe(true);
      expect(isHomePath('/about')).toBe(false);
      expect(isHomePath('/feed')).toBe(false);
      expect(isHomePath('/home/extra')).toBe(false);
    });
  });

  describe('isForcePublicPath', () => {
    it('matches join and nested join routes', () => {
      expect(isForcePublicPath('/join')).toBe(true);
      expect(isForcePublicPath('/join/step')).toBe(true);
      expect(isForcePublicPath('/')).toBe(false);
    });
  });
});
