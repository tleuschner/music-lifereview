import { randomBytes } from 'crypto';
import { SHARE_TOKEN_BYTES } from '@music-livereview/shared';
import type { TokenGenerator } from '../../../domain/port/outbound/TokenGenerator.js';

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(SHARE_TOKEN_BYTES).toString('base64url');
  }
}
