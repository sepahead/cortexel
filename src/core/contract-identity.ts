/** Internal named projections of the generated registry-owned contract identities. */

import {
  ARTIFACT_CONTRACT,
  REQUEST_CONTRACT,
} from '../generated/identity.js';

export interface ContractIdentityParts {
  readonly value: string;
  readonly name: string;
  readonly version: string;
}

const CONTRACT_VALUE = /^([a-z][a-z0-9-]*)\/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/u;

function splitContractIdentity(value: string, axis: string): ContractIdentityParts {
  const match = CONTRACT_VALUE.exec(value);
  if (!match) {
    throw new Error(`${axis} is not a canonical contract-name/major.minor identity`);
  }
  return Object.freeze({ value, name: match[1], version: match[2] });
}

export const REQUEST_CONTRACT_IDENTITY = splitContractIdentity(
  REQUEST_CONTRACT,
  'REQUEST_CONTRACT',
);

export const ARTIFACT_CONTRACT_IDENTITY = splitContractIdentity(
  ARTIFACT_CONTRACT,
  'ARTIFACT_CONTRACT',
);
