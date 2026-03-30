import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashingPort } from '@domain/ports/outbound/hashing.port';

@Injectable()
export class BcryptAdapter implements HashingPort {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
