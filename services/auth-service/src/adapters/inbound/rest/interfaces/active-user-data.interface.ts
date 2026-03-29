import {UserType} from '@domain/models/generated/enums';

export interface ActiveUserData {
  sub: string;
  email: string;
  userType: UserType;
  permissions: string[];
}
