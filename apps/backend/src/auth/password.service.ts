import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

@Injectable()
export class PasswordService {
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  }

  async verify(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
  }

  validatePolicy(password: string): boolean {
    return PASSWORD_POLICY.test(password);
  }
}
