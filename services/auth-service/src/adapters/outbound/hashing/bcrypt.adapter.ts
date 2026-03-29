import {Injectable} from '@nestjs/common';
import {compare, genSalt, hash} from 'bcrypt';
import {HashingPort} from '@domain/ports/outbound/hashing.port';

@Injectable()
export class BcryptAdapter implements HashingPort {
  async hash(data: string | Buffer): Promise<string> {
    const salt = await genSalt();
    return hash(data, salt);
  }

  compare(data: string | Buffer, encrypted: string): Promise<boolean> {
    return compare(data, encrypted);
  }
}
